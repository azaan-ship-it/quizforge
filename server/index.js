// QuizForge server — web app, accounts, sets, AI, shop, history and live games.
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const dbm = require('./db');
const store = require('./store');
const auth = require('./auth');
const ai = require('./ai');
const progress = require('./progress');
const { attach } = require('./games');

const isDesktop = () => process.env.QF_DESKTOP === '1';

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

// wrap async route handlers so errors become clean JSON
const route = fn => (req, res) => Promise.resolve(fn(req, res)).catch(err => {
  res.status(err.status || 400).json({ error: err.message || 'Something went wrong.' });
});

async function start({
  port = Number(process.env.PORT) || 3000,
  dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'userdata'),
  host = '0.0.0.0',
} = {}) {
  await dbm.init({ dataDir });
  await store.init(dataDir);

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
  app.use('/api', auth.middleware());

  let actualPort = port;
  app.get('/api/info', route(async (req, res) => {
    res.json({
      lan: lanIPs(), port: actualPort, desktop: isDesktop(), storage: dbm.db.kind, ai: await ai.status(req.user),
      subjects: store.SUBJECTS, grades: store.GRADES, difficulties: store.DIFFICULTIES,
    });
  }));
  app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

  // accounts
  app.post('/api/auth/register', route(async (req, res) => res.json(await auth.register(req.body.username, req.body.password))));
  app.post('/api/auth/login', route(async (req, res) => res.json(await auth.login(req.body.username, req.body.password))));
  app.post('/api/auth/logout', route(async (req, res) => { await auth.logout(req.token); res.json({ ok: true }); }));
  app.get('/api/me', route(async (req, res) => res.json({ user: auth.publicUser(req.user) })));
  app.post('/api/me/avatar', auth.requireUser, route(async (req, res) => {
    if (!progress.canUseAvatar(req.user, req.body.avatar)) throw new Error('You haven’t unlocked that Forgeling yet.');
    req.user.avatar = req.body.avatar;
    await auth.saveUser(req.user);
    res.json({ user: auth.publicUser(req.user) });
  }));

  // sets
  app.get('/api/sets', route(async (req, res) => res.json(await store.list(req.user))));
  app.get('/api/sets/:id', route(async (req, res) => {
    const set = await store.get(req.params.id);
    if (!store.canRead(set, req.user)) return res.status(404).json({ error: 'That set doesn’t exist or is private.' });
    res.json(set);
  }));
  app.post('/api/sets', auth.requireUser, route(async (req, res) => res.json(await store.save(req.body, req.user))));
  app.post('/api/sets/:id/copy', auth.requireUser, route(async (req, res) => res.json(await store.copy(req.params.id, req.user))));
  app.delete('/api/sets/:id', auth.requireUser, route(async (req, res) => { await store.remove(req.params.id, req.user); res.json({ ok: true }); }));

  // AI
  app.get('/api/ai/status', route(async (req, res) => res.json(await ai.status(req.user))));
  app.post('/api/ai/generate', auth.requireUser, route(async (req, res) => res.json(await ai.generate(req.body, req.user))));
  app.post('/api/me/ai-key', auth.requireUser, route(async (req, res) => res.json(await ai.saveUserKey(req.user, req.body.provider, req.body.key))));

  // Forgelings & shop
  app.get('/api/forgelings', (req, res) => {
    res.json({ basic: progress.BASIC, collectibles: progress.COLLECTIBLES, packs: progress.PACKS, refund: progress.REFUND });
  });
  app.post('/api/shop/open', auth.requireUser, route(async (req, res) => {
    const result = progress.openPack(req.user, req.body.pack);
    await auth.saveUser(req.user);
    res.json({ ...result, user: auth.publicUser(req.user) });
  }));

  // homework
  const homework = require('./homework');
  app.get('/api/homework', auth.requireUser, route(async (req, res) => res.json(await homework.list(req.user))));
  app.post('/api/homework', auth.requireUser, route(async (req, res) => res.json(await homework.create(req.user, req.body, store))));
  app.get('/api/homework/code/:code', route(async (req, res) => {
    const hw = await homework.getByCode(req.params.code);
    if (!hw) return res.status(404).json({ error: 'No homework with that code. Check it with your teacher.' });
    res.json(homework.publicInfo(hw));
  }));
  app.get('/api/homework/:id', auth.requireUser, route(async (req, res) => res.json(await homework.report(req.user, req.params.id))));
  app.delete('/api/homework/:id', auth.requireUser, route(async (req, res) => { await homework.remove(req.user, req.params.id); res.json({ ok: true }); }));

  // history
  app.get('/api/history', auth.requireUser, route(async (req, res) => {
    const rows = await dbm.db.list('games', { owner: req.user.id, limit: 100 });
    res.json(rows.map(r => {
      const g = r.data;
      return { id: g.id, setTitle: g.setTitle, mode: g.mode, solo: g.solo, date: g.date, players: g.players.length, winner: g.players[0] ? g.players[0].name : null };
    }));
  }));
  app.get('/api/history/:id', auth.requireUser, route(async (req, res) => {
    const rows = await dbm.db.list('games', { owner: req.user.id, limit: 100 });
    const hit = rows.find(r => r.id === req.params.id);
    if (!hit) return res.status(404).json({ error: 'Game not found.' });
    res.json(hit.data);
  }));

  const server = http.createServer(app);
  attach(new Server(server, { maxHttpBufferSize: 2e6 }), store);

  return new Promise((resolve, reject) => {
    server.once('error', err => {
      if (err.code === 'EADDRINUSE') server.listen(0, host);
      else reject(err);
    });
    server.on('listening', () => {
      actualPort = server.address().port;
      console.log(`QuizForge running on http://localhost:${actualPort}`);
      resolve({ port: actualPort, server });
    });
    server.listen(port, host);
  });
}

if (require.main === module) start().catch(err => { console.error(err); process.exit(1); });
module.exports = { start };