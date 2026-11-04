// Question sets. Full set in "sets", a light summary in "setmeta" for fast listing.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dbm = require('./db');

const db = () => dbm.db;
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMG = 450_000;      // ~330 KB image after base64
const MAX_SET_BYTES = 9_000_000;
const SUBJECTS = ['Math', 'Science', 'English', 'Social Studies', 'Geography', 'World Languages', 'Computer Science', 'Health', 'Arts & Music', 'Other'];
const GRADES = ['K–2', '3–5', '6–8', '9–12', 'College', 'Any'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function cleanImage(img, label) {
  if (!img) return null;
  if (typeof img !== 'string' || !IMG_RE.test(img)) throw new Error(`${label} has an image that isn't a PNG, JPG, WEBP or GIF.`);
  if (img.length > MAX_IMG) throw new Error(`${label} has an image that's too large. Use a smaller picture.`);
  return img;
}

function toIndexList(c, n) {
  const list = (Array.isArray(c) ? c : [c]).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x < n);
  return [...new Set(list)].sort((a, b) => a - b);
}

function cleanQuestion(q = {}, i) {
  const label = `Question ${i + 1}`;
  const type = ['mc', 'tf', 'type'].includes(q.type) ? q.type : 'mc';
  const text = str(q.q, 300);
  const img = cleanImage(q.img, label);
  if (!text && !img) throw new Error(`${label} needs text or a picture.`);
  if (type === 'tf') {
    const c = toIndexList(q.c, 2);
    return { type, q: text, img, a: ['True', 'False'], c: [c[0] ?? 0] };
  }
  if (type === 'type') {
    const accept = (Array.isArray(q.accept) ? q.accept : []).map(a => str(a, 80)).filter(Boolean).slice(0, 6);
    if (!accept.length) throw new Error(`${label} needs at least one accepted answer.`);
    return { type, q: text, img, accept };
  }
  const a = (Array.isArray(q.a) ? q.a : []).map(x => str(x, 120));
  if (a.length < 2 || a.length > 4 || a.some(x => !x)) throw new Error(`${label} needs 2 to 4 filled-in answers.`);
  const c = toIndexList(q.c, a.length);
  if (!c.length) throw new Error(`${label} needs at least one right answer marked.`);
  if (c.length === a.length) throw new Error(`${label} needs at least one wrong answer.`);
  return { type, q: text, img, a, c };
}

function clean(input = {}) {
  const title = str(input.title, 80);
  if (!title) throw new Error('Give the set a title.');
  if (!Array.isArray(input.questions) || !input.questions.length) throw new Error('Add at least one question.');
  if (input.questions.length > 300) throw new Error('A set can hold up to 300 questions.');
  const questions = input.questions.map(cleanQuestion);
  const out = {
    title, description: str(input.description, 200),
    visibility: input.visibility === 'public' ? 'public' : 'private',
    subject: SUBJECTS.includes(input.subject) ? input.subject : 'Other',
    grade: GRADES.includes(input.grade) ? input.grade : 'Any',
    difficulty: DIFFICULTIES.includes(input.difficulty) ? input.difficulty : 'medium',
    cover: cleanImage(input.cover, 'The cover'),
    questions,
  };
  if (JSON.stringify(out).length > MAX_SET_BYTES) throw new Error('This set is too big. Use fewer or smaller pictures.');
  return out;
}

// older sets stored c as a single number
function normalize(set) {
  if (!set) return set;
  set.questions = set.questions.map(q => {
    if (q.type === 'type') return q;
    return { type: q.type || 'mc', ...q, c: Array.isArray(q.c) ? q.c : [q.c] };
  });
  return set;
}

function meta(set) {
  return {
    id: set.id, title: set.title, description: set.description, count: set.questions.length,
    visibility: set.visibility, owner: set.owner, ownerName: set.ownerName, updatedAt: set.updatedAt,
    hasImages: set.questions.some(q => q.img), plays: set.plays || 0,
    subject: set.subject || 'Other', grade: set.grade || 'Any', difficulty: set.difficulty || 'medium',
    official: !!set.official, hidden: !!set.hidden, hiddenBy: set.hiddenBy || null,
  };
}

