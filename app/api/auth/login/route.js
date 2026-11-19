import bcrypt from 'bcryptjs';
import { handle, ok, HttpError } from '@/lib/api';
import { query } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export const POST = handle(async (req) => {
  const { email, password } = await req.json();
  const { rows } = await query(
    `SELECT u.user_id, u.name, u.password_hash, r.role_name
     FROM users u JOIN roles r ON r.role_id = u.role_id
     WHERE u.email = lower($1)`,
    [String(email || '').trim()]
  );
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  const user = { id: u.user_id, name: u.name, role: u.role_name };
  setAuthCookie(await signToken(user));
  return ok({ user });
});