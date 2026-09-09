import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkPassword, createSessionCookie } from './_lib/auth'
import { findBrotherByEmail } from './_lib/sanity'

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

  let brother
  try {
    brother = await findBrotherByEmail(email)
  } catch (err) {
    console.error('Brother roster lookup failed:', err)
    return res.status(500).json({ error: 'Failed to verify brother roster' })
  }

  if (!brother) {
    return res.status(401).json({
      error: "That email isn't on the brothers roster. Check the Brothers page in Sanity.",
    })
  }

  // The roster's name/picture are authoritative — a login can't spoof a
  // different brother's identity by typing someone else's name.
  const user = { name: brother.name, email: brother.email.toLowerCase(), pictureUrl: brother.pictureUrl }
  res.setHeader('Set-Cookie', createSessionCookie(user))
  return res.status(200).json({ ok: true, user })
}
