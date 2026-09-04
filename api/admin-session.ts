import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = getSession(req)
  return res.status(200).json({
    authenticated: session !== null,
    user: session ? { name: session.name, email: session.email } : null,
  })
}
