import { handle, ok, requireUser, HttpError, intParam } from '@/lib/api';
import { query } from '@/lib/db';
import { logEvent } from '@/lib/game';

// Start a session for a room, or resume the player's in-progress one.
export const POST = handle(async (req) => {
  const user = await requireUser();
  const roomId = intParam((await req.json()).roomId);

  const room = await query(`SELECT 1 FROM rooms WHERE room_id = $1 AND status = 'PUBLISHED'`, [roomId]);
  if (!room.rowCount) throw new HttpError(404, 'This room is not available');

  const findActive = () => query(
    `SELECT session_id FROM game_sessions WHERE player_id = $1 AND room_id = $2 AND status = 'IN_PROGRESS'`,
    [user.id, roomId]
  );
  const existing = await findActive();
  if (existing.rowCount) return ok({ sessionId: existing.rows[0].session_id, resumed: true });

  try {
    const { rows } = await query(
      `INSERT INTO game_sessions (player_id, room_id) VALUES ($1, $2) RETURNING session_id`,
      [user.id, roomId]
    );
    await logEvent({ session_id: rows[0].session_id, player_id: user.id, room_id: roomId, event_type: 'session_started' });
    return ok({ sessionId: rows[0].session_id, resumed: false }, 201);
  } catch (e) {
    if (e.code === '23505') { // unique partial index: another request just created it
      const again = await findActive();
      return ok({ sessionId: again.rows[0].session_id, resumed: true });
    }
    throw e;
  }
});