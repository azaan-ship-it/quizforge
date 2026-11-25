/*!
 * byteforge-auth (Node + Electron) v1.0.0. No dependencies. Needs Node 18+.
 *
 * On your app SERVER:
 *   const { ByteForgeServer } = require('./byteforge-auth-node');
 *   const bf = new ByteForgeServer({ issuer: process.env.BYTEFORGE_ISSUER, clientId: 'typeforge', apiKey: process.env.BYTEFORGE_API_KEY });
 *   const claims = await bf.verify(accessToken);          // { sub, username, role, ... } or throws
 *   app.get('/api/me', bf.middleware(), (req, res) => res.json(req.byteforge));
 *   await bf.sendEvent(claims.sub, { type: 'game_finished', result: 'win', xp: 40 });
 *
 * In an ELECTRON main process (desktop sign-in through the system browser):
 *   const { signInDesktop, refreshTokens, revokeToken } = require('./byteforge-auth-node');
 *   const tokens = await signInDesktop({ issuer, clientId: 'typeforge', openExternal: (url) => shell.openExternal(url) });
 */
'use strict';

const crypto = require('crypto');
const http = require('http');

const trimIssuer = (s) => String(s || '').replace(/\/+$/, '');

// ---------------------------------------------------------------- tokens
class ByteForgeServer {
  constructor({ issuer, clientId, apiKey, audiences } = {}) {
    if (!issuer) throw new Error('ByteForgeServer needs issuer');
    this.issuer = trimIssuer(issuer);
    this.clientId = clientId;
    this.audiences = audiences || (clientId ? [clientId] : null);
    this.apiKey = apiKey;
    this._keys = null;
    this._keysAt = 0;
  }

  async _jwks(force) {
    if (!force && this._keys && Date.now() - this._keysAt < 3600_000) return this._keys;
    const r = await fetch(`${this.issuer}/.well-known/jwks.json`);
    if (!r.ok) throw new Error(`Could not load ByteForge keys (${r.status})`);
    const { keys } = await r.json();
    this._keys = new Map(keys.map((k) => [k.kid, crypto.createPublicKey({ key: k, format: 'jwk' })]));
    this._keysAt = Date.now();
    return this._keys;
  }

  /** Verifies a ByteForge access token locally with the cached JWKS. Throws if invalid. */
  async verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) throw new Error('invalid_token');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url'));
    if (header.alg !== 'RS256') throw new Error('invalid_token');
    let keys = await this._jwks(false);
    if (!keys.has(header.kid)) keys = await this._jwks(true); // key rotation
    const key = keys.get(header.kid);
    if (!key) throw new Error('invalid_token');
    const ok = crypto.verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
    if (!ok) throw new Error('invalid_token');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url'));
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== this.issuer) throw new Error('invalid_token: wrong issuer');
    if (this.audiences && !this.audiences.includes(claims.aud)) throw new Error('invalid_token: wrong audience');
    if (claims.exp < now - 30) throw new Error('token_expired');
    return claims;
  }

  /** Express middleware: verifies "Authorization: Bearer <token>" and sets req.byteforge. */
  middleware({ optional = false } = {}) {
    return (req, res, next) => {
      const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
      if (!m) return optional ? next() : res.status(401).json({ error: 'not_signed_in' });
      this.verify(m[1]).then((claims) => { req.byteforge = claims; next(); })
        .catch(() => (optional ? next() : res.status(401).json({ error: 'invalid_token' })));
    };
  }

  async _call(method, path, body) {
    if (!this.apiKey) throw new Error('ByteForgeServer needs apiKey for this call');
    const r = await fetch(`${this.issuer}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok && !data.results) {
      const e = new Error(data.message || `ByteForge request failed (${r.status})`);
      e.code = data.error;
      e.status = r.status;
      throw e;
    }
    return data;
  }

  /**
   * Report progress for a player. event = {
   *   type: 'xp' | 'achievement' | 'game_finished' | 'stats',
   *   xp?: number, event_id?: string (makes retries safe),
   *   achievement?: { id, name, description?, icon? },
   *   result?: 'win'|'loss'|'draw'|'done', summary?: string,
   *   stats?: { 'Best WPM': 112 },  increment?: { 'Words typed': 350 } }
   */
  sendEvent(userId, event) {
    return this._call('POST', '/api/v1/events', { ...event, user_id: userId });
  }

  /** Several events at once: [{ user_id, type, ... }] (max 50). */
  sendEvents(events) {
    return this._call('POST', '/api/v1/events', { events });
  }

  /** Look up a ByteForge user (username, email, role, level). */
  getUser(userId) {
    return this._call('GET', `/api/v1/apps/me/users/${encodeURIComponent(userId)}`);
  }

  /** Fire-and-forget version of sendEvent that never throws. */
  sendEventQuiet(userId, event) {
    this.sendEvent(userId, event).catch((e) => console.warn('[byteforge] event not sent:', e.message));
  }
}

// ---------------------------------------------------------------- desktop sign-in
const b64url = (buf) => Buffer.from(buf).toString('base64url');

function donePage(ok, message) {
  const color = ok ? '#22e584' : '#ff5c7a';
  return `<!doctype html><html><head><meta charset="utf-8"><title>ByteForge Account</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#050a08;color:#e8fff3;font-family:Inter,Segoe UI,Arial,sans-serif">
<div style="text-align:center;padding:40px;border:1px solid #1a2c23;border-radius:18px;background:#0c1612;max-width:380px">
<svg width="72" height="72" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 12px ${color}88)"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#0c1612" stroke="${color}" stroke-width="6"/><text x="50" y="62" text-anchor="middle" font-family="Segoe UI,Arial" font-weight="900" font-size="32" fill="#fff">BF</text></svg>
<h1 style="font-size:22px;margin:16px 0 8px">${ok ? 'You’re signed in' : 'Sign-in failed'}</h1>
<p style="color:#8db3a0;margin:0">${message}</p></div></body></html>`;
}

async function postToken(issuer, params) {
  const r = await fetch(`${trimIssuer(issuer)}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(data.error_description || data.error || 'Sign-in failed');
    e.code = data.error;
    throw e;
  }
  return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
}

