export const EVAL_FORM_TYPES = ['rushEval', 'invitationalEval', 'interview'] as const
export type EvalFormType = (typeof EVAL_FORM_TYPES)[number]

export function isEvalFormType(value: unknown): value is EvalFormType {
  return typeof value === 'string' && (EVAL_FORM_TYPES as readonly string[]).includes(value)
}

export interface EvalResponse {
  label: string
  fieldType: string
  value: string
  score: number | null
  scoreMin: number | null
  scoreMax: number | null
  weight: number
}

function isFiniteOrNull(v: unknown): boolean {
  return v === null || v === undefined || typeof v === 'number'
}

export function isEvalResponse(r: unknown): r is EvalResponse {
  if (typeof r !== 'object' || r === null) return false
  const c = r as EvalResponse
  return (
    typeof c.label === 'string' &&
    c.label.length <= 200 &&
    typeof c.fieldType === 'string' &&
    typeof c.value === 'string' &&
    c.value.length <= 5000 &&
    isFiniteOrNull(c.score) &&
    isFiniteOrNull(c.scoreMin) &&
    isFiniteOrNull(c.scoreMax) &&
    isFiniteOrNull(c.weight)
  )
}

function weightOf(r: EvalResponse): number {
  return Number.isFinite(r.weight) && (r.weight as number) > 0 ? r.weight : 1
}

/** Weighted mean of the raw scores, in the units of the rubric itself. */
export function rawAverage(responses: EvalResponse[]): number | null {
  let weighted = 0
  let totalWeight = 0
  for (const r of responses) {
    if (r.fieldType !== 'score' || typeof r.score !== 'number' || !Number.isFinite(r.score)) continue
    const w = weightOf(r)
    weighted += r.score * w
    totalWeight += w
  }
  if (totalWeight === 0) return null
  return Math.round((weighted / totalWeight) * 100) / 100
}

/**
 * Weighted mean rescaled to 0-100. Rubrics can mix scales (a 1-5 criterion
 * alongside a 1-10 one), and a raw average across those is meaningless, so the
 * comparable number used by the spreadsheet and deliberation views is a percent
 * of each criterion's own range.
 */
export function normalizedScore(responses: EvalResponse[]): number | null {
  let weighted = 0
  let totalWeight = 0
  for (const r of responses) {
    if (r.fieldType !== 'score' || typeof r.score !== 'number' || !Number.isFinite(r.score)) continue
    const min = typeof r.scoreMin === 'number' ? r.scoreMin : 0
    const max = typeof r.scoreMax === 'number' ? r.scoreMax : null
    if (max === null || max <= min) continue
    const w = weightOf(r)
    weighted += ((r.score - min) / (max - min)) * w
    totalWeight += w
  }
  if (totalWeight === 0) return null
  return Math.round((weighted / totalWeight) * 1000) / 10
}
