// QuizForge client
const MODES = {
  classic: { name: 'Classic Race', icon: '🏁', desc: 'Answer fast. First to the goal, or the top score when time runs out, wins.' },
  gold: { name: 'Gold Rush', icon: '💰', desc: 'Right answers open chests. Grab gold, double it, or steal it from a rival.' },
  td: { name: 'Tower Defense', icon: '🏰', desc: 'Right answers earn coins. Build towers and survive the most waves.' },
  clash: { name: 'Core Clash', icon: '⚔️', desc: 'Two teams, two cores. Each right answer hits their core or repairs yours.' },
  royale: { name: 'Knockout', icon: '🥊', desc: 'Everyone starts with 3 hearts. Wrong answers cost one, right answers let you take one. Last one standing wins.' },
  race: { name: 'Space Race', icon: '🚀', desc: 'Right answers boost you down the track, streaks boost harder. First to the finish wins.' },
  climb: { name: 'Summit', icon: '🏔️', desc: 'Climb with right answers, slip with wrong ones. First to 1,000 m wins.' },
  blitz: { name: 'Blitz', icon: '⚡', desc: 'The faster you answer, the more points you get. Pure speed.' },
  spin: { name: 'Lucky Spin', icon: '🎡', desc: 'Every right answer spins the wheel: big points, doubles, steals or bankrupt.' },
  dig: { name: 'Dig Site', icon: '⛏️', desc: 'Dig a spot for every right answer. Find gold and gems, dodge the bombs.' },
  fishing: { name: 'Deep Dive', icon: '🎣', desc: 'Right answers cast your line. Streaks lure rarer, heavier fish. Most kilograms wins.' },
  factory: { name: 'Forge Factory', icon: '🏭', desc: 'Earn cash, build machines that make money every second, grow the richest factory.' },
  territory: { name: 'Color Wars', icon: '🎨', desc: 'Claim tiles on a shared map. Three in a row lets you steal tiles. Most tiles wins.' },
  sudden: { name: 'Sudden Death', icon: '💀', desc: 'One wrong answer and you’re out. Last one standing wins.' },
  tug: { name: 'Tug of War', icon: '🪢', desc: 'Two teams pull a rope with right answers. Drag it over the line to win.' },
  boss: { name: 'Boss Battle', icon: '🐲', desc: 'Everyone teams up against one giant boss. Beat it before time runs out.' },
};
const MODE_GROUPS = [
  ['Speed & racing', ['classic', 'race', 'blitz', 'climb']],
  ['Luck & strategy', ['gold', 'spin', 'dig', 'fishing', 'factory']],
  ['Battle', ['royale', 'sudden', 'td', 'territory']],
  ['Teams & co-op', ['clash', 'tug', 'boss']],
];
const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const TEAM_NAMES = { ember: 'Ember', tide: 'Tide' };
const RARITY = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Turn plain-text math into real math: stacked fractions, mixed numbers, exponents, square roots.
function mathHTML(text) {
  const frac = (n, d) => `<span class="frac" aria-label="${n} over ${d}"><span class="num">${n}</span><span class="den">${d}</span></span>`;
  return esc(text)
    .replace(/(^|[^\d/.])(\d+) (\d+)\/(\d+)(?![\d/])/g, (m, pre, w, n, d) => `${pre}<span class="mixed">${w}${frac(n, d)}</span>`)
    .replace(/(^|[^\d/.])(\d+)\/(\d+)(?![\d/])/g, (m, pre, n, d) => `${pre}${frac(n, d)}`)
    .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
    .replace(/\^(-?\d+(?:\.\d+)?|[a-z])/g, '<sup>$1</sup>')
    .replace(/√(\d+(?:\.\d+)?)/g, '<span class="sqrt"><span class="rad">√</span><span class="radicand">$1</span></span>');
}

// Text-to-speech wording for math symbols
function speakable(text) {
  return String(text || '')
    .replace(/(\d+) (\d+)\/(\d+)/g, '$1 and $2 over $3')
    .replace(/(\d+)\/(\d+)/g, '$1 over $2')
    .replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ')
    .replace(/√/g, 'the square root of ').replace(/\^2\b|²/g, ' squared').replace(/\^3\b|³/g, ' cubed')
    .replace(/\^(-?\d+)/g, ' to the power of $1').replace(/_{2,}/g, ' blank ').replace(/…/g, ' dot dot dot ');
}

const readAloud = {
  get auto() { try { return localStorage.getItem('qf-readaloud') === '1'; } catch { return false; } },
  set auto(v) { try { localStorage.setItem('qf-readaloud', v ? '1' : '0'); } catch {} },
  speak(q) {
    if (!('speechSynthesis' in window) || !q) return;
    speechSynthesis.cancel();
    const shapes = ['Triangle', 'Diamond', 'Circle', 'Square'];
    let text = q.q ? speakable(q.q) : 'Look at the picture.';
    if (q.type === 'type') text += '. Type your answer.';
    else if (q.answers) text += '. ' + q.answers.map((a, i) => `${shapes[i]}: ${speakable(a)}.`).join(' ');
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    speechSynthesis.speak(u);
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};

const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- session ----------
const getToken = () => { try { return localStorage.getItem('qf-token'); } catch { return null; } };
const setToken = t => { try { t ? localStorage.setItem('qf-token', t) : localStorage.removeItem('qf-token'); } catch {} };

async function api(path, { method, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch(path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

const socket = io({ auth: cb => cb({ token: getToken() }) });
const emit = (ev, data) => new Promise(res => socket.emit(ev, data, res));

const app = {
  role: null, pin: null, playerId: null, mode: null, goal: 0,
  setup: { solo: false, setId: null, mode: 'classic' },
  avatar: { join: null, solo: null },
  user: null, info: null, catalog: null,
  me: null, lastState: null, busy: false, review: null, over: null, imgCache: {}, td: null,
  setsTab: 'mine',
  filters: { setup: { q: '', subject: '', grade: '', difficulty: '', source: '' }, sets: { q: '', subject: '', grade: '', difficulty: '', source: '' } },
  setupData: null, setsData: null,
};

// ---------- navigation ----------
function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name));
  window.scrollTo(0, 0);
  if (name === 'home') renderHome();
}

// ---------- looks ----------
const MODE_THEME = {
  classic: ['#ffc93c', '#ff9f43'], race: ['#48a6ff', '#4ee0ff'], blitz: ['#ffe14d', '#ff5c7a'], climb: ['#a3e635', '#2ee6a8'],
  gold: ['#ffc93c', '#fbbf24'], spin: ['#ff7ad9', '#c58bff'], dig: ['#d6a46b', '#ffc93c'], fishing: ['#4ee0ff', '#48a6ff'],
  factory: ['#ff9f43', '#818cf8'], royale: ['#ff5c7a', '#c58bff'], sudden: ['#f87171', '#9ca3af'], td: ['#2ee6a8', '#48a6ff'],
  territory: ['#c58bff', '#ff7ad9'], clash: ['#ff5c7a', '#48a6ff'], tug: ['#ff5c7a', '#48a6ff'], boss: ['#ff5c7a', '#ff9f43'],
};
const SUBJECT_STYLE = {
  'Math': ['🔢', '#48a6ff'], 'Science': ['🔬', '#2ee6a8'], 'English': ['📚', '#ff7ad9'], 'Social Studies': ['🏛️', '#ff9f43'],
  'Geography': ['🌍', '#4ee0ff'], 'World Languages': ['🗣️', '#c58bff'], 'Computer Science': ['💻', '#818cf8'],
  'Health': ['🍎', '#f87171'], 'Arts & Music': ['🎨', '#fbbf24'], 'Other': ['✨', '#bcaee0'],
};
const FEATURED_SETS = ['math-mult-frac-unlike', 'sci-weathering-35', 'sci-solar-system', 'ss-states-1', 'ela-figurative', 'sci-cells',
  'math-mult-12', 'geo-continents-oceans', 'spanish-basics', 'cs-python-basics', 'ss-american-revolution', 'math-eq-2step'];

function applyTheme(screen, watermark, mode) {
  const [a, b] = MODE_THEME[mode] || MODE_THEME.classic;
  screen.style.setProperty('--accent', a);
  screen.style.setProperty('--accent2', b);
  const icon = MODES[mode] ? MODES[mode].icon : '⚡';
  watermark.innerHTML = Array.from({ length: 9 }, (_, i) => `<span style="left:${(i * 37) % 100}%;top:${(i * 53) % 90}%;animation-delay:-${i * 2.3}s">${icon}</span>`).join('');
}

function confettiAt(el) {
  const fx = $('fx');
  if (!fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const colors = ['var(--sun)', 'var(--mint)', 'var(--sky)', 'var(--coral)', '#c58bff'];
  for (let i = 0; i < 18; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = r.left + r.width / 2 + 'px';
    c.style.top = r.top + r.height / 2 + 'px';
    c.style.background = colors[i % colors.length];
    const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 120;
    c.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    c.style.setProperty('--dy', Math.sin(ang) * dist - 60 + 'px');
    c.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
    fx.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
}

function floatText(el, text, tone = 'good') {
  const fx = $('fx');
  if (!fx) return;
  const r = el.getBoundingClientRect();
  const t = document.createElement('span');
  t.className = 'float-text ' + tone;
  t.textContent = text;
  t.style.left = r.left + r.width / 2 + 'px';
  t.style.top = r.top + 'px';
  fx.appendChild(t);
  setTimeout(() => t.remove(), 1200);
}

// ---------- home ----------
let homeSets = null;
async function renderHome() {
  $('home-admin-link').hidden = !(app.user && app.user.isAdmin);
  // floating background critters
  const bg = $('home-bg');
  if (!bg.children.length) {
    const icons = ['🤖', '🦊', '🐉', '🚀', '⚡', '🏆', '🎨', '🔬', '🐙', '🌈', '👾', '🎡'];
    bg.innerHTML = icons.map((ic, i) => `<span style="left:${(i * 83) % 96}%;top:${(i * 47) % 90}%;animation-delay:-${i * 1.7}s;font-size:${2 + (i % 3)}rem">${ic}</span>`).join('');
  }
  // player card
  const pc = $('home-player');
  const u = app.user;
  if (u) {
    const next = (100 * u.level * (u.level + 1)) / 2;
    const prev = (100 * (u.level - 1) * u.level) / 2;
    const pct = Math.round(((u.xp - prev) / (next - prev)) * 100);
    const total = (app.catalog?.basic.length || 0) + (app.catalog?.collectibles.length || 0);
    const owned = (app.catalog?.basic.length || 0) + Object.keys(u.forgelings || {}).length;
    pc.innerHTML = `<div class="pc-top"><span class="pc-av">${u.avatar}</span><div><strong>${esc(u.username)}</strong><span class="muted">Level ${u.level} · ${plural(u.wins || 0, 'win')}</span></div></div>
      <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
      <div class="pc-row"><span class="coins">${u.coins}</span><span class="muted">${owned}/${total} Forgelings</span></div>
      ${u.dailyReady ? '<p class="daily">🎁 Daily bonus ready: +50 coins after your next game</p>' : '<p class="daily done">✅ Daily bonus collected. Come back tomorrow!</p>'}
      <button class="btn btn-sun btn-small" data-go="shop">Open packs</button>`;
  } else {
    pc.innerHTML = `<div class="pc-top"><span class="pc-av">🤖</span><div><strong>Playing as a guest</strong><span class="muted">Your progress isn’t saved</span></div></div>
      <ul class="perks"><li>🪙 Earn coins every game</li><li>⭐ Level up with XP</li><li>🎁 Daily bonus</li><li>🤖 Collect 100+ Forgelings</li></ul>
      <div class="pc-row"><button class="btn btn-sun btn-small" id="pc-signup">Create account</button><button class="btn btn-ghost btn-small" id="pc-login">Log in</button></div>`;
    $('pc-signup').onclick = () => openAuth('register');
    $('pc-login').onclick = () => openAuth('login');
  }
  // forgeling parade
  const parade = $('home-parade');
  if (!parade.children.length && app.catalog) {
    const list = [...app.catalog.collectibles].sort(() => Math.random() - 0.5).slice(0, 16);
    const items = list.map(c => `<span class="pf rarity-${c.rarity}" title="${esc(c.name)}">${c.icon}</span>`).join('');
    parade.innerHTML = `<div class="parade-track">${items}${items}</div>`;
  }
  // mode strip
  const strip = $('home-modes');
  if (!strip.children.length) {
    for (const [key, m] of Object.entries(MODES)) {
      const [a, b] = MODE_THEME[key] || MODE_THEME.classic;
      const card = document.createElement('button');
      card.className = 'mode-card';
      card.style.setProperty('--a', a);
      card.style.setProperty('--b', b);
      card.innerHTML = `<span class="mc-icon">${m.icon}</span><strong>${m.name}</strong><span>${m.desc}</span>`;
      card.onclick = () => { SFX.play('click'); app.setup.mode = key; openSetup(true); };
      strip.appendChild(card);
    }
  }
  // stats + popular sets
  if (!homeSets) {
    try { homeSets = (await api('/api/sets')).public; } catch { homeSets = []; }
  }
  const qs = homeSets.reduce((n, s) => n + s.count, 0);
  const fcount = (app.catalog?.basic.length || 0) + (app.catalog?.collectibles.length || 0);
  $('home-stats').innerHTML = [['16', 'game modes'], [homeSets.length, 'question sets'], [qs.toLocaleString(), 'questions'], [fcount, 'Forgelings']]
    .map(([n, l]) => `<div><strong>${n}</strong><span>${l}</span></div>`).join('');
  const setBox = $('home-sets');
  if (!setBox.children.length && homeSets.length) {
    const byPlays = [...homeSets].filter(s => s.plays > 0).sort((a, b) => b.plays - a.plays);
    const picks = [...byPlays, ...FEATURED_SETS.map(id => homeSets.find(s => s.id === id)).filter(Boolean)];
    const seen = new Set();
    for (const s of picks) {
      if (seen.has(s.id) || seen.size >= 10) continue;
      seen.add(s.id);
      const [icon, color] = SUBJECT_STYLE[s.subject] || SUBJECT_STYLE.Other;
      const card = document.createElement('button');
      card.className = 'set-card';
      card.style.setProperty('--c', color);
      card.innerHTML = `<span class="sc-icon">${icon}</span><strong>${esc(s.title)}</strong>
        <span class="muted">${plural(s.count, 'question')} · ${s.grade && s.grade !== 'Any' ? 'Grades ' + esc(s.grade) : 'Any grade'}</span>
        <span class="badge diff-${esc(s.difficulty)}">${DIFF_LABEL[s.difficulty] || 'Medium'}</span>`;
      card.onclick = () => { SFX.play('click'); app.setup.setId = s.id; openSetup(true); };
      setBox.appendChild(card);
    }
  }
}


document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (!go) return;
  SFX.play('click');
  const to = go.dataset.go;
  if (to === 'home') { leaveGame(); renderAccountBar(); }
  const needsUser = { shop: 'the Shop', locker: 'your Forgelings', history: 'your game history', homework: 'assign homework', classes: 'use Classes' };
  if (needsUser[to] && !app.user) return openAuth('login', `Log in to see ${needsUser[to]}.`);
  if (to === 'host' || to === 'solo') return openSetup(to === 'solo');
  if (to === 'sets') return openSets();
  if (to === 'shop') return openShop();
  if (to === 'locker') return openLocker();
  if (to === 'history') return openHistory();
  if (to === 'settings') return openSettings();
  if (to === 'join') return openJoin();
  if (to === 'homework') return openHomework();
  if (to === 'classes') return openClasses();
  if (to === 'admin') return openAdmin();
  show(to);
});


function leaveGame() {
  TD.stop();
  readAloud.stop();
  app.homework = null;
  SFX.stopMusic();
  if (app.role === 'host' && app.lastState?.state !== 'ended') socket.emit('host:end');
  if (app.role) { socket.disconnect(); socket.connect(); }
  Object.assign(app, { role: null, pin: null, playerId: null, me: null, lastState: null, review: null, over: null, busy: false, imgCache: {} });
  $('overlay').hidden = true;
  document.body.classList.remove('bigscreen');
}

function reconnectSocket() {
  socket.disconnect();
  socket.connect();
}

// ---------- account ----------
async function loadMe() {
  if (!getToken()) { app.user = null; return; }
  try { app.user = (await api('/api/me')).user; } catch { app.user = null; }
  if (!app.user) setToken(null);
}

function setUser(user) {
  app.user = user;
  renderAccountBar();
  if ($('s-home').classList.contains('active')) renderHome();
}

function renderAccountBar() {
  const bar = $('account-bar');
  if (!app.user) {
    bar.innerHTML = `<span class="guest">Playing as a guest</span>
      <button class="btn btn-ghost btn-small" id="ab-login">Log in</button>
      <button class="btn btn-sun btn-small" id="ab-signup">Sign up</button>`;
    $('ab-login').onclick = () => openAuth('login');
    $('ab-signup').onclick = () => openAuth('register');
    return;
  }
  const u = app.user;
  bar.innerHTML = `<button class="me-chip" data-go="locker"><span class="me-av">${u.avatar}</span><span>${esc(u.username)}</span><span class="lvl">Lv ${u.level}</span></button>
    <span class="coins">${u.coins} coins</span>
    <button class="btn btn-ghost btn-small" id="ab-logout">Log out</button>`;
  $('ab-logout').onclick = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    setToken(null);
    setUser(null);
    reconnectSocket();
  };
}

