// The soundfont the band plays from: GeneralUser GS (S. Christian
// Collins; licence in public/soundfonts/), trimmed to what a song can
// play and compressed by scripts/build-soundfont.ts. Vite serves it under
// a name with its content's hash, so this browser keeps it in Cache
// Storage until it changes.

import SOUNDFONT_URL from './soundfont/GeneralUser-GS-city-pop.sf3?url';

const CACHE = 'endless-city-pop.soundfonts';

/** The soundfont's bytes: from this browser's cache if they're there, else downloaded (and cached). */
export async function loadSoundfont(): Promise<ArrayBuffer> {
  const url = new URL(SOUNDFONT_URL, document.baseURI).href;
  const cache = await openCache();
  const cached = await cache?.match(url);
  if (cached) return cached.arrayBuffer();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the soundfont: ${response.status} ${response.statusText}`);
  // Cached on the side, in place of any older build: a failure there
  // (storage full) still plays.
  if (cache) void replaceIn(cache, url, response.clone());
  return response.arrayBuffer();
}

async function replaceIn(cache: Cache, url: string, response: Response): Promise<void> {
  try {
    for (const old of await cache.keys()) if (old.url !== url) await cache.delete(old);
    await cache.put(url, response);
  } catch {
    // Not cached: downloaded again next time.
  }
}

// Cache Storage, where the browser has it (not over plain http, nor in
// some private windows).
async function openCache(): Promise<Cache | undefined> {
  try {
    return await caches.open(CACHE);
  } catch {
    return undefined;
  }
}
