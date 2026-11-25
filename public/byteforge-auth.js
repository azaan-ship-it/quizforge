/*!
 * byteforge-auth (browser) v1.0.0 — "Sign in with ByteForge" for web apps.
 * No dependencies. Load it with a <script> tag (window.ByteForgeAuth) or import it.
 *
 *   const bf = ByteForgeAuth.create({
 *     issuer: 'https://byteforge-account.onrender.com',
 *     clientId: 'typeforge',
 *     redirectUri: location.origin + '/auth/callback',
 *   });
 *   bf.renderButton(document.getElementById('login'));   // the sign-in button
 *   const session = await bf.handleRedirect();           // on the callback page
 *   const token = await bf.getAccessToken();             // send to your server as "Authorization: Bearer <token>"
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ByteForgeAuth = api;
}(typeof self !== 'undefined' ? self : this, () => {
  const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const randomString = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
  const sha256 = async (s) => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const decodeJwt = (t) => {
    try {
      const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch { return null; }
  };

  const LOGO = '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#0c1612" stroke="#22e584" stroke-width="8" stroke-linejoin="round"/><text x="50" y="63" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="900" font-size="34" fill="#fff">BF</text></svg>';
  const CSS = `.bf-signin{display:inline-flex;align-items:center;gap:12px;height:44px;padding:0 18px 0 12px;border-radius:8px;border:1px solid #1f3a2c;
    background:#0b1410;color:#ecfff5;font:600 15px/1 Inter,'Segoe UI',Roboto,Arial,sans-serif;cursor:pointer;letter-spacing:.1px;
    box-shadow:0 1px 2px rgba(0,0,0,.35);transition:border-color .15s,box-shadow .15s,transform .05s;text-decoration:none;white-space:nowrap}
  .bf-signin:hover{border-color:#22e584;box-shadow:0 0 0 1px #22e584,0 0 18px rgba(34,229,132,.35)}
  .bf-signin:active{transform:translateY(1px)}
  .bf-signin:focus-visible{outline:2px solid #22e584;outline-offset:2px}
  .bf-signin svg{width:24px;height:24px;flex:none;filter:drop-shadow(0 0 4px rgba(34,229,132,.6))}
  .bf-signin.bf-light{background:#fff;color:#1f1f1f;border-color:#dadce0}
  .bf-signin.bf-light:hover{border-color:#22e584;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .bf-signin.bf-block{display:flex;width:100%;justify-content:center}
  .bf-signin[disabled]{opacity:.6;cursor:default}`;

  function injectCss() {
    if (typeof document === 'undefined' || document.getElementById('bf-signin-css')) return;
    const s = document.createElement('style');
    s.id = 'bf-signin-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function create(opts) {
    const issuer = String(opts.issuer || '').replace(/\/+$/, '');
    const clientId = opts.clientId;
    const redirectUri = opts.redirectUri || `${location.origin}/auth/callback`;
    const scope = opts.scope || 'profile';
    if (!issuer || !clientId) throw new Error('ByteForgeAuth.create needs issuer and clientId');
    const KEY = `bf_auth_${clientId}`;
    const PKCE = `bf_pkce_${clientId}`;
    const listeners = new Set();

    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
    const save = (t) => {
      if (t) localStorage.setItem(KEY, JSON.stringify(t)); else localStorage.removeItem(KEY);
      listeners.forEach((fn) => { try { fn(t ? t.user : null); } catch { /* ignore */ } });
    };

    async function tokenRequest(body) {
      const r = await fetch(`${issuer}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, ...body }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error(data.error_description || data.error || 'Sign-in failed');
        e.code = data.error;
        throw e;
      }
      return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
    }

    /** Send the user to ByteForge Account to sign in. `returnTo` is where to land afterwards. */
    async function signIn({ returnTo = location.pathname + location.search, prompt } = {}) {
      const verifier = randomString(48);
      const state = randomString(16);
      sessionStorage.setItem(PKCE, JSON.stringify({ verifier, state, returnTo }));
      const q = new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope, state,
        code_challenge: await sha256(verifier), code_challenge_method: 'S256',
      });
      if (prompt) q.set('prompt', prompt);
      location.assign(`${issuer}/oauth/authorize?${q}`);
    }

    /**
     * Call on the redirect page. Returns { user, accessToken, returnTo } after a
     * sign-in, or null if this page load is not a sign-in callback.
     */
    async function handleRedirect(url = location.href) {
      const u = new URL(url);
      const code = u.searchParams.get('code');
      const err = u.searchParams.get('error');
      if (!code && !err) return null;
      const saved = JSON.parse(sessionStorage.getItem(PKCE) || 'null');
      sessionStorage.removeItem(PKCE);
      if (typeof history !== 'undefined') history.replaceState(null, '', u.pathname);
      if (err) throw Object.assign(new Error(u.searchParams.get('error_description') || err), { code: err });
      if (!saved || saved.state !== u.searchParams.get('state')) throw new Error('Sign-in expired. Please try again.');
      const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: saved.verifier });
      save(t);
      return { user: t.user, accessToken: t.access_token, returnTo: saved.returnTo || '/' };
    }

    let refreshing = null;
    /** A valid access token (refreshed when needed), or null when signed out. */
    async function getAccessToken() {
      const t = load();
      if (!t) return null;
      if (t.expires_at - Date.now() > 60_000) return t.access_token;
      if (!refreshing) {
        refreshing = tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })
          .then((n) => { save(n); return n.access_token; })
          .catch((e) => {
            // Another tab may have refreshed first.
            const again = load();
            if (again && again.refresh_token !== t.refresh_token) return again.access_token;
            if (e.code === 'invalid_grant') save(null);
            return null;
          })
          .finally(() => { refreshing = null; });
      }
      return refreshing;
    }

    function getUser() {
      const t = load();
      return t ? t.user : null;
    }

    /** Claims inside the current access token (sub, username, role, ...). Not verified: use on the server for trust. */
    function getClaims() {
      const t = load();
      return t ? decodeJwt(t.access_token) : null;
    }

    async function signOut() {
      const t = load();
      save(null);
      if (t?.refresh_token) {
        await fetch(`${issuer}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: t.refresh_token, client_id: clientId }),
        }).catch(() => {});
      }
    }

    async function authFetch(path, init = {}) {
      const token = await getAccessToken();
      if (!token) throw new Error('Not signed in');
      return fetch(path.startsWith('http') ? path : `${issuer}${path}`, {
        ...init,
        headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      });
    }

    /** ByteForge level, XP and this app's stats for the signed-in user. */
    const fetchProfile = async () => (await authFetch('/api/v1/me')).json();

    /**
     * Report an event straight from the browser. Only works for apps with
     * client events turned on (lower XP caps). Prefer sending from your server.
     */
    const sendEvent = async (event) => (await authFetch('/api/v1/events', { method: 'POST', body: JSON.stringify(event) })).json();

    /** Render the "Sign in with ByteForge" button into an element. */
    function renderButton(el, options = {}) {
      const btn = button(el, {
        ...options,
        onClick: () => {
          btn.disabled = true;
          setTimeout(() => { btn.disabled = false; }, 4000);
          (options.onClick || (() => signIn()))();
        },
      });
      return btn;
    }

    const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
    const profileUrl = (username) => `${issuer}/u/${encodeURIComponent(username)}`;

    return { signIn, handleRedirect, getAccessToken, getUser, getClaims, signOut, fetchProfile, sendEvent, renderButton, onChange, profileUrl, accountUrl: `${issuer}/dashboard` };
  }

  /** Just the styled button, for apps that run the flow themselves (e.g. Electron). */
  function button(el, { text = 'Sign in with ByteForge', theme = 'dark', block = false, onClick } = {}) {
    injectCss();
    const target = typeof el === 'string' ? document.querySelector(el) : el;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `bf-signin${theme === 'light' ? ' bf-light' : ''}${block ? ' bf-block' : ''}`;
    btn.innerHTML = `${LOGO}<span></span>`;
    btn.querySelector('span').textContent = text;
    if (onClick) btn.addEventListener('click', onClick);
    target.replaceChildren(btn);
    return btn;
  }

  return { create, button, version: '1.0.0' };
}));
