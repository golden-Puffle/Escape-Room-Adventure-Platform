import { query } from '@/lib/db';

// Loads the all-MiniLM-L6-v2 sentence model once (first call downloads ~25 MB, then it is cached on disk).
const g = globalThis;

async function getExtractor() {
  if (!g._extractor) {
    g._extractor = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return g._extractor;
}

// Text -> array of 384 numbers (normalised, so cosine distance works well)
export async function embed(text) {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

// pgvector accepts vectors written as '[0.1,0.2,...]'
export const toVectorLiteral = (v) => `[${v.join(',')}]`;

export async function embedRoom(roomId, title, description) {
  const vec = await embed(`${title}. ${description || ''}`);
  await query('UPDATE rooms SET description_embedding = $1::vector WHERE room_id = $2', [toVectorLiteral(vec), roomId]);
}