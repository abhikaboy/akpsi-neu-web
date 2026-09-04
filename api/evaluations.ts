import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/auth'
import {
  isEvalFormType,
  isEvalResponse,
  normalizedScore,
  rawAverage,
  type EvalResponse,
} from './_lib/evaluations'
import { getDb, normalizeEmail } from './_lib/mongo'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  try {
    const db = await getDb()
    const evaluations = db.collection('evaluations')

    if (req.method === 'GET') {
      const { formType, cycle, applicantEmail, mine } = req.query
      const filter: Record<string, unknown> = {}
      if (typeof formType === 'string' && formType) {
        if (!isEvalFormType(formType)) return res.status(400).json({ error: 'Invalid formType' })
        filter.formType = formType
      }
      if (typeof cycle === 'string' && cycle) filter.cycle = cycle
      if (typeof applicantEmail === 'string' && applicantEmail) {
        filter.applicantEmail = normalizeEmail(applicantEmail)
      }
      // Scoped from the session rather than a caller-supplied email, so "mine"
      // can only ever mean the brother who is signed in.
      if (mine === 'true' || mine === '1') {
        filter.evaluatorEmail = normalizeEmail(session.email)
      }
      const docs = await evaluations.find(filter).sort({ submittedAt: -1 }).toArray()
      return res.status(200).json({ evaluations: docs })
    }

    const { formType, cycle, applicantName, applicantEmail, responses } = req.body ?? {}

    if (!isEvalFormType(formType)) {
      return res.status(400).json({ error: 'A valid formType is required' })
    }
    if (typeof cycle !== 'string' || !cycle.trim()) {
      return res.status(400).json({ error: 'cycle is required' })
    }
    if (typeof applicantName !== 'string' || !applicantName.trim() || applicantName.length > 200) {
      return res.status(400).json({ error: 'A valid applicant name is required' })
    }
    if (
      typeof applicantEmail !== 'string' ||
      !EMAIL_RE.test(applicantEmail) ||
      applicantEmail.length > 200
    ) {
      return res.status(400).json({ error: 'A valid applicant email is required' })
    }
    if (!Array.isArray(responses) || responses.length > 100 || !responses.every(isEvalResponse)) {
      return res.status(400).json({ error: 'responses must be an array of criterion responses' })
    }

    const typed = responses as EvalResponse[]

    // One evaluation per brother, per applicant, per form, per cycle — a
    // re-submission is the evaluator revising their own eval, not a new one.
    const result = await evaluations.findOneAndUpdate(
      {
        formType,
        cycle,
        applicantEmail: normalizeEmail(applicantEmail),
        evaluatorEmail: normalizeEmail(session.email),
      },
      {
        $set: {
          applicantName: applicantName.trim(),
          evaluatorName: session.name,
          responses: typed,
          rawAverage: rawAverage(typed),
          normalizedScore: normalizedScore(typed),
          submittedAt: new Date(),
        },
        $setOnInsert: {
          formType,
          cycle,
          applicantEmail: normalizeEmail(applicantEmail),
          evaluatorEmail: normalizeEmail(session.email),
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )

    return res.status(200).json({ ok: true, evaluation: result })
  } catch (err) {
    console.error('Evaluations request failed:', err)
    return res.status(500).json({ error: 'Failed to process evaluation' })
  }
}
