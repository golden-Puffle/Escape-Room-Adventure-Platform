import { handle, ok, requireUser, HttpError } from '@/lib/api';
import { query, pool } from '@/lib/db';
import { getDb } from '@/lib/mongo';
import { embedRoom } from '@/lib/embed';

export const GET = handle(async () => {
  await requireUser('admin');
  const { rows } = await query(
    `SELECT r.room_id, r.title, r.difficulty, r.status, r.created_at,
            (SELECT COUNT(*) FROM puzzles p WHERE p.room_id = r.room_id)::int AS puzzle_count,
            (SELECT COUNT(*) FROM game_sessions g WHERE g.room_id = r.room_id)::int AS sessions,
            (SELECT COUNT(*) FROM game_sessions g WHERE g.room_id = r.room_id AND g.status = 'COMPLETED')::int AS completed
     FROM rooms r ORDER BY r.created_at DESC`
  );
  return ok({ rooms: rows });
});

// Create a room and all its puzzles in ONE transaction; hints go to MongoDB afterwards.
export const POST = handle(async (req) => {
  const admin = await requireUser('admin');
  const { title, description, difficulty, status, puzzles } = await req.json();
  if (!Array.isArray(puzzles) || puzzles.length === 0) throw new HttpError(400, 'Add at least one puzzle');

  const client = await pool.connect();
  const hintDocs = [];
  let roomId;
  try {
    await client.query('BEGIN');
    const room = await client.query(
      `INSERT INTO rooms (created_by, title, description, difficulty, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING room_id`,
      [admin.id, title, description || null, difficulty, status || 'DRAFT']
    );
    roomId = room.rows[0].room_id;
    for (let i = 0; i < puzzles.length; i++) {
      const p = puzzles[i];
      const r = await client.query(
        `INSERT INTO puzzles (room_id, title, description, answer_hash, sequence_no, points)
         VALUES ($1, $2, $3, hash_answer($4), $5, $6) RETURNING puzzle_id`,
        [roomId, p.title, p.description, p.answer || '', i + 1, Number(p.points) || 100]
      );
      (p.hints || []).forEach((text, k) => hintDocs.push({ puzzle_id: r.rows[0].puzzle_id, level: k + 1, text }));
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  if (hintDocs.length) await (await getDb()).collection('hints').insertMany(hintDocs);
  try {
    await embedRoom(roomId, title, description); // semantic search; skipped if pgvector is not set up
  } catch (e) {
    console.warn('Room created without embedding:', e.message);
  }
  return ok({ roomId }, 201);
});