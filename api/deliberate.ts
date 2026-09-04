import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSession } from './_lib/auth'
import { EVAL_FORM_TYPES, type EvalFormType } from './_lib/evaluations'
import { getDb, normalizeEmail } from './_lib/mongo'

interface FormSummary {
  count: number
  averageScore: number | null
  evaluatorNames: string[]
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

/**
 * Applicants have no profile record, so their avatar is whatever image they
 * uploaded on the application (a headshot question, typically). PDFs and other
 * uploads are skipped; the UI falls back to initials when there's nothing.
 */
function findPhotoUrl(answers: unknown): string | null {
  if (!Array.isArray(answers)) return null
  for (const answer of answers) {
    const value = answer?.value
    if (typeof value !== 'string') continue
    if (/^https?:\/\//.test(value) && IMAGE_RE.test(value)) return value
  }
  return null
}

/** Read-only: every source we hold on one applicant, joined on their email. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
  const viewerEmail = normalizeEmail(session.email)

  const { cycle } = req.query
  const cycleFilter = typeof cycle === 'string' && cycle ? { cycle } : {}

  try {
    const db = await getDb()
    const [applications, evaluations] = await Promise.all([
      db.collection('applications').find(cycleFilter).toArray(),
      db.collection('evaluations').find(cycleFilter).sort({ submittedAt: -1 }).toArray(),
    ])

    const profiles = new Map<string, any>()

    const ensure = (email: string, name: string, cycleValue: string) => {
      let profile = profiles.get(email)
      if (!profile) {
        profile = {
          email,
          name,
          cycle: cycleValue,
          application: null,
          photoUrl: null as string | null,
          evaluations: [],
          summary: {} as Record<EvalFormType, FormSummary>,
          // Which forms the brother making this request has filed on this
          // rushee — drives the "evaluated by me" filters.
          myFormTypes: [] as EvalFormType[],
          overallScore: null as number | null,
          totalEvaluations: 0,
        }
        for (const formType of EVAL_FORM_TYPES) {
          profile.summary[formType] = { count: 0, averageScore: null, evaluatorNames: [] }
        }
        profiles.set(email, profile)
      }
      return profile
    }

    for (const app of applications) {
      if (typeof app.email !== 'string') continue
      const email = normalizeEmail(app.email)
      const profile = ensure(email, app.name ?? email, app.cycle ?? '')
      profile.application = {
        _id: String(app._id),
        status: app.status ?? 'new',
        submittedAt: app.submittedAt ?? null,
        answers: Array.isArray(app.answers) ? app.answers : [],
      }
      profile.photoUrl = findPhotoUrl(app.answers)
    }

    for (const evaluation of evaluations) {
      if (typeof evaluation.applicantEmail !== 'string') continue
      const email = normalizeEmail(evaluation.applicantEmail)
      const profile = ensure(email, evaluation.applicantName ?? email, evaluation.cycle ?? '')
      if (
        normalizeEmail(String(evaluation.evaluatorEmail ?? '')) === viewerEmail &&
        !profile.myFormTypes.includes(evaluation.formType)
      ) {
        profile.myFormTypes.push(evaluation.formType)
      }
      profile.evaluations.push({
        _id: String(evaluation._id),
        formType: evaluation.formType,
        evaluatorName: evaluation.evaluatorName ?? 'Unknown',
        rawAverage: evaluation.rawAverage ?? null,
        normalizedScore: evaluation.normalizedScore ?? null,
        responses: Array.isArray(evaluation.responses) ? evaluation.responses : [],
        submittedAt: evaluation.submittedAt ?? null,
      })
    }

    // Per-form averages, then one overall figure across every form so the table
    // can be ranked at a glance.
    for (const profile of profiles.values()) {
      const allScores: number[] = []
      for (const formType of EVAL_FORM_TYPES) {
        const forForm = profile.evaluations.filter((e: any) => e.formType === formType)
        const scores = forForm
          .map((e: any) => e.normalizedScore)
          .filter((s: unknown): s is number => typeof s === 'number')
        allScores.push(...scores)
        profile.summary[formType] = {
          count: forForm.length,
          averageScore: scores.length
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
          evaluatorNames: forForm.map((e: any) => e.evaluatorName),
        }
      }
      profile.totalEvaluations = profile.evaluations.length
      profile.overallScore = allScores.length
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null
    }

    const sorted = Array.from(profiles.values()).sort((a, b) => {
      if (a.overallScore === b.overallScore) return a.name.localeCompare(b.name)
      if (a.overallScore === null) return 1
      if (b.overallScore === null) return -1
      return b.overallScore - a.overallScore
    })

    return res.status(200).json({ profiles: sorted })
  } catch (err) {
    console.error('Failed to build deliberation view:', err)
    return res.status(500).json({ error: 'Failed to build deliberation view' })
  }
}
