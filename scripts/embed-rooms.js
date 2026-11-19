// Creates an embedding for every room that does not have one yet (title + description).
// Model: all-MiniLM-L6-v2 (384 dimensions). First run downloads the model (~25 MB).
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  const { rows } = await pool.query('SELECT room_id, title, description FROM rooms WHERE description_embedding IS NULL');
  for (const r of rows) {
    const out = await extractor(`${r.title}. ${r.description || ''}`, { pooling: 'mean', normalize: true });
    await pool.query('UPDATE rooms SET description_embedding = $1::vector WHERE room_id = $2', [`[${Array.from(out.data).join(',')}]`, r.room_id]);
    console.log('Embedded:', r.title);
  }
  console.log(`Done. ${rows.length} room(s) embedded.`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });