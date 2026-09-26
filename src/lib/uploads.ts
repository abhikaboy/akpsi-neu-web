import { upload } from '@vercel/blob/client'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB, must match api/upload.ts

/**
 * Phone cameras produce 4000px+ images, but nothing in the admin UI shows a
 * headshot larger than a few hundred pixels. Shrinking before upload keeps the
 * Blob store — and every later download of the original — small.
 */
const MAX_IMAGE_DIMENSION = 1600
const WEBP_QUALITY = 0.82

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

/**
 * Re-encodes an oversized image as WebP within MAX_IMAGE_DIMENSION. Returns the
 * original file untouched for PDFs, already-small images, or if anything about
 * the canvas path fails — an upload that works beats a smaller one that doesn't.
 */
async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
    // Leave small images alone unless they're needlessly heavy for their size.
    if (scale === 1 && file.size <= 600 * 1024) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], name, { type: 'image/webp' })
  } catch {
    return file
  }
}

export async function uploadApplicationFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only PDF, JPEG, PNG, or WebP files are allowed.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File must be under 10MB.')
  }
  const toUpload = await downscaleImage(file)
  const blob = await upload(`applications/${crypto.randomUUID()}-${toUpload.name}`, toUpload, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return blob.url
}
