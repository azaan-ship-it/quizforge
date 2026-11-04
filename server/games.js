// QuizForge game engine — rooms, five modes, bots, rewards and history.
const crypto = require('crypto');
const dbm = require('./db');
const auth = require('./auth');
const progress = require('./progress');
const extra = require('./modes');
const { isBadName } = require('./namefilter');
const homework = require('./homework');

const EMOTES = ['🔥', '😱', '😂', '👏', '😎', '💀', '🤯', '❤️'];

const MODES = ['classic', 'gold', 'td', 'clash', 'royale', ...Object.keys(extra.MODES)];
const X = mode => extra.MODES[mode] || null;
const isTeamMode = mode => extra.TEAM_MODES.includes(mode);
const BOT_NAMES = ['Sparky', 'Gizmo', 'Bolt', 'Widget', 'Pixel', 'Rivet', 'Cog', 'Byte', 'Servo', 'Fuse', 'Diode', 'Chip'];
const TEAMS = ['ember', 'tide'];
const HEARTS = 3;

const rooms = new Map();
let io = null;
let store = null;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const chan = room => 'room:' + room.pin;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weighted(table) {
  let r = Math.random() * table.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of table) { if ((r -= w) < 0) return k; }
  return table[0][0];
}

function newPin() {
  let pin;
  do { pin = String(randInt(100000, 999999)); } while (rooms.has(pin));
  return pin;
}

const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20);

function cleanSettings(s = {}, mode) {
  return {
    duration: clamp(Math.round(Number(s.duration) || 5), 1, 30) * 60,
    goal: mode === 'classic' ? clamp(Math.round(Number(s.goal) || 0), 0, 200) : 0,
  };
}

// typed answers: forgiving comparison
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function typedMatches(input, accept) {
  const t = norm(input);
  if (!t) return false;
  return accept.some(a => {
    const n = norm(a);
    if (n === t) return true;
    return n.length >= 5 && Math.abs(n.length - t.length) <= 1 && lev(n, t) <= 1;
  });
}

const rightTexts = q => (q.type === 'type' ? q.accept : q.c.map(i => q.a[i]));

// ---------- rooms & players ----------

function createRoom({ set, mode, settings, hostSocketId, hostUser, solo }) {
  const room = {
    id: crypto.randomUUID(), pin: newPin(), set, mode, solo: !!solo, hostSocketId,
    hostUserId: hostUser ? hostUser.id : null,
    settings: cleanSettings(settings, mode), startedAt: 0,
    state: 'lobby', players: new Map(), feed: [], endsAt: 0, timer: null,
    teams: null, qStats: set.questions.map(() => ({ right: 0, wrong: 0 })), botCount: 0, colorN: 0,
  };
  room.api = {
    addFeed: text => addFeed(room, text),
    end: () => setImmediate(() => endGame(room)),
    notify: (p, payload) => { if (p.socketId) io.to(p.socketId).emit('player:hit', payload); },
  };
  rooms.set(room.pin, room);
  return room;
}

function nameTaken(room, name) {
  const n = name.toLowerCase();
  for (const p of room.players.values()) if (p.name.toLowerCase() === n) return true;
  return false;
}

function addPlayer(room, { name, avatar, socketId = null, bot = false, team = null, user = null }) {
  const id = 'p' + crypto.randomBytes(5).toString('hex');
  const p = {
    id, name, avatar: progress.canUseAvatar(user, avatar) ? avatar : pick(progress.BASIC), socketId, bot,
    userId: user ? user.id : null, level: user ? auth.levelFor(user.xp) : null,
    score: 0, gold: 0, correct: 0, answered: 0, streak: 0, bestStreak: 0,
    order: [], ptr: 0, current: null, pending: null, pendingKind: null, sentImgs: new Set(),
    missed: new Set(), team, out: false, wave: 0, lives: 0, hearts: 0, shield: 0, kos: 0,
    online: true, nextActAt: 0, color: room.colorN++ % extra.COLORS,
  };
  room.players.set(id, p);
  if (room.state === 'playing') initPlayerForGame(room, p);
  return p;
}

function addBot(room, team = null) {
  const used = new Set([...room.players.values()].map(p => p.name));
  let name = BOT_NAMES.find(n => !used.has(n));
  if (!name) name = 'Bot ' + (++room.botCount);
  return addPlayer(room, { name, bot: true, team });
}

function teamSize(room, team) {
  let n = 0;
  for (const p of room.players.values()) if (p.team === team) n++;
  return n;
}

