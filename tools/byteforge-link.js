// ByteForge Account migration, step 2 for QuizForge.
//   node tools/byteforge-link.js migration/quizforge-mapping.json
// Links each QuizForge user to their ByteForge Account (bfId) and removes the old
// password hash (it now lives in ByteForge Account). Progress, sets, classes and
// homework keep the same QuizForge user id. Reads DATABASE_URL from .env. Safe to run twice.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envFile = path.join(__dirname, '..', '.env');
if (!process.env.DATABASE_URL && fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line);
    if (m) process.env[m[1]] = m[2].replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1');
  }
}
const file = process.argv[2];
if (!file) { console.error('Usage: node tools/byteforge-link.js <quizforge-mapping.json>'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (.env).'); process.exit(1); }

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: false } });
  const mapping = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [legacyId, bfId] of Object.entries(mapping)) {
    const r = await pool.query(
      `UPDATE docs SET data = (data - 'salt' - 'passHash') || jsonb_build_object('bfId', $2::text), updated = $3
       WHERE coll = 'users' AND id = $1 RETURNING data->>'username' AS name`, [legacyId, bfId, Date.now()]);
    console.log(r.rows.length ? `  ${r.rows[0].name} -> ${bfId}` : `  no QuizForge user with id ${legacyId}`);
  }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
