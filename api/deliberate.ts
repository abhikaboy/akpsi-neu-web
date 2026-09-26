import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendCachedJson } from './_lib/http.js'
import { getSession } from './_lib/auth.js'
import { EVAL_FORM_TYPES, type EvalFormType } from './_lib/evaluations.js'
import { getDb, normalizeEmail } from './_lib/mongo.js'

interface FormSummary {
  count: number
  averageScore: number | null
  evaluatorNames: string[]
}

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

/**
 * Rush events carry no type field in Sanity, so an info session is recognised
 * by name. They're the events we care most about, hence the flag on the record.
 */
const INFO_SESSION_RE = /info\s*(session|night)/i

/** Events a rushee must attend for their rush to count. */
const REQUIRED_EVENT_COUNT = 3

/** Case- and spacing-insensitive key used to spot one person under two emails. */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Rushees who check in with one address and apply with another show up as two
 * profiles. Where the name matches exactly we fold them into a single record,
 * keeping the address that carries the application as the canonical one and
 * listing the rest as aliases.
 */
function mergeByName(profiles: Map<string, any>): Map<string, any> {
  const byName = new Map<string, any[]>()
  for (const profile of profiles.values()) {
    const key = nameKey(profile.name)
    const group = byName.get(key)
    if (group) group.push(profile)
    else byName.set(key, [profile])
  }

  const merged = new Map<string, any>()
  for (const group of byName.values()) {
    if (group.length === 1) {
      merged.set(group[0].email, group[0])
      continue
    }

    // The application is the record a human filled in deliberately, so its
    // email wins; otherwise fall back to whoever has the most evaluations.
    const primary =
      group.find((p) => p.application) ??
      group.reduce((best, p) => (p.evaluations.length > best.evaluations.length ? p : best))

    for (const other of group) {
      if (other === primary) continue
      primary.aliasEmails.push(other.email, ...other.aliasEmails)
      primary.application ??= other.application
      primary.photoUrl ??= other.photoUrl
      primary.cycle ||= other.cycle
      primary.evaluations.push(...other.evaluations)
      for (const formType of other.myFormTypes) {
        if (!primary.myFormTypes.includes(formType)) primary.myFormTypes.push(formType)
      }
      for (const event of other.attendance) {
        if (!primary.attendance.some((e: any) => e.eventId === event.eventId)) {
          primary.attendance.push(event)
        }
      }
    }
    primary.aliasEmails = Array.from(new Set(primary.aliasEmails)).sort()
    merged.set(primary.email, primary)
  }
  return merged
}

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

/**
 * The list view renders names, scores and attendance — it never opens an
 * application answer or an evaluation response. Those two arrays are almost
 * the entire payload (applications average ~5KB each, nearly all of it essay
 * text), so the chapter-wide request leaves them behind and a single-candidate
 * request (`?email=`) fetches them for the one profile being read.
 */
function isDetailRequest(query: VercelRequest['query']): string | null {
  const { email } = query
  return typeof email === 'string' && email ? normalizeEmail(email) : null
}

/**
 * Keeps only the answers whose value looks like an image URL, so the list can
 * still show a headshot without shipping the essays. Done in the aggregation
 * rather than after the fact because the point is to never send the text.
 */
