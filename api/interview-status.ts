import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession, isAuthenticated } from './_lib/auth'
import { getDb, normalizeEmail } from './_lib/mongo'

export const INTERVIEW_STAGES = ['to-interview', 'in-progress', 'complete'] as const
type InterviewStage = (typeof INTERVIEW_STAGES)[number]

export const INTERVIEW_ROLES = [
  'facilitator',
  'video-bro',
  'note-taker-bro',
  'chillin-bro',
] as const
type InterviewRole = (typeof INTERVIEW_ROLES)[number]

const MAX_ASSIGNMENTS = 6

interface InterviewAssignment {
  role: InterviewRole
  memberEmail: string
  memberName: string
  memberPictureUrl: string | null
}

function isStage(value: unknown): value is InterviewStage {
  return typeof value === 'string' && (INTERVIEW_STAGES as readonly string[]).includes(value)
}

function isRole(value: unknown): value is InterviewRole {
  return typeof value === 'string' && (INTERVIEW_ROLES as readonly string[]).includes(value)
}

function parseAssignments(value: unknown): InterviewAssignment[] | null {
  if (!Array.isArray(value)) return null
  if (value.length > MAX_ASSIGNMENTS) return null
  const out: InterviewAssignment[] = []
  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      !isRole((item as Record<string, unknown>).role) ||
      typeof (item as Record<string, unknown>).memberEmail !== 'string' ||
      typeof (item as Record<string, unknown>).memberName !== 'string'
    ) {
      return null
    }
    const memberEmail = normalizeEmail((item as { memberEmail: string }).memberEmail)
    const memberName = (item as { memberName: string }).memberName.trim()
    const rawPictureUrl = (item as Record<string, unknown>).memberPictureUrl
    if (!memberEmail || !memberName) return null
    if (rawPictureUrl !== undefined && rawPictureUrl !== null && typeof rawPictureUrl !== 'string') {
      return null
    }
    out.push({
      role: (item as { role: InterviewRole }).role,
      memberEmail,
      memberName,
      memberPictureUrl: typeof rawPictureUrl === 'string' ? rawPictureUrl : null,
    })
  }
  return out
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Per-candidate interview record: pipeline stage and scheduled date. Both are
 * optional and patched independently, and only values someone has deliberately
 * set are stored — the board derives a default stage for everyone else from
 * whether any interview has been filed, so a fresh cycle needs no backfill.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const db = await getDb()
    const statuses = db.collection('interviewStatuses')

    if (req.method === 'GET') {
      const { cycle } = req.query
      const filter = typeof cycle === 'string' && cycle ? { cycle } : {}
      const docs = await statuses.find(filter).toArray()
      return res.status(200).json({ statuses: docs })
    }

    const session = getSession(req)
    if (!session) return res.status(401).json({ error: 'Not authenticated' })

    const { cycle, applicantEmail, applicantName, stage, scheduledAt, assignments } =
      req.body ?? {}

    if (typeof cycle !== 'string' || !cycle.trim()) {
      return res.status(400).json({ error: 'cycle is required' })
    }
    if (
      typeof applicantEmail !== 'string' ||
      !EMAIL_RE.test(applicantEmail) ||
      applicantEmail.length > 200
    ) {
      return res.status(400).json({ error: 'A valid applicant email is required' })
    }
    // Stage and date are patched independently: dragging a card must not clear
    // a scheduled date, and scheduling must not move someone's stage.
    const set: Record<string, unknown> = {
      applicantName: typeof applicantName === 'string' ? applicantName.trim() : '',
      updatedAt: new Date(),
      updatedByName: session.name,
      updatedByEmail: normalizeEmail(session.email),
    }
    const unset: Record<string, ''> = {}

    if (stage !== undefined) {
      if (!isStage(stage)) return res.status(400).json({ error: 'Invalid stage' })
      set.stage = stage
    }

    if (scheduledAt !== undefined) {
      if (scheduledAt === null || scheduledAt === '') {
        // Explicit null clears the date rather than leaving a stale one behind.
        unset.scheduledAt = ''
      } else {
        if (typeof scheduledAt !== 'string') {
          return res.status(400).json({ error: 'scheduledAt must be a date string or null' })
        }
        const parsed = new Date(scheduledAt)
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'scheduledAt is not a valid date' })
        }
        set.scheduledAt = parsed
      }
    }

    if (assignments !== undefined) {
      const parsed = parseAssignments(assignments)
      if (!parsed) {
        return res
          .status(400)
          .json({ error: `assignments must be a valid list of up to ${MAX_ASSIGNMENTS} brothers` })
      }
      set.assignments = parsed
    }

    if (stage === undefined && scheduledAt === undefined && assignments === undefined) {
      return res.status(400).json({ error: 'Provide a stage, a scheduledAt, or assignments' })
    }

    await statuses.updateOne(
      { cycle, applicantEmail: normalizeEmail(applicantEmail) },
      {
        $set: set,
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        $setOnInsert: { cycle, applicantEmail: normalizeEmail(applicantEmail) },
      },
      { upsert: true },
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Interview status request failed:', err)
    return res.status(500).json({ error: 'Failed to update interview status' })
  }
}
