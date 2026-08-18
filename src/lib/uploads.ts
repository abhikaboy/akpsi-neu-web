import { upload } from '@vercel/blob/client'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB, must match api/upload.ts

export async function uploadApplicationFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PDF, JPEG, PNG, or WebP files are allowed.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File must be under 10MB.')
  }
  const blob = await upload(`applications/${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return blob.url
}
