import { useEffect, useState } from 'react'
import { fetchPresence, leavePresence, sendPresenceHeartbeat, type PresenceViewer } from '../../lib/presence'

const HEARTBEAT_MS = 5000
const POLL_MS = 4000

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

/**
 * Shown while a candidate's profile is expanded. Heartbeats a short-lived
 * presence key while mounted and polls for everyone else's, so "who else is
 * looking at this rushee right now" updates within a few seconds without any
 * persistent connection.
 */
export default function PresenceIndicator({
  cycle,
  candidateEmail,
  viewerEmail,
}: {
  cycle: string
  candidateEmail: string
  viewerEmail: string
}) {
  const [viewers, setViewers] = useState<PresenceViewer[]>([])

  useEffect(() => {
    let cancelled = false

    const heartbeat = () => sendPresenceHeartbeat(cycle, candidateEmail)
    const poll = () =>
      fetchPresence(cycle, candidateEmail)
        .then(next => {
          if (!cancelled) setViewers(next)
        })
        .catch(() => {})

    heartbeat()
    poll()
    const heartbeatId = setInterval(heartbeat, HEARTBEAT_MS)
    const pollId = setInterval(poll, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(heartbeatId)
      clearInterval(pollId)
      leavePresence(cycle, candidateEmail)
    }
  }, [cycle, candidateEmail])

  const others = viewers.filter(v => v.email !== viewerEmail.toLowerCase())
  if (others.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {others.slice(0, 4).map(viewer => (
          <div
            key={viewer.email}
            title={viewer.name}
            className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold ring-2 ring-card"
          >
            {initials(viewer.name)}
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {others.length === 1 ? `${others[0].name} is` : `${others.length} brothers are`} also
        viewing
      </span>
    </div>
  )
}
