import { handle, ok, requireUser } from '@/lib/api';
import { query } from '@/lib/db';

export const GET = handle(async () => {
  const user = await requireUser();
  const perf = await query(`SELECT rooms_played, rooms_completed, total_score, average_score FROM player_performance WHERE user_id = $1`, [user.id]);
  const sessions = await query(
    `SELECT gs.session_id, gs.room_id, r.title, gs.status, gs.started_at, gs.completed_at,
            COALESCE(s.total_score, 0)::int AS score
     FROM game_sessions gs
     JOIN rooms r ON r.room_id = gs.room_id
     LEFT JOIN scores s ON s.session_id = gs.session_id
     WHERE gs.player_id = $1
     ORDER BY gs.started_at DESC LIMIT 20`,
    [user.id]
  );
  return ok({ performance: perf.rows[0], sessions: sessions.rows });
});