function initPlayerForGame(room, p) {
  p.order = shuffle(room.set.questions.map((_, i) => i));
  p.ptr = 0;
  p.nextActAt = Date.now() + rand(2000, 5000);
  if (room.mode === 'td') p.lives = 20;
  if (room.mode === 'royale') { p.hearts = HEARTS; p.shield = 0; }
  if (isTeamMode(room.mode) && room.state === 'playing' && !p.team) {
    p.team = teamSize(room, 'ember') <= teamSize(room, 'tide') ? 'ember' : 'tide';
    if (room.teams) { room.teams[p.team].max += 150; room.teams[p.team].hp += 150; }
  }
  const x = X(room.mode);
  if (x && x.initPlayer) x.initPlayer(room, p);
}

function publicPlayer(p, room) {
  const x = room && room.state !== 'lobby' && X(room.mode);
  return {
    id: p.id, name: p.name, avatar: p.avatar, bot: p.bot, level: p.level, score: p.score, gold: p.gold,
    correct: p.correct, answered: p.answered, streak: p.streak, team: p.team, color: p.color,
    out: p.out, wave: p.wave, lives: p.lives, hearts: p.hearts, shield: p.shield, kos: p.kos, online: p.online,
    ...(x && x.display ? x.display(room, p) : {}),
  };
}

function standings(room) {
  const list = [...room.players.values()];
  if (room.mode === 'royale') {
    list.sort((a, b) => (a.out - b.out) || (b.hearts - a.hearts) || (b.kos - a.kos) || (b.correct - a.correct));
  } else if (room.mode === 'sudden') {
    list.sort((a, b) => (a.out - b.out) || (b.correct - a.correct));
  } else {
    const key = room.mode === 'gold' ? 'gold' : 'score';
    list.sort((a, b) => b[key] - a[key] || b.correct - a.correct);
  }
  return list.map(p => publicPlayer(p, room));
}

function lobbyUpdate(room) {
  io.to(chan(room)).emit('lobby:update', {
    mode: room.mode, settings: room.settings, setTitle: room.set.title, locked: !!room.locked, reactions: room.reactions !== false,
    players: [...room.players.values()].map(p => publicPlayer(p, room)),
  });
}

function broadcast(room) {
  io.to(chan(room)).emit('game:state', {
    mode: room.mode, state: room.state,
    timeLeft: Math.max(0, Math.round((room.endsAt - Date.now()) / 1000)),
    goal: room.settings.goal, teams: room.teams, players: standings(room), locked: !!room.locked, reactions: room.reactions !== false,
    ...(X(room.mode) && X(room.mode).state ? X(room.mode).state(room) : {}),
  });
}

function addFeed(room, text) {
  room.feed.push(text);
  if (room.feed.length > 30) room.feed.shift();
  io.to(chan(room)).emit('game:feed', text);
}

// ---------- game flow ----------

function startGame(room) {
  room.state = 'playing';
  room.startedAt = Date.now();
  room.endsAt = Date.now() + room.settings.duration * 1000;
  if (isTeamMode(room.mode)) {
    const unassigned = shuffle([...room.players.values()].filter(p => !p.team));
    for (const p of unassigned) p.team = teamSize(room, 'ember') <= teamSize(room, 'tide') ? 'ember' : 'tide';
  }
  if (X(room.mode) && X(room.mode).init) X(room.mode).init(room);
  if (room.mode === 'clash') {
    room.teams = {};
    for (const t of TEAMS) {
      const max = 400 + 150 * Math.max(1, teamSize(room, t));
      room.teams[t] = { hp: max, max };
    }
  }
  for (const p of room.players.values()) initPlayerForGame(room, p);
  room.timer = setInterval(() => tick(room), 1000);
  io.to(chan(room)).emit('game:start', { mode: room.mode, setTitle: room.set.title, goal: room.settings.goal });
  broadcast(room);
  store.countPlay(room.set.id).catch(() => {});
}

function tick(room) {
  if (room.state !== 'playing') return;
  if (Date.now() >= room.endsAt) return endGame(room);
  if (X(room.mode) && X(room.mode).tick) X(room.mode).tick(room);
  runBots(room);
  if (room.state === 'playing') broadcast(room);
}

