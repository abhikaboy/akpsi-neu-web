import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

// Same public, published-only project/dataset the frontend reads from — no
// token needed, so this is safe to run from a serverless function.
const client = createClient({
  projectId: 'nqx8unn9',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2025-08-30',
  perspective: 'published',
})

const builder = imageUrlBuilder(client)

export interface BrotherRecord {
  name: string
  email: string
  pictureUrl: string | null
}

interface MemberDoc {
  name: string
  email: string
  picture?: { asset?: { _ref: string } }
}

/** Looks up a brother by email for login validation, case-insensitively. */
export async function findBrotherByEmail(email: string): Promise<BrotherRecord | null> {
  const normalized = email.trim().toLowerCase()
  const doc = await client.fetch<MemberDoc | null>(
    `*[_type == "member" && lower(email) == $email][0]{name, email, picture}`,
    { email: normalized },
  )
  if (!doc) return null
  return {
    name: doc.name,
    email: doc.email,
    pictureUrl: doc.picture?.asset ? builder.image(doc.picture).width(128).height(128).fit('crop').url() : null,
  }
}

/**
 * The check-in code for a rush event, so the server can verify it instead of
 * trusting the browser. Falls back to the schema default when unset.
 */
export async function getRushEventCheckinCode(eventId: string): Promise<string | null> {
  const doc = await client.fetch<{ checkinCode?: string } | null>(
    `*[_type == "rushEvent" && _id == $eventId][0]{checkinCode}`,
    { eventId },
  )
  if (!doc) return null
  return (doc.checkinCode ?? '1234').trim()
}
