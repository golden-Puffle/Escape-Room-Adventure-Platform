import { handle, ok, requireUser, HttpError, intParam } from '@/lib/api';
import { getDb } from '@/lib/mongo';
import { loadSession, currentPuzzle, hintsUsed, logEvent, HINT_PENALTY } from '@/lib/game';

export const POST = handle(async (req, { params }) => {
  const user = await requireUser();
  const s = await loadSession(intParam(params.id), user.id);
  if (s.status !== 'IN_PROGRESS') throw new HttpError(400, 'This session is already finished');
  const puzzle = await currentPuzzle(s.session_id, s.room_id);
  if (!puzzle) throw new HttpError(400, 'No puzzles left in this room');

  const used = await hintsUsed(s.session_id, puzzle.puzzle_id);
  const db = await getDb();
  const next = await db.collection('hints').find({ puzzle_id: puzzle.puzzle_id }).sort({ level: 1 }).skip(used).limit(1).toArray();
  if (!next[0]) throw new HttpError(404, 'No more hints for this puzzle');

  await logEvent({
    session_id: s.session_id, player_id: user.id, room_id: s.room_id,
    puzzle_id: puzzle.puzzle_id, event_type: 'hint_requested', details: { level: next[0].level },
  });
  return ok({ hint: next[0].text, level: next[0].level, penalty: HINT_PENALTY });
});