/**
 * Sign in from a desktop app: opens the system browser, waits for the
 * redirect on http://127.0.0.1:<random port>/callback, then shows
 * "You can close this tab". Resolves with { access_token, refresh_token, expires_at, user }.
 */
function signInDesktop({ issuer, clientId, openExternal, scope = 'profile', timeoutMs = 5 * 60_000, appName = 'the app' }) {
  if (!openExternal) throw new Error('signInDesktop needs openExternal (e.g. shell.openExternal)');
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = b64url(crypto.randomBytes(16));

  return new Promise((resolve, reject) => {
    let finished = false;
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/callback') { res.writeHead(404); return res.end(); }
      const send = (ok, msg) => { res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(donePage(ok, msg)); };
      if (url.searchParams.get('state') !== state) return send(false, 'This sign-in link is out of date. Go back to the app and try again.');
      const done = (err, val) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        setTimeout(() => server.close(), 500);
        err ? reject(err) : resolve(val);
      };
      if (url.searchParams.get('error')) {
        send(false, 'You can close this tab and try again in the app.');
        return done(new Error(url.searchParams.get('error_description') || url.searchParams.get('error')));
      }
      try {
        const tokens = await postToken(issuer, {
          grant_type: 'authorization_code', client_id: clientId, code: url.searchParams.get('code'),
          redirect_uri: redirectUri, code_verifier: verifier,
        });
        send(true, `You can close this tab and go back to ${appName}.`);
        done(null, tokens);
      } catch (e) {
        send(false, 'Something went wrong. You can close this tab and try again.');
        done(e);
      }
    });
    let redirectUri;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      server.close();
      reject(Object.assign(new Error('Sign-in timed out'), { code: 'timeout' }));
    }, timeoutMs);
    server.on('error', (e) => { if (!finished) { finished = true; clearTimeout(timer); reject(e); } });
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
      const q = new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope, state,
        code_challenge: challenge, code_challenge_method: 'S256',
      });
      Promise.resolve(openExternal(`${trimIssuer(issuer)}/oauth/authorize?${q}`)).catch(reject);
    });
  });
}

/** Swap a refresh token for new tokens. Throws with code 'invalid_grant' when the user must sign in again. */
const refreshTokens = ({ issuer, clientId, refreshToken }) =>
  postToken(issuer, { grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken });

async function revokeToken({ issuer, clientId, refreshToken }) {
  await fetch(`${trimIssuer(issuer)}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken, client_id: clientId }),
  }).catch(() => {});
}

/** Decode (NOT verify) a JWT's claims, e.g. to read username/role in a desktop UI. */
function decodeClaims(token) {
  try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url')); } catch { return null; }
}

module.exports = { ByteForgeServer, signInDesktop, refreshTokens, revokeToken, decodeClaims, version: '1.0.0' };
