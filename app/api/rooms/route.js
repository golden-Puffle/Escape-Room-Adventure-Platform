import { handle, ok, HttpError } from '@/lib/api';
import { query } from '@/lib/db';
import { embed, toVectorLiteral } from '@/lib/embed';

// Published rooms. Two search modes:
//  - normal: full-text OR partial title match
//  - semantic=1: pgvector similarity search on the room description embedding
export const GET = handle(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') || '').trim() || null;
  const difficulty = sp.get('difficulty') || null;

  if (q && sp.get('semantic') === '1') {
    try {
      const vec = toVectorLiteral(await embed(q));
      const { rows } = await query(
        `SELECT r.room_id, r.title, r.description, r.difficulty,
                COUNT(p.puzzle_id)::int AS puzzle_count,
                COALESCE(SUM(p.points), 0)::int AS max_points,
                ROUND((1 - (r.description_embedding <=> $1::vector))::numeric, 3)::float AS similarity
         FROM rooms r LEFT JOIN puzzles p ON p.room_id = r.room_id
         WHERE r.status = 'PUBLISHED'
           AND r.description_embedding IS NOT NULL
           AND ($2::text IS NULL OR r.difficulty = $2)
         GROUP BY r.room_id
         HAVING COUNT(p.puzzle_id) > 0
         ORDER BY r.description_embedding <=> $1::vector
         LIMIT 6`,
        [vec, difficulty]
      );
      return ok({ rooms: rows, semantic: true });
    } catch (e) {
      if (e.code === '42703' || e.code === '42704') {
        throw new HttpError(503, 'Semantic search is not set up yet. Run: npm run db:vector and npm run db:embed');
      }
      if (!e.code) throw new HttpError(503, 'The language model could not be loaded. Check your internet connection and try again.');
      throw e;
    }
  }

  const { rows } = await query(
    `SELECT r.room_id, r.title, r.description, r.difficulty,
            COUNT(p.puzzle_id)::int AS puzzle_count,
            COALESCE(SUM(p.points), 0)::int AS max_points
     FROM rooms r LEFT JOIN puzzles p ON p.room_id = r.room_id
     WHERE r.status = 'PUBLISHED'
       AND ($1::text IS NULL
            OR to_tsvector('english', r.title || ' ' || COALESCE(r.description, '')) @@ plainto_tsquery('english', $1)
            OR r.title ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR r.difficulty = $2)
     GROUP BY r.room_id
     HAVING COUNT(p.puzzle_id) > 0
     ORDER BY r.created_at DESC`,
    [q, difficulty]
  );
  return ok({ rooms: rows });
});