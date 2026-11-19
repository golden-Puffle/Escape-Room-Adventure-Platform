'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function Nav() {
  const [user, setUser] = useState(null);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => setUser(null));
  }, [path]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  }

  return (
    <header className="nav">
      <Link href="/" className="brand">Escape Room</Link>
      <Link href="/">Rooms</Link>
      <Link href="/leaderboard">Leaderboard</Link>
      {user && <Link href="/dashboard">My progress</Link>}
      {user?.role === 'admin' && <Link href="/admin">Admin</Link>}
      {user ? (
        <>
          <span>{user.name}</span>
          <button onClick={logout}>Log out</button>
        </>
      ) : (
        <>
          <Link href="/login">Log in</Link>
          <Link href="/register">Create account</Link>
        </>
      )}
    </header>
  );
}