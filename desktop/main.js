// QuizForge desktop — runs the game server locally so it works offline
// and lets anyone on the same Wi-Fi join, or switches to the online server.
// Sign-in uses ByteForge Account in the system browser (loopback redirect to 127.0.0.1).
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
process.env.QF_DESKTOP = '1';
const { start } = require('../server');
const { signInDesktop } = require('../byteforge/byteforge-auth-node');

// Put your Render URL here once the web version is deployed.
const ONLINE_URL = process.env.QUIZFORGE_ONLINE_URL || 'https://playquizforge.onrender.com';
const LOCAL_PORT = 3417;
const BF_ISSUER = (process.env.BYTEFORGE_ISSUER || 'https://byteforge-account.onrender.com').replace(/\/+$/, '');

let win = null;
let localUrl = null;
let connectRun = 0;

// Free Render servers fall asleep when nobody uses them. Instead of showing Render's
// wake-up page, show our own screen and wait until the server answers.
async function playOnline() {
  const run = ++connectRun;
  await win.loadFile(path.join(__dirname, 'connecting.html'));
  const started = Date.now();
  const status = (text, failed) => {
    if (run === connectRun && !win.isDestroyed()) win.webContents.executeJavaScript(`setStatus(${JSON.stringify(text)}, ${!!failed})`).catch(() => {});
  };
  while (run === connectRun && Date.now() - started < 120000) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${ONLINE_URL}/api/health`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(t);
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('application/json')) {
        if (run === connectRun) win.loadURL(ONLINE_URL);
        return;
      }
    } catch { /* still waking up, or offline */ }
    const secs = Math.round((Date.now() - started) / 1000);
    status(secs < 10 ? 'Connecting to the online server…' : `Waking up the online server… ${secs}s`);
    await new Promise(r => setTimeout(r, 2500));
  }
  if (run === connectRun) status('Couldn’t reach the online server. Check your internet, or play offline from the Game menu.', true);
}

// "Sign in with ByteForge": only the QuizForge page (online server or this computer's server) may ask.
ipcMain.handle('bf-sign-in', async (e) => {
  let origin = '';
  try { origin = new URL(e.senderFrame?.url || e.sender.getURL()).origin; } catch { /* no page */ }
  const allowed = [new URL(ONLINE_URL).origin, localUrl && new URL(localUrl).origin].filter(Boolean);
  if (!allowed.includes(origin)) throw new Error('Sign-in is only available on the QuizForge server.');
  const tokens = await signInDesktop({ issuer: BF_ISSUER, clientId: 'quizforge', appName: 'QuizForge', openExternal: (url) => shell.openExternal(url) });
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus(); }
  return { access_token: tokens.access_token };
});

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Game',
      submenu: [
        { label: 'Play offline / on this Wi-Fi', click: () => { connectRun++; win.loadURL(localUrl); } },
        { label: 'Play online', click: () => playOnline() },
        { type: 'separator' },
        { label: 'Open in browser', click: () => shell.openExternal(win.webContents.getURL()) },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { role: 'toggleDevTools' }],
    },
  ]));
}

app.whenReady().then(async () => {
  try {
    const { port } = await start({ port: LOCAL_PORT, dataDir: path.join(app.getPath('userData'), 'data') });
    localUrl = `http://localhost:${port}`;
  } catch (err) {
    dialog.showErrorBox('QuizForge could not start', String(err && err.message || err));
    return app.quit();
  }
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    backgroundColor: '#1a1033', title: 'QuizForge', autoHideMenuBar: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') },
  });
  buildMenu();
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL(localUrl);
  // the connecting screen's buttons
  win.webContents.on('will-navigate', (e, url) => {
    if (url === 'quizforge://retry') { e.preventDefault(); playOnline(); }
    if (url === 'quizforge://offline') { e.preventDefault(); connectRun++; win.loadURL(localUrl); }
  });
});

app.on('window-all-closed', () => app.quit());