let authMode = 'login';
let afterAuth = null;
function openAuth(mode, why) {
  authMode = mode;
  const reg = mode === 'register';
  $('auth-title').textContent = reg ? 'Create an account' : 'Log in';
  $('auth-go').textContent = reg ? 'Create account' : 'Log in';
  $('auth-switch-text').textContent = reg ? 'Already have an account?' : 'New here?';
  $('auth-switch').textContent = reg ? 'Log in' : 'Create an account';
  $('auth-pass').autocomplete = reg ? 'new-password' : 'current-password';
  const where = app.info?.desktop && location.hostname === 'localhost'
    ? 'This account lives on this computer. Use Game › Play online for your online account.'
    : '';
  $('auth-where').textContent = [why, where].filter(Boolean).join(' ');
  $('auth-error').textContent = '';
  show('auth');
  $('auth-user').focus();
}
$('auth-switch').onclick = () => openAuth(authMode === 'login' ? 'register' : 'login');
$('auth-go').onclick = async () => {
  try {
    const res = await api('/api/auth/' + (authMode === 'register' ? 'register' : 'login'), {
      body: { username: $('auth-user').value, password: $('auth-pass').value },
    });
    setToken(res.token);
    setUser(res.user);
    $('auth-pass').value = '';
    reconnectSocket();
    SFX.play('unlock');
    const next = afterAuth;
    afterAuth = null;
    if (next) next();
    else if (app.pendingClassCode) openClasses();
    else show('home');
  } catch (e) { $('auth-error').textContent = e.message; }
};
['auth-user', 'auth-pass'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('auth-go').click(); }));

// ---------- avatars ----------
function ownedAvatars() {
  const list = [...(app.catalog?.basic || [])];
  if (app.user && app.catalog) {
    for (const c of app.catalog.collectibles) if (app.user.forgelings[c.id]) list.push(c.icon);
  }
  return list;
}

function buildAvatars(el, key) {
  const list = ownedAvatars();
  if (!list.includes(app.avatar[key])) app.avatar[key] = app.user && list.includes(app.user.avatar) ? app.user.avatar : list[0];
  el.innerHTML = '';
  for (const a of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a;
    b.setAttribute('aria-label', 'Forgeling ' + a);
    b.setAttribute('aria-pressed', String(app.avatar[key] === a));
    b.onclick = () => { app.avatar[key] = a; SFX.play('click'); buildAvatars(el, key); };
    el.appendChild(b);
  }
}

// ---------- join ----------
function openJoin() {
  $('join-error').textContent = '';
  if (app.user && !$('join-name').value) $('join-name').value = app.user.username;
  $('join-guest-hint').hidden = !!app.user;
  buildAvatars($('join-avatars'), 'join');
  show('join');
  $('join-pin').focus();
}

