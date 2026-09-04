import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAuthenticated } from './_lib/auth'
import { getDb } from './_lib/mongo'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { cycle } = req.query
  const filter = typeof cycle === 'string' && cycle ? { cycle } : {}

  try {
    const db = await getDb()
    const applications = await db
      .collection('applications')
      .find(filter)
      .sort({ submittedAt: -1 })
      .toArray()
    return res.status(200).json({ applications })
  } catch (err) {
    console.error('Failed to fetch applications:', err)
    return res.status(500).json({ error: 'Failed to fetch applications' })
  }
}
