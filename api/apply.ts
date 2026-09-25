import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ObjectId } from 'mongodb'
import { getDb, normalizeEmail } from './_lib/mongo.js'

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ALREADY_SUBMITTED = 'You have already submitted an application'

/**
 * GET: check whether an application already exists for this cycle (used by the
 * apply form when a rushee is selected). Kept on the same function as POST so
 * we stay under the Hobby plan's 12-function limit.
 * POST: submit a new application.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleStatusCheck(req, res)
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cycle, name, email, answers, rusheeId } = req.body ?? {}

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
  if (rusheeId !== undefined && (typeof rusheeId !== 'string' || !ObjectId.isValid(rusheeId))) {
    return res.status(400).json({ error: 'rusheeId must be a valid id' })
  }

  const trimmedName = name.trim()
  const normalizedEmail = normalizeEmail(email)
  const cycleKey = cycle.trim()

  try {
    const db = await getDb()

    // One application per rushee / email per cycle. Checked here as well as in
    // the UI so a direct POST can't create duplicates.
    const duplicateClauses: Record<string, unknown>[] = [
      {
        email: {
          $regex: `^${escapeRegex(normalizedEmail)}$`,
          $options: 'i',
        },
      },
    ]
    if (typeof rusheeId === 'string' && rusheeId) {
      duplicateClauses.push({ rusheeId: new ObjectId(rusheeId) })
    }

    const existing = await db.collection('applications').findOne({
      cycle: cycleKey,
      $or: duplicateClauses,
    })
    if (existing) {
      return res.status(409).json({ error: ALREADY_SUBMITTED })
    }

    await db.collection('applications').insertOne({
      cycle: cycleKey,
      name: trimmedName,
      email: normalizedEmail,
      answers,
      ...(typeof rusheeId === 'string' && rusheeId
        ? { rusheeId: new ObjectId(rusheeId) }
        : {}),
      submittedAt: new Date(),
      status: 'new',
    })
    return res.status(201).json({ ok: true, name: trimmedName })
  } catch (err) {
    console.error('Failed to save application:', err)
    return res.status(500).json({ error: 'Failed to save application' })
  }
}

async function handleStatusCheck(req: VercelRequest, res: VercelResponse) {
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
