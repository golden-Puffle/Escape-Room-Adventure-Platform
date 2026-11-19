-- =====================================================================
-- Escape Room Platform : PostgreSQL schema (DDL, constraints, indexes,
-- functions, triggers, views)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- TABLES ----------
CREATE TABLE roles (
    role_id   SERIAL PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);
INSERT INTO roles (role_name) VALUES ('admin'), ('player');

CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    role_id       INT NOT NULL,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT,
    CONSTRAINT chk_user_name  CHECK (length(trim(name)) >= 2),
    CONSTRAINT chk_user_email CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT chk_user_pw    CHECK (length(password_hash) >= 20)   
);

CREATE TABLE rooms (
    room_id     SERIAL PRIMARY KEY,
    created_by  INT NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    difficulty  VARCHAR(20) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_room_title      CHECK (length(trim(title)) >= 3),
    CONSTRAINT chk_room_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    CONSTRAINT chk_room_status     CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE TABLE puzzles (
    puzzle_id      SERIAL PRIMARY KEY,
    room_id        INT NOT NULL,
    title          VARCHAR(150) NOT NULL,
    description    TEXT NOT NULL,
    answer_hash    TEXT NOT NULL,                
    sequence_no    INT NOT NULL,
    points         INT NOT NULL DEFAULT 100,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_puzzle_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT chk_puzzle_sequence CHECK (sequence_no > 0),
    CONSTRAINT chk_puzzle_points   CHECK (points > 0),
    CONSTRAINT chk_answer_hash     CHECK (answer_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT unique_room_sequence UNIQUE (room_id, sequence_no)
);

CREATE TABLE game_sessions (
    session_id   SERIAL PRIMARY KEY,
    player_id    INT NOT NULL,
    room_id      INT NOT NULL,
    started_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status       VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    CONSTRAINT fk_session_player FOREIGN KEY (player_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_session_room   FOREIGN KEY (room_id)   REFERENCES rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT chk_session_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    CONSTRAINT chk_completion_time CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE attempts (
    attempt_id   SERIAL PRIMARY KEY,
    session_id   INT NOT NULL,
    puzzle_id    INT NOT NULL,
    answer_given TEXT NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attempt_session FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_puzzle  FOREIGN KEY (puzzle_id)  REFERENCES puzzles(puzzle_id) ON DELETE CASCADE
);

CREATE TABLE puzzle_completions (
    completion_id SERIAL PRIMARY KEY,
    session_id    INT NOT NULL,
    puzzle_id     INT NOT NULL,
    completed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    points_earned INT NOT NULL DEFAULT 0,
    hints_used    INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_completion_session FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_completion_puzzle  FOREIGN KEY (puzzle_id)  REFERENCES puzzles(puzzle_id) ON DELETE CASCADE,
    CONSTRAINT unique_session_puzzle UNIQUE (session_id, puzzle_id),
    CONSTRAINT chk_points_earned CHECK (points_earned >= 0),
    CONSTRAINT chk_hints_used    CHECK (hints_used >= 0)
);

CREATE TABLE scores (
    score_id        SERIAL PRIMARY KEY,
    session_id      INT NOT NULL UNIQUE,
    player_id       INT NOT NULL,
    room_id         INT NOT NULL,
    total_score     INT NOT NULL DEFAULT 0,
    completion_time INTERVAL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_score_session FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_score_player  FOREIGN KEY (player_id)  REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_score_room    FOREIGN KEY (room_id)    REFERENCES rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT chk_total_score CHECK (total_score >= 0)
);

-- ---------- ALTER (schema evolution) ----------
ALTER TABLE puzzles ADD COLUMN time_limit_seconds INT;
ALTER TABLE puzzles ADD CONSTRAINT chk_time_limit CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0);
ALTER TABLE rooms   ADD COLUMN max_players INT NOT NULL DEFAULT 1;
ALTER TABLE rooms   ADD CONSTRAINT chk_max_players CHECK (max_players > 0);

-- ---------- INDEXES ----------
CREATE INDEX idx_puzzles_room          ON puzzles(room_id, sequence_no);
CREATE INDEX idx_sessions_player       ON game_sessions(player_id);
CREATE INDEX idx_sessions_room         ON game_sessions(room_id);
CREATE INDEX idx_attempts_session      ON attempts(session_id);
CREATE INDEX idx_attempts_puzzle       ON attempts(puzzle_id);
CREATE INDEX idx_scores_room_score     ON scores(room_id, total_score DESC);
CREATE INDEX idx_users_role            ON users(role_id);
CREATE UNIQUE INDEX uq_active_session  ON game_sessions(player_id, room_id) WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_rooms_fts ON rooms USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ---------- FUNCTIONS ----------
CREATE OR REPLACE FUNCTION hash_answer(p_answer TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT encode(digest(lower(trim(p_answer)), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION get_player_score(p_player_id INT, p_room_id INT) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE total INT;
BEGIN
    SELECT COALESCE(SUM(pc.points_earned), 0) INTO total
    FROM puzzle_completions pc
    JOIN game_sessions gs ON pc.session_id = gs.session_id
    WHERE gs.player_id = p_player_id AND gs.room_id = p_room_id;
    RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION submit_answer(
    p_session_id INT, p_player_id INT, p_answer TEXT, p_hints_used INT DEFAULT 0
) RETURNS TABLE (out_correct BOOLEAN, out_points INT, out_status TEXT, out_puzzle_id INT)
LANGUAGE plpgsql AS $$
DECLARE
    v_room   INT;
    v_status TEXT;
    v_puzzle puzzles%ROWTYPE;
    v_ok     BOOLEAN;
    v_pts    INT := 0;
BEGIN
    SELECT gs.room_id, gs.status INTO v_room, v_status
    FROM game_sessions gs
    WHERE gs.session_id = p_session_id AND gs.player_id = p_player_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
    IF v_status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'Session is not in progress'; END IF;

    SELECT p.* INTO v_puzzle
    FROM puzzles p
    WHERE p.room_id = v_room
      AND NOT EXISTS (SELECT 1 FROM puzzle_completions pc
                      WHERE pc.session_id = p_session_id AND pc.puzzle_id = p.puzzle_id)
    ORDER BY p.sequence_no
    LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'No puzzles remaining in this room'; END IF;

    v_ok := (hash_answer(p_answer) = v_puzzle.answer_hash);
    INSERT INTO attempts (session_id, puzzle_id, answer_given, is_correct)
    VALUES (p_session_id, v_puzzle.puzzle_id, p_answer, v_ok);

    IF v_ok THEN
        v_pts := GREATEST(v_puzzle.points - 10 * GREATEST(p_hints_used, 0), 0);
        INSERT INTO puzzle_completions (session_id, puzzle_id, points_earned, hints_used)
        VALUES (p_session_id, v_puzzle.puzzle_id, v_pts, GREATEST(p_hints_used, 0));
    END IF;

    SELECT gs.status INTO v_status FROM game_sessions gs WHERE gs.session_id = p_session_id;
    RETURN QUERY SELECT v_ok, v_pts, v_status, v_puzzle.puzzle_id;
END;
$$;

-- ---------- TRIGGERS ----------
CREATE OR REPLACE FUNCTION fn_update_score() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO scores (session_id, player_id, room_id, total_score)
    SELECT gs.session_id, gs.player_id, gs.room_id, NEW.points_earned
    FROM game_sessions gs WHERE gs.session_id = NEW.session_id
    ON CONFLICT (session_id)
    DO UPDATE SET total_score = scores.total_score + EXCLUDED.total_score;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_complete_session() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_room INT; v_total INT; v_done INT;
BEGIN
    SELECT room_id INTO v_room FROM game_sessions WHERE session_id = NEW.session_id;
    SELECT COUNT(*) INTO v_total FROM puzzles WHERE room_id = v_room;
    SELECT COUNT(*) INTO v_done  FROM puzzle_completions WHERE session_id = NEW.session_id;

    IF v_total > 0 AND v_done >= v_total THEN
        UPDATE game_sessions
           SET status = 'COMPLETED', completed_at = clock_timestamp()
         WHERE session_id = NEW.session_id AND status = 'IN_PROGRESS';
        UPDATE scores
           SET completion_time = (SELECT completed_at - started_at FROM game_sessions
                                  WHERE session_id = NEW.session_id)
         WHERE session_id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_01_update_score
AFTER INSERT ON puzzle_completions
FOR EACH ROW EXECUTE FUNCTION fn_update_score();

CREATE TRIGGER trg_02_complete_session
AFTER INSERT ON puzzle_completions
FOR EACH ROW EXECUTE FUNCTION fn_complete_session();

-- ---------- VIEWS ----------
CREATE OR REPLACE VIEW leaderboard AS
SELECT s.room_id,
       r.title AS room_name,
       s.player_id,
       u.name  AS player_name,
       s.total_score,
       s.completion_time,
       RANK() OVER (PARTITION BY s.room_id
                    ORDER BY s.total_score DESC, s.completion_time ASC) AS rank
FROM scores s
JOIN game_sessions gs ON gs.session_id = s.session_id AND gs.status = 'COMPLETED'
JOIN users u ON u.user_id = s.player_id
JOIN rooms r ON r.room_id = s.room_id;

CREATE OR REPLACE VIEW player_performance AS
SELECT u.user_id,
       u.name AS player_name,
       COUNT(DISTINCT gs.room_id) AS rooms_played,
       COUNT(DISTINCT CASE WHEN gs.status = 'COMPLETED' THEN gs.session_id END) AS rooms_completed,
       COALESCE(SUM(s.total_score), 0) AS total_score,
       COALESCE(ROUND(AVG(s.total_score), 1), 0) AS average_score
FROM users u
LEFT JOIN game_sessions gs ON u.user_id = gs.player_id
LEFT JOIN scores s ON gs.session_id = s.session_id
GROUP BY u.user_id, u.name;