async function writeSet(set) {
  const old = await db().get('setmeta', set.id);
  await db().put('sets', set.id, set, set.owner);
  await db().put('setmeta', set.id, { ...meta(set), plays: old ? old.plays || 0 : set.plays || 0 }, set.owner);
}

// Official library: re-imported whenever data/official-sets.json has a new version number
async function importOfficial() {
  const file = path.join(__dirname, '..', 'data', 'official-sets.json');
  if (!fs.existsSync(file)) return;
  const lib = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cfg = await db().get('config', 'official');
  if (cfg && cfg.version === lib.version) return;
  for (const s of lib.sets) {
    await writeSet(normalize({ ...s, owner: null, ownerName: 'QuizForge', visibility: 'public', official: true, updatedAt: Date.now() }));
  }
  await db().put('config', 'official', { version: lib.version, count: lib.sets.length });
  console.log(`Imported ${lib.sets.length} official question sets (library v${lib.version})`);
}

async function init(dataDir) {
  if ((await db().count('setmeta')) === 0) await seedFresh(dataDir);
  await importOfficial();
}

async function seedFresh(dataDir) {
  const samples = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'sample-sets.json'), 'utf8'));
  // carry over sets from the earlier build (saved in sets.json before accounts existed)
  const old = dataDir && path.join(dataDir, 'sets.json');
  if (old && fs.existsSync(old)) {
    try {
      const ids = new Set(samples.map(s => s.id));
      for (const s of JSON.parse(fs.readFileSync(old, 'utf8'))) if (!ids.has(s.id)) samples.push({ ...s, ownerName: 'Imported' });
    } catch { /* unreadable old file: skip */ }
  }
  for (const s of samples) {
    await writeSet(normalize({ ...s, owner: null, ownerName: s.ownerName || 'QuizForge', visibility: 'public', updatedAt: Date.now() }));
  }
}

async function list(user) {
  const all = (await db().list('setmeta')).map(r => r.data);
  const mine = user ? all.filter(s => s.owner === user.id) : [];
  const pub = all.filter(s => s.visibility === 'public' && !s.hidden && (!user || s.owner !== user.id))
    .sort((a, b) => (b.plays || 0) - (a.plays || 0));
  return { mine, public: pub };
}

async function get(id) {
  return normalize(await db().get('sets', String(id)));
}

function canRead(set, user) {
  return set && ((set.visibility === 'public' && !set.hidden) || (user && set.owner === user.id));
}

// moderation: hide a set from Discover (owner still sees it) or delete it outright
async function setHidden(id, hidden, by = null) {
  const set = await get(id);
  if (!set) return;
  set.hidden = !!hidden;
  set.hiddenBy = hidden ? by : null;
  await writeSet(set);
}

async function adminDelete(id) {
  await db().del('sets', id);
  await db().del('setmeta', id);
}

async function save(input, user) {
  const data = clean(input);
  if (input.id) {
    const existing = await get(input.id);
    if (existing) {
      if (existing.owner !== user.id) throw new Error('You can only edit your own sets. Make a copy instead.');
      const set = { ...existing, ...data, updatedAt: Date.now() };
      await writeSet(set);
      return set;
    }
  }
  const set = { id: crypto.randomUUID(), owner: user.id, ownerName: user.username, ...data, plays: 0, updatedAt: Date.now() };
  await writeSet(set);
  return set;
}

async function copy(id, user) {
  const src = await get(id);
  if (!canRead(src, user)) throw new Error('That set is private.');
  const set = { ...src, id: crypto.randomUUID(), owner: user.id, ownerName: user.username, title: str(`${src.title} (copy)`, 80), visibility: 'private', plays: 0, updatedAt: Date.now() };
  await writeSet(set);
  return set;
}

async function remove(id, user) {
  const set = await get(id);
  if (!set) return;
  if (set.owner !== user.id) throw new Error('You can only delete your own sets.');
  await db().del('sets', id);
  await db().del('setmeta', id);
}

async function countPlay(id) {
  const m = await db().get('setmeta', id);
  if (!m) return;
  m.plays = (m.plays || 0) + 1;
  await db().put('setmeta', id, m, m.owner);
}

module.exports = { init, list, get, canRead, save, copy, remove, countPlay, cleanQuestion, setHidden, adminDelete, SUBJECTS, GRADES, DIFFICULTIES };
