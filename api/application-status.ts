import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ObjectId } from 'mongodb'
import { getDb, normalizeEmail } from './_lib/mongo.js'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Public lookup used by the apply form: when someone picks their name from the
 * rushee dropdown (or types an email they've already used), tell the client
 * whether an application already exists for this cycle so we can short-circuit
 * the form instead of letting them fill it out twice.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cycle = typeof req.query.cycle === 'string' ? req.query.cycle.trim() : ''
  const rusheeId =
    typeof req.query.rusheeId === 'string' ? req.query.rusheeId.trim() : ''
  const email = typeof req.query.email === 'string' ? req.query.email.trim() : ''

  if (!cycle) {
    return res.status(400).json({ error: 'cycle is required' })
  }
  if (!rusheeId && !email) {
    return res.status(400).json({ error: 'rusheeId or email is required' })
  }
  if (rusheeId && !ObjectId.isValid(rusheeId)) {
    return res.status(400).json({ error: 'rusheeId must be a valid id' })
  }

  try {
    const db = await getDb()
    const clauses: Record<string, unknown>[] = []
    if (rusheeId) {
      clauses.push({ rusheeId: new ObjectId(rusheeId) })
    }
    if (email) {
      clauses.push({
        email: {
          $regex: `^${escapeRegex(normalizeEmail(email))}$`,
          $options: 'i',
        },
      })
    }

    const existing = await db.collection('applications').findOne(
      { cycle, $or: clauses },
      { projection: { _id: 1, name: 1 } },
    )

    return res.status(200).json({
      submitted: Boolean(existing),
      name: existing?.name ?? null,
    })
  } catch (err) {
    console.error('Failed to check application status:', err)
    return res.status(500).json({ error: 'Failed to check application status' })
  }
}
