// Storage driver: Neon/Postgres when DATABASE_URL is set, otherwise a local JSON file.
// Everything is stored as documents: (collection, id, owner, data, updated).
const fs = require('fs');
const path = require('path');

let driver = null;

function fileDriver(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'db.json');
  let db = {};
  if (fs.existsSync(file)) {
    try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { db = {}; }
  }
  let saveTimer = null;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, file);
    }, 150);
  };
  const coll = c => (db[c] = db[c] || {});
  return {
    kind: 'file',
    async get(c, id) { const d = coll(c)[id]; return d ? structuredClone(d.data) : null; },
    async put(c, id, data, owner = null) { coll(c)[id] = { owner, data: structuredClone(data), updated: Date.now() }; persist(); },
    async del(c, id) { delete coll(c)[id]; persist(); },
    async list(c, { owner, limit = 500 } = {}) {
      return Object.entries(coll(c))
        .filter(([, d]) => owner === undefined || d.owner === owner)
        .sort((a, b) => b[1].updated - a[1].updated)
        .slice(0, limit)
        .map(([id, d]) => ({ id, owner: d.owner, updated: d.updated, data: structuredClone(d.data) }));
    },
    async findOne(c, field, value) {
      const v = String(value).toLowerCase();
      const hit = Object.entries(coll(c)).find(([, d]) => String(d.data[field] ?? '').toLowerCase() === v);
      return hit ? { id: hit[0], data: structuredClone(hit[1].data) } : null;
    },
    async count(c) { return Object.keys(coll(c)).length; },
  };
}

async function pgDriver(url) {
  const { Pool } = require('pg');
  const ssl = process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: url, ssl, max: 5 });
  await pool.query(`CREATE TABLE IF NOT EXISTS docs (
    coll TEXT NOT NULL, id TEXT NOT NULL, owner TEXT, data JSONB NOT NULL, updated BIGINT NOT NULL,
    PRIMARY KEY (coll, id))`);
  await pool.query('CREATE INDEX IF NOT EXISTS docs_owner ON docs (coll, owner)');
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS docs_username ON docs (lower(data->>'username')) WHERE coll = 'users'`);
  return {
    kind: 'postgres',
    async get(c, id) {
      const r = await pool.query('SELECT data FROM docs WHERE coll=$1 AND id=$2', [c, id]);
      return r.rows[0] ? r.rows[0].data : null;
    },
    async put(c, id, data, owner = null) {
      await pool.query(`INSERT INTO docs (coll,id,owner,data,updated) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (coll,id) DO UPDATE SET owner=EXCLUDED.owner, data=EXCLUDED.data, updated=EXCLUDED.updated`,
        [c, id, owner, JSON.stringify(data), Date.now()]);
    },
    async del(c, id) { await pool.query('DELETE FROM docs WHERE coll=$1 AND id=$2', [c, id]); },
    async list(c, { owner, limit = 500 } = {}) {
      const r = owner === undefined
        ? await pool.query('SELECT id,owner,updated,data FROM docs WHERE coll=$1 ORDER BY updated DESC LIMIT $2', [c, limit])
        : await pool.query('SELECT id,owner,updated,data FROM docs WHERE coll=$1 AND owner IS NOT DISTINCT FROM $2 ORDER BY updated DESC LIMIT $3', [c, owner, limit]);
      return r.rows.map(x => ({ ...x, updated: Number(x.updated) }));
    },
    async findOne(c, field, value) {
      const r = await pool.query(`SELECT id,data FROM docs WHERE coll=$1 AND lower(data->>'${field.replace(/\W/g, '')}')=lower($2) LIMIT 1`, [c, String(value)]);
      return r.rows[0] || null;
    },
    async count(c) { const r = await pool.query('SELECT count(*)::int AS n FROM docs WHERE coll=$1', [c]); return r.rows[0].n; },
  };
}

async function init({ dataDir }) {
  driver = process.env.DATABASE_URL ? await pgDriver(process.env.DATABASE_URL) : fileDriver(dataDir);
  console.log(`Storage: ${driver.kind}`);
  return driver;
}

module.exports = { init, get db() { return driver; } };
