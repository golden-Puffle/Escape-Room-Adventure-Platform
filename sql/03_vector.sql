-- =====================================================================
-- Semantic search with pgvector (run AFTER pgvector is installed)
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- 384 numbers = size of the all-MiniLM-L6-v2 sentence embedding
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description_embedding vector(384);

-- Approximate nearest-neighbour index using cosine distance
CREATE INDEX IF NOT EXISTS idx_rooms_embedding
    ON rooms USING hnsw (description_embedding vector_cosine_ops);