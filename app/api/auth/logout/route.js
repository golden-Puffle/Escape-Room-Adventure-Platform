import { cookies } from 'next/headers';
import { handle, ok } from '@/lib/api';

export const POST = handle(async () => {
  cookies().delete('token');
  return ok({ ok: true });
});