function endGame(room) {
  if (room.state === 'ended') return;
  room.state = 'ended';
  clearInterval(room.timer);
  let winnerTeam = null;
  if (room.mode === 'clash' && room.teams) {
    const r = t => room.teams[t].hp / room.teams[t].max;
    winnerTeam = r('ember') === r('tide') ? null : (r('ember') > r('tide') ? 'ember' : 'tide');
  }
  const xEnd = X(room.mode) && X(room.mode).end ? X(room.mode).end(room) : {};
  if (room.homework) {
    const hp = [...room.players.values()].find(x => !x.bot);
    if (hp) {
      const total = room.set.questions.length;
      xEnd.banner = hp.answered >= total ? `Homework handed in: ${hp.correct} of ${total} right` : `Saved your progress: ${hp.answered} of ${total} answered`;
      homework.saveSubmission(room, hp).catch(err => console.error('homework save failed', err.message));
    }
  }
  if (xEnd.winnerTeam !== undefined) winnerTeam = xEnd.winnerTeam;
  const final = standings(room);
  const stats = room.set.questions.map((q, i) => ({ q: q.q || '(picture question)', ...room.qStats[i] }));
  io.to(chan(room)).emit('game:over', { mode: room.mode, standings: final, winnerTeam, teams: room.teams, stats, banner: xEnd.banner || null });

  const humans = final.filter(p => !p.bot).length;
  final.forEach((pub, idx) => {
    const p = room.players.get(pub.id);
    if (!p || p.bot || !p.socketId) return;
    const missed = [...p.missed].map(i => {
      const q = room.set.questions[i];
      return { q: q.q, img: q.img ? true : false, answer: rightTexts(q).join(' / ') };
    });
    const won = isTeamMode(room.mode) ? (!!winnerTeam && p.team === winnerTeam) : xEnd.allWon !== undefined ? xEnd.allWon : idx === 0;
    const review = { missed, correct: p.correct, answered: p.answered, bestStreak: p.bestStreak, rewards: null };
    if (!p.userId) return io.to(p.socketId).emit('game:review', review);
    grantRewards(p, { place: idx + 1, playerCount: room.solo ? final.length : Math.max(humans, final.length), solo: room.solo, won })
      .then(r => { review.rewards = r; })
      .catch(() => {})
      .finally(() => io.to(p.socketId).emit('game:review', review));
  });

  saveHistory(room, final, stats, winnerTeam).catch(err => console.error('history save failed', err.message));
  setTimeout(() => { if (rooms.get(room.pin) === room) rooms.delete(room.pin); }, 10 * 60 * 1000);
}

async function grantRewards(p, { place, playerCount, solo, won }) {
  const user = await dbm.db.get('users', p.userId);
  if (!user) return null;
  const r = progress.rewardsFor({ correct: p.correct, answered: p.answered, place, playerCount, solo, won });
  const before = auth.levelFor(user.xp);
  const applied = progress.applyRewards(user, { ...r, won });
  await auth.saveUser(user);
  return { ...applied, levelUp: auth.levelFor(user.xp) > before, user: auth.publicUser(user) };
}

async function saveHistory(room, final, stats, winnerTeam) {
  const owner = room.hostUserId || (room.solo ? [...room.players.values()].find(p => !p.bot)?.userId : null);
  if (!owner || !room.startedAt) return;
  await dbm.db.put('games', room.id, {
    id: room.id, setId: room.set.id, setTitle: room.set.title, mode: room.mode, solo: room.solo,
    date: room.startedAt, length: Math.round((Date.now() - room.startedAt) / 1000), winnerTeam,
    players: final.slice(0, 60).map(p => ({ name: p.name, avatar: p.avatar, bot: p.bot, score: p.score, gold: p.gold, correct: p.correct, answered: p.answered, team: p.team, wave: p.wave, kos: p.kos, out: p.out })),
    stats,
  }, owner);
}

function closeRoom(room, notify) {
  clearInterval(room.timer);
  room.state = 'ended';
  if (notify) io.to(chan(room)).emit('room:closed');
  rooms.delete(room.pin);
}

// ---------- questions & modes ----------

function nextQuestion(room, p) {
  if (p.pending || p.out) return null;
  const qs = room.set.questions;
  if (p.ptr >= p.order.length) {
    if (room.homework) return null;
    const last = p.order[p.order.length - 1];
    p.order = shuffle(qs.map((_, i) => i));
    if (p.order.length > 1 && p.order[0] === last) p.order.push(p.order.shift());
    p.ptr = 0;
  }
  const idx = p.order[p.ptr++];
  const q = qs[idx];
  const out = { idx, type: q.type, q: q.q, hasImg: !!q.img };
  if (q.img && !p.sentImgs.has(idx)) { out.img = q.img; p.sentImgs.add(idx); }
  if (q.type === 'type') {
    p.current = { idx, map: null };
  } else {
    const map = q.type === 'tf' ? [0, 1] : shuffle(q.a.map((_, i) => i));
    p.current = { idx, map };
    out.answers = map.map(i => q.a[i]);
  }
  const x = X(room.mode);
  if (x && x.sent) x.sent(room, p);
  return out;
}

