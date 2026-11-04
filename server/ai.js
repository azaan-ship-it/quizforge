// AI question generation with Anthropic (Claude) or Google Gemini.
// Keys come from the user's own saved key first, then the server's environment variables.
const crypto = require('crypto');
const dbm = require('./db');
const auth = require('./auth');
const { cleanQuestion } = require('./store');

const ANTHROPIC_MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const GEMINI_MODELS = [process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-2.5-flash'];
const PROVIDERS = ['anthropic', 'gemini'];
const usage = new Map();

// ---------- key storage (AES-256-GCM) ----------
let secretKey = null;
async function secret() {
  if (secretKey) return secretKey;
  if (process.env.APP_SECRET) {
    secretKey = crypto.createHash('sha256').update(process.env.APP_SECRET).digest();
    return secretKey;
  }
  let cfg = await dbm.db.get('config', 'secret');
  if (!cfg) {
    cfg = { value: crypto.randomBytes(32).toString('hex') };
    await dbm.db.put('config', 'secret', cfg);
  }
  secretKey = Buffer.from(cfg.value, 'hex');
  return secretKey;
}

async function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', await secret(), iv);
  const data = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString('base64')).join('.');
}

async function decrypt(blob) {
  try {
    const [iv, tag, data] = blob.split('.').map(x => Buffer.from(x, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', await secret(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  } catch { return null; }
}

async function serverKey(provider) {
  if (provider === 'anthropic') {
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    const legacy = await dbm.db.get('config', 'ai'); // key saved by the first desktop build
    return legacy && legacy.key ? legacy.key : null;
  }
  return process.env.GEMINI_API_KEY || null;
}

async function userKey(user, provider) {
  const blob = user && user.aiKeys && user.aiKeys[provider];
  return blob ? decrypt(blob) : null;
}

async function status(user) {
  const out = { server: {}, mine: {}, preferred: (user && user.aiProvider) || null };
  for (const p of PROVIDERS) {
    out.server[p] = !!(await serverKey(p));
    out.mine[p] = !!(user && user.aiKeys && user.aiKeys[p]);
  }
  out.available = PROVIDERS.some(p => out.server[p] || out.mine[p]);
  return out;
}

async function saveUserKey(user, provider, key) {
  if (!PROVIDERS.includes(provider)) throw new Error('Pick Anthropic or Gemini.');
  key = String(key || '').trim();
  user.aiKeys = user.aiKeys || {};
  if (!key) {
    delete user.aiKeys[provider];
    if (user.aiProvider === provider) user.aiProvider = null;
  } else {
    if (key.length < 20 || key.length > 300 || /\s/.test(key)) throw new Error('That doesn’t look like an API key. Copy the whole key with no spaces.');
    if (provider === 'anthropic' && !key.startsWith('sk-ant-')) throw new Error('Anthropic keys start with sk-ant-.');
    user.aiKeys[provider] = await encrypt(key);
    user.aiProvider = provider;
  }
  await auth.saveUser(user);
  return status(user);
}

// pick which provider and key to use
async function resolve(user, wanted) {
  const order = [];
  if (wanted && PROVIDERS.includes(wanted)) order.push(wanted);
  if (user && user.aiProvider) order.push(user.aiProvider);
  order.push(...PROVIDERS);
  for (const p of [...new Set(order)]) {
    const mine = await userKey(user, p);
    if (mine) return { provider: p, key: mine, own: true };
  }
  for (const p of [...new Set(order)]) {
    const k = await serverKey(p);
    if (k) return { provider: p, key: k, own: false };
  }
  return null;
}

function rateLimit(userId, own) {
  if (own) return; // people using their own key aren't limited by us
  const now = Date.now();
  const list = (usage.get(userId) || []).filter(t => now - t < 3600_000);
  if (list.length >= 20) throw new Error('You’ve generated 20 sets this hour with the shared key. Add your own key in Settings, or try again later.');
  list.push(now);
  usage.set(userId, list);
}

function buildPrompt({ topic, notes, count, difficulty, types, grade }) {
  const allowed = types.length ? types : ['mc'];
  return `You write quiz questions for a classroom quiz game.
${topic ? `Topic: ${topic}` : ''}
${grade ? `Audience: ${grade}` : ''}
Difficulty: ${difficulty}
Number of questions: ${count}
Allowed question types: ${allowed.join(', ')}
${notes ? `Base every question on these notes, and don't add facts that aren't in them:\n"""\n${notes}\n"""` : ''}

Question types:
- "mc": multiple choice. "a" has exactly 4 short answers, "c" is an array of the index or indexes of the right answer(s). Usually one right answer. Wrong answers must be believable but clearly wrong.
- "tf": true/false. "c" is [0] for true or [1] for false.
- "type": typed answer. "accept" lists 1 to 4 short accepted spellings. Use only when the answer is one or two words.

Mix the allowed types. Keep questions under 200 characters and answers under 80. Every fact must be accurate.
Respond with only a JSON array and nothing else, like:
[{"type":"mc","q":"...","a":["...","...","...","..."],"c":[2]},{"type":"tf","q":"...","c":[0]},{"type":"type","q":"...","accept":["..."]}]`;
}

async function callAnthropic(key, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude request failed: ${data.error && data.error.message ? data.error.message : 'status ' + res.status}`);
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

async function callGemini(key, prompt) {
  let lastError = '';
  for (const model of [...new Set(GEMINI_MODELS)]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 8000 },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      return parts.map(p => p.text || '').join('');
    }
    lastError = data.error && data.error.message ? data.error.message : 'status ' + res.status;
    if (res.status !== 404) break; // only try the backup model if this one wasn't found
  }
  throw new Error(`Gemini request failed: ${lastError}`);
}

async function generate(opts, user) {
  const pick = await resolve(user, opts.provider);
  if (!pick) throw new Error('AI isn’t set up yet. Add your own Anthropic or Gemini key in Settings. Making quizzes by hand works without it.');
  const topic = String(opts.topic || '').trim().slice(0, 200);
  const notes = String(opts.notes || '').trim().slice(0, 12000);
  if (!topic && !notes) throw new Error('Enter a topic or paste some notes.');
  const count = Math.min(30, Math.max(3, Math.round(Number(opts.count) || 10)));
  const difficulty = ['easy', 'medium', 'hard'].includes(opts.difficulty) ? opts.difficulty : 'medium';
  const types = (Array.isArray(opts.types) ? opts.types : ['mc']).filter(t => ['mc', 'tf', 'type'].includes(t));
  const grade = String(opts.grade || '').trim().slice(0, 60);
  rateLimit(user.id, pick.own);

  const prompt = buildPrompt({ topic, notes, count, difficulty, types, grade });
  const text = pick.provider === 'gemini' ? await callGemini(pick.key, prompt) : await callAnthropic(pick.key, prompt);
  const match = text.replace(/```json|```/g, '').match(/\[[\s\S]*\]/);
  if (!match) throw new Error('The AI reply wasn’t in the expected format. Try again.');
  let raw;
  try { raw = JSON.parse(match[0]); } catch { throw new Error('The AI reply couldn’t be read. Try again.'); }
  const questions = [];
  raw.forEach((q, i) => { try { questions.push(cleanQuestion(q, i)); } catch { /* skip bad ones */ } });
  if (!questions.length) throw new Error('The AI didn’t return usable questions. Try a clearer topic.');
  return { questions, provider: pick.provider };
}

module.exports = { generate, status, saveUserKey };
