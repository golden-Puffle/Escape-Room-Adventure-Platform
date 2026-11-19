import { MongoClient } from 'mongodb';

const g = globalThis;

export async function getDb() {
  if (!g._mongoClient) g._mongoClient = new MongoClient(process.env.MONGODB_URI).connect();
  const client = await g._mongoClient;
  return client.db(process.env.MONGODB_DB || 'escape_room_logs');
}