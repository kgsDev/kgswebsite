// src/lib/api_facebook.ts
// Server-side fetch of recent Facebook Page posts via the Graph API.
// Replaces the Page Plugin iframe so the display never shows a blank feed.

const GRAPH_VERSION = import.meta.env.FB_GRAPH_VERSION || 'v24.0';
const PAGE_ID = import.meta.env.FB_PAGE_ID;       // numeric Page ID
const PAGE_TOKEN = import.meta.env.FB_PAGE_TOKEN; // long-lived Page access token
const CACHE_TTL_MS = 10 * 60 * 1000;              // refetch at most every 10 minutes

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
}

export interface FacebookFeedResult {
  posts: FacebookPost[];
  stale: boolean;   // true when serving cached posts after a failed refresh
  error?: string;
}

// Module-level cache: lives as long as the Node server process.
let cache: { posts: FacebookPost[]; fetchedAt: number } | null = null;

function fromCache(limit: number, error?: string): FacebookFeedResult {
  return {
    posts: cache ? cache.posts.slice(0, limit) : [],
    stale: cache !== null,
    error,
  };
}

export async function fetchFacebookPosts(limit = 4): Promise<FacebookFeedResult> {
  // Fresh cache: no network call.
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { posts: cache.posts.slice(0, limit), stale: false };
  }

  if (!PAGE_ID || !PAGE_TOKEN) {
    return fromCache(limit, 'FB_PAGE_ID or FB_PAGE_TOKEN is not set');
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/posts`);
  url.searchParams.set('fields', 'message,created_time,full_picture,permalink_url');
  // Ask for a few extra in case some posts have no text or image.
  url.searchParams.set('limit', String(Math.max(limit * 2, 10)));

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PAGE_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json();

    if (!res.ok || body.error) {
      throw new Error(body.error?.message || `HTTP ${res.status}`);
    }

    const posts: FacebookPost[] = (body.data ?? []).filter(
      (p: FacebookPost) => p.message || p.full_picture
    );

    cache = { posts, fetchedAt: Date.now() };
    return { posts: posts.slice(0, limit), stale: false };
  } catch (err) {
    console.error('[facebook] Graph API fetch failed:', err);
    // Serve the last good posts rather than an empty column.
    return fromCache(limit, err instanceof Error ? err.message : String(err));
  }
}