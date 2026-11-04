// Admin tools: set reports, moderation, bans and usage stats.
// Admins are listed by username in the ADMIN_USERS environment variable (comma-separated).
const crypto = require('crypto');
const dbm = require('./db');
const auth = require('./auth');

const db = () => dbm.db;
const REASONS = { inappropriate: 'Inappropriate content', offensive: 'Offensive or hateful', wrong: 'Wrong answers', spam: 'Spam or nonsense', copied: 'Copied from someone else', other: 'Something else' };
const AUTO_HIDE_AT = 3; // distinct reporters before a community set is hidden pending review
const reportLimits = new Map();
const today = (d = new Date()) => d.toISOString().slice(0, 10);

// ---------- reports ----------
async function report(store, setId, body, user, ip) {
  const set = await store.get(setId);
  if (!set || !store.canRead(set, user)) throw new Error('That set doesn’t exist.');
  if (user && set.owner === user.id) throw new Error('You can’t report your own set.');
  const reason = REASONS[body.reason] ? body.reason : null;
  if (!reason) throw new Error('Pick a reason.');
  const reporterKey = user ? 'u:' + user.id : 'ip:' + (ip || 'unknown');
  const now = Date.now();
  const recent = (reportLimits.get(reporterKey) || []).filter(t => now - t < 3600_000);
  if (recent.length >= 10) throw new Error('You’ve sent a lot of reports. Try again later.');
  recent.push(now);
  reportLimits.set(reporterKey, recent);

  // one open report per person per set
  const existing = (await db().list('reports', { owner: setId, limit: 1000 })).map(r => r.data)
    .find(r => r.status === 'open' && r.reporterKey === reporterKey);
  const doc = existing || { id: crypto.randomUUID(), setId, created: now, status: 'open', reporterKey };
  Object.assign(doc, {
    setTitle: set.title, ownerName: set.ownerName || 'QuizForge', official: !!set.official,
    reason, details: String(body.details || '').trim().slice(0, 500),
    reporter: user ? user.username : 'Guest', updated: now,
  });
  await db().put('reports', doc.id, doc, setId);

  const open = (await db().list('reports', { owner: setId, limit: 1000 })).map(r => r.data).filter(r => r.status === 'open');
  if (!set.official && !set.hidden && new Set(open.map(r => r.reporterKey)).size >= AUTO_HIDE_AT) {
    await store.setHidden(setId, true, 'auto');
  }
  return { ok: true };
}

async function listReports() {
  const all = (await db().list('reports', { limit: 5000 })).map(r => r.data);
  const bySet = new Map();
  for (const r of all) {
    if (r.status !== 'open') continue;
    const g = bySet.get(r.setId) || { setId: r.setId, setTitle: r.setTitle, ownerName: r.ownerName, official: r.official, count: 0, reasons: {}, latest: 0, notes: [] };
    g.count++;
    g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1;
    g.latest = Math.max(g.latest, r.updated || r.created);
    if (r.details) g.notes.push({ by: r.reporter, text: r.details, reason: r.reason });
    bySet.set(r.setId, g);
  }
  const out = [];
  for (const g of bySet.values()) {
    const meta = await db().get('setmeta', g.setId);
    out.push({ ...g, hidden: !!(meta && meta.hidden), exists: !!meta });
  }
  return out.sort((a, b) => b.count - a.count || b.latest - a.latest);
}

async function closeReports(setId, status) {
  for (const r of await db().list('reports', { owner: setId, limit: 1000 })) {
    if (r.data.status === 'open') await db().put('reports', r.id, { ...r.data, status, closed: Date.now() }, setId);
  }
}

async function resolve(store, setId, action) {
  if (action === 'dismiss') {
    const meta = await db().get('setmeta', setId);
    if (meta && meta.hidden && meta.hiddenBy === 'auto') await store.setHidden(setId, false);
    await closeReports(setId, 'dismissed');
  } else if (action === 'hide') {
    await store.setHidden(setId, true, 'admin');
    await closeReports(setId, 'hidden');
  } else if (action === 'unhide') {
    await store.setHidden(setId, false);
  } else if (action === 'delete') {
    await store.adminDelete(setId);
    await closeReports(setId, 'deleted');
  } else {
    throw new Error('Unknown action.');
  }
  return { ok: true };
}

