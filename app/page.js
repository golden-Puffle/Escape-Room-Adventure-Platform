'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusy(true);
      api(`/api/rooms?q=${encodeURIComponent(q)}&difficulty=${difficulty}&semantic=${semantic ? 1 : 0}`)
        .then((d) => { setRooms(d.rooms); setError(''); setLoaded(true); })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }, 400);
    return () => clearTimeout(t);
  }, [q, difficulty, semantic]);

  return (
    <>
      <h1>Pick a room and find the way out</h1>
      <p className="muted">Each room is a chain of puzzles. Solve them in order; hints help but cost points.</p>
      <div className="row" style={{ margin: '1rem 0 .25rem' }}>
        <input aria-label="Search rooms" placeholder={semantic ? 'Describe the kind of room you want' : 'Search rooms'} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>
      <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', margin: '0 0 1rem' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={semantic} onChange={(e) => setSemantic(e.target.checked)} />
        Search by meaning (e.g. "spooky place with ghosts"). The first search downloads a small language model.
      </label>
      {busy && <p className="muted">Searching...</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {loaded && !busy && !rooms.length && !error && <p>No rooms match. Clear the search or ask an admin to publish a room.</p>}
      <div className="grid">
        {rooms.map((r) => (
          <div className="card" key={r.room_id}>
            <h3>{r.title}</h3>
            <span className="tag">{r.difficulty.toLowerCase()}</span>
            {r.similarity != null && <span className="tag" style={{ marginLeft: '.4rem' }}>{Math.round(r.similarity * 100)}% match</span>}
            <p>{r.description}</p>
            <p className="muted">{r.puzzle_count} puzzles, up to {r.max_points} points</p>
            <Link className="btn" href={`/rooms/${r.room_id}`}>Enter room</Link>
          </div>
        ))}
      </div>
    </>
  );
}