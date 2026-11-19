import { handle, ok, requireUser, HttpError, intParam } from '@/lib/api';
import { query } from '@/lib/db';
import { loadSession, currentPuzzle, hintsUsed, logEvent } from '@/lib/game';

export const POST = handle(async (req, { params }) => {
  const user = await requireUser();
  const { answer } = await req.json();
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 255) {
    throw new HttpError(400, 'Enter an answer (up to 255 characters)');
  }
  const s = await loadSession(intParam(params.id), user.id);
  if (s.status !== 'IN_PROGRESS') throw new HttpError(400, 'This session is already finished');
  const puzzle = await currentPuzzle(s.session_id, s.room_id);
  if (!puzzle) throw new HttpError(400, 'No puzzles left in this room');

  const used = await hintsUsed(s.session_id, puzzle.puzzle_id);
  // Validation, scoring, completion and leaderboard update all happen inside PostgreSQL
  const { rows } = await query('SELECT * FROM submit_answer($1, $2, $3, $4)', [s.session_id, user.id, answer, used]);
  const r = rows[0];

  const base = { session_id: s.session_id, player_id: user.id, room_id: s.room_id, puzzle_id: puzzle.puzzle_id };
  await logEvent({ ...base, event_type: r.out_correct ? 'attempt_correct' : 'attempt_wrong', details: { answer, points: r.out_points } });
  if (r.out_status === 'COMPLETED') await logEvent({ ...base, event_type: 'room_completed' });

  return ok({ correct: r.out_correct, points: r.out_points, status: r.out_status });
});