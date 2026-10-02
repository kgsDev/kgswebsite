// src/lib/api_podcast.js
// API functions for The Big Blue Rock Pod episode directory.
// Episodes are loaded into Directus monthly by scripts/podcast-sync.mjs.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PUBLIC_DIRECTUS_URL,
  headers: { 'Content-Type': 'application/json' },
});

async function apiRequest(path, params) {
  try {
    const response = await api.get(path, { params });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    return [];
  }
}

const EPISODE_FIELDS = [
  'id', 'title', 'episode_number', 'season', 'pub_date', 'duration',
  'summary', 'description', 'audio_url', 'episode_url', 'image_url',
  'topics.podcast_topics_id.name', 'topics.podcast_topics_id.slug',
].join(',');

// Decode %-escapes without throwing on malformed input, and lowercase so "%E2%80%93" and
// "%e2%80%93" (and the decoded "–") all compare equal.
function safeDecode(s) {
  try { return decodeURIComponent(s).toLowerCase(); } catch { return String(s).toLowerCase(); }
}

/**
 * URL slug for an episode's page on our site: the episode number (/podcast/58).
 * Episodes without a number (trailers, bonus episodes) use their Directus id (/podcast/id-142),
 * prefixed so it can never collide with an episode number.
 */
export function episodeSlug(ep) {
  return ep.episode_number != null ? String(ep.episode_number) : `id-${ep.id}`;
}

/**
 * The episode's slug on Podbean (kgsnews.podbean.com/e/<this>/), decoded. Only used to
 * redirect older title-style links (/podcast/earthquakes) to the numbered URL.
 */
export function podbeanSlug(ep) {
  const match = (ep.episode_url || '').match(/\/e\/([^/?#]+)/);
  return match ? safeDecode(match[1]) : null;
}

// Junction rows come back as [{ podcast_topics_id: { name, slug } }]; flatten them and add the slug.
function normalize(ep) {
  return {
    ...ep,
    slug: episodeSlug(ep),
    topics: (ep.topics || []).map(t => t.podcast_topics_id).filter(Boolean),
  };
}

/**
 * Published episodes, newest first, with topics flattened to [{ name, slug }].
 */
export async function fetchAllEpisodes() {
  const episodes = await apiRequest('/items/podcast_episodes', {
    fields: EPISODE_FIELDS,
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    sort: '-pub_date',
    limit: -1,
  });
  return episodes.map(normalize);
}

/**
 * One published episode for a /podcast/<slug> URL, or null. Accepts:
 *   "58"            → episode number 58 (newest, if a number were ever reused)
 *   "id-142"        → Directus id 142 (episodes without a number)
 *   anything else   → a Podbean title slug, matched against each episode's Podbean URL.
 * The caller compares the result's .slug to the requested one and redirects if they differ.
 */
export async function fetchEpisodeBySlug(slug) {
  const published = { status: { _eq: 'published' } };
  let filter;
  if (/^\d+$/.test(slug)) filter = { episode_number: { _eq: Number(slug) } };
  else if (/^id-\d+$/.test(slug)) filter = { id: { _eq: Number(slug.slice(3)) } };

  if (filter) {
    const rows = await apiRequest('/items/podcast_episodes', {
      fields: EPISODE_FIELDS,
      filter: JSON.stringify({ _and: [published, filter] }),
      sort: '-pub_date',
      limit: 1,
    });
    return rows.length ? normalize(rows[0]) : null;
  }

  // Legacy title slug. Podbean URLs can hold %-encoded characters (e.g. an en dash as
  // %e2%80%93), so compare decoded values in JS rather than string-matching in Directus.
  const wanted = safeDecode(slug);
  const all = await fetchAllEpisodes();
  return all.find(e => podbeanSlug(e) === wanted) || null;
}

export function formatEpisodeDate(d) {
  return d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
    : '';
}

// Podbean durations arrive as seconds ("2537") or occasionally as "hh:mm:ss" text.
export function formatDuration(value) {
  if (value == null || value === '') return '';
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds)) return value || '';
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export async function fetchAllTopics() {
  return apiRequest('/items/podcast_topics', {
    fields: 'id,name,slug',
    sort: 'sort,name',
    limit: -1,
  });
}

export function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