let hwLookup = 0;
$('join-pin').addEventListener('input', async e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const v = e.target.value;
  const box = $('join-hw-info');
  const isCode = /^[A-Z]{6}$/.test(v);
  if (/^[A-Z]{3}[0-9]{3}$/.test(v)) {
    box.hidden = false;
    box.innerHTML = `<strong>🏫 That’s a class code</strong><span>Join classes from Classes on the home screen (you’ll need an account).</span><button class="btn btn-sky btn-small" id="join-to-class">Go to Classes</button>`;
    $('join-to-class').onclick = () => { app.pendingClassCode = v; if (!app.user) return openAuth('login', 'Log in to join a class.'); openClasses(); };
    $('join-go').textContent = 'Join game';
    return;
  }
  $('join-go').textContent = isCode ? 'Start homework' : 'Join game';
  if (!isCode) { box.hidden = true; return; }
  const run = ++hwLookup;
  try {
    const info = await api('/api/homework/code/' + v);
    if (run !== hwLookup) return;
    box.hidden = false;
    box.innerHTML = `<strong>📝 ${esc(info.title)}</strong><span>${esc(info.setTitle)} · ${plural(info.count, 'question')} · ${MODES[info.mode]?.icon || ''} ${MODES[info.mode]?.name || ''}</span>
      <span>From ${esc(info.teacher)}${info.due ? ` · due ${new Date(info.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}${info.late ? ' · <b class="late">past due, it will be marked late</b>' : ''}</span>`;
  } catch (err) {
    if (run !== hwLookup) return;
    box.hidden = false;
    box.innerHTML = `<span class="error">${esc(err.message)}</span>`;
  }
});

async function startHomework(code, name) {
  const res = await emit('homework:start', { code, name, avatar: app.avatar.join || (app.user && app.user.avatar) });
  if (res.error) {
    if ($('s-join').classList.contains('active')) $('join-error').textContent = res.error;
    else alert(res.error);
    return;
  }
  Object.assign(app, { role: 'solo', pin: res.pin, playerId: res.playerId, mode: res.mode, imgCache: {}, homework: res.info });
  try { localStorage.setItem('qf-name', name); } catch {}
  SFX.play('start');
  enterPlay(res.mode, 0);
}

$('join-go').onclick = async () => {
  const pin = $('join-pin').value.trim();
  const name = $('join-name').value.trim();
  if (/^[A-Z]{6}$/.test(pin)) {
    if (!name) return ($('join-error').textContent = 'Enter your name so your teacher knows it’s you.');
    return startHomework(pin, name);
  }
  if (!/^\d{6}$/.test(pin)) return ($('join-error').textContent = 'Enter the 6-digit PIN from the host screen, or a 6-letter homework code.');
  if (!name) return ($('join-error').textContent = 'Enter a name.');
  const res = await emit('player:join', { pin, name, avatar: app.avatar.join });
  if (res.error) return ($('join-error').textContent = res.error);
  Object.assign(app, { role: 'player', pin, playerId: res.playerId, mode: res.mode, imgCache: {}, homework: null });
  try { localStorage.setItem('qf-name', name); } catch {}
  SFX.play('join');
  if (res.state === 'playing') enterPlay(res.mode, res.goal);
  else {
    $('wait-avatar').textContent = res.avatar;
    $('wait-name').textContent = name;
    $('wait-meta').textContent = `${MODES[res.mode].name} with ${res.setTitle}`;
    show('wait');
    SFX.playTrack('lobby');
  }
};
['join-pin', 'join-name'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('join-go').click(); }));

// ---------- setup (host / solo) ----------
async function openSetup(solo) {
  app.setup.solo = solo;
  $('setup-title').textContent = solo ? 'Play solo' : 'Host a game';
  $('setup-go').textContent = solo ? 'Start solo game' : 'Create game';
  $('setup-solo-fields').hidden = !solo;
  $('setup-error').textContent = '';
  if (solo) {
    if (!$('solo-name').value) $('solo-name').value = app.user ? app.user.username : (localStorage.getItem('qf-name') || '');
    buildAvatars($('solo-avatars'), 'solo');
  }
  show('setup');
  renderModes();
  app.setupData = await api('/api/sets');
  const all = [...app.setupData.mine, ...app.setupData.public];
  if (!all.some(s => s.id === app.setup.setId)) app.setup.setId = all[0]?.id || null;
  renderFilters($('setup-filters'), 'setup', renderSetupSets, false);
  renderSetupSets();
}

function badges(s) {
  return `<span class="badges">${s.official ? '<span class="badge official">Official</span>' : ''}<span class="badge">${esc(s.subject || 'Other')}</span><span class="badge">${s.grade && s.grade !== 'Any' ? 'Grades ' + esc(s.grade) : 'Any grade'}</span><span class="badge diff-${esc(s.difficulty || 'medium')}">${DIFF_LABEL[s.difficulty] || 'Medium'}</span></span>`;
}

function clearSetFilters() {
  app.filters.sets = { q: '', subject: '', grade: '', difficulty: '', source: '' };
}

function matchSet(s, f) {
  if (f.subject && s.subject !== f.subject) return false;
  if (f.grade && s.grade !== f.grade) return false;
  if (f.difficulty && s.difficulty !== f.difficulty) return false;
  if (f.source === 'official' && !s.official) return false;
  if (f.source === 'community' && s.official) return false;
  if (f.q) {
    const hay = `${s.title} ${s.description || ''} ${s.subject || ''} ${s.ownerName || ''}`.toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  }
  return true;
}

function renderFilters(el, key, onChange, withSource) {
  const f = app.filters[key];
  const opts = (list, cur, all, label = x => x) => `<option value="">${all}</option>` + list.map(x => `<option value="${esc(x)}" ${x === cur ? 'selected' : ''}>${esc(label(x))}</option>`).join('');
  el.innerHTML = `<input type="search" data-f="q" placeholder="Search sets" value="${esc(f.q)}" aria-label="Search sets">
    <select data-f="subject" aria-label="Subject">${opts(app.info?.subjects || [], f.subject, 'All subjects')}</select>
    <select data-f="grade" aria-label="Grade">${opts(app.info?.grades || [], f.grade, 'All grades', g => g === 'Any' || g === 'College' ? g : 'Grades ' + g)}</select>
    <select data-f="difficulty" aria-label="Difficulty">${opts(['easy', 'medium', 'hard'], f.difficulty, 'Any difficulty', d => DIFF_LABEL[d])}</select>
    ${withSource ? `<select data-f="source" aria-label="Made by">${opts(['official', 'community'], f.source, 'All sources', x => x === 'official' ? 'Official only' : 'Community only')}</select>` : ''}`;
  el.querySelectorAll('[data-f]').forEach(inp => {
    inp.addEventListener(inp.tagName === 'INPUT' ? 'input' : 'change', () => { f[inp.dataset.f] = inp.value; onChange(); });
  });
}

function renderSetupSets() {
  const box = $('setup-sets');
  const f = app.filters.setup;
  box.innerHTML = '';
  const group = (title, sets) => {
    const shown = sets.filter(s => matchSet(s, f));
    if (!shown.length) return;
    const h = document.createElement('p');
    h.className = 'group-label';
    h.textContent = `${title} (${shown.length})`;
    box.appendChild(h);
    for (const s of shown.slice(0, 60)) {
      const b = document.createElement('button');
      b.className = 'pick';
      b.innerHTML = `<strong>${esc(s.title)}</strong><span>${plural(s.count, 'question')}${s.ownerName && !s.official && s.owner !== app.user?.id ? ' by ' + esc(s.ownerName) : ''}</span>${badges(s)}`;
      b.setAttribute('aria-pressed', String(s.id === app.setup.setId));
      b.onclick = () => { app.setup.setId = s.id; box.querySelectorAll('.pick').forEach(x => x.setAttribute('aria-pressed', String(x === b))); showSelected(); };
      box.appendChild(b);
    }
    if (shown.length > 60) {
      const more = document.createElement('p');
      more.className = 'hint group-label';
      more.textContent = `Showing 60 of ${shown.length}. Search or filter to find the rest.`;
      box.appendChild(more);
    }
  };
  group('Your sets', app.setupData.mine);
  group('Discover', app.setupData.public);
  if (!box.children.length) box.innerHTML = '<p class="empty group-label">No sets match those filters.</p>';
  showSelected();
}

function showSelected() {
  const all = [...app.setupData.mine, ...app.setupData.public];
  const sel = all.find(s => s.id === app.setup.setId);
  let line = $('setup-selected');
  if (!line) {
    line = document.createElement('p');
    line.id = 'setup-selected';
    line.className = 'selected-line';
    $('setup-sets').before(line);
  }
  line.innerHTML = sel ? `Selected: <strong>${esc(sel.title)}</strong> · ${plural(sel.count, 'question')}` : 'Pick a set below.';
}

function renderModes() {
  const box = $('setup-modes');
  box.innerHTML = '';
  for (const [label, keys] of MODE_GROUPS) {
    const h = document.createElement('p');
    h.className = 'group-label';
    h.textContent = label;
    box.appendChild(h);
    for (const key of keys) {
      const m = MODES[key];
      const b = document.createElement('button');
      b.className = 'pick';
      b.innerHTML = `<span class="mode-icon">${m.icon}</span><strong>${m.name}</strong><span>${m.desc}</span>`;
      b.setAttribute('aria-pressed', String(key === app.setup.mode));
      b.onclick = () => { app.setup.mode = key; renderModes(); };
      box.appendChild(b);
    }
  }
  $('setup-goal-field').hidden = app.setup.mode !== 'classic';
}

$('setup-go').onclick = async () => {
  if (!app.setup.setId) return ($('setup-error').textContent = 'Pick a question set first.');
  const settings = { duration: Number($('setup-duration').value), goal: Number($('setup-goal').value) };
  const payload = { setId: app.setup.setId, mode: app.setup.mode, settings, solo: app.setup.solo };
  if (app.setup.solo) {
    payload.name = $('solo-name').value.trim() || 'You';
    payload.avatar = app.avatar.solo;
  }
  $('setup-go').disabled = true;
  const res = await emit('host:create', payload);
  $('setup-go').disabled = false;
  if (res.error) return ($('setup-error').textContent = res.error);
  Object.assign(app, { pin: res.pin, mode: res.mode, role: app.setup.solo ? 'solo' : 'host', playerId: res.playerId || null, imgCache: {}, homework: null });
  if (app.role === 'solo') { SFX.play('start'); enterPlay(res.mode, app.setup.mode === 'classic' ? settings.goal : 0); }
  else openLobby(res);
};

// ---------- host lobby ----------
async function openLobby(res) {
  $('lobby-pin').textContent = res.pin;
  $('lobby-meta').textContent = `${MODES[res.mode].name} with ${res.setTitle}`;
  $('lobby-error').textContent = '';
  renderLobbyPlayers([]);
  show('lobby');
  SFX.playTrack('lobby');
  let url = location.host;
  if (['localhost', '127.0.0.1'].includes(location.hostname) && app.info?.lan.length) url = `${app.info.lan[0]}:${app.info.port}`;
  $('lobby-url').textContent = url;
}

let lastLobbyCount = 0;
function renderLobbyPlayers(players) {
  const list = $('lobby-players');
  list.innerHTML = '';
  for (const p of players) {
    const li = document.createElement('li');
    li.className = 'chip';
    li.innerHTML = `<span>${p.avatar}</span><span>${esc(p.name)}</span>${p.bot ? '<span class="bot-tag">bot</span>' : ''}${p.level ? `<span class="bot-tag">Lv ${p.level}</span>` : ''}<button aria-label="Remove ${esc(p.name)}">×</button>`;
    li.querySelector('button').onclick = () => emit('host:kick', { playerId: p.id });
    li.querySelector('button').title = `Kick ${p.name}`;
    list.appendChild(li);
  }
  if (players.length > lastLobbyCount) SFX.play('join');
  lastLobbyCount = players.length;
  $('lobby-count').textContent = plural(players.length, 'player');
  $('lobby-empty').hidden = players.length > 0;
}

socket.on('lobby:update', d => { if (app.role === 'host') { renderLobbyPlayers(d.players); renderHostToggles(d); } });

function renderHostToggles(d) {
  app.hostLocked = !!d.locked;
  app.hostReactions = d.reactions !== false;
  for (const id of ['lobby-lock', 'hg-lock']) {
    $(id).textContent = d.locked ? '🔒 Locked' : '🔓 Lock game';
    $(id).classList.toggle('on', !!d.locked);
  }
  for (const id of ['lobby-react', 'hg-react']) {
    $(id).textContent = app.hostReactions ? '😀 Reactions on' : '🚫 Reactions off';
  }
}
const toggleLock = () => emit('host:lock', { locked: !app.hostLocked });
const toggleReactions = () => emit('host:reactions', { on: !app.hostReactions });
$('lobby-lock').onclick = toggleLock;
$('hg-lock').onclick = toggleLock;
$('lobby-react').onclick = toggleReactions;
$('hg-react').onclick = toggleReactions;

async function addBot(errEl) {
  const r = await emit('host:addBot');
  if (r.error && errEl) errEl.textContent = r.error;
}
const toggleBig = () => document.body.classList.toggle('bigscreen');
$('lobby-big').onclick = toggleBig;
$('hg-big').onclick = toggleBig;
$('lobby-bot').onclick = () => addBot($('lobby-error'));
$('hg-bot').onclick = () => addBot(null);
$('lobby-close').onclick = () => { leaveGame(); show('home'); };
$('lobby-start').onclick = async () => {
  const r = await emit('host:start');
  if (r.error) $('lobby-error').textContent = r.error;
};
$('hg-end').onclick = () => { if (confirm('End the game for everyone?')) emit('host:end'); };
$('play-end').onclick = () => emit('host:end');

// ---------- game start ----------
socket.on('game:start', d => {
  app.mode = d.mode;
  SFX.play('start');
  if (app.role === 'host') {
    $('hg-mode').textContent = `${MODES[d.mode].icon} ${MODES[d.mode].name}`;
    $('hg-pin').textContent = app.pin;
    $('hg-feed').innerHTML = '';
    $('hg-bot').hidden = d.mode === 'td';
    applyTheme($('s-host-game'), $('hg-watermark'), d.mode);
    show('host-game');
    SFX.playTrack(d.mode);
  } else if (app.role === 'player' && !$('s-play').classList.contains('active')) {
    enterPlay(d.mode, d.goal);
  }
});

function enterPlay(mode, goal) {
  Object.assign(app, { mode, goal, review: null, over: null, busy: false, td: null });
  $('play-mode').textContent = app.homework ? `📝 ${app.homework.title} · ${MODES[mode].name}` : `${MODES[mode].icon} ${MODES[mode].name}`;
  $('play-end').textContent = app.homework ? 'Hand in' : 'End game';
  $('play-react-card').hidden = app.role !== 'player';
  renderEmotes();
  $('play-feed').innerHTML = '<li class="feed-empty">Nothing yet. Big plays show up here.</li>';
  $('play-hud').textContent = '';
  $('play-stage').hidden = true;
  $('play-me').innerHTML = '';
  $('q-streak').hidden = true;
  app.totalTime = 0;
  applyTheme($('s-play'), $('play-watermark'), mode);
  $('play-end').hidden = app.role !== 'solo';
  $('overlay').hidden = true;
  const td = mode === 'td';
  $('td-wrap').hidden = !td;
  $('play-body').classList.toggle('with-td', td);
  if (td) {
    TD.start($('td-canvas'), $('td-shop'), {
      onChange: s => { app.td = s; renderHud(); },
      onReport: s => socket.emit('td:report', s),
      onGameOver: s => { SFX.play('ko'); setQuestion(null, `Your base fell on wave ${s.wave}. Watch the leaderboard until the game ends.`); },
    });
  }
  show('play');
  SFX.playTrack(mode);
  loadQuestion();
}

// ---------- questions ----------
function setQuestion(q, message) {
  const box = $('q-answers');
  box.innerHTML = '';
  box.classList.remove('locked');
  $('q-typed').hidden = true;
  $('q-toast').textContent = '';
  $('q-toast').className = 'toast';
  const img = $('q-img');
  if (!q) { img.hidden = true; $('q-text').textContent = message || 'Waiting…'; return; }
  if (q.img) app.imgCache[q.idx] = q.img;
  const src = q.hasImg ? app.imgCache[q.idx] : null;
  img.hidden = !src;
  if (src) img.src = src;
  $('q-text').innerHTML = mathHTML(q.q);
  app.currentQ = q;
  if (readAloud.auto) readAloud.speak(q);
  $('q-text').hidden = !q.q;
  const me = app.me;
  $('q-count').textContent = me ? `Question ${me.answered + 1} · ${me.correct} right` : 'Question 1';
  if (q.type === 'type') {
    $('q-typed').hidden = false;
    const input = $('q-typed-input');
    input.value = '';
    input.disabled = false;
    input.focus();
    return;
  }
  box.classList.toggle('two', q.answers.length === 2);
  q.answers.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'answer';
    b.dataset.text = a;
    b.innerHTML = `<span class="shape" aria-hidden="true">${['▲', '◆', '●', '■'][i]}</span><span class="atext"></span>`;
    b.querySelector('.atext').innerHTML = mathHTML(a);
    b.onclick = () => submitAnswer({ choice: i }, b);
    box.appendChild(b);
  });
}

async function loadQuestion() {
  if (app.over) return;
  const q = await emit('player:next');
  if (q.error) return setQuestion(null, q.error);
  if (q.wait) {
    if (q.out) setQuestion(null, knockedOutText());
    return;
  }
  setQuestion(q);
}

const knockedOutText = () => (app.mode === 'royale' ? 'You’re knocked out. Watch the leaderboard to see who wins.'
  : app.mode === 'sudden' ? 'One wrong answer and you’re out. Watch who lasts the longest.' : 'You’re out for this game.');

$('q-typed').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('q-typed-input').value.trim();
  if (!text) return;
  $('q-typed-input').disabled = true;
  submitAnswer({ text });
});

async function submitAnswer(payload, btn) {
  if (app.busy) return;
  readAloud.stop();
  app.busy = true;
  const box = $('q-answers');
  box.classList.add('locked');
  const res = await emit('player:answer', payload);
  if (res.error) { app.busy = false; return loadQuestion(); }
  const rights = res.correctTexts || [res.correctText];
  [...box.children].forEach(b => b.classList.add(rights.includes(b.dataset.text) ? 'right' : 'dim'));
  const anchor = btn || $('q-typed');
  const streak = $('q-streak');
  streak.hidden = !(res.streak >= 2);
  streak.textContent = `🔥 ${res.streak} in a row`;
  streak.classList.toggle('hot', res.streak >= 5);
  if (res.correct) {
    confettiAt(anchor);
    const pop = res.points ? `+${res.points}` : res.reward ? `+${res.reward} coins` : res.event ? res.event.text.split(/[.,]/)[0] : '✓';
    floatText(anchor, pop, res.event && res.event.tone === 'gold' ? 'gold' : 'good');
  } else {
    const panel = $('qpanel');
    panel.classList.remove('shake');
    void panel.offsetWidth;
    panel.classList.add('shake');
    if (btn) btn.classList.add('wrong-pick');
  }
  const toast = $('q-toast');
  SFX.play(res.correct ? 'correct' : 'wrong');
  if (res.correct) {
    toast.className = 'toast good';
    let msg = 'Correct';
    if (res.points) msg += `  +${res.points}`;
    if (res.reward) { msg += `  +${res.reward} coins`; TD.addCoins(res.reward); }
    if (res.streak >= 3) msg += `  ${res.streak} in a row`;
    if (res.gotShield) msg += '  You earned a shield';
    if (res.event) {
      msg = `Correct · ${res.event.text}`;
      if (res.event.tone === 'gold') toast.className = 'toast gold';
    }
    toast.textContent = msg;
    if (app.mode === 'fishing') SFX.play('splash');
    if (app.mode === 'spin') SFX.play('spin');
  } else {
    toast.className = 'toast bad';
    toast.textContent = `The answer was ${rights.join(' / ')}`;
    if (app.mode === 'royale') toast.textContent += res.out ? '. You’re out.' : res.hearts !== undefined ? `. ${plural(res.hearts, 'heart')} left.` : '';
    if (res.event) toast.textContent += ` · ${res.event.text}`;
    if (app.mode === 'sudden' && res.out) toast.textContent += '. You’re out.';
  }
  await wait(res.correct ? 650 : 1500);
  if (app.over) { app.busy = false; return; }
  if (res.out) { app.busy = false; SFX.play('ko'); return setQuestion(null, knockedOutText()); }
  if (res.pending === 'chest') await chestFlow();
  else if (res.pending === 'clash') await clashFlow(res.power);
  else if (res.pending === 'royale') await royaleFlow(res.targets);
  else if (res.pending === 'choice') await choiceFlow(res.choice);
  app.busy = false;
  loadQuestion();
}

// ---------- overlays ----------
function overlay(html) {
  $('overlay-card').innerHTML = html;
  $('overlay').hidden = false;
  return $('overlay-card');
}
const closeOverlay = () => { $('overlay').hidden = true; };

function targetPicker(title, targets, label, onPick) {
  const card = overlay(`<h3>${esc(title)}</h3><div class="targets"></div>`);
  for (const p of targets) {
    const tb = document.createElement('button');
    tb.className = 'btn btn-ghost';
    tb.innerHTML = `<span>${p.avatar} ${esc(p.name)}</span><span>${label(p)}</span>`;
    tb.onclick = () => { card.querySelectorAll('button').forEach(x => x.disabled = true); onPick(p); };
    card.querySelector('.targets').appendChild(tb);
  }
}

async function flashResult(text, ms = 1100) {
  overlay(`<p class="big-result">${esc(text)}</p>`);
  await wait(ms);
  closeOverlay();
}

function chestFlow() {
  return new Promise(resolve => {
    const card = overlay(`<h3>Pick a chest</h3><div class="chests">${'<button class="chest" aria-label="Chest">🎁</button>'.repeat(3)}</div>`);
    card.querySelectorAll('.chest').forEach(b => b.onclick = async () => {
      card.querySelectorAll('.chest').forEach(x => x.disabled = true);
      SFX.play('chest');
      const r = await emit('gold:chest');
      if (r.error) { closeOverlay(); return resolve(); }
      if (r.needsTarget) {
        if (!r.targets.length) { closeOverlay(); return resolve(); }
        return targetPicker(r.kind === 'steal' ? 'Steal from who?' : 'Swap with who?', r.targets, p => `${p.gold} gold`, async p => {
          const rr = await emit('gold:target', { targetId: p.id });
          await flashResult(rr.text || rr.error, 1200);
          resolve();
        });
      }
      await flashResult(r.text);
      resolve();
    });
  });
}

function clashFlow(power) {
  return new Promise(resolve => {
    const card = overlay(`<h3>Use your ${power} power</h3>
      <div class="actions-2">
        <button class="btn btn-coral btn-big" data-a="attack">Attack their core</button>
        <button class="btn btn-mint btn-big" data-a="repair">Repair our core</button>
      </div>`);
    card.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      card.querySelectorAll('button').forEach(x => x.disabled = true);
      const r = await emit('clash:action', { action: b.dataset.a });
      if (r.error) { closeOverlay(); return resolve(); }
      SFX.play(r.action === 'attack' ? 'hit' : 'correct');
      await flashResult(r.action === 'attack' ? `${r.crit ? 'Critical hit! ' : ''}${r.amount} damage` : `Repaired ${r.amount}`, 900);
      resolve();
    });
  });
}

const heartsText = p => `${'❤️'.repeat(Math.max(0, p.hearts))}${p.shield ? ' 🛡️' : ''}`;

function royaleFlow(targets) {
  return new Promise(resolve => {
    targetPicker('Take a heart from who?', targets, heartsText, async p => {
      const r = await emit('royale:attack', { targetId: p.id });
      SFX.play(r.result === 'ko' ? 'ko' : 'hit');
      await flashResult(r.text || r.error, 1000);
      resolve();
    });
  });
}

function choiceFlow(choice) {
  return new Promise(resolve => {
    const render = (ch, err) => {
      const inner = ch.kind === 'grid'
        ? `<div class="pick-grid" style="--cols:${ch.cols}">${ch.options.map(o => `<button class="cell ${o.cls || ''}" data-id="${esc(o.id)}" ${o.disabled ? 'disabled' : ''} ${o.color !== null && o.color !== undefined ? `style="--c:var(--p${o.color})"` : ''} aria-label="Tile ${Number(o.id) + 1}">${esc(o.label)}</button>`).join('')}</div>`
        : `<div class="targets">${ch.options.map(o => `<button class="btn btn-ghost" data-id="${esc(o.id)}" ${o.disabled ? 'disabled' : ''}><span>${esc(o.label)}</span><span>${esc(o.sub || '')}</span></button>`).join('')}</div>`;
      const card = overlay(`<h3>${esc(ch.title)}</h3>${err ? `<p class="error">${esc(err)}</p>` : ''}${inner}`);
      card.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => {
        card.querySelectorAll('[data-id]').forEach(x => x.disabled = true);
        const r = await emit('mode:choose', { id: b.dataset.id });
        if (r.error) {
          if (r.choice) return render(r.choice, r.error);
          closeOverlay();
          return resolve();
        }
        SFX.play(/Boom|Lost/.test(r.text) ? 'hit' : 'coin');
        await flashResult(r.text, 900);
        resolve();
      });
    };
    render(choice);
  });
}

socket.on('player:hit', d => {
  SFX.play(d.out ? 'ko' : 'hit');
  const t = $('q-toast');
  t.className = 'toast bad';
  t.textContent = d.text;
  if (d.out) {
    closeOverlay();
    app.busy = false;
    setQuestion(null, knockedOutText());
    $('q-toast').className = 'toast bad';
    $('q-toast').textContent = d.text;
  }
});

// ---------- live state ----------
function valueFor(p, mode) {
  if (p.display) return esc(p.display);
  if (mode === 'gold') return `${p.gold} gold`;
  if (mode === 'td') return `${p.score} · wave ${p.wave}`;
  if (mode === 'royale') return p.out ? `out · ${plural(p.kos, 'KO')}` : `${heartsText(p)} · ${plural(p.kos, 'KO')}`;
  if (mode === 'classic' && app.lastState?.goal) return `${p.correct}/${app.lastState.goal}`;
  return `${p.score}`;
}

function renderBoard(el, players, mode, limit, kick) {
  el.innerHTML = '';
  players.slice(0, limit || players.length).forEach((p, i) => {
    const li = document.createElement('li');
    if (p.id && p.id === app.playerId) li.classList.add('me');
    if (p.out || p.online === false) li.classList.add('out');
    if (p.team) li.classList.add('team-' + p.team);
    const swatch = mode === 'territory' && p.color !== undefined ? `<i class="swatch" style="--c:var(--p${p.color})"></i>` : '';
    const prog = p.progress !== undefined ? `<span class="prog"><i style="width:${Math.round(p.progress * 100)}%"></i></span>` : '';
    li.innerHTML = `<span class="rank">${i + 1}</span><span class="av">${p.avatar}</span><span class="nm">${swatch}${esc(p.name)}${p.bot ? ' <small>(bot)</small>' : ''}${prog}</span><span class="val">${valueFor(p, mode)}</span>`;
    if (kick && p.id) {
      li.classList.add('kickable');
      const k = document.createElement('button');
      k.className = 'kick-btn';
      k.textContent = 'Kick';
      k.setAttribute('aria-label', `Kick ${p.name}`);
      k.onclick = () => { if (confirm(`Remove ${p.name} from the game?`)) emit('host:kick', { playerId: p.id }); };
      li.appendChild(k);
    }
    el.appendChild(li);
  });
}

function renderCores(el, teams, myTeam) {
  if (!teams) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = ['ember', 'tide'].map(t => {
    const pct = Math.round((teams[t].hp / teams[t].max) * 100);
    return `<div class="core ${t}${t === myTeam ? ' mine' : ''}">
      <div class="core-label"><span>${TEAM_NAMES[t]} core${t === myTeam ? ' (yours)' : ''}</span><span>${teams[t].hp}</span></div>
      <div class="core-bar"><div class="core-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

function renderExtra(el, s, big) {
  let html = '';
  if (s.boss) {
    const pct = Math.round((s.boss.hp / s.boss.max) * 100);
    html = `<div class="boss"><span class="boss-icon">${s.boss.icon}</span><div class="boss-info"><div class="core-label"><span>${esc(s.boss.name)}</span><span>${s.boss.hp.toLocaleString()} / ${s.boss.max.toLocaleString()}</span></div><div class="core-bar"><div class="core-fill boss-fill" style="width:${pct}%"></div></div></div></div>`;
  } else if (s.rope !== undefined) {
    const pos = Math.round((s.rope + 100) / 2);
    html = `<div class="rope"><span class="rope-team ember">Ember</span><div class="rope-track"><div class="rope-mid"></div><div class="rope-knot" style="left:${pos}%">🪢</div></div><span class="rope-team tide">Tide</span></div>`;
  } else if (s.grid) {
    html = `<div class="map-grid ${big ? 'big' : ''}" style="--cols:${s.gridCols}">${s.grid.map(c => `<i ${c >= 0 ? `style="--c:var(--p${c})"` : ''}></i>`).join('')}</div>`;
  }
  el.hidden = !html;
  el.innerHTML = html;
}

function renderHud() {
  const me = app.me;
  let hud = '';
  if (app.mode === 'td' && app.td) hud = `${app.td.coins} coins · ${app.td.lives} lives · wave ${app.td.wave}`;
  else if (me) {
    if (app.mode === 'classic') hud = `${me.score} pts${app.goal ? ` · ${me.correct}/${app.goal} correct` : ''}`;
    if (app.mode === 'gold') hud = `${me.gold} gold`;
    if (app.mode === 'clash') hud = `Team ${TEAM_NAMES[me.team] || ''} · ${me.score} power`;
    if (app.mode === 'royale') hud = me.out ? 'Knocked out' : `${heartsText(me)} · ${plural(me.kos, 'KO')}`;
    if (!hud && me.display) hud = (me.team ? `Team ${TEAM_NAMES[me.team]} · ` : '') + me.display;
  }
  $('play-hud').textContent = hud;
}

socket.on('game:state', s => {
  app.lastState = s;
  const time = fmtTime(s.timeLeft);
  const low = s.timeLeft <= 10 && s.timeLeft > 0;
  if (low) SFX.play('tick');
  SFX.setIntense(s.timeLeft > 0 && s.timeLeft <= 30);
  if (app.role === 'host') {
    $('hg-time').textContent = time;
    $('hg-time').classList.toggle('low', s.timeLeft <= 30);
    renderBoard($('hg-board'), s.players, s.mode, 0, true);
    renderHostToggles(s);
    renderCores($('hg-clash'), s.teams, null);
    $('hg-extra').hidden = true;
    renderStage($('hg-stage'), s, true);
    return;
  }
  app.me = s.players.find(p => p.id === app.playerId) || null;
  $('play-time').textContent = time;
  $('play-time').classList.toggle('low', s.timeLeft <= 30);
  renderBoard($('play-board'), s.players, s.mode, 8);
  renderCores($('play-clash'), s.teams, app.me?.team);
  $('play-extra').hidden = true;
  renderStage($('play-stage'), s, false);
  renderMe(s);
  app.totalTime = Math.max(app.totalTime || 0, s.timeLeft);
  $('play-timebar').style.width = app.totalTime ? `${(s.timeLeft / app.totalTime) * 100}%` : '100%';
  renderHud();
});

function renderMe(s) {
  const me = app.me;
  const el = $('play-me');
  if (!me) { el.innerHTML = ''; return; }
  const rank = s.players.findIndex(p => p.id === me.id) + 1;
  const acc = me.answered ? Math.round((me.correct / me.answered) * 100) : 0;
  const stat = me.display || (s.mode === 'gold' ? `${me.gold} gold` : `${me.score}`);
  const medal = ['🥇', '🥈', '🥉'][rank - 1] || `#${rank}`;
  el.innerHTML = `<div class="me-top"><span class="me-big-av">${me.avatar}</span><div class="me-name"><strong>${esc(me.name)}</strong><span class="muted">${me.team ? 'Team ' + TEAM_NAMES[me.team] : 'You'}</span></div><span class="me-rank">${medal}<small>of ${s.players.length}</small></span></div>
    <div class="me-stat">${esc(stat)}</div>
    <div class="me-row"><span><b>${me.correct}</b> right</span><span><b>${acc}%</b> accuracy</span><span><b>${me.streak}</b> streak</span></div>`;
}

function stageValue(p, mode) {
  if (mode === 'gold') return p.gold;
  if (mode === 'royale') return p.out ? 0 : p.hearts * 10 + p.kos;
  return p.score;
}

function renderStage(el, s, big) {
  let html = '';
  const players = s.players;
  const meId = app.playerId;
  const pickLanes = n => {
    const top = players.slice(0, n);
    const me = players.find(p => p.id === meId);
    if (me && !top.includes(me)) top[top.length - 1] = me;
    return top;
  };
  if (s.boss || s.rope !== undefined || s.grid) {
    renderExtra(el, s, big);
    el.classList.add('stage-visual');
    return;
  }
  el.classList.remove('stage-visual');
  if (s.mode === 'race') {
    html = `<div class="track">${pickLanes(big ? 8 : 5).map(p => `<div class="lane ${p.id === meId ? 'me' : ''}"><span class="lane-name">${esc(p.name)}</span><div class="lane-road"><span class="runner" style="left:${Math.round((p.progress || 0) * 92)}%">${p.avatar}</span></div><span class="flag">🏁</span></div>`).join('')}</div>`;
  } else if (s.mode === 'climb') {
    const climbers = pickLanes(big ? 8 : 6);
    html = `<div class="mountain"><svg viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true"><polygon class="m-back" points="40,160 260,30 420,160"/><polygon class="m-front" points="0,160 200,10 400,160"/><polygon class="m-snow" points="176,32 200,10 224,32 212,28 200,36 188,28"/></svg>
      <span class="summit-flag">🚩</span>
      ${climbers.map((p, i) => { const pr = p.progress || 0; return `<span class="climber ${p.id === meId ? 'me' : ''}" style="left:${3 + pr * 47 + (i % 3) * 1.5}%;bottom:${pr * 82}%" title="${esc(p.name)}">${p.avatar}</span>`; }).join('')}</div>`;
  } else if (!big && s.mode !== 'td' && s.mode !== 'clash') {
    const top = pickLanes(5);
    const max = Math.max(1, ...players.map(p => stageValue(p, s.mode)));
    html = `<div class="bars">${top.map(p => `<div class="bar-row ${p.id === meId ? 'me' : ''} ${p.out ? 'out' : ''}"><span class="av">${p.avatar}</span><div class="bar"><i style="width:${Math.max(3, Math.round((stageValue(p, s.mode) / max) * 100))}%"></i><span class="bar-name">${esc(p.name)}</span></div><b>${esc(p.display || valueFor(p, s.mode))}</b></div>`).join('')}</div>`;
  }
  el.hidden = !html;
  el.innerHTML = html;
}

$('q-speak').onclick = () => { SFX.play('click'); readAloud.speak(app.currentQ); };

const EMOTES = ['🔥', '😱', '😂', '👏', '😎', '💀', '🤯', '❤️'];
function renderEmotes() {
  const box = $('play-react');
  if (box.children.length) return;
  for (const e of EMOTES) {
    const b = document.createElement('button');
    b.className = 'emote';
    b.textContent = e;
    b.setAttribute('aria-label', 'React ' + e);
    b.onclick = () => {
      if (b.disabled) return;
      socket.emit('reaction', { emoji: e });
      box.querySelectorAll('.emote').forEach(x => { x.disabled = true; });
      setTimeout(() => box.querySelectorAll('.emote').forEach(x => { x.disabled = false; }), 1300);
    };
    box.appendChild(b);
  }
}

socket.on('reaction', r => {
  const host = app.role === 'host';
  const fx = host ? $('hg-fx') : $('fx');
  if (!fx || (!host && !$('s-play').classList.contains('active'))) return;
  const el = document.createElement('div');
  el.className = 'reaction' + (host ? ' big' : '') + (r.id === app.playerId ? ' mine' : '');
  el.style.left = (host ? 8 + Math.random() * 84 : 70 + Math.random() * 25) + '%';
  el.innerHTML = `<span class="r-emoji">${r.emoji}</span>${host ? `<span class="r-name">${r.avatar} ${esc(r.name)}</span>` : ''}`;
  fx.appendChild(el);
  setTimeout(() => el.remove(), 3200);
});

socket.on('game:feed', text => {
  const el = app.role === 'host' ? $('hg-feed') : $('play-feed');
  el.querySelectorAll('.feed-empty').forEach(x => x.remove());
  const li = document.createElement('li');
  li.textContent = text;
  el.prepend(li);
  while (el.children.length > (app.role === 'host' ? 14 : 5)) el.lastChild.remove();
});

// ---------- results ----------
function renderResults({ mode, standings, winnerTeam, stats, title, sub, showStats, fromHistory, banner: bannerText }) {
  $('res-title').textContent = title || 'Game over';
  $('res-sub').textContent = sub || '';
  $('res-back').hidden = !fromHistory;
  $('res-home').hidden = !!fromHistory;
  const banner = $('res-banner');
  const teamMode = mode === 'clash' || mode === 'tug';
  banner.hidden = !teamMode && !bannerText;
  if (bannerText) banner.textContent = bannerText;
  else if (teamMode) banner.textContent = winnerTeam ? `Team ${TEAM_NAMES[winnerTeam]} wins` : 'It’s a tie';
  const top = standings.slice(0, 3);
  const order = [1, 0, 2].filter(i => top[i]);
  $('res-podium').innerHTML = order.map(i => `<div class="step p${i + 1}"><div class="av">${top[i].avatar}</div><div class="nm">${esc(top[i].name)}</div><div class="block">${i + 1}</div></div>`).join('');
  renderResultsTable(standings, mode);
  $('res-stats').hidden = !showStats;
  if (showStats) {
    $('res-stats-list').innerHTML = stats
      .map(s => ({ ...s, total: s.right + s.wrong }))
      .filter(s => s.total > 0)
      .sort((a, b) => a.right / a.total - b.right / b.total)
      .map(s => {
        const pct = Math.round((s.right / s.total) * 100);
        return `<li class="${pct < 60 ? 'low' : ''}"><span>${mathHTML(s.q)}</span><span><div class="acc-bar"><div class="acc-fill" style="width:${pct}%"></div></div>${pct}% right (${s.right}/${s.total})</span></li>`;
      }).join('') || '<li>No answers were submitted.</li>';
  }
}

function renderResultsTable(standings, mode) {
  const rows = standings.map((p, i) => {
    const answered = p.answered || 0;
    const right = p.correct || 0;
    const wrong = Math.max(0, answered - right);
    const acc = answered ? Math.round((right / answered) * 100) : null;
    const me = p.id && p.id === app.playerId;
    return `<tr class="${me ? 'me-row' : ''} ${p.out ? 'out-row' : ''}">
      <td class="rank-cell">${['🥇', '🥈', '🥉'][i] || i + 1}</td>
      <td><span class="tbl-av">${p.avatar || ''}</span> ${esc(p.name)}${p.bot ? ' <small class="muted">(bot)</small>' : ''}${me ? ' <span class="badge official">you</span>' : ''}</td>
      <td class="num">${valueFor(p, mode)}</td>
      <td class="num good">✓ ${right}</td>
      <td class="num bad">✗ ${wrong}</td>
      <td class="num"><span class="score ${acc === null ? '' : acc >= 80 ? 'hi' : acc >= 60 ? 'mid' : 'lo'}">${acc === null ? '–' : acc + '%'}</span></td>
      <td class="num">${p.bestStreak ? '🔥 ' + p.bestStreak : '–'}</td></tr>`;
  }).join('');
  $('res-table').innerHTML = `<thead><tr><th></th><th>Player</th><th>Score</th><th>Right</th><th>Wrong</th><th>Accuracy</th><th>Best streak</th></tr></thead><tbody>${rows}</tbody>`;
}

socket.on('game:over', d => {
  app.over = d;
  SFX.stopMusic();
  TD.stop();
  closeOverlay();
  $('res-rewards').hidden = true;
  renderResults({ ...d, showStats: app.role === 'host' });
  renderReview();
  const mineFirst = d.standings[0] && d.standings[0].id === app.playerId;
  const myTeamWon = (d.mode === 'clash' || d.mode === 'tug') && app.me && d.winnerTeam === app.me.team;
  SFX.play(mineFirst || myTeamWon || app.role === 'host' ? 'win' : 'start');
  show('results');
});

socket.on('game:review', r => { app.review = r; renderReview(); });

function renderReview() {
  const box = $('res-review');
  const r = app.review;
  if (!r || app.role === 'host') { box.hidden = true; return; }
  box.hidden = false;
  const acc = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
  $('res-review-meta').textContent = `You got ${r.correct} of ${r.answered} right (${acc}%). Best streak: ${r.bestStreak}.`;
  $('res-review-list').innerHTML = r.missed.length
    ? r.missed.map(m => `<li>${m.q ? mathHTML(m.q) : 'Picture question'}<br><span class="ans">${mathHTML(m.answer)}</span></li>`).join('')
    : '<li>You didn’t miss a single question.</li>';
  const rw = $('res-rewards');
  if (r.rewards) {
    rw.hidden = false;
    rw.innerHTML = `<span>+${r.rewards.coins} coins</span><span>+${r.rewards.xp} XP</span>${r.rewards.daily ? `<span>+${r.rewards.daily} daily bonus</span>` : ''}${r.rewards.levelUp ? `<span class="lvlup">Level ${r.rewards.user.level}!</span>` : ''}`;
    if (r.rewards.user) app.user = r.rewards.user;
    if (r.rewards.levelUp) SFX.play('unlock');
  } else if (!app.user) {
    rw.hidden = false;
    rw.innerHTML = '<span class="muted">Log in next time to earn coins and XP.</span>';
  }
}

socket.on('player:kicked', () => { leaveGame(); alert('The host removed you from the game.'); show('home'); });
socket.on('room:closed', () => {
  if (app.role !== 'player') return;
  leaveGame();
  alert('The host closed the game.');
  show('home');
});
socket.on('disconnect', reason => {
  if (reason === 'io client disconnect') return;
  if (app.role && !app.over) {
    app.role = null;
    TD.stop();
    alert('Lost connection to the game server.');
    show('home');
  }
});

// ---------- sets ----------
async function openSets() {
  show('sets');
  $('sets-guest').hidden = !!app.user;
  $('sets-new').hidden = !app.user;
  if (!app.user) app.setsTab = 'public';
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === app.setsTab)));
  app.setsData = await api('/api/sets');
  renderFilters($('sets-filters'), 'sets', renderSetsList, app.setsTab === 'public');
  renderSetsList();
}

