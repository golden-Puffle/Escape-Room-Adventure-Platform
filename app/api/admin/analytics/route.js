import { handle, ok, requireUser } from '@/lib/api';
import { query } from '@/lib/db';
import { getDb } from '@/lib/mongo';

// Where do players get stuck? MongoDB aggregation over game_logs, joined with SQL puzzle/room titles.
export const GET = handle(async () => {
  await requireUser('admin');
  const db = await getDb();
  const agg = await db.collection('game_logs').aggregate([
    { $match: { puzzle_id: { $exists: true } } },
    { $group: {
        _id: '$puzzle_id',
        wrong:   { $sum: { $cond: [{ $eq: ['$event_type', 'attempt_wrong'] }, 1, 0] } },
        correct: { $sum: { $cond: [{ $eq: ['$event_type', 'attempt_correct'] }, 1, 0] } },
        hints:   { $sum: { $cond: [{ $eq: ['$event_type', 'hint_requested'] }, 1, 0] } },
    } },
    { $sort: { wrong: -1, hints: -1 } },
    { $limit: 50 },
  ]).toArray();
  if (!agg.length) return ok({ rows: [] });

  const { rows: meta } = await query(
    `SELECT p.puzzle_id, p.title, p.sequence_no, r.title AS room_title
     FROM puzzles p JOIN rooms r ON r.room_id = p.room_id
     WHERE p.puzzle_id = ANY($1::int[])`,
    [agg.map((a) => a._id)]
  );
  const byId = Object.fromEntries(meta.map((m) => [m.puzzle_id, m]));
  const rows = agg.filter((a) => byId[a._id]).map((a) => ({
    puzzle_id: a._id, ...byId[a._id], wrong: a.wrong, correct: a.correct, hints: a.hints,
  }));
  return ok({ rows });
});