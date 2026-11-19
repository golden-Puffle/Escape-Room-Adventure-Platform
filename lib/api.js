import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ok = (data, status = 200) => NextResponse.json(data, { status });

export function intParam(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id');
  return n;
}

export async function requireUser(role) {
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Please log in first');
  if (role && user.role !== role) throw new HttpError(403, 'You do not have access to this');
  return user;
}

// PostgreSQL error codes -> friendly API errors (this is where DB-level validation surfaces)
const PG = {
  '23505': [409, 'That value already exists'],
  '23514': [400, 'Rejected by a database rule'],
  '23503': [400, 'Refers to something that does not exist'],
  '22P02': [400, 'Invalid input'],
};

export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return ok({ error: e.message }, e.status);
      if (e.code === 'P0001') return ok({ error: e.message }, 400); // RAISE EXCEPTION in plpgsql
      if (PG[e.code]) {
        const [status, msg] = PG[e.code];
        return ok({ error: e.constraint ? `${msg} (${e.constraint})` : msg }, status);
      }
      console.error(e);
      return ok({ error: 'Something went wrong on the server' }, 500);
    }
  };
}