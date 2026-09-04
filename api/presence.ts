import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/auth'
import { normalizeEmail } from './_lib/mongo'
import { getRedis } from './_lib/redis'

// Heartbeat-based presence: the client pings every few seconds while a
// candidate's profile is open, each ping resets a short TTL key. Redis expires
// stale keys on its own, so "who's viewing this candidate right now" is just
// "which keys under this prefix currently exist" — no explicit leave/cleanup
// step is required, though the client sends one anyway for a snappier update.
const PRESENCE_TTL_SECONDS = 12

function presenceKey(cycle: string, candidateEmail: string, viewerEmail: string): string {
  return `presence:${cycle}:${normalizeEmail(candidateEmail)}:${normalizeEmail(viewerEmail)}`
}

function presencePrefix(cycle: string, candidateEmail: string): string {
  return `presence:${cycle}:${normalizeEmail(candidateEmail)}:*`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const redis = getRedis()

  if (req.method === 'GET') {
    const { cycle, candidateEmail } = req.query
    if (typeof cycle !== 'string' || !cycle || typeof candidateEmail !== 'string' || !candidateEmail) {
      return res.status(400).json({ error: 'cycle and candidateEmail are required' })
    }
    const keys = await redis.keys(presencePrefix(cycle, candidateEmail))
    const viewers =
      keys.length === 0
        ? []
        : (await redis.mget<{ name: string; email: string }[]>(...keys)).filter(
            (v): v is { name: string; email: string } => v !== null,
          )
    return res.status(200).json({ viewers })
  }

  if (req.method === 'POST' || req.method === 'DELETE') {
    const { cycle, candidateEmail } = req.body ?? {}
    if (typeof cycle !== 'string' || !cycle || typeof candidateEmail !== 'string' || !candidateEmail) {
      return res.status(400).json({ error: 'cycle and candidateEmail are required' })
    }
    const key = presenceKey(cycle, candidateEmail, session.email)
    if (req.method === 'DELETE') {
      await redis.del(key)
    } else {
      await redis.set(key, { name: session.name, email: session.email }, { ex: PRESENCE_TTL_SECONDS })
    }
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
