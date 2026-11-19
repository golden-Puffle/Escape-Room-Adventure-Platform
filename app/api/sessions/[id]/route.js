import { handle, ok, requireUser, intParam } from '@/lib/api';
import { query } from '@/lib/db';
import { getDb } from '@/lib/mongo';
import { loadSession, currentPuzzle, hintsUsed, HINT_PENALTY } from '@/lib/game';

// Current state of a session: progress, the puzzle to solve now, hints already revealed.
export const GET = handle(async (req, { params }) => {
  const user = await requireUser();
  const s = await loadSession(intParam(params.id), user.id);

  let puzzle = null, hints = [], hintsAvailable = 0, result = null;
  if (s.status === 'IN_PROGRESS') {
    puzzle = await currentPuzzle(s.session_id, s.room_id);
    if (puzzle) {
      const db = await getDb();
      const used = await hintsUsed(s.session_id, puzzle.puzzle_id);
      hintsAvailable = await db.collection('hints').countDocuments({ puzzle_id: puzzle.puzzle_id });
      if (used) {
        const docs = await db.collection('hints').find({ puzzle_id: puzzle.puzzle_id }).sort({ level: 1 }).limit(used).toArray();
        hints = docs.map((h) => h.text);
      }
    }
  } else if (s.status === 'COMPLETED') {
    const r = await query(`SELECT EXTRACT(EPOCH FROM completion_time)::int AS seconds FROM scores WHERE session_id = $1`, [s.session_id]);
    result = { seconds: r.rows[0]?.seconds ?? null };
  }
  return ok({ session: s, puzzle, hints, hintsAvailable, hintPenalty: HINT_PENALTY, result });
});