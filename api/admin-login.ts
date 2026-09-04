import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkPassword, createSessionCookie } from './_lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password, name, email } = req.body ?? {}
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required' })
  }
  if (typeof name !== 'string' || !name.trim() || name.length > 200) {
    return res.status(400).json({ error: 'Your name is required' })
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 200) {
    return res.status(400).json({ error: 'A valid email is required' })
  }

  let valid: boolean
  try {
    valid = checkPassword(password)
  } catch (err) {
    console.error('Admin login misconfigured:', err)
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' })
  }

  const user = { name: name.trim(), email: email.trim().toLowerCase() }
  res.setHeader('Set-Cookie', createSessionCookie(user))
  return res.status(200).json({ ok: true, user })
}
