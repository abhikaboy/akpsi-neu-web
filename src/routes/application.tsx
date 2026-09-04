import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Navigation from '../components/Navigation'
import NameCombobox from '../components/NameCombobox'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { getApplicationQuestions, type ApplicationQuestion } from '../lib/sanity'
import { useActiveCycle } from '../lib/activeCycle'
import { submitApplication } from '../lib/applications'
import { uploadApplicationFile } from '../lib/uploads'
import { fetchRushees, type Rushee } from '../lib/rushCheckin'

export const Route = createFileRoute('/application')({
  component: Application,
})

function Application() {
  const {
    cycle,
    label: cycleLabel,
    loading: cycleLoading,
    error: cycleError,
  } = useActiveCycle()
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [rushees, setRushees] = useState<Rushee[]>([])
  const [name, setName] = useState('')
  const [rusheeId, setRusheeId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set())
  const [fileNames, setFileNames] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchRushees()
      .then(setRushees)
      .catch(() => {
        /* the search combo just degrades to a plain name field */
      })
  }, [])

  useEffect(() => {
    if (cycleLoading) return
    if (!cycle) {
      setLoading(false)
      return
    }
    setLoading(true)
    setAnswers({})
    getApplicationQuestions(cycle)
      .then(setQuestions)
      .catch(() => setError('Failed to load application questions.'))
      .finally(() => setLoading(false))
  }, [cycle, cycleLoading])

  const setAnswer = (id: string, value: string) => setAnswers(prev => ({ ...prev, [id]: value }))

  const handleFileChange = async (q: ApplicationQuestion, file: File | undefined) => {
    if (!file) return
    setUploadingIds(prev => new Set(prev).add(q._id))
    try {
      const url = await uploadApplicationFile(file)
      setAnswer(q._id, url)
      setFileNames(prev => ({ ...prev, [q._id]: file.name }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingIds(prev => {
        const next = new Set(prev)
        next.delete(q._id)
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error('Please enter your name and email.')
      return
    }
    if (uploadingIds.size > 0) {
      toast.error('Please wait for your file(s) to finish uploading.')
      return
    }
    const missing = questions.find(q => q.required && !answers[q._id]?.trim())
    if (missing) {
      toast.error(`Please answer: ${missing.label}`)
      return
    }
    setSubmitting(true)
    try {
      if (!cycle) {
        toast.error('Applications are not open right now.')
        return
      }
      await submitApplication({
        cycle,
        name,
        email,
        answers: questions.map(q => ({ label: q.label, value: answers[q._id] ?? '' })),
        rusheeId: rusheeId || undefined,
      })
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit application.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white min-h-screen relative w-full">
      <Navigation currentPage="Apply" mode="dark" />

      <div className="pt-24 sm:pt-28 pb-20 px-6 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-black mb-2"
            style={{ fontFamily: 'var(--font-avenir-black)' }}
          >
            Apply
          </h1>
          <p className="text-muted-foreground mb-8">
            Interested in joining Alpha Kappa Psi? Fill out the form below
            {cycleLabel ? ` to apply for ${cycleLabel}` : ''}.
          </p>

          {(cycleError ?? error) && (
            <div className="p-3 mb-6 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              {cycleError ?? error}
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded" />
              ))}
            </div>
          ) : !cycle || questions.length === 0 ? (
            <p className="text-muted-foreground text-sm border rounded-lg p-6">
              Applications aren't open yet. Check back soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="mb-2 block">
                  Name<span className="text-destructive"> *</span>
                </Label>
                <NameCombobox
                  inputId="name"
                  people={rushees}
                  query={name}
                  onQueryChange={value => {
                    setName(value)
                    setRusheeId('')
                  }}
                  selectedId={rusheeId}
                  onSelect={person => {
                    setRusheeId(person._id)
                    setName(person.name)
                  }}
                  placeholder="Start typing your name..."
                  emptyMessage="No matches. That's OK, just keep your typed name above."
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-2 block">
                  Email<span className="text-destructive"> *</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {questions.map(q => (
                <div key={q._id}>
                  <Label htmlFor={q._id} className="mb-2 block">
                    {q.label}
                    {q.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {q.fieldType === 'textarea' && (
                    <Textarea
                      id={q._id}
                      value={answers[q._id] ?? ''}
                      onChange={e => setAnswer(q._id, e.target.value)}
                      rows={5}
                    />
                  )}
                  {q.fieldType === 'text' && (
                    <Input
                      id={q._id}
                      value={answers[q._id] ?? ''}
                      onChange={e => setAnswer(q._id, e.target.value)}
                    />
                  )}
                  {q.fieldType === 'select' && (
                    <Select value={answers[q._id] ?? ''} onValueChange={v => setAnswer(q._id, v)}>
                      <SelectTrigger id={q._id} className="w-full">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {(q.options ?? []).map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {q.fieldType === 'file' && (
                    <>
                      <Input
                        id={q._id}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        disabled={uploadingIds.has(q._id)}
                        onChange={e => handleFileChange(q, e.target.files?.[0])}
                      />
                      {uploadingIds.has(q._id) && <div className="skeleton h-4 w-32 rounded mt-2" />}
                      {!uploadingIds.has(q._id) && fileNames[q._id] && (
                        <p className="text-xs text-muted-foreground mt-1">Uploaded: {fileNames[q._id]}</p>
                      )}
                    </>
                  )}
                </div>
              ))}

              <Button type="submit" disabled={submitting || uploadingIds.size > 0} className="w-full sm:w-auto">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Application
