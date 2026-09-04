import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthenticated } from './_lib/auth'
import { getDb, normalizeEmail } from './_lib/mongo'

interface RosterEntry {
  name: string
  email: string
  hasApplication: boolean
}

/**
 * The picker on every eval form needs one list of people, but a rushee can be
 * evaluated before they ever submit an application — so the roster is the union
 * of applicants, anyone who's checked in to a rush event this cycle, and anyone
 * already evaluated, keyed on email.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Not authenticated' })

  const { cycle } = req.query
  const cycleFilter = typeof cycle === 'string' && cycle ? { cycle } : {}

  try {
    const db = await getDb()
    const [applications, rushCheckins, evaluations] = await Promise.all([
      db
        .collection('applications')
        .find(cycleFilter, { projection: { name: 1, email: 1 } })
        .toArray(),
      db
        .collection('rushCheckins')
        .find(cycleFilter, { projection: { name: 1, email: 1 } })
        .toArray(),
      db
        .collection('evaluations')
        .find(cycleFilter, { projection: { applicantName: 1, applicantEmail: 1 } })
        .toArray(),
    ])

    const byEmail = new Map<string, RosterEntry>()
    for (const app of applications) {
      if (typeof app.email !== 'string') continue
      const email = normalizeEmail(app.email)
      byEmail.set(email, { name: app.name ?? email, email, hasApplication: true })
    }
    for (const checkin of rushCheckins) {
      if (typeof checkin.email !== 'string') continue
      const email = normalizeEmail(checkin.email)
      if (byEmail.has(email)) continue
      byEmail.set(email, { name: checkin.name ?? email, email, hasApplication: false })
    }
    for (const evaluation of evaluations) {
      if (typeof evaluation.applicantEmail !== 'string') continue
      const email = normalizeEmail(evaluation.applicantEmail)
      if (byEmail.has(email)) continue
      byEmail.set(email, { name: evaluation.applicantName ?? email, email, hasApplication: false })
    }

    const roster = Array.from(byEmail.values()).sort((a, b) => a.name.localeCompare(b.name))
    return res.status(200).json({ roster })
  } catch (err) {
    console.error('Failed to fetch eval roster:', err)
    return res.status(500).json({ error: 'Failed to fetch eval roster' })
  }
}
