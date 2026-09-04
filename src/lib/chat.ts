export interface ChatMessage {
  _id: string
  cycle: string
  candidateEmail: string
  senderName: string
  senderEmail: string
  body: string
  createdAt: string
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.error ?? 'Something went wrong.'
}

export async function fetchChatMessages(cycle: string, candidateEmail: string): Promise<ChatMessage[]> {
  const res = await fetch(
    `/api/chat?cycle=${encodeURIComponent(cycle)}&candidateEmail=${encodeURIComponent(candidateEmail)}`,
  )
  if (res.status === 401) throw new Error('unauthenticated')
  if (!res.ok) throw new Error(await readError(res))
  const body = await res.json()
  return body.messages ?? []
}

export async function sendChatMessage(
  cycle: string,
  candidateEmail: string,
  body: string,
): Promise<ChatMessage> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle, candidateEmail, body }),
  })
  if (res.status === 401) throw new Error('unauthenticated')
  if (!res.ok) throw new Error(await readError(res))
  const json = await res.json()
  return json.message
}
