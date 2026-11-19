import { handle, ok, HttpError, intParam } from '@/lib/api';
import { query } from '@/lib/db';

export const GET = handle(async (req, { params }) => {
  const { rows } = await query(
    `SELECT r.room_id, r.title, r.description, r.difficulty,
            (SELECT COUNT(*) FROM puzzles p WHERE p.room_id = r.room_id)::int AS puzzle_count
     FROM rooms r WHERE r.room_id = $1 AND r.status = 'PUBLISHED'`,
    [intParam(params.id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Room not found');
  return ok({ room: rows[0] });
});