function answer(room, p, payload) {
  if (!p.current || p.pending) return { error: 'No question to answer.' };
  const { idx, map } = p.current;
  p.current = null;
  const q = room.set.questions[idx];
  const correct = q.type === 'type'
    ? typedMatches(payload.text, q.accept)
    : q.c.includes(map[Number(payload.choice)]);
  p.answered++;
  room.qStats[idx][correct ? 'right' : 'wrong']++;
  if (room.homework) {
    p.firstTry = p.firstTry || {};
    if (p.firstTry[idx] === undefined) p.firstTry[idx] = correct ? 1 : 0;
    if (p.answered >= room.set.questions.length) setImmediate(() => endGame(room));
  }
  if (correct) {
    p.correct++;
    p.streak++;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    if (p.streak === 5 || p.streak === 10) addFeed(room, `${p.name} is on a ${p.streak}-answer streak`);
  } else {
    p.streak = 0;
    p.missed.add(idx);
  }
  const texts = rightTexts(q);
  const res = { correct, correctText: texts[0], correctTexts: texts, streak: p.streak };

  if (!correct) {
    const xw = X(room.mode);
    if (xw && xw.wrong) xw.wrong(room, p, res, room.api);
    if (room.mode === 'royale') {
      loseHeart(room, p, null);
      res.hearts = p.hearts;
      res.shield = p.shield;
      res.out = p.out;
    }
    return res;
  }

  if (room.mode === 'classic') {
    const pts = 100 + Math.min(p.streak - 1, 5) * 20;
    p.score += pts;
    res.points = pts;
    if (room.settings.goal && p.correct >= room.settings.goal) {
      addFeed(room, `${p.name} reached ${room.settings.goal} correct answers`);
      setImmediate(() => endGame(room));
    }
  } else if (room.mode === 'gold') {
    p.pending = 'chest';
    res.pending = 'chest';
  } else if (room.mode === 'clash') {
    p.pending = 'clash';
    res.pending = 'clash';
    res.power = clashPower(p);
  } else if (room.mode === 'td') {
    res.reward = 40 + Math.min(p.streak, 5) * 10;
  } else if (room.mode === 'royale') {
    p.score += 10;
    if (p.streak % 3 === 0 && p.shield < 1) { p.shield = 1; res.gotShield = true; }
    const targets = royaleTargets(room, p);
    if (targets.length) {
      p.pending = 'royale';
      res.pending = 'royale';
      res.targets = targets;
    }
    res.hearts = p.hearts;
    res.shield = p.shield;
  } else if (X(room.mode)) {
    X(room.mode).correct(room, p, res, room.api);
  }
  return res;
}

function chooseOption(room, p, id) {
  const x = X(room.mode);
  if (!x || p.pending !== 'choice') return { error: 'Nothing to choose.' };
  const r = x.choose(room, p, String(id), room.api);
  if (r.error) return { ...r, choice: x.refresh ? x.refresh(room, p) : null };
  p.pending = null;
  return r;
}

function otherPlayers(room, p) {
  return [...room.players.values()].filter(o => o !== p);
}

function openChest(room, p) {
  if (p.pending !== 'chest') return { error: 'No chest to open.' };
  p.pending = null;
  let kind = weighted([['gain', 30], ['big', 18], ['double', 9], ['triple', 3], ['lose', 8], ['nothing', 8], ['steal', 16], ['swap', 4]]);
  const others = otherPlayers(room, p);
  if (kind === 'steal' && !others.some(o => o.gold > 0)) kind = 'gain';
  if (kind === 'swap' && !others.some(o => o.gold > p.gold)) kind = 'gain';
  if ((kind === 'double' || kind === 'triple' || kind === 'lose') && p.gold === 0) kind = 'gain';

  let amount = 0, text = '';
  switch (kind) {
    case 'gain': amount = randInt(10, 40) + Math.round(p.gold * 0.05); p.gold += amount; text = `+${amount} gold`; break;
    case 'big': amount = randInt(50, 120) + Math.round(p.gold * 0.1); p.gold += amount; text = `+${amount} gold`; break;
    case 'double': amount = p.gold; p.gold *= 2; text = 'Double gold'; break;
    case 'triple': amount = p.gold * 2; p.gold *= 3; text = 'Triple gold'; addFeed(room, `${p.name} tripled their gold`); break;
    case 'lose': amount = Math.round(p.gold * 0.25); p.gold -= amount; text = `Lost ${amount} gold`; break;
    case 'nothing': text = 'Empty chest'; break;
    case 'steal':
    case 'swap': {
      p.pending = 'target';
      p.pendingKind = kind;
      const targets = others
        .filter(o => kind === 'steal' ? o.gold > 0 : true)
        .map(o => ({ id: o.id, name: o.name, avatar: o.avatar, gold: o.gold }));
      return { kind, text: kind === 'steal' ? 'Steal gold' : 'Swap gold', needsTarget: true, targets };
    }
  }
  return { kind, text, amount, gold: p.gold };
}

