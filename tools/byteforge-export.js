// ByteForge Account migration, step 1 for QuizForge.
//   node tools/byteforge-export.js
// 1. Backs up every QuizForge document to backups/quizforge-backup-<time>.json
// 2. Writes migration/quizforge-export.json for byteforge-account/scripts/import-users.js
// Reads DATABASE_URL from .env. Changes nothing in the database.
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
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set (.env).'); process.exit(1); }

const { COLLECTIBLES } = require('../server/progress');
const { levelFor } = require('../server/auth');
const admins = String(process.env.ADMIN_USERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const tables = (await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)).rows.map((r) => r.table_name);
  const backup = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) backup.tables[t] = (await pool.query(`SELECT * FROM "${t}"`)).rows;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(path.join(__dirname, '..', 'backups'), { recursive: true });
  const backupFile = path.join(__dirname, '..', 'backups', `quizforge-backup-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup));
  console.log(`Backup: ${backupFile}`);
  for (const t of tables) console.log(`  ${t}: ${backup.tables[t].length} rows`);
  const docs = backup.tables.docs || [];
  const counts = {};
  for (const d of docs) counts[d.coll] = (counts[d.coll] || 0) + 1;
  console.log('  collections:', JSON.stringify(counts));

  const users = docs.filter((d) => d.coll === 'users' && d.data.passHash && !d.data.bfId).map((d) => {
    const u = d.data;
    const stats = { Level: levelFor(u.xp || 0) };
    if (u.gamesPlayed) stats.Games = u.gamesPlayed;
    if (u.wins) stats.Wins = u.wins;
    const owned = COLLECTIBLES.filter((c) => u.forgelings && u.forgelings[c.id]);
    if (owned.length) stats.Forgelings = owned.length;
    stats['QuizForge XP'] = u.xp || 0;
    return {
      legacy_id: String(u.id),
      username: u.username,
      email: null, // QuizForge never stored emails
      password_hash: `nodescrypt$64$${u.salt}$${u.passHash}`,
      created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      role: admins.includes(String(u.username).toLowerCase()) ? 'admin' : 'user',
      // Starting ByteForge XP: one tenth of QuizForge XP, capped at 5,000.
      xp: Math.min(5000, Math.floor((u.xp || 0) / 10)),
      stats,
      achievements: owned.map((c) => ({ id: `forgeling-${c.id}`, name: `Forgeling: ${c.name}`, description: `Collected ${c.name} (${c.rarity}).`, icon: c.icon })),
      banned: !!u.banned,
    };
  });
  fs.mkdirSync(path.join(__dirname, '..', 'migration'), { recursive: true });
  const out = path.join(__dirname, '..', 'migration', 'quizforge-export.json');
  fs.writeFileSync(out, JSON.stringify({ app: 'quizforge', exported_at: backup.exported_at, users }, null, 1));
  console.log(`Export: ${out} (${users.length} users)`);
  for (const u of users) console.log(`  ${u.username}  role=${u.role}  xp=${u.xp}  forgelings=${u.achievements.length}${u.banned ? '  BANNED' : ''}`);
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
