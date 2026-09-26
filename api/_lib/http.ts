import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Sends JSON with a strong ETag and answers 304 when the browser already holds
 * this exact body.
 *
 * The query still runs, so this saves transfer rather than database work — but
 * transfer is what costs time here. Fetching the deliberation list moves most
 * of its payload over a link that measured ~110KB/s, while the queries behind
 * it finish in under a second. A 304 turns a repeat view into an empty body.
 *
 * `private` matters: these responses are scoped to the signed-in brother (the
 * deliberation profile carries their own `myFormTypes`), so a shared cache must
 * never hold one. `max-age=0, must-revalidate` keeps the browser asking, which
 * is what makes freshly submitted evaluations show up.
 */
export function sendCachedJson(
  req: VercelRequest,
  res: VercelResponse,
  body: unknown,
): void {
  const json = JSON.stringify(body)
  const etag = `"${createHash('sha1').update(json).digest('base64url')}"`

  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')

  // If-None-Match can carry several tags, and a proxy may weaken ours.
  const ifNoneMatch = req.headers['if-none-match']
  if (ifNoneMatch) {
    const tags = ifNoneMatch.split(',').map((tag) => tag.trim().replace(/^W\//, ''))
    if (tags.includes(etag)) {
      res.status(304).end()
      return
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(200).send(json)
}