function chooseTarget(room, p, targetId) {
  if (p.pending !== 'target') return { error: 'Nothing to target.' };
  const t = room.players.get(targetId);
  if (!t || t === p) return { error: 'Pick another player.' };
  const kind = p.pendingKind;
  p.pending = null;
  p.pendingKind = null;
  let text;
  if (kind === 'steal') {
    const amount = Math.max(1, Math.round(t.gold * rand(0.1, 0.25)));
    t.gold = Math.max(0, t.gold - amount);
    p.gold += amount;
    text = `You stole ${amount} gold from ${t.name}`;
    addFeed(room, `${p.name} stole ${amount} gold from ${t.name}`);
    if (t.socketId) io.to(t.socketId).emit('player:hit', { text: `${p.name} stole ${amount} of your gold` });
  } else {
    [p.gold, t.gold] = [t.gold, p.gold];
    text = `You swapped gold with ${t.name}`;
    addFeed(room, `${p.name} swapped gold with ${t.name}`);
    if (t.socketId) io.to(t.socketId).emit('player:hit', { text: `${p.name} swapped gold with you` });
  }
  return { text, gold: p.gold };
}

function clashPower(p) {
  return 25 + Math.min(p.streak, 6) * 8;
}

function clashAction(room, p, action) {
  if (p.pending !== 'clash') return { error: 'No action ready.' };
  p.pending = null;
  const own = p.team;
  const enemy = own === 'ember' ? 'tide' : 'ember';
  const crit = Math.random() < 0.1;
  const power = clashPower(p) * (crit ? 2 : 1);
  if (action === 'repair') {
    const before = room.teams[own].hp;
    room.teams[own].hp = Math.min(room.teams[own].max, before + Math.round(power * 0.6));
    const healed = room.teams[own].hp - before;
    p.score += healed;
    return { action, amount: healed, crit };
  }
  room.teams[enemy].hp = Math.max(0, room.teams[enemy].hp - power);
  p.score += power;
  if (crit) addFeed(room, `${p.name} landed a critical hit for ${power}`);
  if (room.teams[enemy].hp === 0) {
    addFeed(room, `The ${enemy === 'ember' ? 'Ember' : 'Tide'} core went down`);
    setImmediate(() => endGame(room));
  }
  return { action: 'attack', amount: power, crit };
}

// ---------- knockout (royale) ----------

function royaleTargets(room, p) {
  return otherPlayers(room, p).filter(o => !o.out)
    .map(o => ({ id: o.id, name: o.name, avatar: o.avatar, hearts: o.hearts, shield: o.shield }));
}

function loseHeart(room, p, attacker) {
  if (p.out) return 'out';
  if (p.shield > 0) { p.shield = 0; return 'shield'; }
  p.hearts = Math.max(0, p.hearts - 1);
  if (p.hearts === 0) {
    p.out = true;
    p.pending = null;
    if (attacker) attacker.kos++;
    addFeed(room, attacker ? `${attacker.name} knocked out ${p.name}` : `${p.name} is out`);
    checkRoyaleEnd(room);
    return 'ko';
  }
  return 'hit';
}

function checkRoyaleEnd(room) {
  const all = [...room.players.values()];
  const alive = all.filter(x => !x.out);
  const humans = all.filter(x => !x.bot);
  if (alive.length <= 1 || (humans.length && humans.every(x => x.out))) setImmediate(() => endGame(room));
}