function renderSetsList() {
  const all = app.setsTab === 'mine' ? app.setsData.mine : app.setsData.public;
  const sets = all.filter(s => matchSet(s, app.filters.sets));
  const list = $('sets-list');
  list.innerHTML = '';
  if (!all.length) list.innerHTML = app.setsTab === 'mine' ? '<li>You haven’t made a set yet. Select New set to start.</li>' : '<li>No shared sets yet.</li>';
  else if (!sets.length) {
    list.innerHTML = '<li>No sets match those filters. <button class="link" id="clear-filters">Clear filters</button></li>';
    $('clear-filters').onclick = () => { clearSetFilters(); renderFilters($('sets-filters'), 'sets', renderSetsList, app.setsTab === 'public'); renderSetsList(); };
  }
  else {
    const count = document.createElement('li');
    count.className = 'count-row';
    const qn = sets.reduce((n, s) => n + s.count, 0);
    count.textContent = `${plural(sets.length, 'set')}, ${qn.toLocaleString()} question${qn === 1 ? '' : 's'}`;
    list.appendChild(count);
  }
  for (const s of sets.slice(0, 150)) {
    const mine = app.user && s.owner === app.user.id;
    const li = document.createElement('li');
    li.innerHTML = `<div class="info"><strong>${esc(s.title)}</strong><span>${plural(s.count, 'question')}${s.hasImages ? ' · pictures' : ''}${mine ? (s.visibility === 'public' ? ' · published' : ' · private') : s.official ? '' : ' · by ' + esc(s.ownerName || 'someone')}${s.plays ? ' · ' + plural(s.plays, 'play') : ''}${s.description ? ' · ' + esc(s.description) : ''}</span>${badges(s)}</div>
      <button class="btn btn-sun btn-small" data-a="play">Play solo</button>
      ${mine ? '<button class="btn btn-ghost btn-small" data-a="edit">Edit</button><button class="btn btn-ghost btn-small" data-a="del">Delete</button>' : ''}
      ${!mine && app.user ? '<button class="btn btn-ghost btn-small" data-a="copy">Make a copy</button>' : ''}
      ${!mine ? '<button class="btn btn-ghost btn-small report-btn" data-a="report" title="Report this set" aria-label="Report this set">⚑</button>' : ''}`;
    li.querySelector('[data-a=play]').onclick = () => { app.setup.setId = s.id; openSetup(true); };
    const edit = li.querySelector('[data-a=edit]');
    if (edit) edit.onclick = () => openEditor(s.id);
    const rpt = li.querySelector('[data-a=report]');
    if (rpt) rpt.onclick = () => reportFlow(s);
    const copy = li.querySelector('[data-a=copy]');
    if (copy) copy.onclick = async () => { const c = await api(`/api/sets/${encodeURIComponent(s.id)}/copy`, { method: 'POST' }); openEditor(c.id); };
    const del = li.querySelector('[data-a=del]');
    if (del) del.onclick = async () => {
      if (!confirm(`Delete "${s.title}"? This can’t be undone.`)) return;
      await api('/api/sets/' + encodeURIComponent(s.id), { method: 'DELETE' });
      openSets();
    };
    list.appendChild(li);
  }
}
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  if (t.dataset.tab === 'mine' && !app.user) return openAuth('login', 'Log in to make your own sets.');
  app.setsTab = t.dataset.tab;
  clearSetFilters();
  openSets();
});
$('sets-new').onclick = () => openEditor(null);
$('home-all-sets').onclick = () => { app.setsTab = 'public'; clearSetFilters(); openSets(); };

