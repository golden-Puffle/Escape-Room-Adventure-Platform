// Adds the pgvector extension, the embedding column and the HNSW index.
// Requires pgvector to be installed on the PostgreSQL server first.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'sql', '03_vector.sql'), 'utf8'));
    console.log('pgvector ready: rooms.description_embedding + HNSW index created');
  } catch (e) {
    if (/vector/.test(e.message) && /(not available|could not open extension control file)/.test(e.message)) {
      console.error('pgvector is not installed on your PostgreSQL server yet. Follow the pgvector install steps first.');
    } else {
      console.error(e.message);
    }
    process.exitCode = 1;
  }
  await pool.end();
})();