import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchChatMessages, sendChatMessage, type ChatMessage } from '../../lib/chat'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

const POLL_MS = 3000

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * A discussion thread scoped to one candidate + cycle, for brothers to argue
 * a rushee's case without leaving the deliberation view. Polls every few
 * seconds rather than pushing, which is plenty responsive for a handful of
 * people in the same room during deliberations.
 */
export default function CandidateChat({
  cycle,
  candidateEmail,
  viewerEmail,
}: {
  cycle: string
  candidateEmail: string
  viewerEmail: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () =>
      fetchChatMessages(cycle, candidateEmail)
        .then(next => {
          if (!cancelled) setMessages(next)
        })
        .catch(() => {})
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [cycle, candidateEmail])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    try {
      const message = await sendChatMessage(cycle, candidateEmail, draft.trim())
      setMessages(prev => [...prev, message])
      setDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border rounded-md">
      <div ref={listRef} className="max-h-64 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discussion yet. Say something about this candidate.
          </p>
        ) : (
          messages.map(message => (
            <div key={message._id} className={message.senderEmail === viewerEmail.toLowerCase() ? 'text-right' : ''}>
              <p className="text-xs text-muted-foreground">
                {message.senderName} &middot; {formatTime(message.createdAt)}
              </p>
              <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="flex gap-2 border-t p-2">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          rows={1}
          placeholder="Add to the discussion..."
          className="min-h-9 resize-none"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
