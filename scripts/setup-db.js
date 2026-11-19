// Creates the database (if missing), the PostgreSQL schema and the MongoDB indexes.
// Usage:  npm run db:setup            (first time)
//         npm run db:setup -- --reset (drops everything first)
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');

async function ensureDatabase(url) {
  const u = new URL(url);
  const name = decodeURIComponent(u.pathname.slice(1));
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error('Database name in DATABASE_URL may only contain letters, numbers and _');
  u.pathname = '/postgres';
  const admin = new Pool({ connectionString: u.toString() });
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${name}"`);
    console.log('Created database', name);
  }
  await admin.end();
}

(async () => {
  const { DATABASE_URL, MONGODB_URI, MONGODB_DB } = process.env;
  if (!DATABASE_URL || !MONGODB_URI) throw new Error('Create .env.local from .env.example first');

  await ensureDatabase(DATABASE_URL);
  const pool = new Pool({ connectionString: DATABASE_URL });
  const sql = (f) => fs.readFileSync(path.join(__dirname, '..', 'sql', f), 'utf8');
  if (process.argv.includes('--reset')) {
    await pool.query(sql('99_drop_all.sql'));
    console.log('Dropped existing tables');
  }
  await pool.query(sql('01_schema.sql'));
  console.log('PostgreSQL schema created');

  const mongo = await new MongoClient(MONGODB_URI).connect();
  const db = mongo.db(MONGODB_DB || 'escape_room_logs');
  if (process.argv.includes('--reset')) {
    await db.collection('hints').deleteMany({});
    await db.collection('game_logs').deleteMany({});
  }
  await db.collection('hints').createIndex({ puzzle_id: 1, level: 1 }, { unique: true });
  await db.collection('game_logs').createIndex({ session_id: 1, puzzle_id: 1, event_type: 1 });
  await db.collection('game_logs').createIndex({ puzzle_id: 1, event_type: 1 });
  await db.collection('game_logs').createIndex({ ts: -1 });
  console.log('MongoDB indexes created');

  await pool.end();
  await mongo.close();
})().catch((e) => { console.error(e.message); process.exit(1); });