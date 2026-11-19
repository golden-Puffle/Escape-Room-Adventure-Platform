'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(isRegister ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: form });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>
      <form onSubmit={submit}>
        {isRegister && (<><label htmlFor="name">Name</label><input id="name" value={form.name} onChange={set('name')} required /></>)}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} required />
        <label htmlFor="password">Password {isRegister && '(at least 8 characters)'}</label>
        <input id="password" type="password" value={form.password} onChange={set('password')} required />
        {error && <p className="error" role="alert">{error}</p>}
        <p><button className="btn" disabled={busy}>{isRegister ? 'Create account' : 'Log in'}</button></p>
      </form>
      <p className="muted">
        {isRegister ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New here? <Link href="/register">Create an account</Link></>}
      </p>
    </div>
  );
}