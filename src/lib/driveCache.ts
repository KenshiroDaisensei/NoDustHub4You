let cache: { data: unknown; meta: { name: string; modifiedTime: string } | null; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getDriveCache() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { data: cache.data, meta: cache.meta };
  }
  return null;
}

export function setDriveCache(data: unknown, meta: { name: string; modifiedTime: string } | null = null) {
  cache = { data, meta, timestamp: Date.now() };
}

export function clearDriveCache() {
  cache = null;
}
