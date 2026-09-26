/**
 * Collapses duplicate applications down to the most recent one per applicant.
 *
 *   bun run dedupe:applications          # dry run, prints what would go
 *   bun run dedupe:applications --apply  # archives, then deletes
 *
 * Applications are keyed on cycle + normalized email, the same join key the
 * deliberation view uses. Duplicates exist because api/apply.ts checked for an
 * existing row and then inserted, so two submissions racing each other both
 * passed the check — most of these groups are seconds apart.
 *
 * Every deleted document is copied into `applicationsArchive` first, so this is
 * recoverable: the archive keeps the original _id under `originalId`.
 */
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

const APPLY = process.argv.includes('--apply')
const ARCHIVE = 'applicationsArchive'

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

function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}

/**
 * Newest first. Timestamps tie when a form is submitted several times in the
 * same second, so ObjectIds break the tie — they embed creation time and are
 * monotonic within a client, making the choice deterministic rather than
 * dependent on the order Mongo happened to return.
 */
function newestFirst(a, b) {
  const delta = new Date(b.submittedAt ?? 0) - new Date(a.submittedAt ?? 0)
  return delta !== 0 ? delta : String(b._id).localeCompare(String(a._id))
}

const uri = loadUri()
if (!uri) {
  console.error('MONGODB_URI is not set and was not found in .env.local')
  process.exit(1)
}

const client = await new MongoClient(uri).connect()
const db = client.db('akpsi')
const applications = db.collection('applications')

const all = await applications.find({}).toArray()
const groups = new Map()
for (const app of all) {
  const key = `${app.cycle ?? ''}::${normalizeEmail(app.email)}`
  groups.set(key, [...(groups.get(key) ?? []), app])
}

const doomed = []
for (const [key, group] of groups) {
  if (group.length < 2) continue
  const [keep, ...rest] = [...group].sort(newestFirst)
  console.log(`${key}: keeping ${keep._id} (${keep.submittedAt?.toISOString?.() ?? keep.submittedAt}), dropping ${rest.length}`)
  doomed.push(...rest)
}

console.log(
  `\n${all.length} applications, ${groups.size} unique applicants, ${doomed.length} duplicates`,
)

if (!doomed.length) {
  await client.close()
  process.exit(0)
}

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply to archive and delete.')
  await client.close()
  process.exit(0)
}

await db.collection(ARCHIVE).insertMany(
  doomed.map(({ _id, ...rest }) => ({
    ...rest,
    originalId: _id,
    archivedAt: new Date(),
    archivedBy: 'dedupe-applications',
  })),
)
console.log(`archived ${doomed.length} documents to ${ARCHIVE}`)

const result = await applications.deleteMany({ _id: { $in: doomed.map((d) => d._id) } })
console.log(`deleted ${result.deletedCount}`)
console.log(`remaining: ${await applications.countDocuments({})}`)

await client.close()
