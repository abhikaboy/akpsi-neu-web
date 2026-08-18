import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MongoClient } from 'mongodb'

// ponytail: one cached client per warm serverless instance — the standard
// pattern for Mongo-on-serverless. Without it every invocation opens a new
// connection and cold Mongo Atlas under load.
let clientPromise: Promise<MongoClient> | null = null

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

interface Answer {
  label: string
  value: string
}

function isAnswer(a: unknown): a is Answer {
  return (
    typeof a === 'object' &&
    a !== null &&
    typeof (a as Answer).label === 'string' &&
    typeof (a as Answer).value === 'string'
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cycle, name, email, answers } = req.body ?? {}

  if (typeof cycle !== 'string' || !cycle.trim()) {
    return res.status(400).json({ error: 'cycle is required' })
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 200) {
    return res.status(400).json({ error: 'A valid name is required' })
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'A valid email is required' })
  }
  if (!Array.isArray(answers) || answers.length > 100 || !answers.every(isAnswer)) {
    return res.status(400).json({ error: 'answers must be an array of {label, value}' })
  }

  try {
    const client = await getClient()
    const db = client.db('akpsi')
    await db.collection('applications').insertOne({
      cycle,
      name: name.trim(),
      email: email.trim(),
      answers,
      submittedAt: new Date(),
      status: 'new',
    })
    return res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Failed to save application:', err)
    return res.status(500).json({ error: 'Failed to save application' })
  }
}
