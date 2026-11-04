// QuizForge extra modes. games.js calls these hooks for any mode listed in MODES here.
// Hooks: init, initPlayer, correct, wrong, choose, tick, display, bot, end, state.

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.floor(n).toLocaleString('en-US');

function weighted(table) {
  let r = Math.random() * table.reduce((s, x) => s + x.w, 0);
  for (const x of table) { if ((r -= x.w) < 0) return x; }
  return table[0];
}

const players = room => [...room.players.values()];
const humans = room => players(room).filter(p => !p.bot);

// ---------- Space Race ----------
const TRACK = 20;
const race = {
  initPlayer(room, p) { p.pos = 0; },
  correct(room, p, res, api) {
    const steps = 1 + (p.streak >= 3 ? 1 : 0) + (p.streak >= 6 ? 1 : 0);
    p.pos = Math.min(TRACK, p.pos + steps);
    p.score = p.pos;
    res.event = { text: `Boost +${steps}. You're at ${p.pos}/${TRACK}`, tone: 'good' };
    if (p.pos >= TRACK) { api.addFeed(`${p.name} crossed the finish line`); api.end(); }
    else if (p.pos >= TRACK - 3 && p.pos - steps < TRACK - 3) api.addFeed(`${p.name} is closing in on the finish`);
  },
  display: (room, p) => ({ display: `${p.pos}/${TRACK}`, progress: p.pos / TRACK }),
};

// ---------- Summit ----------
const SUMMIT = 1000;
const climb = {
  initPlayer(room, p) { p.height = 0; },
  correct(room, p, res, api) {
    const up = Math.min(100, 40 + p.streak * 10);
    p.height = Math.min(SUMMIT, p.height + up);
    p.score = p.height;
    res.event = { text: `Climbed ${up} m`, tone: 'good' };
    if (p.height >= SUMMIT) { api.addFeed(`${p.name} reached the summit`); api.end(); }
  },
  wrong(room, p, res) {
    const down = Math.min(p.height, 30);
    p.height -= down;
    p.score = p.height;
    if (down) res.event = { text: `You slipped ${down} m`, tone: 'bad' };
  },
  display: (room, p) => ({ display: `${p.height} m`, progress: p.height / SUMMIT }),
};

// ---------- Boss Battle (co-op) ----------
const BOSSES = [
  { name: 'Molten Wyrm', icon: '🐲' }, { name: 'Glitch King', icon: '👾' },
  { name: 'Kraken Prime', icon: '🦑' }, { name: 'Iron Golem', icon: '🗿' }, { name: 'Void Comet', icon: '☄️' },
];
const boss = {
  init(room) {
    const b = pick(BOSSES);
    const max = 300 + 260 * Math.max(1, room.players.size);
    room.boss = { ...b, hp: max, max };
    for (const p of room.players.values()) p._bossCounted = true;
  },
  initPlayer(room, p) {
    if (room.boss && room.state === 'playing' && !p._bossCounted) { room.boss.max += 260; room.boss.hp += 260; }
    p._bossCounted = true;
  },
  correct(room, p, res, api) {
    const crit = Math.random() < 0.12;
    const dmg = (15 + Math.min(p.streak, 8) * 5) * (crit ? 2 : 1);
    room.boss.hp = Math.max(0, room.boss.hp - dmg);
    p.score += dmg;
    res.event = { text: `${crit ? 'Critical! ' : ''}${dmg} damage`, tone: 'good' };
    if (crit) api.addFeed(`${p.name} landed a critical hit for ${dmg}`);
    if (room.boss.hp === 0) { room.bossDefeated = true; api.addFeed(`The ${room.boss.name} was defeated`); api.end(); }
  },
  wrong(room, p, res) {
    const heal = Math.min(room.boss.max - room.boss.hp, 10);
    room.boss.hp += heal;
    res.event = { text: heal ? `The ${room.boss.name} healed ${heal}` : `The ${room.boss.name} shrugged it off`, tone: 'bad' };
  },
  display: (room, p) => ({ display: `${fmt(p.score)} dmg` }),
  state: room => ({ boss: room.boss }),
  end: room => ({ banner: room.bossDefeated ? `You beat the ${room.boss.name}!` : `The ${room.boss.name} survived`, allWon: !!room.bossDefeated }),
};

