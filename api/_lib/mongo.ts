import { type Db, MongoClient } from 'mongodb'

// ponytail: one cached client per warm serverless instance — the standard
// pattern for Mongo-on-serverless. Without it every invocation opens a new
// connection and cold Mongo Atlas under load.
let clientPromise: Promise<MongoClient> | null = null

export function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

export async function getDb(): Promise<Db> {
  const client = await getClient()
  return client.db('akpsi')
}

/** Applicants are joined across collections on their email, so normalize it everywhere. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
