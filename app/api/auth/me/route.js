import { handle, ok } from '@/lib/api';
import { getUser } from '@/lib/auth';

export const GET = handle(async () => {
  const u = await getUser();
  return ok({ user: u ? { id: u.id, name: u.name, role: u.role } : null });
});