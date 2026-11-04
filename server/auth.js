// Accounts: username + password (scrypt), bearer-token sessions.
const crypto = require('crypto');
const dbm = require('./db');

const db = () => dbm.db;
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, coins: u.coins, xp: u.xp, level: levelFor(u.xp),
    avatar: u.avatar, forgelings: u.forgelings, gamesPlayed: u.gamesPlayed || 0, wins: u.wins || 0,
    dailyReady: u.lastDaily !== new Date().toISOString().slice(0, 10),
  };
}

// level n needs 100 * n * (n + 1) / 2 xp in total
function levelFor(xp = 0) {
  let n = 1;
  while (xp >= (100 * n * (n + 1)) / 2) n++;
  return n;
}

function validUsername(name) {
  return /^[A-Za-z0-9_]{3,20}$/.test(name);
}

async function register(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (!validUsername(username)) throw new Error('Usernames are 3 to 20 letters, numbers or underscores.');
  if (require('./namefilter').isBadName(username)) throw new Error('Please pick a different username.');
  if (password.length < 6) throw new Error('Passwords need at least 6 characters.');
  if (await db().findOne('users', 'username', username)) throw new Error('That username is taken.');
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: crypto.randomUUID(), username, salt, passHash: hash(password, salt), createdAt: Date.now(),
    coins: 200, xp: 0, avatar: '🤖', forgelings: {}, gamesPlayed: 0, wins: 0, lastDaily: null,
  };
  await db().put('users', user.id, user, user.id);
  return createSession(user);
}

async function login(username, password) {
  const hit = await db().findOne('users', 'username', String(username || '').trim());
  if (!hit) throw new Error('Wrong username or password.');
  const u = hit.data;
  const attempt = Buffer.from(hash(String(password || ''), u.salt), 'hex');
  if (!crypto.timingSafeEqual(attempt, Buffer.from(u.passHash, 'hex'))) throw new Error('Wrong username or password.');
  return createSession(u);
}

async function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await db().put('sessions', token, { userId: user.id, created: Date.now() }, user.id);
  return { token, user: publicUser(user) };
}

async function userFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  const s = await db().get('sessions', token);
  if (!s) return null;
  return db().get('users', s.userId);
}

async function logout(token) {
  if (token) await db().del('sessions', token);
}

async function saveUser(u) {
  await db().put('users', u.id, u, u.id);
}

// Express middleware: req.user (full record) or null
function middleware() {
  return async (req, res, next) => {
    const m = /^Bearer (\w+)$/.exec(req.get('authorization') || '');
    try { req.user = m ? await userFromToken(m[1]) : null; } catch { req.user = null; }
    req.token = m ? m[1] : null;
    next();
  };
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Log in to do that.' });
  next();
}

module.exports = { register, login, logout, userFromToken, saveUser, publicUser, levelFor, middleware, requireUser };