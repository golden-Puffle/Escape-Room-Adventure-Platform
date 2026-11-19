import bcrypt from 'bcryptjs';
import { handle, ok, HttpError } from '@/lib/api';
import { query } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export const POST = handle(async (req) => {
  const { name, email, password } = await req.json();
  if (!name || !email || typeof password !== 'string' || password.length < 8) {
    throw new HttpError(400, 'Name, email and a password of at least 8 characters are required');
  }
  const hash = await bcrypt.hash(password, 10);
  let row;
  try {
    ({ rows: [row] } = await query(
      `INSERT INTO users (role_id, name, email, password_hash)
       VALUES ((SELECT role_id FROM roles WHERE role_name = 'player'), $1, lower($2), $3)
       RETURNING user_id`,
      [name.trim(), email.trim(), hash]
    ));
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw e; // CHECK violations (bad email/name) are reported by handle()
  }
  const token = await signToken({ id: row.user_id, name: name.trim(), role: 'player' });
  setAuthCookie(token);
  return ok({ user: { id: row.user_id, name: name.trim(), role: 'player' } }, 201);
});