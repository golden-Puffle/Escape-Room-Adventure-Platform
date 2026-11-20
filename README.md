# Escape Room Adventure Platform

A web application where players choose themed escape rooms, solve a chain of puzzles against the clock, and compete on a leaderboard. It was built as a DBMS mini project and uses two databases: PostgreSQL for structured, transactional data and MongoDB for hints and gameplay logs. Semantic room search is provided by pgvector.

## Features

- Registration and login with hashed passwords and role-based access (admin and player)
- Room browsing with text search, a difficulty filter and optional semantic search by meaning
- Puzzles solved in sequence, with answers validated inside the database
- Hints stored in MongoDB, with 10 points deducted for each hint used
- Automatic scoring and session completion through database triggers
- Leaderboard ranked by score and then by fastest completion time
- Player dashboard with rooms played, rooms escaped, total score and average score
- Admin panel to create, publish, archive and delete rooms, and to see where players get stuck

## Tech stack

| Layer | Technology |
|---|---|
| Front end and API | Next.js 14, React 18 |
| Relational database | PostgreSQL with the pgcrypto and pgvector extensions |
| Document database | MongoDB |
| Authentication | jose (signed tokens in a cookie), bcryptjs |
| Semantic search | Transformers.js with the all-MiniLM-L6-v2 model |

## Database design

PostgreSQL holds eight tables: `roles`, `users`, `rooms`, `puzzles`, `game_sessions`, `attempts`, `puzzle_completions` and `scores`. The schema uses primary and foreign keys, `UNIQUE` and `CHECK` constraints, indexes (including a GIN full-text index and a partial unique index that allows one active session per player per room), and the following objects:

- Views: `leaderboard` and `player_performance`
- Functions: `hash_answer()`, `get_player_score()` and `submit_answer()`
- Triggers: `trg_01_update_score` and `trg_02_complete_session` on `puzzle_completions`

Puzzle answers are stored only as SHA-256 hashes. `submit_answer()` validates the answer, records the attempt and, if correct, records the completion as one atomic operation.

MongoDB holds two collections: `hints` (hint text per puzzle) and `game_logs` (gameplay events such as `session_started` and `hint_requested`).

## Project structure

```
app/            Pages and API routes (Next.js app router)
  api/          Auth, rooms, sessions, leaderboard, performance and admin routes
  admin/        Admin panel
  dashboard/    Player dashboard
  leaderboard/  Leaderboard page
  login/        Login page
  register/     Registration page
  rooms/        Room play page
components/     Shared React components (navigation, authentication form)
lib/            Database, MongoDB, authentication, game logic and embedding helpers
scripts/        Database setup, seeding and embedding scripts
sql/            Schema, demo queries, vector setup and drop script
middleware.js   Route protection
```

## Prerequisites

- Node.js 18 or later
- PostgreSQL, with the pgcrypto extension available (and pgvector if you want semantic search)
- MongoDB running locally or a connection string to a hosted instance

## Setup

1. Clone the repository and install dependencies.

```
git clone https://github.com/golden-Puffle/Escape-Room-Adventure-Platform.git
cd Escape-Room-Adventure-Platform
npm install
```

2. Create an empty PostgreSQL database for the project.

3. Create a file named `.env.local` in the project root. This file is not committed to the repository.

```
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/<database_name>
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=escape_room_logs
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<admin password>
```

4. Create the tables, functions, triggers and views.

```
npm run db:setup
```

5. Create the admin account and the sample rooms with their puzzles and hints.

```
npm run db:seed
```

6. Optional: enable semantic search.

```
npm run db:vector
npm run db:embed
```

The first semantic search downloads a small language model (about 25 MB), which is then cached on disk. If pgvector is not set up, rooms are still created and the rest of the application works normally.

7. Start the application and open http://localhost:3000.

```
npm run dev
```

Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to use the admin panel. Players can create their own accounts from the registration page.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the application for production |
| `npm start` | Run the production build |
| `npm run db:setup` | Create the PostgreSQL schema |
| `npm run db:seed` | Create the admin account and sample rooms |
| `npm run db:vector` | Set up pgvector for semantic search |
| `npm run db:embed` | Generate embeddings for existing rooms |

## SQL files

| File | Contents |
|---|---|
| `sql/01_schema.sql` | Tables, constraints, indexes, functions, triggers and views |
| `sql/02_demo_queries.sql` | Example queries: joins, grouping, subqueries, views, full-text and semantic search |
| `sql/03_vector.sql` | pgvector extension and embedding column |
| `sql/99_drop_all.sql` | Removes all project database objects |

## Authors

- Monisha Agarwal ([golden-Puffle](https://github.com/golden-Puffle))
- M S Nikhil Chowdhary ([Greyman-hub](https://github.com/Greyman-hub))