const IMAGE_ANSWERS_ONLY = {
  $filter: {
    input: { $ifNull: ['$answers', []] },
    as: 'answer',
    cond: {
      $regexMatch: {
        input: { $ifNull: ['$$answer.value', ''] },
        regex: '^https?://.*\\.(jpe?g|png|webp|gif|avif)(\\?|$)',
        options: 'i',
      },
    },
  },
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
  const detailEmail = isDetailRequest(req.query)

  try {
    const db = await getDb()

    // Profiles are merged across emails before the requested candidate can be
    // picked out, so both modes read the same rows; only the heavy per-document
    // arrays differ.
    const applicationProjection = detailEmail
      ? { $project: { name: 1, email: 1, cycle: 1, status: 1, submittedAt: 1, answers: 1 } }
      : {
          $project: {
            name: 1,
            email: 1,
            cycle: 1,
            status: 1,
            submittedAt: 1,
            answers: IMAGE_ANSWERS_ONLY,
          },
        }

    const evaluationProjection = detailEmail
      ? {}
      : { projection: { responses: 0 } }

    const [applications, evaluations, checkins] = await Promise.all([
      db.collection('applications').aggregate([{ $match: cycleFilter }, applicationProjection]).toArray(),
      db
        .collection('evaluations')
        .find(cycleFilter, evaluationProjection)
        .sort({ submittedAt: -1 })
        .toArray(),
      db.collection('rushCheckins').find(cycleFilter).sort({ eventDate: 1 }).toArray(),
    ])

    const profiles = new Map<string, any>()

    const ensure = (email: string, name: string, cycleValue: string) => {
      let profile = profiles.get(email)
      if (!profile) {
        profile = {
          email,
          // Other addresses folded into this profile by an exact name match.
          aliasEmails: [] as string[],
          name,
          cycle: cycleValue,
          application: null,
          photoUrl: null as string | null,
          evaluations: [],
          summary: {} as Record<EvalFormType, FormSummary>,
          // Which forms the brother making this request has filed on this
          // rushee — drives the "evaluated by me" filters.
          myFormTypes: [] as EvalFormType[],
          attendance: [] as {
            eventId: string
            eventName: string
            eventDate: string | null
            isInfoSession: boolean
          }[],
          eventsAttended: 0,
          infoSessionsAttended: 0,
          belowEventRequirement: true,
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
        // Absent in list mode: the field is omitted rather than sent empty, so
        // a consumer that needs answers fails loudly instead of rendering none.
        ...(detailEmail ? { answers: Array.isArray(app.answers) ? app.answers : [] } : {}),
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
        ...(detailEmail
          ? { responses: Array.isArray(evaluation.responses) ? evaluation.responses : [] }
          : {}),
        submittedAt: evaluation.submittedAt ?? null,
      })
    }

    // Attendance is keyed on the email the rushee checked in with, so a rushee
    // who applied under a different address simply shows zero events.
    for (const checkin of checkins) {
      if (typeof checkin.email !== 'string') continue
      const email = normalizeEmail(checkin.email)
      const profile = ensure(email, checkin.name ?? email, checkin.cycle ?? '')
      // One event can produce several check-in rows (re-submits); count it once.
      if (profile.attendance.some((e: any) => e.eventId === checkin.eventId)) continue
      profile.attendance.push({
        eventId: String(checkin.eventId ?? ''),
        eventName: checkin.eventName ?? 'Unnamed event',
        eventDate: checkin.eventDate ? new Date(checkin.eventDate).toISOString() : null,
        isInfoSession: INFO_SESSION_RE.test(String(checkin.eventName ?? '')),
      })
    }

    const mergedProfiles = mergeByName(profiles)

    // Per-form averages, then one overall figure across every form so the table
    // can be ranked at a glance.
    for (const profile of mergedProfiles.values()) {
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
      profile.attendance.sort((a: any, b: any) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))
      profile.eventsAttended = profile.attendance.length
      profile.infoSessionsAttended = profile.attendance.filter((e: any) => e.isInfoSession).length
      profile.belowEventRequirement = profile.eventsAttended < REQUIRED_EVENT_COUNT
      profile.totalEvaluations = profile.evaluations.length
      profile.overallScore = allScores.length
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null
    }

    const sorted = Array.from(mergedProfiles.values()).sort((a, b) => {
      if (a.overallScore === b.overallScore) return a.name.localeCompare(b.name)
      if (a.overallScore === null) return 1
      if (b.overallScore === null) return -1
      return b.overallScore - a.overallScore
    })

    if (detailEmail) {
      // Merging can move a candidate under a different canonical address, so
      // the alias list is searched too — the same match the UI route makes.
      const profile = sorted.find(
        (p) => p.email === detailEmail || p.aliasEmails.includes(detailEmail),
      )
      if (!profile) return res.status(404).json({ error: 'Candidate not found' })
      return sendCachedJson(req, res, { profile })
    }

    return sendCachedJson(req, res, { profiles: sorted })
  } catch (err) {
    console.error('Failed to build deliberation view:', err)
    return res.status(500).json({ error: 'Failed to build deliberation view' })
  }
}
