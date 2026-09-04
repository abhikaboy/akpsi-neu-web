export interface ApplicationSubmission {
  cycle: string
  name: string
  email: string
  answers: { label: string; value: string }[]
  rusheeId?: string
}

export async function submitApplication(submission: ApplicationSubmission): Promise<void> {
  const res = await fetch('/api/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? 'Failed to submit application.')
  }
}
