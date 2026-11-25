// Sign in with ByteForge Account, and reporting QuizForge progress to the ByteForge profile.
const crypto = require('crypto');
const { ByteForgeServer } = require('../byteforge/byteforge-auth-node');
const dbm = require('./db');

const ISSUER = (process.env.BYTEFORGE_ISSUER || 'https://byteforge-account.onrender.com').replace(/\/+$/, '');
const CLIENT_ID = 'quizforge';
const bf = new ByteForgeServer({ issuer: ISSUER, clientId: CLIENT_ID, apiKey: process.env.BYTEFORGE_API_KEY || '' });
const db = () => dbm.db;

function statCard(u) {
  const { levelFor } = require('./auth');
  const { COLLECTIBLES } = require('./progress');
  const out = { Level: levelFor(u.xp || 0) };
  if (u.gamesPlayed) out.Games = u.gamesPlayed;
  if (u.wins) out.Wins = u.wins;
  const owned = COLLECTIBLES.filter(c => u.forgelings && u.forgelings[c.id]).length;
  if (owned) out.Forgelings = owned;
  out['QuizForge XP'] = u.xp || 0;
  return out;
}

// Verifies a ByteForge access token and returns the QuizForge user (created on first sign-in).
async function signIn(accessToken) {
  let claims;
  try { claims = await bf.verify(String(accessToken || '')); }
  catch { const e = new Error('ByteForge sign-in failed. Please try again.'); e.status = 401; throw e; }
  const taken = async name => !!(await db().findOne('users', 'username', name));
  let hit = await db().findOne('users', 'bfId', claims.sub);
  let u = hit && hit.data.bfId === claims.sub ? hit.data : null;
  // Offline / Wi-Fi mode on your own computer: a local account with the same name becomes yours.
  if (!u && db().kind === 'file') {
    const local = await db().findOne('users', 'username', claims.username);
    if (local && !local.data.bfId) { u = local.data; delete u.salt; delete u.passHash; u.bfId = claims.sub; }
  }
  let created = false;
  if (!u) {
    let name = claims.username;
    for (let i = 2; await taken(name); i++) name = (claims.username.slice(0, 17) + i).slice(0, 20);
    u = { id: crypto.randomUUID(), username: name, bfId: claims.sub, createdAt: Date.now(), coins: 200, xp: 0, avatar: '🤖', forgelings: {}, gamesPlayed: 0, wins: 0, lastDaily: null };
    created = true;
  } else if (u.username !== claims.username && !(await taken(claims.username))) {
    // Use the ByteForge username in QuizForge too (old name kept for reference).
    (u.formerNames = u.formerNames || []).push(u.username);
    u.username = claims.username;
  }
  if (u.banned) { const e = new Error('This account has been suspended.'); e.status = 403; throw e; }
  u.bfRole = claims.role || 'user';
  await db().put('users', u.id, u, u.id);
  return { user: u, created, byteforge: { id: claims.sub, profileUrl: `${ISSUER}/u/${encodeURIComponent(claims.username)}` } };
}

// Never blocks a game: failures are only logged.
function send(events) {
  if (!bf.apiKey || !events.length) return;
  bf.sendEvents(events).catch(e => console.warn('[byteforge] events not sent:', e.message));
}
function reportGame(user, xpGained) {
  if (!user || !user.bfId || !(xpGained > 0)) return;
  send([{ user_id: user.bfId, type: 'xp', xp: Math.min(250, Math.ceil(xpGained / 10)), stats: statCard(user) }]);
}
function reportForgeling(user, c) {
  if (!user || !user.bfId || !c) return;
  send([{ user_id: user.bfId, type: 'achievement', event_id: `qf-forgeling-${user.bfId}-${c.id}`, achievement: { id: `forgeling-${c.id}`, name: `Forgeling: ${c.name}`, description: `Collected ${c.name} (${c.rarity}).`, icon: c.icon }, stats: statCard(user) }]);
}

module.exports = { ISSUER, CLIENT_ID, signIn, reportGame, reportForgeling, statCard, bf };
