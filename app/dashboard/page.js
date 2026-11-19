'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/me/performance').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!data) return <p>Loading...</p>;
  const p = data.performance || {};

  return (
    <>
      <h1>My progress</h1>
      <div className="stats">
        {[['Rooms played', p.rooms_played], ['Rooms escaped', p.rooms_completed], ['Total score', p.total_score], ['Average score', p.average_score]].map(([k, v]) => (
          <div className="card" key={k}><div className="stat">{v ?? 0}</div><div className="muted">{k}</div></div>
        ))}
      </div>
      <h2>Recent sessions</h2>
      {!data.sessions.length ? <p>You have not entered a room yet. <Link href="/">Pick one</Link>.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Room</th><th>Status</th><th>Score</th><th>Started</th><th></th></tr></thead>
          <tbody>{data.sessions.map((s) => (
            <tr key={s.session_id}>
              <td>{s.title}</td><td>{s.status.replace('_', ' ').toLowerCase()}</td><td>{s.score}</td>
              <td>{new Date(s.started_at).toLocaleString()}</td>
              <td>{s.status === 'IN_PROGRESS' && <Link href={`/rooms/${s.room_id}`}>Continue</Link>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}