import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MongoClient } from 'mongodb'

let clientPromise: Promise<MongoClient> | null = null

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const client = await getClient()
    const db = client.db('akpsi')
    const rushees = await db
      .collection('rushees')
      .find({}, { projection: { name: 1 } })
      .sort({ name: 1 })
      .toArray()
    return res.status(200).json({
      rushees: rushees.map(r => ({ _id: String(r._id), name: r.name })),
    })
  } catch (err) {
    console.error('Failed to fetch rushees:', err)
    return res.status(500).json({ error: 'Failed to fetch rushees' })
  }
}
