'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, fmtSeconds } from '@/lib/client';

export default function PlayRoom() {
  const { id } = useParams();
  const [sid, setSid] = useState(null);
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (s) => setState(await api(`/api/sessions/${s}`));

  useEffect(() => {
    (async () => {
      try {
        const { sessionId } = await api('/api/sessions', { method: 'POST', body: { roomId: Number(id) } });
        setSid(sessionId);
        await load(sessionId);
      } catch (e) { setError(e.message); }
    })();
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    if (!answer.trim()) { setError('Enter an answer first'); return; }
    setBusy(true); setError(''); setMsg(null);
    try {
      const r = await api(`/api/sessions/${sid}/submit`, { method: 'POST', body: { answer } });
      setMsg(r.correct ? { ok: true, text: `Correct! +${r.points} points` } : { ok: false, text: 'Not quite. Try again.' });
      setAnswer('');
      await load(sid);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  async function hint() {
    setError(''); setMsg(null);
    try {
      await api(`/api/sessions/${sid}/hint`, { method: 'POST' });
      await load(sid);
    } catch (err) { setError(err.message); }
  }

  if (error && !state) return <p className="error" role="alert">{error}</p>;
  if (!state) return <p>Opening the room...</p>;
  const { session: s, puzzle, hints, hintsAvailable, hintPenalty, result } = state;

  return (
    <>
      <div className="row spread">
        <h1>{s.room_title}</h1>
        <div className="stat" aria-label="Score">{s.score} pts</div>
      </div>
      <div className="locks" role="img" aria-label={`${s.done} of ${s.total} puzzles solved`}>
        {Array.from({ length: s.total }, (_, i) => (
          <span key={i} className={`lock ${i < s.done ? 'open' : i === s.done ? 'now' : ''}`} />
        ))}
      </div>

      {s.status === 'COMPLETED' ? (
        <div className="plate">
          <h2>You escaped!</h2>
          <p>Final score: {s.score} points. Time: {fmtSeconds(result?.seconds)}.</p>
          <p><Link className="btn ghost" style={{ color: '#eef3f1', borderColor: '#eef3f1' }} href="/leaderboard">See the leaderboard</Link></p>
        </div>
      ) : puzzle && (
        <form className="plate" onSubmit={submit}>
          <h2>Puzzle {puzzle.sequence_no}: {puzzle.title}</h2>
          <p>{puzzle.description}</p>
          <label htmlFor="ans" style={{ color: '#d6dfdc' }}>Your answer ({puzzle.points} points)</label>
          <input id="ans" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" />
          {error && <p className="error" style={{ color: '#ffb4a6' }} role="alert">{error}</p>}
          {msg && <p style={{ color: msg.ok ? '#9be3bd' : '#ffb4a6' }}>{msg.text}</p>}
          <div className="row" style={{ marginTop: '.75rem' }}>
            <button className="btn" style={{ background: 'var(--brass)' }} disabled={busy}>Unlock</button>
            <button type="button" className="btn ghost" style={{ color: '#eef3f1', borderColor: '#eef3f1' }}
              onClick={hint} disabled={hints.length >= hintsAvailable}>
              {hints.length >= hintsAvailable ? 'No more hints' : `Get a hint (-${hintPenalty} points)`}
            </button>
          </div>
          {hints.length > 0 && <ol className="hints">{hints.map((h, i) => <li key={i}>{h}</li>)}</ol>}
        </form>
      )}
    </>
  );
}