// ---------- editor ----------
const editor = { id: null, questions: [] };
const blank = type => ({ type, q: '', img: null, a: type === 'tf' ? ['True', 'False'] : ['', '', '', ''], c: [0], accept: '' });

function toEditable(q) {
  if (q.type === 'type') return { ...blank('type'), q: q.q, img: q.img || null, accept: q.accept.join(', ') };
  if (q.type === 'tf') return { ...blank('tf'), q: q.q, img: q.img || null, c: [q.c[0] ?? 0] };
  return { ...blank('mc'), q: q.q, img: q.img || null, a: [...q.a, '', '', ''].slice(0, 4), c: [...q.c] };
}

function fillMetaSelects() {
  const sel = (el, list, label = x => x) => { el.innerHTML = list.map(x => `<option value="${esc(x)}">${esc(label(x))}</option>`).join(''); };
  sel($('ed-subject'), app.info?.subjects || ['Other']);
  sel($('ed-grade'), app.info?.grades || ['Any'], g => (g === 'Any' || g === 'College' ? g : 'Grades ' + g));
}

async function openEditor(id) {
  if (!app.user) return openAuth('login', 'Log in to make your own sets.');
  fillMetaSelects();
  renderAiStatus();
  editor.id = id;
  $('ed-error').textContent = '';
  $('ai-error').textContent = '';
  $('ed-bulk').value = '';
  if (id) {
    const s = await api('/api/sets/' + encodeURIComponent(id));
    $('ed-heading').textContent = 'Edit set';
    $('ed-title').value = s.title;
    $('ed-desc').value = s.description || '';
    $('ed-public').checked = s.visibility === 'public';
    $('ed-subject').value = s.subject || 'Other';
    $('ed-grade').value = s.grade || 'Any';
    $('ed-difficulty').value = s.difficulty || 'medium';
    editor.questions = s.questions.map(toEditable);
  } else {
    $('ed-heading').textContent = 'New set';
    $('ed-title').value = '';
    $('ed-desc').value = '';
    $('ed-public').checked = false;
    $('ed-subject').value = 'Other';
    $('ed-grade').value = 'Any';
    $('ed-difficulty').value = 'medium';
    editor.questions = [blank('mc')];
  }
  $('ai-box').hidden = false;
  renderEditor();
  show('editor');
}

// shrink pictures so sets stay small and load fast
function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) return reject(new Error('Pick a picture file (PNG, JPG, WEBP or GIF).'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('That picture is over 15 MB. Pick a smaller one.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let out = null;
      for (const [max, quality] of [[900, 0.82], [700, 0.72], [500, 0.65]]) {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', quality);
        if (out.length < 420_000) break;
      }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture couldn’t be opened.')); };
    img.src = url;
  });
}

const TYPE_LABEL = { mc: 'Multiple choice', tf: 'True or false', type: 'Type the answer' };

