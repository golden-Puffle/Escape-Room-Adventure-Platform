'use client';
import { useEffect, useState } from 'react';
import { api, fmtSeconds } from '@/lib/client';

export default function Leaderboard() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { api('/api/rooms').then((d) => setRooms(d.rooms)).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    api(`/api/leaderboard${roomId ? `?roomId=${roomId}` : ''}`).then((d) => setRows(d.rows)).catch((e) => setError(e.message));
  }, [roomId]);

  return (
    <>
      <h1>Leaderboard</h1>
      <p className="muted">Ranked by score, then by fastest escape.</p>
      <select aria-label="Room" value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ maxWidth: 320, margin: '.5rem 0 1rem' }}>
        <option value="">All rooms</option>
        {rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.title}</option>)}
      </select>
      {error && <p className="error" role="alert">{error}</p>}
      {!rows.length ? <p>No one has escaped yet. Be the first.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Rank</th><th>Player</th><th>Room</th><th>Score</th><th>Time</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}><td>{r.rank}</td><td>{r.player_name}</td><td>{r.room_name}</td><td>{r.total_score}</td><td>{fmtSeconds(r.seconds)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}