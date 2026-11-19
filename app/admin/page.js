'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const blankPuzzle = () => ({ title: '', description: '', answer: '', points: 100, hints: '' });
const blankRoom = () => ({ title: '', description: '', difficulty: 'EASY', status: 'DRAFT', puzzles: [blankPuzzle()] });

export default function Admin() {
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState([]);
  const [form, setForm] = useState(blankRoom());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    try {
      setRooms((await api('/api/admin/rooms')).rooms);
      setStats((await api('/api/admin/analytics')).rows);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { refresh(); }, []);

  const setPuzzle = (i, k, v) => setForm({ ...form, puzzles: form.puzzles.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });

  async function create(e) {
    e.preventDefault();
    setError(''); setNotice('');
    try {
      const body = { ...form, puzzles: form.puzzles.map((p) => ({ ...p, hints: p.hints.split('\n').map((h) => h.trim()).filter(Boolean) })) };
      await api('/api/admin/rooms', { method: 'POST', body });
      setForm(blankRoom());
      setNotice('Room created');
      refresh();
    } catch (err) { setError(err.message); }
  }

  async function setStatus(id, status) {
    setError('');
    try { await api(`/api/admin/rooms/${id}`, { method: 'PATCH', body: { status } }); refresh(); } catch (e) { setError(e.message); }
  }
  async function remove(id, title) {
    if (!confirm(`Delete "${title}" and all its sessions and scores?`)) return;
    try { await api(`/api/admin/rooms/${id}`, { method: 'DELETE' }); refresh(); } catch (e) { setError(e.message); }
  }

  return (
    <>
      <h1>Admin</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="okmsg">{notice}</p>}

      <h2>Rooms</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Room</th><th>Difficulty</th><th>Status</th><th>Puzzles</th><th>Sessions</th><th>Escaped</th><th></th></tr></thead>
        <tbody>{rooms.map((r) => (
          <tr key={r.room_id}>
            <td>{r.title}</td><td>{r.difficulty.toLowerCase()}</td><td>{r.status.toLowerCase()}</td>
            <td>{r.puzzle_count}</td><td>{r.sessions}</td><td>{r.completed}</td>
            <td className="row">
              {r.status !== 'PUBLISHED' && <button className="btn ghost" onClick={() => setStatus(r.room_id, 'PUBLISHED')}>Publish</button>}
              {r.status === 'PUBLISHED' && <button className="btn ghost" onClick={() => setStatus(r.room_id, 'ARCHIVED')}>Archive</button>}
              <button className="btn danger" onClick={() => remove(r.room_id, r.title)}>Delete</button>
            </td>
          </tr>
        ))}</tbody>
      </table></div>

      <h2 style={{ marginTop: '2rem' }}>Where players get stuck</h2>
      {!stats.length ? <p>No play data yet. Attempts and hint requests will show up here.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Room</th><th>Puzzle</th><th>Wrong attempts</th><th>Hints used</th><th>Solved</th></tr></thead>
          <tbody>{stats.map((s) => (
            <tr key={s.puzzle_id}><td>{s.room_title}</td><td>{s.sequence_no}. {s.title}</td><td>{s.wrong}</td><td>{s.hints}</td><td>{s.correct}</td></tr>
          ))}</tbody>
        </table></div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Create a room</h2>
      <form onSubmit={create}>
        <label htmlFor="t">Title</label>
        <input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <label htmlFor="d">Description</label>
        <textarea id="d" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="row">
          <div style={{ flex: 1 }}><label htmlFor="df">Difficulty</label>
            <select id="df" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select></div>
          <div style={{ flex: 1 }}><label htmlFor="st">Status</label>
            <select id="st" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option>
            </select></div>
        </div>

        {form.puzzles.map((p, i) => (
          <div className="puzzle-form" key={i}>
            <h3>Puzzle {i + 1}</h3>
            <label>Title</label><input value={p.title} onChange={(e) => setPuzzle(i, 'title', e.target.value)} required />
            <label>Question</label><textarea rows={2} value={p.description} onChange={(e) => setPuzzle(i, 'description', e.target.value)} required />
            <div className="row">
              <div style={{ flex: 2 }}><label>Answer</label><input value={p.answer} onChange={(e) => setPuzzle(i, 'answer', e.target.value)} required /></div>
              <div style={{ flex: 1 }}><label>Points</label><input type="number" min="1" value={p.points} onChange={(e) => setPuzzle(i, 'points', e.target.value)} /></div>
            </div>
            <label>Hints (one per line, easiest first)</label>
            <textarea rows={3} value={p.hints} onChange={(e) => setPuzzle(i, 'hints', e.target.value)} />
            {form.puzzles.length > 1 && (
              <p><button type="button" className="btn ghost" onClick={() => setForm({ ...form, puzzles: form.puzzles.filter((_, j) => j !== i) })}>Remove puzzle</button></p>
            )}
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setForm({ ...form, puzzles: [...form.puzzles, blankPuzzle()] })}>Add puzzle</button>
          <button className="btn">Create room</button>
        </div>
      </form>
    </>
  );
}