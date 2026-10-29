/**
 * High-performance Thumbnail Cache Manager for Mobile & Web.
 * Solves:
 * 1. Mobile GPU/CPU lag caused by rendering raw, high-resolution photos in lists.
 * 2. Uncropped full-photo thumbnails (Contain / Fit Mode).
 * 3. Smart temporary cache: Automatically clears stale thumbnails after TTL (7 days)
 *    or when cache count exceeds threshold (150 items), preventing storage bloat.
 */

import { idbGet, idbSet, idbDelete } from './indexedDb';

interface CachedThumbnailEntry {
  thumbnailUrl: string;
  createdAt: number;
  lastUsedAt: number;
  sizeBytes: number;
}

const IDB_KEY_THUMBNAIL_INDEX = 'homeorganizer_thumb_index_v1';
const MAX_CACHE_ENTRIES = 150;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory LRU cache for 0ms synchronous lookup
const memoryCache = new Map<string, string>();
let isCleaningUp = false;

// Simple hash for string keys to keep storage compact
function hashKey(str: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 256); i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `thumb_${Math.abs(hash)}_${str.length}`;
}

/**
 * Generates a lightweight 160x160 compressed thumbnail from any data URL or image path.
 */
export function generateThumbnailDataUrl(
  sourceUrl: string,
  maxWidth = 180,
  maxHeight = 180,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    // If already SVG or tiny, return directly
    if (sourceUrl.startsWith('data:image/svg+xml') || sourceUrl.length < 2000) {
      return resolve(sourceUrl);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return resolve(sourceUrl);
      }

      // Calculate scale to fit inside maxWidth x maxHeight
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(sourceUrl);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      try {
        // Try webp first (smaller), fallback to jpeg
        let thumb = canvas.toDataURL('image/webp', quality);
        if (!thumb.startsWith('data:image/webp')) {
          thumb = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(thumb);
      } catch (e) {
        resolve(sourceUrl);
      }
    };

    img.onerror = () => {
      resolve(sourceUrl);
    };

    img.src = sourceUrl;
  });
}

/**
 * Returns a cached thumbnail synchronously if present in memory, or null if loading.
 */
export function getSynchronousThumbnail(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const key = hashKey(rawUrl);
  return memoryCache.get(key) || null;
}

/**
 * Gets or creates a thumbnail with caching in Memory + IndexedDB.
 */
export async function getCachedThumbnail(rawUrl: string): Promise<string> {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:image/svg+xml') || rawUrl.length < 2500) {
    return rawUrl;
  }

  const key = hashKey(rawUrl);

  // 1. Check memory
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // 2. Check IndexedDB
  try {
    const cached = await idbGet<CachedThumbnailEntry>(`thumb_${key}`);
    if (cached && cached.thumbnailUrl) {
      memoryCache.set(key, cached.thumbnailUrl);
      // Update lastUsedAt asynchronously
      cached.lastUsedAt = Date.now();
      idbSet(`thumb_${key}`, cached).catch(() => {});
      return cached.thumbnailUrl;
    }
  } catch {}

  // 3. Generate thumbnail on the fly
  const thumbnail = await generateThumbnailDataUrl(rawUrl, 180, 180, 0.72);
  memoryCache.set(key, thumbnail);

  // 4. Save to IndexedDB & update index
  const entry: CachedThumbnailEntry = {
    thumbnailUrl: thumbnail,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    sizeBytes: thumbnail.length,
  };

  idbSet(`thumb_${key}`, entry).catch(() => {});
  recordThumbnailInIndex(key).catch(() => {});

  return thumbnail;
}

/**
 * Records key into thumbnail index for LRU & TTL garbage collection.
 */
async function recordThumbnailInIndex(key: string): Promise<void> {
  try {
    const rawIndex = (await idbGet<string[]>(IDB_KEY_THUMBNAIL_INDEX)) || [];
    if (!rawIndex.includes(key)) {
      rawIndex.push(key);
      await idbSet(IDB_KEY_THUMBNAIL_INDEX, rawIndex);
    }
    // Check if cleanup is needed
    if (rawIndex.length > MAX_CACHE_ENTRIES && !isCleaningUp) {
      autoPruneThumbnails();
    }
  } catch {}
}

