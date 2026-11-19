import { handle, ok } from '@/lib/api';
import { query } from '@/lib/db';

export const GET = handle(async (req) => {
  const roomId = new URL(req.url).searchParams.get('roomId');
  const { rows } = await query(
    `SELECT room_id, room_name, player_name, total_score, rank::int AS rank,
            EXTRACT(EPOCH FROM completion_time)::int AS seconds
     FROM leaderboard
     WHERE ($1::int IS NULL OR room_id = $1::int)
     ORDER BY room_id, rank LIMIT 100`,
    [roomId ? Number(roomId) : null]
  );
  return ok({ rows });
});