/**
 * Creates the indexes the API queries rely on. Safe to re-run: createIndex is
 * a no-op when an identical index already exists.
 *
 *   bun run indexes
 *
 * Reads MONGODB_URI from the environment, falling back to .env.local so it can
 * be run against the same database the dev server uses.
 */
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

function loadUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const match = line.match(/^\s*MONGODB_URI\s*=\s*(.*)$/)
      if (match) return match[1].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
  return null
}

// Each entry mirrors a query in api/: the filter fields first, then the field
// the query sorts on, so one index covers both halves of the query.
const INDEXES = {
  applications: [
    { keys: { cycle: 1, submittedAt: -1 }, name: 'cycle_submittedAt' },
    { keys: { email: 1 }, name: 'email' },
  ],
  evaluations: [
    { keys: { cycle: 1, formType: 1, submittedAt: -1 }, name: 'cycle_formType_submittedAt' },
    { keys: { cycle: 1, evaluatorEmail: 1 }, name: 'cycle_evaluatorEmail' },
    { keys: { applicantEmail: 1 }, name: 'applicantEmail' },
  ],
  rushCheckins: [
    { keys: { cycle: 1, eventDate: 1 }, name: 'cycle_eventDate' },
    { keys: { email: 1 }, name: 'email' },
  ],
  interviewStatuses: [{ keys: { cycle: 1, applicantEmail: 1 }, name: 'cycle_applicantEmail' }],
  candidateChatMessages: [
    { keys: { cycle: 1, candidateEmail: 1, createdAt: 1 }, name: 'cycle_candidate_createdAt' },
  ],
}

const uri = loadUri()
if (!uri) {
  console.error('MONGODB_URI is not set and was not found in .env.local')
  process.exit(1)
}

const client = await new MongoClient(uri).connect()
const db = client.db('akpsi')

for (const [collection, indexes] of Object.entries(INDEXES)) {
  for (const { keys, name } of indexes) {
    const created = await db.collection(collection).createIndex(keys, { name })
    console.log(`${collection}.${created}`)
  }
}

await client.close()
console.log('done')
