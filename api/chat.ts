import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/auth'
import { getDb, normalizeEmail } from './_lib/mongo'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const db = await getDb()
  const messages = db.collection('candidateChatMessages')

  if (req.method === 'GET') {
    const { cycle, candidateEmail } = req.query
    if (typeof cycle !== 'string' || !cycle || typeof candidateEmail !== 'string' || !candidateEmail) {
      return res.status(400).json({ error: 'cycle and candidateEmail are required' })
    }
    const docs = await messages
      .find({ cycle, candidateEmail: normalizeEmail(candidateEmail) })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray()
    return res.status(200).json({ messages: docs })
  }

  if (req.method === 'POST') {
    const { cycle, candidateEmail, body } = req.body ?? {}
    if (typeof cycle !== 'string' || !cycle.trim()) {
      return res.status(400).json({ error: 'cycle is required' })
    }
    if (typeof candidateEmail !== 'string' || !candidateEmail.trim()) {
      return res.status(400).json({ error: 'candidateEmail is required' })
    }
    if (typeof body !== 'string' || !body.trim() || body.length > 2000) {
      return res.status(400).json({ error: 'A non-empty message under 2000 characters is required' })
    }

    const doc = {
      cycle,
      candidateEmail: normalizeEmail(candidateEmail),
      senderName: session.name,
      senderEmail: normalizeEmail(session.email),
      body: body.trim(),
      createdAt: new Date(),
    }
    const inserted = await messages.insertOne(doc)
    return res.status(201).json({ message: { ...doc, _id: inserted.insertedId } })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
