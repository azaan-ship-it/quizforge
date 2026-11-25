// Accounts: ByteForge Account sign-in, bearer-token sessions.
const crypto = require('crypto');
const dbm = require('./db');

const db = () => dbm.db;

function isAdmin(u) {
  if (!u) return false;
  const admins = String(process.env.ADMIN_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return u.bfRole === 'admin' || admins.includes(String(u.username).toLowerCase());
}

function publicUser(u) {
  if (!u) return null;
  return {
    isAdmin: isAdmin(u),
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

// Accounts are ByteForge Accounts now ("Sign in with ByteForge"). Old clients get a clear message.
function gone() {
  const e = new Error('QuizForge now uses ByteForge Account. Refresh the page (or update the QuizForge app) and choose Sign in with ByteForge.');
  e.status = 410;
  throw e;
}
async function register() { gone(); }
async function login() { gone(); }

async function signInWithByteForge(accessToken) {
  const r = await require('./byteforge').signIn(accessToken);
  return { ...(await createSession(r.user)), created: r.created, byteforge: r.byteforge };
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
  const u = await db().get('users', s.userId);
  return u && !u.banned ? u : null;
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

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admins only.' });
  next();
}

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Log in to do that.' });
  next();
}

module.exports = { register, login, signInWithByteForge, logout, userFromToken, saveUser, publicUser, levelFor, middleware, requireUser, requireAdmin, isAdmin };