/**
 * Automatically prunes old or excess thumbnails to save device memory.
 */
export async function autoPruneThumbnails(): Promise<number> {
  if (isCleaningUp) return 0;
  isCleaningUp = true;
  let prunedCount = 0;

  try {
    const rawIndex = (await idbGet<string[]>(IDB_KEY_THUMBNAIL_INDEX)) || [];
    if (rawIndex.length === 0) {
      isCleaningUp = false;
      return 0;
    }

    const now = Date.now();
    const remainingKeys: string[] = [];
    const entriesWithMeta: { key: string; lastUsedAt: number }[] = [];

    // Gather entries
    for (const key of rawIndex) {
      const entry = await idbGet<CachedThumbnailEntry>(`thumb_${key}`);
      if (!entry) {
        continue;
      }
      // If older than TTL, remove immediately
      if (now - entry.lastUsedAt > CACHE_TTL_MS) {
        await idbDelete(`thumb_${key}`);
        memoryCache.delete(key);
        prunedCount++;
      } else {
        entriesWithMeta.push({ key, lastUsedAt: entry.lastUsedAt });
      }
    }

    // If still exceeds MAX_CACHE_ENTRIES, prune oldest by lastUsedAt
    if (entriesWithMeta.length > MAX_CACHE_ENTRIES) {
      entriesWithMeta.sort((a, b) => a.lastUsedAt - b.lastUsedAt);
      const toRemoveCount = entriesWithMeta.length - MAX_CACHE_ENTRIES;
      const toRemove = entriesWithMeta.slice(0, toRemoveCount);
      const toKeep = entriesWithMeta.slice(toRemoveCount);

      for (const item of toRemove) {
        await idbDelete(`thumb_${item.key}`);
        memoryCache.delete(item.key);
        prunedCount++;
      }

      for (const item of toKeep) {
        remainingKeys.push(item.key);
      }
    } else {
      for (const item of entriesWithMeta) {
        remainingKeys.push(item.key);
      }
    }

    await idbSet(IDB_KEY_THUMBNAIL_INDEX, remainingKeys);
  } catch (err) {
    console.warn('Thumbnail auto-prune error:', err);
  } finally {
    isCleaningUp = false;
  }

  return prunedCount;
}

/**
 * Manual wipe of all thumbnail cache.
 */
export async function clearAllThumbnailCache(): Promise<void> {
  try {
    const rawIndex = (await idbGet<string[]>(IDB_KEY_THUMBNAIL_INDEX)) || [];
    for (const key of rawIndex) {
      await idbDelete(`thumb_${key}`);
    }
    await idbDelete(IDB_KEY_THUMBNAIL_INDEX);
    memoryCache.clear();
  } catch (e) {
    console.warn('Failed to clear thumbnail cache:', e);
  }
}

/**
 * Returns cache statistics for user UI.
 */
export async function getThumbnailCacheStats(): Promise<{ count: number; totalEstimatedKb: number }> {
  try {
    const rawIndex = (await idbGet<string[]>(IDB_KEY_THUMBNAIL_INDEX)) || [];
    let totalBytes = 0;
    for (const key of rawIndex.slice(0, 50)) {
      const entry = await idbGet<CachedThumbnailEntry>(`thumb_${key}`);
      if (entry?.sizeBytes) {
        totalBytes += entry.sizeBytes;
      }
    }
    // Project average if more than 50
    const avg = rawIndex.length > 0 ? totalBytes / Math.min(rawIndex.length, 50) : 0;
    const estTotalBytes = avg * rawIndex.length;

    return {
      count: rawIndex.length,
      totalEstimatedKb: Math.round(estTotalBytes / 1024),
    };
  } catch {
    return { count: memoryCache.size, totalEstimatedKb: 0 };
  }
}
