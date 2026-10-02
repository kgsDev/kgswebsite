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

/**
 * URL slug for an episode's page on our site, taken from its Podbean URL so the two match:
 *   https://kgsnews.podbean.com/e/earthquakes/  →  "earthquakes"  →  /podcast/earthquakes
 * Falls back to the Directus id if there's no Podbean URL.
 */
export function episodeSlug(ep) {
  const match = (ep.episode_url || '').match(/\/e\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : String(ep.id);
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
 * One published episode by its page slug (see episodeSlug), or null.
 */
export async function fetchEpisodeBySlug(slug) {
  const filter = /^\d+$/.test(slug)
    ? { id: { _eq: Number(slug) } }
    // _contains narrows the query; the exact slug check below rules out near-misses
    // like "earthquakes" matching "/e/earthquakes-part-2/".
    : { episode_url: { _contains: `/e/${slug}` } };

  const rows = await apiRequest('/items/podcast_episodes', {
    fields: EPISODE_FIELDS,
    filter: JSON.stringify({ _and: [{ status: { _eq: 'published' } }, filter] }),
    limit: 10,
  });
  const ep = rows.map(normalize).find(e => e.slug === slug);
  return ep || null;
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
