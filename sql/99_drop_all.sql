-- DROP demo / full reset. Run via: npm run db:setup -- --reset
DROP VIEW IF EXISTS player_performance, leaderboard;
DROP TABLE IF EXISTS scores, puzzle_completions, attempts, game_sessions, puzzles, rooms, users, roles CASCADE;
DROP FUNCTION IF EXISTS submit_answer(INT, INT, TEXT, INT), get_player_score(INT, INT),
                        hash_answer(TEXT), fn_update_score(), fn_complete_session() CASCADE;