import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import NameCombobox from '../components/NameCombobox'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { getRushEvents, type RushEvent } from '../lib/sanity'
import { useActiveCycle } from '../lib/activeCycle'
import { fetchRushees, submitRushCheckin, type Rushee } from '../lib/rushCheckin'

export const Route = createFileRoute('/rush-checkin')({
  component: RushCheckin,
})

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function RushCheckin() {
  const { cycle, loading: cycleLoading, error: cycleError } = useActiveCycle()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<RushEvent[]>([])
  const [rushees, setRushees] = useState<Rushee[]>([])
  const [error, setError] = useState<string | null>(null)

  const [isFirstEvent, setIsFirstEvent] = useState(false)
  const [email, setEmail] = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [rusheeSearch, setRusheeSearch] = useState('')
  const [rusheeId, setRusheeId] = useState('')
  const [eventId, setEventId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<{ name: string; eventName: string } | null>(
    null,
  )

  useEffect(() => {
    Promise.all([getRushEvents(), fetchRushees()])
      .then(([eventData, rusheeData]) => {
        setEvents(eventData.filter(e => isToday(e.date)))
        setRushees(rusheeData)
      })
      .catch(() => setError('Failed to load check-in options. Please refresh and try again.'))
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setIsFirstEvent(false)
    setEmail('')
    setPreferredName('')
    setRusheeSearch('')
    setRusheeId('')
    setEventId('')
    setConfirmation(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const event = events.find(ev => ev._id === eventId)
    if (!event) {
      toast.error('Please select an event.')
      return
    }
    if (isFirstEvent) {
      if (!preferredName.trim() || !email.trim()) {
        toast.error('Please enter your name and email.')
        return
      }
    } else if (!rusheeId) {
      toast.error('Please select your name.')
      return
    }

    if (!cycle) {
      toast.error('No active cycle is set.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitRushCheckin({
        eventId: event._id,
        eventName: event.name,
        eventDate: event.date,
        cycle,
        isFirstEvent,
        email: isFirstEvent ? email.trim() : undefined,
        preferredName: isFirstEvent ? preferredName.trim() : undefined,
        rusheeId: isFirstEvent ? undefined : rusheeId,
      })
      setConfirmation(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check in.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div className="bg-white min-h-screen w-full flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-11 text-green-600" strokeWidth={1.5} />
          </div>
          <h1
            className="text-3xl font-black mb-2"
            style={{ fontFamily: 'var(--font-avenir-black)' }}
          >
            You're checked in!
          </h1>
          <p className="text-muted-foreground mb-1">
            Nice to see you, <span className="font-semibold text-foreground">{confirmation.name}</span>.
          </p>
          <p className="text-muted-foreground mb-8">{confirmation.eventName}</p>
          <Button onClick={resetForm} className="w-full">
            Check in another person
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen w-full">
      <div className="pt-16 pb-20 px-6 sm:px-8">
        <div className="max-w-md mx-auto">
          <h1
            className="text-3xl sm:text-4xl font-black mb-2"
            style={{ fontFamily: 'var(--font-avenir-black)' }}
          >
            Rush Check-In
          </h1>
          <p className="text-muted-foreground mb-8">
            Welcome! Fill this out to check in to today's event.
          </p>

          {(cycleError ?? error) && (
            <div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              {cycleError ?? error}
            </div>
          )}

          {loading || cycleLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded" />
              ))}
            </div>
          ) : !cycle ? null : events.length === 0 ? (
            <p className="text-muted-foreground text-sm border rounded-lg p-6">
              There are no rush events scheduled for today. Check back on an event day!
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="mb-2 block">Event</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Select today's event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.name} &middot; {formatEventTime(event.date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={isFirstEvent}
                  onCheckedChange={checked => setIsFirstEvent(checked === true)}
                />
                <span className="text-sm font-medium">Is this your first rush event?</span>
              </label>

              {isFirstEvent ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preferred-name" className="mb-2 block">
                      Preferred Name<span className="text-destructive"> *</span>
                    </Label>
                    <Input
                      id="preferred-name"
                      className="h-11"
                      value={preferredName}
                      onChange={e => setPreferredName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="mb-2 block">
                      Email<span className="text-destructive"> *</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      className="h-11"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="mb-2 block">
                    Your Name<span className="text-destructive"> *</span>
                  </Label>
                  <NameCombobox
                    people={rushees}
                    query={rusheeSearch}
                    onQueryChange={value => {
                      setRusheeSearch(value)
                      setRusheeId('')
                    }}
                    selectedId={rusheeId}
                    onSelect={person => {
                      setRusheeId(person._id)
                      setRusheeSearch(person.name)
                    }}
                    emptyMessage={'No matches. Check "first rush event" if you\'re new.'}
                  />
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full h-11">
                {submitting ? 'Checking in...' : 'Check In'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default RushCheckin
