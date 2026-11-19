import { Pool } from 'pg';

// Single shared pool (survives hot reload in dev). Config comes from .env.local only.
const g = globalThis;
export const pool = g._pgPool ?? (g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL }));
export const query = (text, params) => pool.query(text, params);