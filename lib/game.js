import { query } from '@/lib/db';
import { getDb } from '@/lib/mongo';
import { HttpError } from '@/lib/api';

export const HINT_PENALTY = 10; // keep in sync with submit_answer() in sql/01_schema.sql

export async function loadSession(sessionId, userId) {
  const { rows } = await query(
    `SELECT gs.session_id, gs.room_id, gs.status, r.title AS room_title,
            (SELECT COUNT(*) FROM puzzles WHERE room_id = gs.room_id)::int AS total,
            (SELECT COUNT(*) FROM puzzle_completions WHERE session_id = gs.session_id)::int AS done,
            COALESCE((SELECT total_score FROM scores WHERE session_id = gs.session_id), 0)::int AS score
     FROM game_sessions gs JOIN rooms r ON r.room_id = gs.room_id
     WHERE gs.session_id = $1 AND gs.player_id = $2`,
    [sessionId, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Session not found');
  return rows[0];
}

export async function currentPuzzle(sessionId, roomId) {
  const { rows } = await query(
    `SELECT p.puzzle_id, p.title, p.description, p.sequence_no, p.points
     FROM puzzles p
     WHERE p.room_id = $1
       AND NOT EXISTS (SELECT 1 FROM puzzle_completions pc
                       WHERE pc.session_id = $2 AND pc.puzzle_id = p.puzzle_id)
     ORDER BY p.sequence_no LIMIT 1`,
    [roomId, sessionId]
  );
  return rows[0] || null;
}

export async function logEvent(doc) {
  const db = await getDb();
  await db.collection('game_logs').insertOne({ ...doc, ts: new Date() });
}

export async function hintsUsed(sessionId, puzzleId) {
  const db = await getDb();
  return db.collection('game_logs').countDocuments({
    session_id: sessionId, puzzle_id: puzzleId, event_type: 'hint_requested',
  });
}