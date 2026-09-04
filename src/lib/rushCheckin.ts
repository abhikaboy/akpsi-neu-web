export interface Rushee {
  _id: string
  name: string
}

export interface RushCheckinPayload {
  eventId: string
  eventName: string
  eventDate: string
  cycle: string
  isFirstEvent: boolean
  email?: string
  preferredName?: string
  rusheeId?: string
}

export interface RushCheckinResult {
  name: string
  eventName: string
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.error ?? 'Something went wrong.'
}

export async function fetchRushees(): Promise<Rushee[]> {
  const res = await fetch('/api/rushees')
  if (!res.ok) throw new Error(await readError(res))
  const body = await res.json()
  return body.rushees ?? []
}

export async function submitRushCheckin(payload: RushCheckinPayload): Promise<RushCheckinResult> {
  const res = await fetch('/api/rush-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json()
}