// ---------- users ----------
async function findUsers(store, q) {
  q = String(q || '').trim().toLowerCase();
  const users = (await db().list('users', { limit: 20000 })).map(r => r.data);
  const sets = (await db().list('setmeta', { limit: 20000 })).map(r => r.data);
  return users
    .filter(u => !q || u.username.toLowerCase().includes(q))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 50)
    .map(u => ({
      id: u.id, username: u.username, createdAt: u.createdAt, level: auth.levelFor(u.xp), gamesPlayed: u.gamesPlayed || 0,
      banned: !!u.banned, admin: auth.isAdmin(u), sets: sets.filter(s => s.owner === u.id).length,
      published: sets.filter(s => s.owner === u.id && s.visibility === 'public').length,
    }));
}

async function setBan(store, userId, banned, actor) {
  const u = await db().get('users', userId);
  if (!u) throw new Error('User not found.');
  if (auth.isAdmin(u)) throw new Error('You can’t ban an admin.');
  if (actor && actor.id === u.id) throw new Error('You can’t ban yourself.');
  u.banned = !!banned;
  await auth.saveUser(u);
  // hide or restore everything they published
  for (const m of (await db().list('setmeta', { owner: userId, limit: 5000 })).map(r => r.data)) {
    if (banned && m.visibility === 'public' && !m.hidden) await store.setHidden(m.id, true, 'ban');
    if (!banned && m.hidden && m.hiddenBy === 'ban') await store.setHidden(m.id, false);
  }
  if (banned) for (const s of await db().list('sessions', { owner: userId, limit: 1000 })) await db().del('sessions', s.id);
  return { ok: true, banned: u.banned };
}

// ---------- stats ----------
async function recordGame(room) {
  try {
    const id = 'day-' + today();
    const d = (await db().get('stats', id)) || { date: today(), games: 0, players: 0, homework: 0, solo: 0, modes: {} };
    d.games++;
    d.players += [...room.players.values()].filter(p => !p.bot).length;
    if (room.homework) d.homework++;
    else if (room.solo) d.solo++;
    d.modes[room.mode] = (d.modes[room.mode] || 0) + 1;
    await db().put('stats', id, d);
  } catch (err) { console.error('stats', err.message); }
}

async function stats(liveStats) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = today(new Date(Date.now() - i * 86400000));
    const d = (await db().get('stats', 'day-' + date)) || { date, games: 0, players: 0, homework: 0, solo: 0, modes: {} };
    days.push(d);
  }
  const sum = (list, k) => list.reduce((n, d) => n + (d[k] || 0), 0);
  const last7 = days.slice(-7);
  const modes = {};
  for (const d of days) for (const [m, n] of Object.entries(d.modes || {})) modes[m] = (modes[m] || 0) + n;

  const users = (await db().list('users', { limit: 20000 })).map(r => r.data);
  const signupsByDay = {};
  for (const u of users) { const k = today(new Date(u.createdAt || 0)); signupsByDay[k] = (signupsByDay[k] || 0) + 1; }
  const sets = (await db().list('setmeta', { limit: 20000 })).map(r => r.data);
  const community = sets.filter(s => !s.official);
  const reports = (await db().list('reports', { limit: 5000 })).map(r => r.data).filter(r => r.status === 'open');

  return {
    live: liveStats(),
    games: { today: days[days.length - 1].games, week: sum(last7, 'games'), month: sum(days, 'games'), playersWeek: sum(last7, 'players'), homeworkWeek: sum(last7, 'homework'), soloWeek: sum(last7, 'solo') },
    users: {
      total: users.length,
      week: users.filter(u => Date.now() - (u.createdAt || 0) < 7 * 86400000).length,
      today: signupsByDay[today()] || 0,
      banned: users.filter(u => u.banned).length,
    },
    sets: { official: sets.length - community.length, community: community.length, published: community.filter(s => s.visibility === 'public' && !s.hidden).length, hidden: sets.filter(s => s.hidden).length },
    homework: { assignments: await db().count('homework'), submissions: await db().count('hwsub'), classes: await db().count('classes') },
    reportsOpen: new Set(reports.map(r => r.setId)).size,
    days: days.map(d => ({ date: d.date, games: d.games, players: d.players, signups: signupsByDay[d.date] || 0 })),
    modes: Object.entries(modes).sort((a, b) => b[1] - a[1]),
    topSets: [...sets].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10).map(s => ({ id: s.id, title: s.title, plays: s.plays || 0, official: !!s.official, ownerName: s.ownerName })),
  };
}

module.exports = { REASONS, report, listReports, resolve, findUsers, setBan, recordGame, stats };
