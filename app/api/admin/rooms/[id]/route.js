import { handle, ok, requireUser, HttpError, intParam } from '@/lib/api';
import { query } from '@/lib/db';
import { getDb } from '@/lib/mongo';

export const PATCH = handle(async (req, { params }) => {
  await requireUser('admin');
  const { status } = await req.json();
  const r = await query(`UPDATE rooms SET status = $1 WHERE room_id = $2`, [status, intParam(params.id)]);
  if (!r.rowCount) throw new HttpError(404, 'Room not found');
  return ok({ ok: true });
});

export const DELETE = handle(async (req, { params }) => {
  await requireUser('admin');
  const id = intParam(params.id);
  const ids = (await query(`SELECT puzzle_id FROM puzzles WHERE room_id = $1`, [id])).rows.map((r) => r.puzzle_id);
  const r = await query(`DELETE FROM rooms WHERE room_id = $1`, [id]); 
  if (!r.rowCount) throw new HttpError(404, 'Room not found');
  const db = await getDb();
  await db.collection('hints').deleteMany({ puzzle_id: { $in: ids } });
  await db.collection('game_logs').deleteMany({ room_id: id });
  return ok({ ok: true });
});