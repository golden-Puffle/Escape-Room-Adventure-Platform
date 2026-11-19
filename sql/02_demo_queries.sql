-- Important queries for the report / viva
-- 1. JOIN + ORDER BY: all puzzles with their room, in play order
SELECT r.title AS room, p.sequence_no, p.title, p.points
FROM puzzles p JOIN rooms r ON r.room_id = p.room_id
ORDER BY r.room_id, p.sequence_no;

-- 2. GROUP BY + HAVING + aggregates: rooms with more than 1 puzzle and their max points
SELECT r.title, COUNT(p.puzzle_id) AS puzzles, SUM(p.points) AS max_points
FROM rooms r JOIN puzzles p ON p.room_id = r.room_id
GROUP BY r.room_id, r.title
HAVING COUNT(p.puzzle_id) > 1
ORDER BY max_points DESC;

-- 3. Subquery: players who scored above the overall average
SELECT u.name, s.total_score
FROM scores s JOIN users u ON u.user_id = s.player_id
WHERE s.total_score > (SELECT AVG(total_score) FROM scores);

-- 4. Hardest puzzles: wrong-attempt ratio
SELECT p.title,
       COUNT(*) FILTER (WHERE NOT a.is_correct) AS wrong,
       COUNT(*) AS total_attempts
FROM attempts a JOIN puzzles p ON p.puzzle_id = a.puzzle_id
GROUP BY p.puzzle_id, p.title
ORDER BY wrong DESC;

-- 5. Views and functions
SELECT * FROM leaderboard ORDER BY room_id, rank;
SELECT * FROM player_performance ORDER BY total_score DESC;
SELECT get_player_score(1, 1);

-- 6. Full-text search over rooms
SELECT title FROM rooms
WHERE to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', 'library');

-- 7. Transaction demo (rollback leaves no trace)
BEGIN;
  UPDATE rooms SET status = 'ARCHIVED' WHERE room_id = 1;
  SELECT room_id, status FROM rooms WHERE room_id = 1;
ROLLBACK;

-- 8. Constraint demo: each of these must FAIL
-- INSERT INTO puzzles (room_id, title, description, answer_hash, sequence_no, points) VALUES (1,'x','y','plain-text',1,-5);
-- INSERT INTO users (role_id, name, email, password_hash) VALUES (2,'A','not-an-email','short');

-- 9. Semantic search (pgvector): the 3 rooms closest in meaning to room 1 (cosine distance)
SELECT title,
       ROUND((1 - (description_embedding <=> (SELECT description_embedding FROM rooms WHERE room_id = 1)))::numeric, 3) AS similarity
FROM rooms
WHERE room_id <> 1 AND description_embedding IS NOT NULL
ORDER BY description_embedding <=> (SELECT description_embedding FROM rooms WHERE room_id = 1)
LIMIT 3;