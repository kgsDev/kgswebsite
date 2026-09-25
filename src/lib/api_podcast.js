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

/**
 * Published episodes, newest first, with topics flattened to [{ name, slug }].
 */
export async function fetchAllEpisodes() {
  const episodes = await apiRequest('/items/podcast_episodes', {
    fields: [
      'id', 'title', 'episode_number', 'season', 'pub_date', 'duration',
      'summary', 'description', 'audio_url', 'episode_url', 'image_url',
      'topics.podcast_topics_id.name', 'topics.podcast_topics_id.slug',
    ].join(','),
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    sort: '-pub_date',
    limit: -1,
  });

  // Junction rows come back as [{ podcast_topics_id: { name, slug } }]
  return episodes.map(ep => ({
    ...ep,
    topics: (ep.topics || []).map(t => t.podcast_topics_id).filter(Boolean),
  }));
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