// ---------- Deep Dive (fishing) ----------
const FISH = [
  { name: 'Minnow', icon: '🐟', min: 0.1, max: 0.5, w: 30, rarity: 'common' },
  { name: 'Sardine', icon: '🐟', min: 0.3, max: 1, w: 24, rarity: 'common' },
  { name: 'Trout', icon: '🐠', min: 1, max: 4, w: 18, rarity: 'common' },
  { name: 'Pufferfish', icon: '🐡', min: 1, max: 3, w: 12, rarity: 'uncommon' },
  { name: 'Salmon', icon: '🐠', min: 3, max: 9, w: 11, rarity: 'uncommon' },
  { name: 'Octopus', icon: '🐙', min: 4, max: 12, w: 8, rarity: 'rare' },
  { name: 'Tuna', icon: '🐟', min: 10, max: 35, w: 6, rarity: 'rare' },
  { name: 'Swordfish', icon: '🗡️', min: 25, max: 60, w: 4, rarity: 'epic' },
  { name: 'Shark', icon: '🦈', min: 40, max: 120, w: 3, rarity: 'epic' },
  { name: 'Golden Koi', icon: '✨', min: 50, max: 90, w: 1.2, rarity: 'legendary' },
  { name: 'Coelacanth', icon: '🦴', min: 60, max: 140, w: 0.8, rarity: 'legendary' },
];
const fishing = {
  initPlayer(room, p) { p.weight = 0; p.fishCount = 0; },
  correct(room, p, res, api) {
    // streaks bait better fish
    const lure = Math.min(p.streak, 8);
    const table = FISH.map((f, i) => ({ ...f, w: f.w * (1 + (i / FISH.length) * lure * 0.6) }));
    const f = weighted(table);
    const kg = Math.round(rand(f.min, f.max) * 10) / 10;
    p.weight = Math.round((p.weight + kg) * 10) / 10;
    p.fishCount++;
    p.score = Math.round(p.weight * 10);
    res.event = { text: `${f.icon} ${f.name}, ${kg} kg`, tone: f.rarity === 'legendary' || f.rarity === 'epic' ? 'gold' : 'good' };
    if (f.rarity === 'legendary' || f.rarity === 'epic') api.addFeed(`${p.name} caught a ${f.name} (${kg} kg)`);
  },
  wrong(room, p, res) { res.event = { text: 'The fish got away', tone: 'bad' }; },
  display: (room, p) => ({ display: `${p.weight.toFixed(1)} kg · ${p.fishCount} fish` }),
};

// ---------- Forge Factory (idle economy) ----------
const MACHINES = [
  { id: 'conveyor', name: 'Conveyor', icon: '🛤️', base: 40, rate: 2 },
  { id: 'arm', name: 'Robot Arm', icon: '🦾', base: 180, rate: 7 },
  { id: 'smelter', name: 'Smelter', icon: '🔥', base: 700, rate: 25 },
  { id: 'reactor', name: 'Reactor', icon: '⚛️', base: 2800, rate: 90 },
];
const machineCost = (p, m) => Math.round(m.base * Math.pow(1.45, p.machines[m.id] || 0));
const factory = {
  initPlayer(room, p) { p.cash = 0; p.rate = 0; p.machines = {}; },
  correct(room, p, res) {
    const earn = 25 + Math.min(p.streak, 6) * 10 + Math.round(p.rate * 2);
    p.cash += earn;
    p.score = Math.floor(p.cash);
    p.pending = 'choice';
    res.pending = 'choice';
    res.choice = factory.options(p, `+$${fmt(earn)}. Buy a machine?`);
  },
  options(p, title) {
    return {
      kind: 'list', title,
      options: [
        ...MACHINES.map(m => ({
          id: m.id, label: `${m.icon} ${m.name}`,
          sub: `$${fmt(machineCost(p, m))} · +$${m.rate}/s · own ${p.machines[m.id] || 0}`,
          disabled: p.cash < machineCost(p, m),
        })),
        { id: 'skip', label: 'Save my cash', sub: '' },
      ],
    };
  },
  choose(room, p, id) {
    if (id === 'skip') return { text: 'Saved for later' };
    const m = MACHINES.find(x => x.id === id);
    if (!m) return { error: 'Unknown machine.' };
    const cost = machineCost(p, m);
    if (p.cash < cost) return { error: 'Not enough cash.' };
    p.cash -= cost;
    p.machines[m.id] = (p.machines[m.id] || 0) + 1;
    p.rate += m.rate;
    p.score = Math.floor(p.cash);
    return { text: `Built a ${m.name}. Now $${p.rate}/s` };
  },
  refresh: (room, p) => factory.options(p, 'Buy a machine?'),
  tick(room) {
    for (const p of players(room)) { p.cash += p.rate; p.score = Math.floor(p.cash); }
  },
  bot(room, p) {
    const affordable = MACHINES.filter(m => p.cash >= machineCost(p, m));
    return affordable.length ? affordable[affordable.length - 1].id : 'skip';
  },
  display: (room, p) => ({ display: `$${fmt(p.cash)} · $${p.rate}/s` }),
};

