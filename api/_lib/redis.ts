import { Redis } from '@upstash/redis'

let redis: Redis | null = null

// The Upstash Vercel Marketplace integration names its env vars after the old
// @vercel/kv convention (KV_REST_API_*), not the UPSTASH_REDIS_REST_* names
// Redis.fromEnv() looks for, so the client is built explicitly here.
export function getRedis(): Redis {
  if (redis) return redis
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN are not set')
  redis = new Redis({ url, token })
  return redis
}
