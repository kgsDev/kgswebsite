// src/lib/podcast_config.js
// Shared podcast settings. Plain ESM with no imports, so the Astro page, the search index,
// and scripts/podcast-sync.mjs (run by Node outside Astro) can all use it.

// Show logo, used for any episode without its own art (or whose art fails to load).
export const PODCAST_DEFAULT_IMAGE =
  'https://pbcdn1.podbean.com/imglogo/image-logo/13580196/Podcast_Logo_Avenir_RiverGreen_withUK.jpg';
