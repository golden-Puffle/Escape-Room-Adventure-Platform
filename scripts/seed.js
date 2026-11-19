// Creates the admin account (from .env.local) and two sample rooms with hints.
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const ROOMS = [
  {
    title: 'The Haunted Library', difficulty: 'EASY', status: 'PUBLISHED',
    description: 'The doors have locked behind you. Solve three riddles to find the way out of the old library.',
    puzzles: [
      { title: 'The Silent Keys', points: 100, answer: 'piano',
        description: 'I have keys but open no locks, and a hammer inside but I never build anything. What am I?',
        hints: ['Think about music.', 'It has black and white keys.', 'It is a large instrument played with both hands.'] },
      { title: 'Voice in the Walls', points: 100, answer: 'echo',
        description: 'I speak without a mouth and hear without ears. I have no body, but I come alive with sound. What am I?',
        hints: ['You can hear it in canyons.', 'It repeats what you say.'] },
      { title: 'The Last Door', points: 150, answer: 'footsteps',
        description: 'The more of me you take, the more you leave behind. What am I?',
        hints: ['Think about walking.', 'You leave them in sand or snow.'] },
    ],
  },
  {
    title: 'Pirate Cove Vault', difficulty: 'MEDIUM', status: 'PUBLISHED',
    description: 'A pirate captain locked his treasure behind two puzzles. Crack both before the tide comes in.',
    puzzles: [
      { title: 'Cipher on the Map', points: 120, answer: 'hello',
        description: 'The note says "KHOOR". Each letter was shifted 3 places forward in the alphabet. What does it really say?',
        hints: ['Shift each letter 3 places back.', 'K goes back to H.'] },
      { title: 'The Soaked Sail', points: 150, answer: 'towel',
        description: 'What gets wetter the more it dries?',
        hints: ['You use it after a shower.'] },
    ],
  },
];

(async () => {
  const { DATABASE_URL, MONGODB_URI, MONGODB_DB, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Fill DATABASE_URL, MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in .env.local');
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  const mongo = await new MongoClient(MONGODB_URI).connect();
  const db = mongo.db(MONGODB_DB || 'escape_room_logs');

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await pool.query(
    `INSERT INTO users (role_id, name, email, password_hash)
     VALUES ((SELECT role_id FROM roles WHERE role_name = 'admin'), 'Admin', lower($1), $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING user_id`,
    [ADMIN_EMAIL, hash]
  );
  const adminId = admin.rows[0].user_id;
  console.log('Admin ready:', ADMIN_EMAIL);

  for (const room of ROOMS) {
    if ((await pool.query('SELECT 1 FROM rooms WHERE title = $1', [room.title])).rowCount) {
      console.log('Skipping existing room:', room.title);
      continue;
    }
    const r = await pool.query(
      `INSERT INTO rooms (created_by, title, description, difficulty, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING room_id`,
      [adminId, room.title, room.description, room.difficulty, room.status]
    );
    for (let i = 0; i < room.puzzles.length; i++) {
      const p = room.puzzles[i];
      const pr = await pool.query(
        `INSERT INTO puzzles (room_id, title, description, answer_hash, sequence_no, points)
         VALUES ($1, $2, $3, hash_answer($4), $5, $6) RETURNING puzzle_id`,
        [r.rows[0].room_id, p.title, p.description, p.answer, i + 1, p.points]
      );
      await db.collection('hints').insertMany(
        p.hints.map((text, k) => ({ puzzle_id: pr.rows[0].puzzle_id, level: k + 1, text }))
      );
    }
    console.log('Created room:', room.title);
  }
  await pool.end();
  await mongo.close();
})().catch((e) => { console.error(e.message); process.exit(1); });