function royaleAttack(room, p, targetId) {
  if (p.pending !== 'royale') return { error: 'No attack ready.' };
  p.pending = null;
  const t = room.players.get(targetId);
  if (!t || t === p || t.out) return { error: 'That player can’t be targeted.' };
  const result = loseHeart(room, t, p);
  if (result === 'ko') p.score += 100;
  const text = result === 'shield' ? `${t.name}'s shield blocked it` : result === 'ko' ? `You knocked out ${t.name}` : `${t.name} lost a heart`;
  if (t.socketId) {
    const msg = result === 'shield' ? `${p.name} broke your shield` : result === 'ko' ? `${p.name} knocked you out` : `${p.name} took one of your hearts`;
    io.to(t.socketId).emit('player:hit', { text: msg, hearts: t.hearts, shield: t.shield, out: t.out });
  }
  return { text, result };
}

function tdReport(room, p, data = {}) {
  const score = clamp(Math.round(Number(data.score) || 0), 0, 1e7);
  p.score = Math.max(p.score, score);
  p.wave = clamp(Math.round(Number(data.wave) || 0), 0, 9999);
  p.lives = clamp(Math.round(Number(data.lives) || 0), 0, 20);
  if (p.lives <= 0 && !p.out) {
    p.out = true;
    addFeed(room, `${p.name}'s base fell on wave ${p.wave}`);
    const humans = [...room.players.values()].filter(x => !x.bot);
    if (humans.length && humans.every(x => x.out)) setImmediate(() => endGame(room));
  }
}

// ---------- bots ----------

function runBots(room) {
  const now = Date.now();
  for (const b of room.players.values()) {
    if (!b.bot || b.out || now < b.nextActAt) continue;
    b.nextActAt = now + rand(2500, 6500);
    const q = nextQuestion(room, b);
    if (!q) continue;
    const real = room.set.questions[b.current.idx];
    const smart = Math.random() < 0.72;
    let payload;
    if (real.type === 'type') payload = { text: smart ? real.accept[0] : 'idk' };
    else {
      const rightIdx = b.current.map.map((orig, i) => (real.c.includes(orig) ? i : -1)).filter(i => i >= 0);
      const wrongIdx = b.current.map.map((orig, i) => (real.c.includes(orig) ? -1 : i)).filter(i => i >= 0);
      payload = { choice: smart || !wrongIdx.length ? pick(rightIdx) : pick(wrongIdx) };
    }
    const res = answer(room, b, payload);
    if (room.state !== 'playing') return;
    if (res.pending === 'chest') {
      const r = openChest(room, b);
      if (r.needsTarget && r.targets.length) chooseTarget(room, b, pick(r.targets).id);
      else if (r.needsTarget) { b.pending = null; b.pendingKind = null; }
    } else if (res.pending === 'clash') {
      clashAction(room, b, Math.random() < 0.8 ? 'attack' : 'repair');
    } else if (res.pending === 'royale') {
      royaleAttack(room, b, pick(res.targets).id);
    } else if (res.pending === 'choice') {
      const id = X(room.mode).bot(room, b);
      if (id === null || id === undefined) b.pending = null;
      else if (chooseOption(room, b, id).error) b.pending = null;
    }
    if (room.state !== 'playing') return;
  }
}

// ---------- sockets ----------

