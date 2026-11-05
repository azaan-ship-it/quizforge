// Homework: a teacher assigns a set; students play it solo with a 6-letter code; the teacher gets a report.
const crypto = require('crypto');
const dbm = require('./db');

const db = () => dbm.db;
const HOMEWORK_MODES = ['classic', 'race', 'climb', 'blitz', 'gold', 'spin', 'dig', 'fishing', 'factory', 'territory', 'boss'];
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // no I, L or O so codes are easy to read aloud

async function newCode() {
  for (let i = 0; i < 50; i++) {
    let code = '';
    for (let k = 0; k < 6; k++) code += CODE_LETTERS[crypto.randomInt(CODE_LETTERS.length)];
    if (!(await db().findOne('homework', 'code', code))) return code;
  }
  throw new Error('Couldn’t make a code. Try again.');
}

async function create(user, body, store) {
  const set = await store.get(body.setId);
  if (!set || !store.canRead(set, user)) throw new Error('Pick a question set you can use.');
  const mode = HOMEWORK_MODES.includes(body.mode) ? body.mode : 'classic';
  let due = null;
  if (body.due) {
    due = Number(new Date(body.due));
    if (!Number.isFinite(due)) throw new Error('That due date doesn’t look right.');
  }
  let cls = null;
  if (body.classId) {
    cls = await db().get('classes', body.classId);
    if (!cls || cls.owner !== user.id) throw new Error('Pick one of your classes.');
  }
  const hw = {
    classId: cls ? cls.id : null, className: cls ? cls.name : null,
    id: crypto.randomUUID(), code: await newCode(), owner: user.id, teacher: user.username,
    title: String(body.title || '').trim().slice(0, 80) || set.title,
    setId: set.id, setTitle: set.title, count: set.questions.length, mode, due, created: Date.now(),
  };
  await db().put('homework', hw.id, hw, user.id);
  return hw;
}

async function getByCode(code) {
  const hit = await db().findOne('homework', 'code', String(code || '').trim().toUpperCase());
  return hit ? hit.data : null;
}

function publicInfo(hw) {
  return { code: hw.code, title: hw.title, setTitle: hw.setTitle, count: hw.count, mode: hw.mode, due: hw.due, teacher: hw.teacher, className: hw.className || null, late: !!(hw.due && Date.now() > hw.due) };
}

async function list(user) {
  const rows = await db().list('homework', { owner: user.id, limit: 200 });
  const out = [];
  for (const r of rows) {
    const subs = await db().list('hwsub', { owner: r.id, limit: 2000 });
    const students = new Set(subs.map(s => s.data.name.toLowerCase()));
    out.push({ ...r.data, students: students.size, attempts: subs.length });
  }
  return out.sort((a, b) => b.created - a.created);
}

async function report(user, id) {
  const hw = await db().get('homework', id);
  if (!hw || hw.owner !== user.id) throw Object.assign(new Error('Assignment not found.'), { status: 404 });
  const subs = (await db().list('hwsub', { owner: id, limit: 2000 })).map(r => r.data);
  const cls = hw.classId ? await db().get('classes', hw.classId) : null;
  const rosterName = new Map((cls ? cls.students : []).map(s => [s.userId, s.username]));
  const byStudent = new Map();
  for (const s of subs) {
    if (s.userId && rosterName.has(s.userId)) s.name = rosterName.get(s.userId);
    const key = s.userId ? 'u:' + s.userId : s.name.toLowerCase();
    const cur = byStudent.get(key) || { name: s.name, attempts: 0, best: null, lastAt: 0 };
    cur.attempts++;
    cur.lastAt = Math.max(cur.lastAt, s.finishedAt);
    const better = !cur.best || (s.complete && !cur.best.complete) || (s.complete === cur.best.complete && s.pct > cur.best.pct);
    if (better) cur.best = s;
    byStudent.set(key, cur);
  }
  const students = [...byStudent.values()].map(st => ({
    key: st.best.userId ? 'u:' + st.best.userId : 'n:' + st.best.name,
    name: st.name, attempts: st.attempts, lastAt: st.lastAt,
    correct: st.best.correct, answered: st.best.answered, total: st.best.total, pct: st.best.pct,
    complete: st.best.complete, late: st.best.late, mode: st.best.mode, account: !!st.best.userId,
    inClass: !!(st.best.userId && rosterName.has(st.best.userId)),
  }));
  // class members who haven't started yet
  if (cls) {
    for (const s of cls.students) {
      if (!byStudent.has('u:' + s.userId)) students.push({ key: 'u:' + s.userId, name: s.username, notStarted: true, inClass: true, account: true, attempts: 0, pct: 0, correct: 0, answered: 0, total: hw.count });
    }
  }
  students.sort((a, b) => (!!a.notStarted - !!b.notStarted) || a.name.localeCompare(b.name));
  // per-question accuracy from each student's best attempt
  const qStats = new Map();
  for (const st of byStudent.values()) {
    for (const [idx, ok] of Object.entries(st.best.perQ || {})) {
      const q = qStats.get(idx) || { right: 0, wrong: 0, q: (st.best.texts || {})[idx] || `Question ${Number(idx) + 1}` };
      q[ok ? 'right' : 'wrong']++;
      qStats.set(idx, q);
    }
  }
  const questions = [...qStats.values()].sort((a, b) => a.right / (a.right + a.wrong) - b.right / (b.right + b.wrong));
  const done = students.filter(s => s.complete);
  const avg = done.length ? Math.round(done.reduce((n, s) => n + s.pct, 0) / done.length) : null;
  return { assignment: hw, students, questions, summary: { students: students.filter(s => !s.notStarted).length, finished: done.length, average: avg, notStarted: students.filter(s => s.notStarted).length, classSize: cls ? cls.students.length : null } };
}