function renderEditor() {
  const box = $('ed-questions');
  box.innerHTML = '';
  editor.questions.forEach((q, qi) => {
    const div = document.createElement('div');
    div.className = 'q-edit';
    let body = '';
    if (q.type === 'mc') {
      body = `<div class="opts">${q.a.map((a, ai) => `<label class="opt ${q.c.includes(ai) ? 'is-right' : ''}">
          <input type="checkbox" data-c="${ai}" ${q.c.includes(ai) ? 'checked' : ''} aria-label="Answer ${ai + 1} is right">
          <input type="text" data-a="${ai}" value="${esc(a)}" maxlength="120" placeholder="${ai < 2 ? 'Answer' : 'Answer (optional)'}"></label>`).join('')}</div>
        <p class="hint">Tick every right answer. Unticked answers are the wrong ones.</p>`;
    } else if (q.type === 'tf') {
      body = `<div class="tf-row">
          <label class="opt ${q.c[0] === 0 ? 'is-right' : ''}"><input type="radio" name="tf${qi}" value="0" ${q.c[0] === 0 ? 'checked' : ''}> True</label>
          <label class="opt ${q.c[0] === 1 ? 'is-right' : ''}"><input type="radio" name="tf${qi}" value="1" ${q.c[0] === 1 ? 'checked' : ''}> False</label>
        </div><p class="hint">Pick whether the statement is true or false.</p>`;
    } else {
      body = `<label class="field">Accepted answers <input type="text" data-accept value="${esc(q.accept)}" maxlength="400" placeholder="Paris, paris france"></label>
        <p class="hint">Separate different accepted answers with commas. Capitals and small typos don’t count against players.</p>`;
    }
    div.innerHTML = `<div class="q-edit-head">
        <span>Question ${qi + 1}</span>
        <select data-type aria-label="Question type">${Object.entries(TYPE_LABEL).map(([k, v]) => `<option value="${k}" ${k === q.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <span class="spacer"></span>
        <button class="btn btn-ghost btn-small" data-up ${qi === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="btn btn-ghost btn-small" data-down ${qi === editor.questions.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="btn btn-ghost btn-small" data-del>Remove</button>
      </div>
      <label class="field"><span class="sr">Question text</span><textarea data-q maxlength="300" placeholder="${q.type === 'tf' ? 'Type a statement' : 'Type the question'}">${esc(q.q)}</textarea></label>
      <div class="img-row">
        ${q.img ? `<img src="${q.img}" alt="Question ${qi + 1} picture"><button class="btn btn-ghost btn-small" data-img-del>Remove picture</button>` : ''}
        <label class="btn btn-ghost btn-small file-btn">${q.img ? 'Change picture' : 'Add a picture'}<input type="file" accept="image/*" data-img hidden></label>
      </div>
      ${body}`;

    div.querySelector('[data-q]').oninput = e => { q.q = e.target.value; };
    div.querySelector('[data-type]').onchange = e => {
      const t = e.target.value;
      const keep = { q: q.q, img: q.img };
      Object.assign(q, blank(t), keep);
      renderEditor();
    };
    div.querySelector('[data-del]').onclick = () => { editor.questions.splice(qi, 1); renderEditor(); };
    div.querySelector('[data-up]').onclick = () => { [editor.questions[qi - 1], editor.questions[qi]] = [editor.questions[qi], editor.questions[qi - 1]]; renderEditor(); };
    div.querySelector('[data-down]').onclick = () => { [editor.questions[qi + 1], editor.questions[qi]] = [editor.questions[qi], editor.questions[qi + 1]]; renderEditor(); };
    div.querySelector('[data-img]').onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try { q.img = await readImage(file); $('ed-error').textContent = ''; renderEditor(); }
      catch (err) { $('ed-error').textContent = err.message; }
    };
    const imgDel = div.querySelector('[data-img-del]');
    if (imgDel) imgDel.onclick = () => { q.img = null; renderEditor(); };
    div.querySelectorAll('[data-a]').forEach(inp => inp.oninput = e => { q.a[Number(e.target.dataset.a)] = e.target.value; });
    div.querySelectorAll('[data-c]').forEach(cb => cb.onchange = e => {
      const i = Number(e.target.dataset.c);
      q.c = e.target.checked ? [...new Set([...q.c, i])] : q.c.filter(x => x !== i);
      e.target.closest('.opt').classList.toggle('is-right', e.target.checked);
    });
    div.querySelectorAll(`input[name=tf${qi}]`).forEach(r => r.onchange = e => { q.c = [Number(e.target.value)]; renderEditor(); });
    const acc = div.querySelector('[data-accept]');
    if (acc) acc.oninput = e => { q.accept = e.target.value; };
    box.appendChild(div);
  });
}

document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
  editor.questions.push(blank(b.dataset.add));
  renderEditor();
  $('ed-questions').lastElementChild.querySelector('textarea').focus();
});

async function renderAiStatus() {
  try { app.info.ai = await api('/api/ai/status'); } catch { return; }
  const ai = app.info.ai;
  const have = ['anthropic', 'gemini'].filter(p => ai.mine[p] || ai.server[p]);
  $('ai-status').textContent = have.length
    ? `Available: ${have.map(p => (p === 'anthropic' ? 'Claude' : 'Gemini') + (ai.mine[p] ? ' (your key)' : '')).join(', ')}.`
    : 'No AI key yet. Add your own Anthropic or Gemini key in Settings. Making questions by hand works without one.';
}
$('ed-difficulty').addEventListener('change', e => { e.target.dataset.touched = '1'; });

const isBlankQ = q => !q.q.trim() && !q.img && (q.type === 'type' ? !q.accept.trim() : q.type === 'tf' || !q.a.some(a => a.trim()));

$('ed-bulk-add').onclick = () => {
  const lines = $('ed-bulk').value.split('\n').map(l => l.trim()).filter(Boolean);
  const added = [];
  const bad = [];
  lines.forEach((line, i) => {
    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length === 2) return added.push({ ...blank('type'), q: parts[0], accept: parts[1] });
    if (parts.length < 3 || parts.length > 5) return bad.push(i + 1);
    const [q, right, ...wrong] = parts;
    const answers = [right, ...wrong];
    const order = answers.map((_, k) => k).sort(() => Math.random() - 0.5);
    added.push({ ...blank('mc'), q, a: [...order.map(k => answers[k]), '', '', ''].slice(0, 4), c: [order.indexOf(0)] });
  });
  editor.questions = editor.questions.filter(q => !isBlankQ(q)).concat(added);
  renderEditor();
  $('ed-bulk').value = '';
  $('ed-error').textContent = bad.length ? `Skipped line ${bad.join(', ')}: use question | answer, or question | right | wrong (up to 3 wrong).` : '';
};

$('ai-go').onclick = async () => {
  const btn = $('ai-go');
  $('ai-error').textContent = '';
  const types = [...document.querySelectorAll('.ai-type:checked')].map(x => x.value);
  if (!types.length) return ($('ai-error').textContent = 'Pick at least one question type.');
  btn.disabled = true;
  btn.textContent = 'Generating…';
  try {
    const { questions } = await api('/api/ai/generate', {
      body: { topic: $('ai-topic').value, notes: $('ai-notes').value, count: $('ai-count').value, difficulty: $('ai-diff').value, grade: $('ai-grade').value, types, provider: $('ai-provider').value },
    });
    if (!$('ed-difficulty').dataset.touched) $('ed-difficulty').value = $('ai-diff').value;
    editor.questions = editor.questions.filter(q => !isBlankQ(q)).concat(questions.map(toEditable));
    if (!$('ed-title').value.trim() && $('ai-topic').value.trim()) $('ed-title').value = $('ai-topic').value.trim().slice(0, 80);
    renderEditor();
    SFX.play('unlock');
    $('ai-error').textContent = '';
    $('ai-box').open = false;
  } catch (e) {
    $('ai-error').textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate questions';
  }
};

$('ed-save').onclick = async () => {
  const questions = editor.questions.filter(q => !isBlankQ(q)).map(q => {
    if (q.type === 'type') return { type: 'type', q: q.q, img: q.img, accept: q.accept.split(',').map(s => s.trim()).filter(Boolean) };
    if (q.type === 'tf') return { type: 'tf', q: q.q, img: q.img, c: q.c };
    const kept = q.a.map((a, i) => ({ a: a.trim(), i })).filter(x => x.a);
    return { type: 'mc', q: q.q, img: q.img, a: kept.map(x => x.a), c: kept.map((x, k) => (q.c.includes(x.i) ? k : -1)).filter(k => k >= 0) };
  });
  const btn = $('ed-save');
  btn.disabled = true;
  try {
    await api('/api/sets', { body: { id: editor.id, title: $('ed-title').value, description: $('ed-desc').value, visibility: $('ed-public').checked ? 'public' : 'private', subject: $('ed-subject').value, grade: $('ed-grade').value, difficulty: $('ed-difficulty').value, questions } });
    app.setsTab = 'mine';
    clearSetFilters();
    openSets();
  } catch (e) {
    $('ed-error').textContent = e.message;
  } finally {
    btn.disabled = false;
  }
};

// ---------- shop ----------
async function openShop() {
  show('shop');
  await loadMe();
  $('shop-coins').textContent = `${app.user.coins} coins`;
  const box = $('shop-packs');
  box.innerHTML = '';
  for (const [id, pack] of Object.entries(app.catalog.packs)) {
    const members = id === 'mystery' ? app.catalog.collectibles : app.catalog.collectibles.filter(c => c.packs.includes(id));
    const owned = members.filter(c => app.user.forgelings[c.id]).length;
    const div = document.createElement('div');
    div.className = 'pack';
    div.style.setProperty('--c', pack.color || 'var(--sun)');
    const preview = (id === 'mystery' ? [...members].sort(() => Math.random() - 0.5) : members).slice(0, 8);
    div.innerHTML = `<div class="pack-art"><span class="pack-emblem">${pack.icon || '🎁'}</span><div class="pack-icons">${preview.map(c => `<span class="${app.user.forgelings[c.id] ? 'got' : ''}">${c.icon}</span>`).join('')}</div></div>
      <strong>${esc(pack.name)}</strong>
      <span class="pack-desc">${esc(pack.desc || '')}</span>
      <div class="pack-progress"><i style="width:${Math.round((owned / members.length) * 100)}%"></i></div>
      <span>${owned} of ${members.length} collected</span>
      <span class="odds">${Object.entries(pack.odds).map(([r, w]) => `<b class="rar-${r}">${RARITY[r]} ${w}%</b>`).join(' ')}</span>
      <button class="btn btn-sun" ${app.user.coins < pack.cost ? 'disabled' : ''}>🪙 Open for ${pack.cost}</button>`;
    div.querySelector('button').onclick = () => openPack(id);
    box.appendChild(div);
  }
}

async function openPack(id) {
  try {
    const r = await api('/api/shop/open', { body: { pack: id } });
    app.user = r.user;
    const f = r.forgeling;
    const card = overlay(`<div class="reveal rarity-${f.rarity}"><div class="reveal-icon">${f.icon}</div>
      <p class="rarity-tag">${RARITY[f.rarity]}</p><h3>${esc(f.name)}</h3>
      <p>${r.duplicate ? `You already had this one, so you got ${r.refund} coins back.` : 'New Forgeling unlocked.'}</p></div>
      <div class="actions-2">${r.duplicate ? '' : '<button class="btn btn-mint" data-a="use">Play as it</button>'}<button class="btn btn-ghost" data-a="ok">Nice</button></div>`);
    SFX.play(r.duplicate ? 'chest' : 'unlock');
    card.querySelector('[data-a=ok]').onclick = () => { closeOverlay(); openShop(); };
    const use = card.querySelector('[data-a=use]');
    if (use) use.onclick = async () => { await setAvatar(f.icon); closeOverlay(); openShop(); };
  } catch (e) { alert(e.message); }
}

async function setAvatar(icon) {
  const r = await api('/api/me/avatar', { body: { avatar: icon } });
  app.user = r.user;
  app.avatar.join = app.avatar.solo = icon;
}

// ---------- locker ----------
async function openLocker() {
  show('locker');
  await loadMe();
  const u = app.user;
  const next = (100 * u.level * (u.level + 1)) / 2;
  const prev = (100 * (u.level - 1) * u.level) / 2;
  const pct = Math.round(((u.xp - prev) / (next - prev)) * 100);
  $('locker-profile').innerHTML = `<div class="big-av">${u.avatar}</div>
    <div><strong>${esc(u.username)}</strong><span>Level ${u.level} · ${u.coins} coins</span>
    <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
    <span>${u.xp - prev} / ${next - prev} XP to level ${u.level + 1}</span>
    <span>${plural(u.gamesPlayed, 'game')} played · ${plural(u.wins, 'win')}</span></div>`;
  const grid = $('locker-grid');
  grid.innerHTML = '';
  const total = app.catalog.basic.length + app.catalog.collectibles.length;
  const ownedCount = app.catalog.basic.length + app.catalog.collectibles.filter(c => u.forgelings[c.id]).length;
  grid.insertAdjacentHTML('beforeend', `<p class="collection-total">${ownedCount} of ${total} collected</p>`);
  const groups = [['starter', 'Starters', '🤖', app.catalog.basic.map(icon => ({ icon, name: 'Starter', rarity: 'common', owned: true }))]];
  for (const [id, pack] of Object.entries(app.catalog.packs)) {
    if (id === 'mystery') continue;
    groups.push([id, pack.name, pack.icon, app.catalog.collectibles.filter(c => c.packs.includes(id)).map(c => ({ ...c, owned: !!u.forgelings[c.id] }))]);
  }
  for (const [id, name, icon, list] of groups) {
    const got = list.filter(f => f.owned).length;
    const sec = document.createElement('section');
    sec.className = 'collection-group';
    sec.innerHTML = `<h3>${icon} ${esc(name)} <span class="muted">${got}/${list.length}</span></h3><div class="collection"></div>`;
    const box = sec.querySelector('.collection');
    for (const f of list) {
      const b = document.createElement('button');
      b.className = `forgeling rarity-${f.rarity}${f.owned ? '' : ' locked'}`;
      b.setAttribute('aria-pressed', String(u.avatar === f.icon));
      b.disabled = !f.owned;
      b.innerHTML = `<span class="f-icon">${f.owned ? f.icon : '?'}</span><span class="f-name">${f.owned ? esc(f.name) : RARITY[f.rarity]}</span>`;
      b.onclick = async () => { await setAvatar(f.icon); SFX.play('click'); openLocker(); };
      box.appendChild(b);
    }
    grid.appendChild(sec);
  }
}

// ---------- history ----------
async function openHistory() {
  show('history');
  const list = $('history-list');
  list.innerHTML = '<li>Loading…</li>';
  const games = await api('/api/history');
  list.innerHTML = games.length ? '' : '<li>No games yet. Host or play a solo game while logged in and it shows up here.</li>';
  for (const g of games) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="info"><strong>${esc(g.setTitle)}</strong><span>${MODES[g.mode]?.name || g.mode}${g.solo ? ' · solo' : ''} · ${new Date(g.date).toLocaleString()} · ${plural(g.players, 'player')}${g.winner ? ' · won by ' + esc(g.winner) : ''}</span></div>
      <button class="btn btn-ghost btn-small">View</button>`;
    li.querySelector('button').onclick = async () => {
      const d = await api('/api/history/' + encodeURIComponent(g.id));
      app.review = null;
      $('res-rewards').hidden = true;
      $('res-review').hidden = true;
      renderResults({ mode: d.mode, standings: d.players, winnerTeam: d.winnerTeam, stats: d.stats, title: d.setTitle, sub: `${MODES[d.mode]?.name || d.mode} · ${new Date(d.date).toLocaleString()} · ${fmtTime(d.length)} long`, showStats: true, fromHistory: true });
      show('results');
    };
    list.appendChild(li);
  }
}

// ---------- settings ----------
async function openSettings() {
  $('set-sound').checked = SFX.prefs.sound;
  $('set-music').checked = SFX.prefs.music;
  $('set-readaloud').checked = readAloud.auto;
  $('set-volume').value = SFX.prefs.volume;
  $('set-ai-error').textContent = '';
  show('settings');
  const box = $('set-ai');
  if (!app.user) {
    box.querySelectorAll('input, select, button').forEach(x => { x.disabled = true; });
    $('set-ai-status').textContent = 'Log in to save your own AI key.';
  } else {
    box.querySelectorAll('input, select, button').forEach(x => { x.disabled = false; });
    try { app.info.ai = await api('/api/ai/status'); } catch {}
    const ai = app.info.ai;
    const line = p => `${p === 'anthropic' ? 'Claude' : 'Gemini'}: ${ai.mine[p] ? 'your key is saved' : ai.server[p] ? 'using the shared server key' : 'not set up'}`;
    $('set-ai-status').textContent = `${line('anthropic')}. ${line('gemini')}.`;
    if (ai.preferred) $('set-ai-provider').value = ai.preferred;
  }
  $('set-about').textContent = `QuizForge · storage: ${app.info?.storage === 'postgres' ? 'online database' : 'this computer'}${app.info?.ai?.available ? ' · AI on' : ''}`;
}
$('set-sound').onchange = e => SFX.set('sound', e.target.checked);
$('set-music').onchange = e => { SFX.set('music', e.target.checked); if (e.target.checked) { SFX.playTrack('lobby'); setTimeout(() => { if ($('s-settings').classList.contains('active')) SFX.stopMusic(); }, 4000); } };
$('set-volume').oninput = e => { SFX.set('volume', e.target.value); SFX.play('click'); };
$('set-readaloud').onchange = e => { readAloud.auto = e.target.checked; if (e.target.checked) readAloud.speak({ q: 'Questions will be read out loud.', type: 'type' }); };
async function saveAiKey(key) {
  try {
    await api('/api/me/ai-key', { body: { provider: $('set-ai-provider').value, key } });
    $('set-ai-key').value = '';
    SFX.play(key ? 'unlock' : 'click');
    openSettings();
  } catch (e) { $('set-ai-error').textContent = e.message; }
}
$('set-ai-save').onclick = () => {
  if (!$('set-ai-key').value.trim()) return ($('set-ai-error').textContent = 'Paste your key first.');
  saveAiKey($('set-ai-key').value);
};
$('set-ai-remove').onclick = () => saveAiKey('');

// ---------- homework (teacher) ----------
const HW_MODES = ['classic', 'race', 'climb', 'blitz', 'gold', 'spin', 'dig', 'fishing', 'factory', 'territory', 'boss'];
let hwSets = [];

async function openHomework() {
  show('homework');
  $('hw-error').textContent = '';
  $('hw-mode').innerHTML = HW_MODES.map(m => `<option value="${m}">${MODES[m].icon} ${MODES[m].name}</option>`).join('');
  try {
    const d = await api('/api/sets');
    hwSets = [...d.mine.map(s => ({ ...s, group: 'Your sets' })), ...d.public.map(s => ({ ...s, group: s.subject || 'Other' }))];
  } catch { hwSets = []; }
  renderHwSetOptions();
  try {
    const c = await api('/api/classes');
    $('hw-class').innerHTML = '<option value="">Anyone with the code</option>' + c.teaching.map(k => `<option value="${esc(k.id)}">🏫 ${esc(k.name)} (${plural(k.students, 'student')})</option>`).join('');
    if (app.hwClassPreset) $('hw-class').value = app.hwClassPreset;
  } catch {}
  app.hwClassPreset = null;
  renderHwList();
}

function renderHwSetOptions() {
  const q = $('hw-search').value.trim().toLowerCase();
  const sel = $('hw-set');
  const keep = sel.value;
  const groups = {};
  for (const s of hwSets) {
    if (q && !`${s.title} ${s.subject} ${s.description || ''}`.toLowerCase().includes(q)) continue;
    (groups[s.group] = groups[s.group] || []).push(s);
  }
  sel.innerHTML = Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(s => `<option value="${esc(s.id)}">${esc(s.title)} (${s.count}, ${s.grade && s.grade !== 'Any' ? 'gr ' + esc(s.grade) : 'any grade'}, ${DIFF_LABEL[s.difficulty] || 'Medium'})</option>`).join('')}</optgroup>`).join('')
    || '<option value="">No sets match</option>';
  if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
}
$('hw-search').addEventListener('input', renderHwSetOptions);

async function renderHwList() {
  const list = $('hw-list');
  list.innerHTML = '<li>Loading…</li>';
  const items = await api('/api/homework');
  list.innerHTML = items.length ? '' : '<li>No assignments yet. Create one above.</li>';
  for (const h of items) {
    const li = document.createElement('li');
    const due = h.due ? new Date(h.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'no due date';
    li.innerHTML = `<div class="info"><strong>${esc(h.title)}</strong><span>${h.className ? '🏫 ' + esc(h.className) + ' · ' : ''}${esc(h.setTitle)} · ${MODES[h.mode]?.name || h.mode} · due ${due} · ${plural(h.students, 'student')}</span></div>
      <span class="code-pill">${h.code}</span>
      <button class="btn btn-sun btn-small">Report</button>`;
    li.querySelector('button').onclick = () => openHwReport(h.id);
    list.appendChild(li);
  }
}

$('hw-create').onclick = async () => {
  $('hw-error').textContent = '';
  if (!$('hw-set').value) return ($('hw-error').textContent = 'Pick a question set.');
  try {
    const hw = await api('/api/homework', { body: { setId: $('hw-set').value, mode: $('hw-mode').value, title: $('hw-title').value, due: $('hw-due').value || null, classId: $('hw-class').value || null } });
    $('hw-title').value = '';
    SFX.play('unlock');
    openHwReport(hw.id);
  } catch (e) { $('hw-error').textContent = e.message; }
};

async function openHwReport(id) {
  show('hw-report');
  $('hwr-title').textContent = 'Loading…';
  ['hwr-code', 'hwr-summary', 'hwr-students', 'hwr-questions'].forEach(x => { $(x).innerHTML = ''; });
  const r = await api('/api/homework/' + encodeURIComponent(id));
  const a = r.assignment;
  $('hwr-title').textContent = a.title;
  const link = `${location.origin}/?hw=${a.code}`;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  $('hwr-code').innerHTML = `<div><span class="card-label">Homework code</span><div class="hw-code">${a.code}</div></div>
    <div class="hw-code-info"><span>${esc(a.setTitle)} · ${plural(a.count, 'question')} · ${MODES[a.mode]?.icon || ''} ${MODES[a.mode]?.name || a.mode}</span>
    <span>${a.due ? 'Due ' + new Date(a.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date'}</span>
    <span class="muted">Students: open QuizForge, select Join a game, and type this code.</span>
    ${local ? '' : `<button class="btn btn-ghost btn-small" id="hwr-copy">Copy link</button>`}</div>`;
  const copy = $('hwr-copy');
  if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(link); copy.textContent = 'Copied!'; } catch { prompt('Copy this link:', link); } };
  renderShare($('hwr-share'), link, `Homework: ${a.title}`, `Play this QuizForge homework. Code: ${a.code}`);
  const sm = r.summary;
  $('hwr-summary').innerHTML = [[sm.students, sm.students === 1 ? 'student started' : 'students started'], [sm.finished + (sm.classSize ? ` / ${sm.classSize}` : ''), 'finished'], [sm.average === null ? '–' : sm.average + '%', 'class average'], [r.questions.length, 'questions answered']]
    .map(([n, l]) => `<div><strong>${n}</strong><span>${l}</span></div>`).join('');
  $('hwr-students').innerHTML = r.students.length
    ? `<thead><tr><th>Student</th><th>Score</th><th>Right</th><th>Status</th><th>Attempts</th><th>Last played</th></tr></thead><tbody>${r.students.map(s => s.notStarted ? `<tr class="not-started"><td>${esc(s.name)}</td><td>–</td><td>–</td><td>❌ Not started</td><td>0</td><td>–</td></tr>` : `<tr>
        <td><button class="link student-link" data-key="${esc(s.key)}">${esc(s.name)}</button>${s.account ? ' <span class="badge">account</span>' : ''}</td>
        <td><span class="score ${s.pct >= 80 ? 'hi' : s.pct >= 60 ? 'mid' : 'lo'}">${s.pct}%</span></td>
        <td>${s.correct}/${s.total}</td>
        <td>${s.complete ? (s.late ? '<span class="late">Done, late</span>' : '✅ Done') : `⏳ ${s.answered}/${s.total} answered`}</td>
        <td>${s.attempts}</td>
        <td>${new Date(s.lastAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td></tr>`).join('')}</tbody>`
    : '<tbody><tr><td>No one has started yet. Share the code above.</td></tr></tbody>';
  $('hwr-students').querySelectorAll('.student-link').forEach(b => b.onclick = () => openHwStudent(a.id, b.dataset.key, () => openHwReport(a.id)));
  $('hwr-questions').innerHTML = r.questions.length ? r.questions.map(q => {
    const tot = q.right + q.wrong;
    const pct = Math.round((q.right / tot) * 100);
    return `<li class="${pct < 60 ? 'low' : ''}"><span>${mathHTML(q.q)}</span><span><div class="acc-bar"><div class="acc-fill" style="width:${pct}%"></div></div>${pct}% right (${q.right}/${tot})</span></li>`;
  }).join('') : '<li>Results show up here once students start.</li>';
  $('hwr-delete').onclick = async () => {
    if (!confirm(`Delete "${a.title}" and all its results? This can’t be undone.`)) return;
    await api('/api/homework/' + encodeURIComponent(a.id), { method: 'DELETE' });
    openHomework();
  };
}

// ---------- sharing ----------
function isLocal() { return ['localhost', '127.0.0.1'].includes(location.hostname); }
function renderShare(el, url, title, body) {
  if (!el) return;
  if (isLocal()) { el.innerHTML = '<span class="hint">Sharing links work on the online version.</span>'; return; }
  const gc = `https://classroom.google.com/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  el.innerHTML = `<a class="btn btn-mint btn-small gc-btn" href="${gc}" target="_blank" rel="noopener">🎓 Share to Google Classroom</a>
    <button class="btn btn-ghost btn-small" data-copy>🔗 Copy link</button>`;
  el.querySelector('[data-copy]').onclick = async e => {
    try { await navigator.clipboard.writeText(url); e.target.textContent = '✅ Copied'; } catch { prompt('Copy this link:', url); }
  };
}

// ---------- report a set ----------
async function reportFlow(set) {
  let reasons = {};
  try { reasons = await api('/api/report-reasons'); } catch {}
  const card = overlay(`<h3>Report “${esc(set.title)}”</h3>
    <p class="hint">Reports go to the QuizForge team. Sets that get several reports are hidden until we check them.</p>
    <div class="report-reasons">${Object.entries(reasons).map(([k, v], i) => `<label class="check"><input type="radio" name="rr" value="${k}" ${i === 0 ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
    <label class="field">Anything else? (optional)<textarea id="rr-details" maxlength="500" rows="3"></textarea></label>
    <p class="error" id="rr-error"></p>
    <div class="actions-2"><button class="btn btn-ghost" data-a="cancel">Cancel</button><button class="btn btn-coral" data-a="send">Send report</button></div>`);
  card.querySelector('[data-a=cancel]').onclick = closeOverlay;
  card.querySelector('[data-a=send]').onclick = async () => {
    const reason = card.querySelector('input[name=rr]:checked')?.value;
    try {
      await api(`/api/sets/${encodeURIComponent(set.id)}/report`, { body: { reason, details: $('rr-details').value } });
      overlay('<p class="big-result">Thanks, report sent</p>');
      setTimeout(closeOverlay, 1200);
    } catch (e) { $('rr-error').textContent = e.message; }
  };
}

// ---------- classes ----------
async function openClasses() {
  if (!app.user) return openAuth('login', 'Log in to use Classes.');
  show('classes');
  $('cls-join-error').textContent = '';
  $('cls-new-error').textContent = '';
  if (app.pendingClassCode) { $('cls-join-code').value = app.pendingClassCode; app.pendingClassCode = null; }
  const data = await api('/api/classes');
  const enr = $('cls-enrolled');
  enr.innerHTML = data.enrolled.length ? '' : '<p class="hint">You haven’t joined any classes yet. Ask your teacher for the class code.</p>';
  for (const c of data.enrolled) {
    const box = document.createElement('div');
    box.className = 'card class-card';
    const todo = c.homework.filter(h => h.status !== 'done').length;
    box.innerHTML = `<div class="row-between"><div><strong>🏫 ${esc(c.name)}</strong><span class="muted"> · ${esc(c.teacher)}</span></div>
      <button class="link" data-leave>Leave</button></div>
      <p class="muted">${c.homework.length ? (todo ? `${plural(todo, 'assignment')} to do` : 'All caught up ✅') : 'No homework yet'}</p>
      <ul class="hw-todo">${c.homework.map(h => `<li class="st-${h.status}">
        <div><strong>${esc(h.title)}</strong><span class="muted">${esc(h.setTitle)} · ${plural(h.count, 'question')} · ${MODES[h.mode]?.icon || ''} ${MODES[h.mode]?.name || ''}${h.due ? ` · due ${new Date(h.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</span></div>
        <span class="hw-status">${h.status === 'done' ? `✅ ${h.pct}%` : h.status === 'started' ? '⏳ Started' : h.late ? '<b class="late">Late</b>' : ''}</span>
        <button class="btn ${h.status === 'done' ? 'btn-ghost' : 'btn-sun'} btn-small" data-code="${h.code}">${h.status === 'done' ? 'Play again' : h.status === 'started' ? 'Continue' : 'Start'}</button>
      </li>`).join('')}</ul>`;
    box.querySelector('[data-leave]').onclick = async () => {
      if (!confirm(`Leave ${c.name}?`)) return;
      await api(`/api/classes/${encodeURIComponent(c.id)}/leave`, { method: 'POST' });
      openClasses();
    };
    box.querySelectorAll('[data-code]').forEach(b => b.onclick = () => startHomework(b.dataset.code, app.user.username));
    enr.appendChild(box);
  }
  const t = $('cls-teaching');
  t.innerHTML = data.teaching.length ? '' : '<li>Make a class to give your students one code they join once.</li>';
  for (const c of data.teaching) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="info"><strong>🏫 ${esc(c.name)}</strong><span>${plural(c.students, 'student')}</span></div><span class="code-pill">${c.code}</span><button class="btn btn-sun btn-small">Open</button>`;
    li.querySelector('button').onclick = () => openClass(c.id);
    t.appendChild(li);
  }
}

$('cls-join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('cls-join').onclick = async () => {
  try {
    const r = await api('/api/classes/join', { body: { code: $('cls-join-code').value } });
    $('cls-join-code').value = '';
    SFX.play('unlock');
    if (r.already) $('cls-join-error').textContent = `You’re already in ${r.class.name}.`;
    openClasses();
  } catch (e) { $('cls-join-error').textContent = e.message; }
};
$('cls-create').onclick = async () => {
  try {
    const c = await api('/api/classes', { body: { name: $('cls-new-name').value } });
    $('cls-new-name').value = '';
    SFX.play('unlock');
    openClass(c.id);
  } catch (e) { $('cls-new-error').textContent = e.message; }
};

async function openClass(id) {
  show('class');
  $('cl-name').textContent = 'Loading…';
  $('cl-roster').innerHTML = '';
  $('cl-hw').innerHTML = '';
  const c = await api('/api/classes/' + encodeURIComponent(id));
  $('cl-name').textContent = '🏫 ' + c.name;
  $('cl-code').innerHTML = `<div><span class="card-label">Class code</span><div class="hw-code">${c.code}</div></div>
    <div class="hw-code-info"><span>${plural(c.students, 'student')}</span>
    <span class="muted">Students: log in, open Classes on the home screen, and type this code once.</span></div>`;
  renderShare($('cl-share'), `${location.origin}/?class=${c.code}`, `Join my QuizForge class: ${c.name}`, `Log in to QuizForge and join with code ${c.code}`);
  $('cl-hw').innerHTML = c.assignments.length ? '' : '<li>No homework yet. Assign some and everyone in the class sees it.</li>';
  for (const h of c.assignments) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="info"><strong>${esc(h.title)}</strong><span>${MODES[h.mode]?.name || h.mode}${h.due ? ' · due ' + new Date(h.due).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''} · ${h.done}/${c.students} done</span></div><span class="code-pill">${h.code}</span><button class="btn btn-ghost btn-small">Report</button>`;
    li.querySelector('button').onclick = () => openHwReport(h.id);
    $('cl-hw').appendChild(li);
  }
  $('cl-roster-title').textContent = `Students (${c.students})`;
  $('cl-roster').innerHTML = c.roster.length ? '' : '<li>No students yet. Share the class code.</li>';
  for (const st of c.roster) {
    const li = document.createElement('li');
    li.className = 'roster-row';
    li.innerHTML = `<div class="info"><strong>${esc(st.username)}</strong><span>joined ${new Date(st.joinedAt).toLocaleDateString()}</span></div><button class="btn btn-sun btn-small" data-view>View work</button><button class="btn btn-ghost btn-small" data-remove>Remove</button>`;
    li.querySelector('[data-view]').onclick = () => openClassStudent(c.id, st.userId);
    li.querySelector('.info').onclick = () => openClassStudent(c.id, st.userId);
    li.querySelector('[data-remove]').onclick = async () => {
      if (!confirm(`Remove ${st.username} from ${c.name}?`)) return;
      await api(`/api/classes/${encodeURIComponent(c.id)}/students/${encodeURIComponent(st.userId)}`, { method: 'DELETE' });
      openClass(c.id);
    };
    $('cl-roster').appendChild(li);
  }
  $('cl-assign').onclick = () => { app.hwClassPreset = c.id; openHomework(); };
  $('cl-delete').onclick = async () => {
    if (!confirm(`Delete ${c.name}? Students are removed from it. Homework you assigned stays in your Homework list.`)) return;
    await api('/api/classes/' + encodeURIComponent(c.id), { method: 'DELETE' });
    openClasses();
  };
}

// ---------- one student's work (teacher) ----------
const fmtWhen = t => (t ? new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const tileHTML = (n, l, cls = '') => `<div class="tile ${cls}"><strong>${n}</strong><span>${l}</span></div>`;

function attemptHTML(at, { open } = {}) {
  const stats = `<div class="att-stats">
    <span class="score ${at.pct >= 80 ? 'hi' : at.pct >= 60 ? 'mid' : 'lo'}">${at.pct}%</span>
    <span class="good">✓ ${at.firstTryRight} right</span><span class="bad">✗ ${at.firstTryWrong} wrong</span>
    <span>${at.answered}/${at.total} answered</span>
    <span>${at.accuracy}% accuracy</span>
    ${at.bestStreak ? `<span>🔥 best streak ${at.bestStreak}</span>` : ''}
    <span class="muted">${at.complete ? (at.late ? '<b class="late">Done late</b>' : '✅ Done') : '⏳ Unfinished'} · ${fmtWhen(at.finishedAt)}</span>
  </div>`;
  const qs = at.details.length ? `<ol class="work-list">${at.details.map(d => `<li class="${d.correct ? 'ok' : 'miss'}">
      <span class="mark">${d.correct ? '✓' : '✗'}</span>
      <div><div class="wq">${d.q ? mathHTML(d.q) : 'Picture question'}${d.img ? ' <small class="muted">(picture)</small>' : ''}</div>
      ${d.given !== null && d.given !== undefined ? `<div class="wa">Answered: <b>${mathHTML(d.given || '(blank)')}</b></div>` : ''}
      ${!d.correct && d.right ? `<div class="wr">Correct answer: <b>${mathHTML(d.right)}</b></div>` : ''}</div>
    </li>`).join('')}</ol>` : '<p class="hint">No questions answered yet.</p>';
  return `${stats}<details class="work-details" ${open ? 'open' : ''}><summary>Show every question</summary>${qs}</details>`;
}

async function openClassStudent(classId, userId) {
  show('student');
  $('sw-title').textContent = 'Loading…';
  $('sw-sub').textContent = '';
  $('sw-tiles').innerHTML = '';
  $('sw-list').innerHTML = '';
  $('sw-back').textContent = 'Back to class';
  $('sw-back').onclick = () => openClass(classId);
  const r = await api(`/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(userId)}`);
  const sm = r.summary;
  $('sw-title').textContent = '👤 ' + r.student.username;
  $('sw-sub').textContent = `${r.className} · joined ${new Date(r.student.joinedAt).toLocaleDateString()}`;
  $('sw-tiles').innerHTML = tileHTML(`${sm.done}/${sm.assigned}`, 'homework done') + tileHTML(sm.average === null ? '–' : sm.average + '%', 'average score')
    + tileHTML(sm.accuracy === null ? '–' : sm.accuracy + '%', 'accuracy') + tileHTML(`<span class="good">✓ ${sm.right}</span> <span class="bad">✗ ${sm.wrong}</span>`, 'right / wrong answers');
  $('sw-list').innerHTML = r.assignments.length ? r.assignments.map(a => `<div class="card work-card">
      <div class="row-between"><div><strong>${esc(a.title)}</strong> <span class="muted">${esc(a.setTitle)} · ${MODES[a.mode]?.name || a.mode}${a.due ? ' · due ' + fmtWhen(a.due) : ''}</span></div>
      <span class="muted">${plural(a.attempts, 'attempt')}</span></div>
      ${a.best ? attemptHTML(a.best) : '<p class="not-started-note">❌ Not started yet</p>'}
    </div>`).join('') : '<p class="hint">No homework assigned to this class yet.</p>';
}

async function openHwStudent(hwId, key, back) {
  show('student');
  $('sw-title').textContent = 'Loading…';
  $('sw-sub').textContent = '';
  $('sw-tiles').innerHTML = '';
  $('sw-list').innerHTML = '';
  $('sw-back').textContent = 'Back to report';
  $('sw-back').onclick = back;
  const r = await api(`/api/homework/${encodeURIComponent(hwId)}/student?key=${encodeURIComponent(key)}`);
  const name = r.attempts[0] ? r.attempts[0].name : key.slice(2);
  $('sw-title').textContent = '👤 ' + name;
  $('sw-sub').textContent = `${r.assignment.title} · ${r.assignment.setTitle}${r.assignment.className ? ' · ' + r.assignment.className : ''}`;
  if (!r.attempts.length) { $('sw-list').innerHTML = '<p class="not-started-note">❌ Hasn’t started this homework yet.</p>'; return; }
  const best = [...r.attempts].sort((a, b) => (b.complete - a.complete) || (b.pct - a.pct))[0];
  $('sw-tiles').innerHTML = tileHTML(best.pct + '%', 'best score') + tileHTML(best.accuracy + '%', 'accuracy')
    + tileHTML(`<span class="good">✓ ${best.firstTryRight}</span> <span class="bad">✗ ${best.firstTryWrong}</span>`, 'right / wrong') + tileHTML(r.attempts.length, r.attempts.length === 1 ? 'attempt' : 'attempts');
  $('sw-list').innerHTML = r.attempts.map((at, i) => `<div class="card work-card">
      <div class="row-between"><strong>${at === best ? '⭐ Best attempt' : 'Attempt ' + (r.attempts.length - i)}</strong><span class="muted">${fmtWhen(at.startedAt)}</span></div>
      ${attemptHTML(at, { open: at === best })}</div>`).join('');
}

// ---------- admin ----------
let adminTab = 'stats';
async function openAdmin() {
  if (!app.user || !app.user.isAdmin) return show('home');
  show('admin');
  showAdminTab(adminTab);
}
document.querySelectorAll('[data-atab]').forEach(t => t.onclick = () => showAdminTab(t.dataset.atab));

function showAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('[data-atab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.atab === tab)));
  ['stats', 'reports', 'users'].forEach(k => { $('adm-' + k).hidden = k !== tab; });
  if (tab === 'stats') loadAdminStats();
  if (tab === 'reports') loadAdminReports();
  if (tab === 'users') loadAdminUsers();
}

async function loadAdminStats() {
  const el = $('adm-stats');
  el.innerHTML = '<p class="hint">Loading…</p>';
  const s = await api('/api/admin/stats');
  $('adm-report-count').textContent = s.reportsOpen ? s.reportsOpen : '';
  const tile = (n, l, cls = '') => `<div class="tile ${cls}"><strong>${n}</strong><span>${l}</span></div>`;
  const maxG = Math.max(1, ...s.days.map(d => d.games));
  const maxM = Math.max(1, ...s.modes.map(m => m[1]));
  el.innerHTML = `
    <div class="tiles">
      ${tile(s.live.players, 'playing right now', 'live')}${tile(s.live.games, 'games running now', 'live')}
      ${tile(s.games.today, 'games today')}${tile(s.games.week, 'games this week')}
      ${tile(s.games.playersWeek, 'players this week')}${tile(s.users.total, 'accounts')}
      ${tile(s.users.week, 'new accounts this week')}${tile(s.sets.published, 'community sets published')}
      ${tile(s.homework.assignments, 'homework assigned')}${tile(s.homework.submissions, 'homework attempts')}
      ${tile(s.homework.classes, 'classes')}${tile(s.reportsOpen, 'sets reported', s.reportsOpen ? 'warn' : '')}
    </div>
    <div class="card">
      <p class="card-label">Games per day (last 30 days)</p>
      <div class="day-chart">${s.days.map(d => `<div class="day" title="${d.date}: ${d.games} games, ${d.players} players, ${d.signups} sign-ups"><i style="height:${Math.round((d.games / maxG) * 100)}%"></i><span>${d.games || ''}</span></div>`).join('')}</div>
      <div class="chart-axis"><span>${s.days[0].date}</span><span>today</span></div>
    </div>
    <div class="admin-cols">
      <div class="card"><p class="card-label">Most played modes (30 days)</p>
        ${s.modes.length ? s.modes.map(([m, n]) => `<div class="hbar"><span>${MODES[m]?.icon || ''} ${MODES[m]?.name || m}</span><div><i style="width:${Math.round((n / maxM) * 100)}%"></i></div><b>${n}</b></div>`).join('') : '<p class="hint">No games yet.</p>'}
      </div>
      <div class="card"><p class="card-label">Most played sets</p>
        <ol class="top-sets">${s.topSets.filter(t => t.plays).map(t => `<li><span>${esc(t.title)}${t.official ? '' : ` <small class="muted">by ${esc(t.ownerName || '?')}</small>`}</span><b>${t.plays}</b></li>`).join('') || '<li class="hint">No plays yet.</li>'}</ol>
      </div>
    </div>
    <p class="hint">Sets: ${s.sets.official} official, ${s.sets.community} made by users (${s.sets.hidden} hidden). Banned accounts: ${s.users.banned}. Games include ones hosted by guests.</p>`;
}

async function loadAdminReports() {
  const el = $('adm-reports');
  el.innerHTML = '<p class="hint">Loading…</p>';
  const reps = await api('/api/admin/reports');
  $('adm-report-count').textContent = reps.length || '';
  let reasons = {};
  try { reasons = await api('/api/report-reasons'); } catch {}
  if (!reps.length) { el.innerHTML = '<p class="empty">No open reports. 🎉</p>'; return; }
  el.innerHTML = '';
  for (const r of reps) {
    const card = document.createElement('div');
    card.className = 'card report-card';
    card.innerHTML = `<div class="row-between"><div><strong>${esc(r.setTitle)}</strong> <span class="muted">by ${esc(r.ownerName)}</span>
      ${r.hidden ? '<span class="badge diff-hard">Hidden</span>' : '<span class="badge diff-easy">Visible</span>'}${r.official ? ' <span class="badge official">Official</span>' : ''}</div>
      <span class="report-count">⚑ ${r.count}</span></div>
      <p>${Object.entries(r.reasons).map(([k, n]) => `<span class="badge">${esc(reasons[k] || k)} × ${n}</span>`).join(' ')}</p>
      ${r.notes.length ? `<ul class="report-notes">${r.notes.slice(0, 5).map(n => `<li><b>${esc(n.by)}:</b> ${esc(n.text)}</li>`).join('')}</ul>` : ''}
      <div class="add-row">
        <button class="btn btn-ghost btn-small" data-act="preview">Preview</button>
        <button class="btn btn-mint btn-small" data-act="dismiss">Dismiss (it’s fine)</button>
        ${r.hidden ? '<button class="btn btn-ghost btn-small" data-act="unhide">Unhide</button>' : '<button class="btn btn-sun btn-small" data-act="hide">Hide from Discover</button>'}
        <button class="btn btn-coral btn-small" data-act="delete">Delete set</button>
      </div>`;
    card.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
      const act = b.dataset.act;
      if (act === 'preview') return previewSet(r.setId);
      if (act === 'delete' && !confirm(`Delete “${r.setTitle}” for good?`)) return;
      await api(`/api/admin/sets/${encodeURIComponent(r.setId)}/${act}`, { method: 'POST' });
      loadAdminReports();
    });
    el.appendChild(card);
  }
}

async function previewSet(id) {
  const set = await api('/api/admin/sets/' + encodeURIComponent(id));
  const card = overlay(`<h3>${esc(set.title)}</h3><p class="hint">${esc(set.description || '')} · by ${esc(set.ownerName || '?')}</p>
    <ol class="preview-list">${set.questions.map(q => `<li>${q.img ? `<img src="${q.img}" alt="">` : ''}<div>${mathHTML(q.q || '(picture)')}</div>
      <small class="muted">${q.type === 'type' ? 'Accepts: ' + q.accept.map(esc).join(', ') : q.a.map((a, i) => (q.c.includes(i) ? '✅ ' : '') + esc(a)).join(' · ')}</small></li>`).join('')}</ol>
    <button class="btn btn-ghost" data-close>Close</button>`);
  card.querySelector('[data-close]').onclick = closeOverlay;
}

let userSearchTimer = null;
$('adm-user-q').addEventListener('input', () => { clearTimeout(userSearchTimer); userSearchTimer = setTimeout(loadAdminUsers, 250); });
async function loadAdminUsers() {
  const users = await api('/api/admin/users?q=' + encodeURIComponent($('adm-user-q').value));
  const t = $('adm-user-table');
  t.innerHTML = `<thead><tr><th>User</th><th>Joined</th><th>Level</th><th>Games</th><th>Sets</th><th></th></tr></thead><tbody>${users.map(u => `<tr class="${u.banned ? 'not-started' : ''}">
    <td>${esc(u.username)}${u.admin ? ' <span class="badge official">admin</span>' : ''}${u.banned ? ' <span class="badge diff-hard">banned</span>' : ''}</td>
    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '–'}</td><td>${u.level}</td><td>${u.gamesPlayed}</td><td>${u.sets} (${u.published} public)</td>
    <td>${u.admin ? '' : `<button class="btn ${u.banned ? 'btn-ghost' : 'btn-coral'} btn-small" data-ban="${esc(u.id)}" data-to="${u.banned ? '0' : '1'}">${u.banned ? 'Unban' : 'Ban'}</button>`}</td></tr>`).join('') || '<tr><td>No users found.</td></tr>'}</tbody>`;
  t.querySelectorAll('[data-ban]').forEach(b => b.onclick = async () => {
    const banning = b.dataset.to === '1';
    if (banning && !confirm('Ban this account? They can’t log in and their published sets are hidden.')) return;
    await api(`/api/admin/users/${encodeURIComponent(b.dataset.ban)}/ban`, { body: { banned: banning } });
    loadAdminUsers();
  });
}

// ---------- boot ----------
(async () => {
  try { $('join-name').value = localStorage.getItem('qf-name') || ''; } catch {}
  const [info, catalog] = await Promise.all([api('/api/info').catch(() => null), api('/api/forgelings').catch(() => null), loadMe()]);
  app.info = info;
  app.catalog = catalog || { basic: ['🤖'], collectibles: [], packs: {} };
  renderAccountBar();
  show('home');
  const classCode = new URLSearchParams(location.search).get('class');
  if (classCode && /^[A-Za-z]{3}[0-9]{3}$/.test(classCode)) {
    app.pendingClassCode = classCode.toUpperCase();
    history.replaceState(null, '', location.pathname);
    if (app.user) openClasses(); else openAuth('login', 'Log in (or create an account) to join the class.');
  }
  const hw = new URLSearchParams(location.search).get('hw');
  if (hw && /^[A-Za-z]{6}$/.test(hw)) {
    openJoin();
    $('join-pin').value = hw.toUpperCase();
    $('join-pin').dispatchEvent(new Event('input'));
    $('join-name').focus();
    history.replaceState(null, '', location.pathname);
  }
})();