// ---------- Dig Site ----------
function newBoard() {
  const tiles = [];
  for (let i = 0; i < 9; i++) tiles.push({ type: 'gold', amount: randInt(10, 60) });
  tiles.push({ type: 'gem', amount: 150 }, { type: 'gem', amount: 150 });
  tiles.push({ type: 'bomb' }, { type: 'bomb' });
  tiles.push({ type: 'double' });
  tiles.push({ type: 'fossil', amount: 90 }, { type: 'empty' });
  for (let i = tiles.length - 1; i > 0; i--) { const j = randInt(0, i); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
  return tiles.map(t => ({ ...t, open: false }));
}
const TILE_ICON = { gold: '🪙', gem: '💎', bomb: '💣', double: '✖️2', fossil: '🦴', empty: '·' };
const dig = {
  initPlayer(room, p) { p.board = newBoard(); },
  correct(room, p, res) {
    if (p.board.every(t => t.open)) p.board = newBoard();
    p.pending = 'choice';
    res.pending = 'choice';
    res.choice = dig.options(p);
  },
  options(p) {
    return {
      kind: 'grid', cols: 4, title: 'Pick a spot to dig',
      options: p.board.map((t, i) => ({ id: String(i), label: t.open ? TILE_ICON[t.type] : '', disabled: t.open, cls: t.open ? 'dug' : 'dirt' })),
    };
  },
  choose(room, p, id, api) {
    const t = p.board[Number(id)];
    if (!t || t.open) return { error: 'Pick a spot you haven’t dug yet.' };
    t.open = true;
    let text = '';
    if (t.type === 'gold' || t.type === 'gem' || t.type === 'fossil') {
      p.score += t.amount;
      text = `${TILE_ICON[t.type]} +${t.amount} gold`;
      if (t.type === 'gem') api.addFeed(`${p.name} dug up a gem`);
    } else if (t.type === 'bomb') {
      const lost = Math.round(p.score * 0.2);
      p.score -= lost;
      text = `💣 Boom! Lost ${lost} gold`;
    } else if (t.type === 'double') {
      text = `✖️2 Doubled to ${p.score * 2} gold`;
      p.score *= 2;
    } else text = 'Just dirt';
    if (p.board.every(x => x.open)) p.board = newBoard();
    return { text };
  },
  refresh: (room, p) => dig.options(p),
  bot(room, p) {
    const closed = p.board.map((t, i) => (t.open ? -1 : i)).filter(i => i >= 0);
    return String(pick(closed));
  },
  display: (room, p) => ({ display: `${fmt(p.score)} gold` }),
};

// ---------- Color Wars (territory) ----------
const GRID = 8;
const territory = {
  init(room) { room.grid = new Array(GRID * GRID).fill(null); },
  correct(room, p, res) {
    p.pending = 'choice';
    res.pending = 'choice';
    res.choice = territory.options(room, p);
  },
  options(room, p) {
    const power = p.streak >= 3;
    return {
      kind: 'grid', cols: GRID,
      title: power ? 'Power claim! Take any tile, even someone else’s' : 'Claim an empty tile (3 in a row lets you steal)',
      options: room.grid.map((owner, i) => {
        const o = owner && room.players.get(owner);
        return {
          id: String(i), label: '', color: o ? o.color : null,
          disabled: owner === p.id || (!!owner && !power),
          cls: owner === p.id ? 'mine' : '',
        };
      }),
    };
  },
  choose(room, p, id, api) {
    const i = Number(id);
    if (!(i >= 0 && i < room.grid.length)) return { error: 'Pick a tile.' };
    const owner = room.grid[i];
    if (owner === p.id) return { error: 'That tile is already yours.' };
    if (owner && p.streak < 3) return { error: 'You need 3 in a row to steal a tile.' };
    room.grid[i] = p.id;
    recount(room);
    if (owner) {
      const o = room.players.get(owner);
      if (o) api.notify(o, { text: `${p.name} stole one of your tiles` });
      return { text: `Stole a tile from ${o ? o.name : 'someone'}` };
    }
    return { text: 'Tile claimed' };
  },
  refresh: (room, p) => territory.options(room, p),
  bot(room, p) {
    const free = room.grid.map((o, i) => (o ? -1 : i)).filter(i => i >= 0);
    if (free.length && (p.streak < 3 || Math.random() < 0.5)) return String(pick(free));
    const others = room.grid.map((o, i) => (o && o !== p.id ? i : -1)).filter(i => i >= 0);
    return others.length ? String(pick(others)) : (free.length ? String(pick(free)) : null);
  },
  display: (room, p) => ({ display: `${p.score} tiles` }),
  state: room => ({ grid: room.grid.map(o => { const pl = o && room.players.get(o); return pl ? pl.color : -1; }), gridCols: GRID }),
};
function recount(room) {
  for (const p of players(room)) p.score = 0;
  for (const o of room.grid) { const p = o && room.players.get(o); if (p) p.score++; }
}

// ---------- Blitz (speed) ----------
const BLITZ_WINDOW = 20000;
const blitz = {
  sent(room, p) { p.sentAt = Date.now(); },
  correct(room, p, res) {
    const elapsed = Date.now() - (p.sentAt || Date.now());
    const speed = Math.max(0.1, 1 - elapsed / BLITZ_WINDOW);
    const pts = Math.round(1000 * speed * (1 + Math.min(p.streak - 1, 5) * 0.1));
    p.score += pts;
    res.event = { text: `+${pts} (${(elapsed / 1000).toFixed(1)} s)`, tone: 'good' };
  },
  display: (room, p) => ({ display: fmt(p.score) }),
};

// ---------- Sudden Death ----------
const sudden = {
  correct(room, p) { p.score = p.correct; },
  wrong(room, p, res, api) {
    p.out = true;
    res.out = true;
    api.addFeed(`${p.name} is out with ${p.correct} correct`);
    const alive = players(room).filter(x => !x.out);
    const h = humans(room);
    if ((room.players.size > 1 && alive.length <= 1) || (h.length && h.every(x => x.out))) api.end();
  },
  display: (room, p) => ({ display: p.out ? `out · ${p.correct}` : `${p.correct} correct` }),
  sortOut: true,
};

// ---------- Lucky Spin ----------
const WEDGES = [
  { label: '+100', w: 18, fn: p => { p.score += 100; } },
  { label: '+200', w: 16, fn: p => { p.score += 200; } },
  { label: '+300', w: 12, fn: p => { p.score += 300; } },
  { label: '+500', w: 7, fn: p => { p.score += 500; } },
  { label: '+50', w: 14, fn: p => { p.score += 50; } },
  { label: 'Double!', w: 7, fn: p => { p.score = Math.max(p.score * 2, 100); }, big: true },
  { label: 'Bankrupt (lose half)', w: 6, fn: p => { p.score = Math.floor(p.score / 2); }, bad: true },
  { label: 'Jackpot +1000', w: 2, fn: p => { p.score += 1000; }, big: true },
  { label: 'Steal 150 from the leader', w: 5, steal: true },
];
const spin = {
  correct(room, p, res, api) {
    const w = weighted(WEDGES);
    if (w.steal) {
      const leader = players(room).filter(x => x !== p).sort((a, b) => b.score - a.score)[0];
      if (leader && leader.score > 0) {
        const amt = Math.min(150, leader.score);
        leader.score -= amt;
        p.score += amt;
        api.addFeed(`${p.name} spun a steal and took ${amt} from ${leader.name}`);
        api.notify(leader, { text: `${p.name} stole ${amt} points from you` });
        res.event = { text: `🎡 Stole ${amt} from ${leader.name}`, tone: 'gold' };
        return;
      }
      p.score += 150;
      res.event = { text: '🎡 +150', tone: 'good' };
      return;
    }
    w.fn(p);
    if (w.big) api.addFeed(`${p.name} spun ${w.label}`);
    res.event = { text: `🎡 ${w.label}`, tone: w.bad ? 'bad' : w.big ? 'gold' : 'good' };
  },
  display: (room, p) => ({ display: fmt(p.score) }),
};

// ---------- Tug of War (teams) ----------
const tug = {
  teams: true,
  init(room) { room.rope = 0; },
  correct(room, p, res, api) {
    const pull = 3 + Math.min(p.streak, 5);
    room.rope += p.team === 'ember' ? -pull : pull;
    p.score += pull;
    res.event = { text: `Pulled ${pull}`, tone: 'good' };
    if (Math.abs(room.rope) >= 100) {
      room.rope = Math.sign(room.rope) * 100;
      api.addFeed(`Team ${room.rope < 0 ? 'Ember' : 'Tide'} pulled the rope over the line`);
      api.end();
    }
  },
  display: (room, p) => ({ display: `${p.score} pull` }),
  state: room => ({ rope: room.rope }),
  end: room => ({ winnerTeam: room.rope === 0 ? null : room.rope < 0 ? 'ember' : 'tide' }),
};

const MODES = { race, climb, boss, fishing, factory, dig, territory, blitz, sudden, spin, tug };
const TEAM_MODES = ['clash', 'tug'];
const COLORS = 12;

module.exports = { MODES, TEAM_MODES, COLORS };