function attach(ioServer, setStore) {
  io = ioServer;
  store = setStore;

  io.use(async (socket, next) => {
    try { socket.data.user = await auth.userFromToken(socket.handshake.auth && socket.handshake.auth.token); }
    catch { socket.data.user = null; }
    next();
  });

  io.on('connection', socket => {
    const ctx = () => {
      const room = rooms.get(socket.data.pin);
      if (!room) return {};
      return { room, p: room.players.get(socket.data.playerId), isHost: room.hostSocketId === socket.id };
    };
    const reply = (cb, data) => { if (typeof cb === 'function') cb(data); };
    const playing = (room, p) => room && p && room.state === 'playing';

    socket.on('host:create', async (opts = {}, cb) => {
      const user = socket.data.user;
      const set = await store.get(opts.setId).catch(() => null);
      if (!set || !store.canRead(set, user) || !set.questions.length) return reply(cb, { error: 'Pick a question set first.' });
      const mode = MODES.includes(opts.mode) ? opts.mode : 'classic';
      const room = createRoom({ set, mode, settings: opts.settings, hostSocketId: socket.id, hostUser: user, solo: opts.solo });
      socket.join(chan(room));
      socket.data.pin = room.pin;
      if (!opts.solo) {
        socket.data.role = 'host';
        return reply(cb, { pin: room.pin, mode, setTitle: set.title });
      }
      const name = cleanName(opts.name) || (user ? user.username : 'You');
      if (isBadName(name)) return reply(cb, { error: 'Please pick a different name.' });
      const me = addPlayer(room, { name, avatar: opts.avatar, socketId: socket.id, team: isTeamMode(mode) ? 'ember' : null, user });
      socket.data.role = 'solo';
      socket.data.playerId = me.id;
      if (isTeamMode(mode)) { addBot(room, 'ember'); addBot(room, 'tide'); addBot(room, 'tide'); }
      else if (mode !== 'td') { addBot(room); addBot(room); addBot(room); }
      reply(cb, { pin: room.pin, mode, setTitle: set.title, playerId: me.id });
      startGame(room);
    });

    socket.on('host:settings', (opts = {}, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost || room.state !== 'lobby') return reply(cb, { error: 'Settings are locked.' });
      if (MODES.includes(opts.mode)) room.mode = opts.mode;
      room.settings = cleanSettings(opts.settings, room.mode);
      if (room.mode === 'td') for (const [id, p] of room.players) if (p.bot) room.players.delete(id);
      lobbyUpdate(room);
      reply(cb, { ok: true });
    });

    socket.on('host:lock', ({ locked } = {}, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost || room.solo) return reply(cb, { error: 'Only the host can lock the game.' });
      room.locked = !!locked;
      room.state === 'lobby' ? lobbyUpdate(room) : broadcast(room);
      reply(cb, { locked: room.locked });
    });

    socket.on('host:reactions', ({ on } = {}, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost) return reply(cb, { error: 'Only the host can change this.' });
      room.reactions = !!on;
      room.state === 'lobby' ? lobbyUpdate(room) : broadcast(room);
      reply(cb, { reactions: room.reactions });
    });

    socket.on('reaction', ({ emoji } = {}) => {
      const { room, p } = ctx();
      if (!room || !p || room.reactions === false || !EMOTES.includes(emoji)) return;
      const now = Date.now();
      if (now - (p.lastReact || 0) < 1200) return; // one reaction every 1.2 s per player
      p.lastReact = now;
      io.to(chan(room)).emit('reaction', { emoji, name: p.name, avatar: p.avatar, id: p.id });
    });

    socket.on('homework:start', async ({ code, name, avatar } = {}, cb) => {
      const user = socket.data.user;
      const hw = await homework.getByCode(code).catch(() => null);
      if (!hw) return reply(cb, { error: 'No homework with that code. Check it with your teacher.' });
      const set = await store.get(hw.setId).catch(() => null);
      if (!set || !set.questions.length) return reply(cb, { error: 'This homework’s question set was deleted. Tell your teacher.' });
      const clean = cleanName(name) || (user ? user.username : '');
      if (!clean) return reply(cb, { error: 'Enter your name so your teacher knows it’s you.' });
      if (isBadName(clean)) return reply(cb, { error: 'Please use your real name.' });
      const room = createRoom({ set, mode: hw.mode, settings: { duration: 30 }, hostSocketId: socket.id, hostUser: null, solo: true });
      room.homework = hw;
      room.api.end = () => {}; // homework only ends when every question is answered or the student hands in
      socket.join(chan(room));
      const me = addPlayer(room, { name: clean, avatar, socketId: socket.id, user });
      Object.assign(socket.data, { pin: room.pin, role: 'solo', playerId: me.id });
      reply(cb, { pin: room.pin, mode: hw.mode, playerId: me.id, info: homework.publicInfo(hw) });
      startGame(room);
    });

    socket.on('host:addBot', (_, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost || room.state === 'ended') return reply(cb, { error: 'Cannot add a bot now.' });
      if (room.mode === 'td') return reply(cb, { error: 'Tower Defense is played solo-style, so bots sit this one out.' });
      if (room.players.size >= 60) return reply(cb, { error: 'This room is full.' });
      addBot(room);
      room.state === 'lobby' ? lobbyUpdate(room) : broadcast(room);
      reply(cb, { ok: true });
    });

    socket.on('host:kick', ({ playerId } = {}, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost) return reply(cb, { error: 'Only the host can remove players.' });
      const p = room.players.get(playerId);
      if (!p) return reply(cb, { error: 'Player not found.' });
      room.players.delete(playerId);
      if (p.socketId) {
        io.to(p.socketId).emit('player:kicked');
        const s = io.sockets.sockets.get(p.socketId);
        if (s) { s.leave(chan(room)); s.data.pin = null; }
      }
      if (room.mode === 'royale' && room.state === 'playing') checkRoyaleEnd(room);
      if (room.grid) { room.grid = room.grid.map(o => (o === playerId ? null : o)); for (const x of room.players.values()) x.score = room.grid.filter(o => o === x.id).length; }
      room.state === 'lobby' ? lobbyUpdate(room) : broadcast(room);
      reply(cb, { ok: true });
    });

    socket.on('host:start', (_, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost || room.state !== 'lobby') return reply(cb, { error: 'The game already started.' });
      if (room.players.size === 0) return reply(cb, { error: 'Wait for at least one player to join.' });
      if (room.mode === 'royale' && room.players.size < 2) return reply(cb, { error: 'Knockout needs at least 2 players. Add a bot or wait for more.' });
      startGame(room);
      reply(cb, { ok: true });
    });

    socket.on('host:end', (_, cb) => {
      const { room, isHost } = ctx();
      if (!room || !isHost) return reply(cb, { error: 'Only the host can end the game.' });
      if (room.state === 'playing') endGame(room);
      else if (room.state === 'lobby') closeRoom(room, true);
      reply(cb, { ok: true });
    });

    socket.on('player:join', ({ pin, name, avatar } = {}, cb) => {
      const room = rooms.get(String(pin || '').trim());
      if (!room || room.solo || room.state === 'ended') return reply(cb, { error: 'No game with that PIN. Check the number on the host screen.' });
      const user = socket.data.user;
      const clean = cleanName(name) || (user ? user.username : '');
      if (!clean) return reply(cb, { error: 'Enter a name.' });
      if (isBadName(clean)) return reply(cb, { error: 'Please pick a different name.' });
      if (room.locked) return reply(cb, { error: 'The host locked this game, so no one new can join.' });
      if (nameTaken(room, clean)) return reply(cb, { error: 'Someone already has that name. Try another.' });
      if (room.players.size >= 60) return reply(cb, { error: 'This game is full.' });
      const p = addPlayer(room, { name: clean, avatar, socketId: socket.id, user });
      socket.join(chan(room));
      Object.assign(socket.data, { pin: room.pin, role: 'player', playerId: p.id });
      reply(cb, { ok: true, playerId: p.id, mode: room.mode, state: room.state, setTitle: room.set.title, goal: room.settings.goal, avatar: p.avatar });
      if (room.state === 'lobby') lobbyUpdate(room);
      else { addFeed(room, `${p.name} joined`); broadcast(room); }
    });

    socket.on('player:next', (_, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p)) return reply(cb, { error: 'The game is not running.' });
      reply(cb, nextQuestion(room, p) || { wait: true, out: p.out });
    });

    socket.on('player:answer', (payload = {}, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p)) return reply(cb, { error: 'The game is not running.' });
      reply(cb, answer(room, p, payload));
    });

    socket.on('gold:chest', (_, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p) || room.mode !== 'gold') return reply(cb, { error: 'Not available.' });
      reply(cb, openChest(room, p));
    });

    socket.on('gold:target', ({ targetId } = {}, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p)) return reply(cb, { error: 'Not available.' });
      reply(cb, chooseTarget(room, p, targetId));
    });

    socket.on('clash:action', ({ action } = {}, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p) || room.mode !== 'clash') return reply(cb, { error: 'Not available.' });
      reply(cb, clashAction(room, p, action === 'repair' ? 'repair' : 'attack'));
    });

    socket.on('royale:attack', ({ targetId } = {}, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p) || room.mode !== 'royale') return reply(cb, { error: 'Not available.' });
      reply(cb, royaleAttack(room, p, targetId));
    });

    socket.on('mode:choose', ({ id } = {}, cb) => {
      const { room, p } = ctx();
      if (!playing(room, p)) return reply(cb, { error: 'The game is not running.' });
      reply(cb, chooseOption(room, p, id));
    });

    socket.on('td:report', data => {
      const { room, p } = ctx();
      if (playing(room, p) && room.mode === 'td') tdReport(room, p, data);
    });

    socket.on('disconnect', () => {
      const { room, p, isHost } = ctx();
      if (!room) return;
      if (isHost) {
        if (room.homework && room.state === 'playing') {
          const hp = [...room.players.values()].find(x => !x.bot);
          if (hp && hp.answered > 0) homework.saveSubmission(room, hp).catch(() => {});
        }
        if (room.solo) closeRoom(room, false);
        else if (room.state !== 'ended') closeRoom(room, true);
        return;
      }
      if (!p) return;
      if (room.state === 'lobby') { room.players.delete(p.id); lobbyUpdate(room); }
      else p.online = false;
    });
  });
}

module.exports = { attach };