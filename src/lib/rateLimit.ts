type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const cutoff = now - 120_000
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => t > cutoff)
    if (bucket.hits.length === 0) buckets.delete(key)
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [] }
    buckets.set(key, bucket)
  }
  bucket.hits = bucket.hits.filter((t) => t > now - windowMs)
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    return { ok: false, retryAfter: Math.ceil((oldest + windowMs - now) / 1000) }
  }
  bucket.hits.push(now)
  return { ok: true, retryAfter: 0 }
}
