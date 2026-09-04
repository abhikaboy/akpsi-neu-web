export interface PresenceViewer {
  name: string
  email: string
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.error ?? 'Something went wrong.'
}

export async function fetchPresence(cycle: string, candidateEmail: string): Promise<PresenceViewer[]> {
  const res = await fetch(
    `/api/presence?cycle=${encodeURIComponent(cycle)}&candidateEmail=${encodeURIComponent(candidateEmail)}`,
  )
  if (res.status === 401) throw new Error('unauthenticated')
  if (!res.ok) throw new Error(await readError(res))
  const body = await res.json()
  return body.viewers ?? []
}

export function sendPresenceHeartbeat(cycle: string, candidateEmail: string): Promise<void> {
  return fetch('/api/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, candidateEmail }),
  }).then(() => undefined)
}

export function leavePresence(cycle: string, candidateEmail: string): void {
  // Fire-and-forget on unmount (SPA navigation, not a page close, so a plain
  // fetch completes fine); the TTL would clean this up a few seconds later
  // regardless, this just makes the "no longer viewing" update feel instant.
  fetch('/api/presence', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, candidateEmail }),
    keepalive: true,
  }).catch(() => {})
}
