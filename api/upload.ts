import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SIZE_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    })
    return res.status(200).json(jsonResponse)
  } catch (err) {
    console.error('Blob upload token error:', err)
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' })
  }
}
