// Classes: a teacher makes a class, students join once with a code, homework can be assigned to the class.
// The class document keeps the roster; a "members" document per student makes "my classes" lookups fast.
const crypto = require('crypto');
const dbm = require('./db');

const db = () => dbm.db;
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';

// Class codes look like KQT482: three letters then three digits, so they never clash with
// game PINs (six digits) or homework codes (six letters).
async function newCode() {
  for (let i = 0; i < 50; i++) {
    let code = '';
    for (let k = 0; k < 3; k++) code += LETTERS[crypto.randomInt(LETTERS.length)];
    for (let k = 0; k < 3; k++) code += DIGITS[crypto.randomInt(DIGITS.length)];
    if (!(await db().findOne('classes', 'code', code))) return code;
  }
  throw new Error('Couldn’t make a class code. Try again.');
}

const isClassCode = code => /^[A-Z]{3}[0-9]{3}$/.test(String(code || '').toUpperCase());

async function create(user, name) {
  name = String(name || '').trim().slice(0, 60);
  if (!name) throw new Error('Give the class a name, like “Period 3 Science”.');
  const mine = await db().list('classes', { owner: user.id, limit: 200 });
  if (mine.length >= 50) throw new Error('You can have up to 50 classes.');
  const cls = { id: crypto.randomUUID(), owner: user.id, teacher: user.username, name, code: await newCode(), created: Date.now(), students: [] };
  await db().put('classes', cls.id, cls, user.id);
  return cls;
}

async function getOwned(user, id) {
  const cls = await db().get('classes', id);
  if (!cls || cls.owner !== user.id) throw Object.assign(new Error('Class not found.'), { status: 404 });
  return cls;
}

async function join(user, code) {
  code = String(code || '').trim().toUpperCase();
  if (!isClassCode(code)) throw new Error('Class codes look like ABC123: three letters, then three numbers.');
  const hit = await db().findOne('classes', 'code', code);
  if (!hit) throw new Error('No class with that code. Check it with your teacher.');
  const cls = hit.data;
  if (cls.owner === user.id) throw new Error('That’s your own class.');
  if (cls.students.some(s => s.userId === user.id)) return { already: true, class: summary(cls) };
  if (cls.students.length >= 300) throw new Error('This class is full.');
  cls.students.push({ userId: user.id, username: user.username, joinedAt: Date.now() });
  await db().put('classes', cls.id, cls, cls.owner);
  await db().put('members', `${cls.id}:${user.id}`, { classId: cls.id, userId: user.id, joinedAt: Date.now() }, user.id);
  return { class: summary(cls) };
}

async function removeStudent(user, classId, studentId) {
  const cls = await getOwned(user, classId);
  cls.students = cls.students.filter(s => s.userId !== studentId);
  await db().put('classes', cls.id, cls, cls.owner);
  await db().del('members', `${cls.id}:${studentId}`);
  return { ok: true };
}

async function leave(user, classId) {
  const cls = await db().get('classes', classId);
  if (cls) {
    cls.students = cls.students.filter(s => s.userId !== user.id);
    await db().put('classes', cls.id, cls, cls.owner);
  }
  await db().del('members', `${classId}:${user.id}`);
  return { ok: true };
}

async function remove(user, classId) {
  const cls = await getOwned(user, classId);
  for (const s of cls.students) await db().del('members', `${cls.id}:${s.userId}`);
  await db().del('classes', cls.id);
  return { ok: true };
}

function summary(cls) {
  return { id: cls.id, name: cls.name, code: cls.code, teacher: cls.teacher, students: cls.students.length, created: cls.created };
}

async function homeworkFor(cls) {
  return (await db().list('homework', { owner: cls.owner, limit: 500 })).map(r => r.data).filter(h => h.classId === cls.id);
}

// Teacher view of one class: roster plus the homework assigned to it
async function detail(user, classId) {
  const cls = await getOwned(user, classId);
  const hws = await homeworkFor(cls);
  const assignments = [];
  for (const h of hws.sort((a, b) => b.created - a.created)) {
    const subs = (await db().list('hwsub', { owner: h.id, limit: 5000 })).map(r => r.data);
    const done = new Set(subs.filter(s => s.complete && s.userId).map(s => s.userId));
    assignments.push({ id: h.id, title: h.title, code: h.code, due: h.due, mode: h.mode, done: cls.students.filter(s => done.has(s.userId)).length });
  }
  return { ...summary(cls), roster: [...cls.students].sort((a, b) => a.username.localeCompare(b.username)), assignments };
}

// Student + teacher overview for the Classes screen
async function overview(user) {
  const teaching = (await db().list('classes', { owner: user.id, limit: 200 })).map(r => summary(r.data));
  const enrolled = [];
  for (const m of await db().list('members', { owner: user.id, limit: 200 })) {
    const cls = await db().get('classes', m.data.classId);
    if (!cls || !cls.students.some(s => s.userId === user.id)) continue;
    const homework = [];
    for (const h of await homeworkFor(cls)) {
      const subs = (await db().list('hwsub', { owner: h.id, limit: 5000 })).map(r => r.data).filter(s => s.userId === user.id);
      const best = subs.sort((a, b) => (b.complete - a.complete) || (b.pct - a.pct))[0];
      homework.push({
        id: h.id, title: h.title, code: h.code, setTitle: h.setTitle, count: h.count, mode: h.mode, due: h.due,
        status: !best ? 'todo' : best.complete ? 'done' : 'started', pct: best ? best.pct : null,
        late: !!(h.due && Date.now() > h.due),
      });
    }
    homework.sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || Infinity) - (b.due || Infinity));
    enrolled.push({ ...summary(cls), homework });
  }
  return { teaching: teaching.sort((a, b) => b.created - a.created), enrolled };
}

// Everything one student did for one class: each assignment with their best attempt
async function studentWork(user, classId, studentId) {
  const homework = require('./homework');
  const cls = await getOwned(user, classId);
  const st = cls.students.find(s => s.userId === studentId);
  if (!st) throw Object.assign(new Error('That student isn’t in this class.'), { status: 404 });
  const out = [];
  for (const h of (await homeworkFor(cls)).sort((a, b) => b.created - a.created)) {
    const subs = (await db().list('hwsub', { owner: h.id, limit: 5000 })).map(r => r.data).filter(s => s.userId === studentId);
    const attempts = subs.sort((a, b) => b.finishedAt - a.finishedAt).map(homework.shapeAttempt);
    const best = [...attempts].sort((a, b) => (b.complete - a.complete) || (b.pct - a.pct))[0] || null;
    out.push({ id: h.id, title: h.title, setTitle: h.setTitle, count: h.count, mode: h.mode, due: h.due, attempts: attempts.length, best });
  }
  const done = out.filter(a => a.best && a.best.complete);
  const totals = out.reduce((t, a) => { if (a.best) { t.right += a.best.correct; t.answered += a.best.answered; } return t; }, { right: 0, answered: 0 });
  return {
    student: { userId: st.userId, username: st.username, joinedAt: st.joinedAt },
    className: cls.name,
    summary: { assigned: out.length, done: done.length, average: done.length ? Math.round(done.reduce((n, a) => n + a.best.pct, 0) / done.length) : null, right: totals.right, wrong: totals.answered - totals.right, accuracy: totals.answered ? Math.round((totals.right / totals.answered) * 100) : null },
    assignments: out,
  };
}

module.exports = { create, join, leave, remove, removeStudent, detail, overview, getOwned, isClassCode, studentWork };