async function remove(user, id) {
  const hw = await db().get('homework', id);
  if (!hw || hw.owner !== user.id) throw new Error('Assignment not found.');
  for (const s of await db().list('hwsub', { owner: id, limit: 5000 })) await db().del('hwsub', s.id);
  await db().del('homework', id);
}

async function saveSubmission(room, p) {
  const hw = room.homework;
  const total = room.set.questions.length;
  const texts = {};
  for (const idx of Object.keys(p.firstTry || {})) texts[idx] = room.set.questions[idx].q || 'Picture question';
  const rightOf = q => (q.type === 'type' ? q.accept : q.c.map(i => q.a[i])).join(' / ');
  const details = Object.keys(p.firstTry || {}).map(Number).sort((a, b) => a - b).map(idx => {
    const q = room.set.questions[idx];
    const log = (p.answerLog || {})[idx] || {};
    return { idx, q: q.q || 'Picture question', img: !!q.img, type: q.type, given: log.given ?? null, right: rightOf(q), correct: !!p.firstTry[idx] };
  });
  const sub = {
    id: crypto.randomUUID(), assignmentId: hw.id, name: p.name, userId: p.userId || null, mode: room.mode,
    correct: p.correct, answered: p.answered, total, details, bestStreak: p.bestStreak || 0,
    pct: total ? Math.round((Object.values(p.firstTry || {}).filter(Boolean).length / total) * 100) : 0,
    complete: p.answered >= total, perQ: p.firstTry || {}, texts,
    startedAt: room.startedAt, finishedAt: Date.now(), late: !!(hw.due && Date.now() > hw.due),
  };
  await db().put('hwsub', sub.id, sub, hw.id);
  return sub;
}

// One student's work on one assignment, for the teacher. key is "u:<userId>" or "n:<name>".
async function studentWork(user, hwId, key) {
  const hw = await db().get('homework', hwId);
  if (!hw || hw.owner !== user.id) throw Object.assign(new Error('Assignment not found.'), { status: 404 });
  const subs = (await db().list('hwsub', { owner: hw.id, limit: 5000 })).map(r => r.data)
    .filter(s => key.startsWith('u:') ? s.userId === key.slice(2) : (!s.userId && s.name.toLowerCase() === key.slice(2).toLowerCase()));
  return { assignment: { id: hw.id, title: hw.title, setTitle: hw.setTitle, count: hw.count, mode: hw.mode, due: hw.due, className: hw.className }, attempts: subs.sort((a, b) => b.finishedAt - a.finishedAt).map(shapeAttempt) };
}

function shapeAttempt(s) {
  // older attempts only kept right/wrong per question, so rebuild what we can
  const details = s.details || Object.entries(s.perQ || {}).map(([idx, ok]) => ({ idx: Number(idx), q: (s.texts || {})[idx] || `Question ${Number(idx) + 1}`, given: null, right: null, correct: !!ok }));
  const firstRight = details.filter(d => d.correct).length;
  return {
    id: s.id, name: s.name, finishedAt: s.finishedAt, startedAt: s.startedAt, complete: s.complete, late: s.late, mode: s.mode,
    total: s.total, answered: s.answered, correct: s.correct, wrong: Math.max(0, s.answered - s.correct), pct: s.pct,
    accuracy: s.answered ? Math.round((s.correct / s.answered) * 100) : 0, bestStreak: s.bestStreak || null,
    firstTryRight: firstRight, firstTryWrong: details.length - firstRight, details,
  };
}

module.exports = { HOMEWORK_MODES, create, getByCode, publicInfo, list, report, remove, saveSubmission, studentWork, shapeAttempt };