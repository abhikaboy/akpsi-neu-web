import type { VercelRequest, VercelResponse } from '@vercel/node'
import { MongoClient, ObjectId } from 'mongodb'
import { getRushEventCheckinCode } from './_lib/sanity.js'

let clientPromise: Promise<MongoClient> | null = null

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (!clientPromise) clientPromise = new MongoClient(uri).connect()
  return clientPromise
}

const EMAIL_RE = /^[^\s@]+@northeastern\.edu$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { eventId, eventName, eventDate, cycle, isFirstEvent, email, preferredName, rusheeId, code } =
    req.body ?? {}

  if (typeof eventId !== 'string' || !eventId.trim()) {
    return res.status(400).json({ error: 'eventId is required' })
  }
  if (typeof eventName !== 'string' || !eventName.trim()) {
    return res.status(400).json({ error: 'eventName is required' })
  }
  if (typeof eventDate !== 'string' || !eventDate.trim()) {
    return res.status(400).json({ error: 'eventDate is required' })
  }
  const parsedEventDate = new Date(eventDate)
  if (Number.isNaN(parsedEventDate.getTime())) {
    return res.status(400).json({ error: 'eventDate must be a valid date' })
  }
  // Check-in normally happens after an event starts, so allow the rest of the
  // day; the 24h window keeps this correct regardless of the client timezone.
  if (parsedEventDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: 'That event has already passed' })
  }
  if (typeof cycle !== 'string' || !cycle.trim()) {
    return res.status(400).json({ error: 'cycle is required' })
  }
  if (typeof isFirstEvent !== 'boolean') {
    return res.status(400).json({ error: 'isFirstEvent must be a boolean' })
  }

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'A check-in code is required' })
  }
  // Verified against Sanity here, not just in the browser, so a check-in can't
  // be forged by editing the client or posting straight at this endpoint.
  const expectedCode = await getRushEventCheckinCode(eventId)
  if (!expectedCode) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (code.trim().toLowerCase() !== expectedCode.toLowerCase()) {
    return res.status(403).json({ error: 'That check-in code is incorrect' })
  }

  if (isFirstEvent) {
    if (typeof preferredName !== 'string' || !preferredName.trim() || preferredName.length > 200) {
      return res.status(400).json({ error: 'A valid preferred name is required' })
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'A valid @northeastern.edu email is required' })
    }
  } else if (typeof rusheeId !== 'string' || !ObjectId.isValid(rusheeId)) {
    return res.status(400).json({ error: 'A valid rusheeId is required' })
  }

  try {
    const client = await getClient()
    const db = client.db('akpsi')

    let resolvedRusheeId: ObjectId
    let name: string
    let resolvedEmail: string

    if (isFirstEvent) {
      name = preferredName.trim()
      resolvedEmail = email.trim()
      const inserted = await db.collection('rushees').insertOne({
        name,
        email: resolvedEmail,
        createdAt: new Date(),
      })
      resolvedRusheeId = inserted.insertedId
    } else {
      const rushee = await db.collection('rushees').findOne({ _id: new ObjectId(rusheeId) })
      if (!rushee) {
        return res.status(404).json({ error: 'Rushee not found' })
      }
      resolvedRusheeId = rushee._id
      name = rushee.name
      resolvedEmail = rushee.email
    }

    await db.collection('rushCheckins').insertOne({
      eventId,
      eventName,
      eventDate: parsedEventDate,
      cycle,
      rusheeId: resolvedRusheeId,
      name,
      email: resolvedEmail,
      isFirstEvent,
      submittedAt: new Date(),
    })

    return res.status(201).json({ ok: true, name, eventName })
  } catch (err) {
    console.error('Failed to save rush check-in:', err)
    return res.status(500).json({ error: 'Failed to save check-in' })
  }
}
