// Syncs The Big Blue Rock Pod's Podbean RSS feed into Directus.
//
//  - New episodes are created as "published" with topics auto-suggested from each topic's keywords.
//  - Existing episodes (matched on the feed's <guid>) get their feed-owned fields refreshed.
//    Their status and topics are never touched, so editors' changes stick.
//  - Episodes that disappear from the feed are left alone.
//
// Usage (from the Astro project root):
//   node scripts/podcast-sync.mjs                      # normal run
//   node scripts/podcast-sync.mjs --dry-run            # report what would change, write nothing
//   node scripts/podcast-sync.mjs --feed-file=feed.xml # use a saved copy of the feed
//
// Reads from .env: PUBLIC_DIRECTUS_URL, PODCAST_FEED_URL, and
//   DIRECTUS_PODCAST_TOKEN (a token limited to the podcast collections — falls back to DIRECTUS_ADMIN_TOKEN)
// Requires the fast-xml-parser package (npm install fast-xml-parser).

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import dotenv from 'dotenv';

// Fields the feed owns. The sync overwrites these; everything else belongs to editors.
export const FEED_FIELDS = [
  'title', 'episode_number', 'season', 'pub_date', 'duration',
  'summary', 'description', 'audio_url', 'episode_url', 'image_url',
];

// ---- feed parsing -----------------------------------------------------------

// A tag can come back as a string or, if it has attributes, as { '#text': ..., '@_attr': ... }.
const text = v => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v)).trim();
const int = v => { const n = parseInt(text(v), 10); return Number.isFinite(n) ? n : null; };

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };
export function htmlToText(html) {
  return html
    .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(plain, max = 300) {
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:]+$/, '') + '…';
}

export function parseFeed(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,        // keep attributes like <enclosure url="..."> as '@_url'
    parseTagValue: false,           // keep every value a string; we convert numbers ourselves
    isArray: name => name === 'item', // one episode still comes back as an array
  });
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel) throw new Error('Not an RSS feed: no <rss><channel> found');

  return (channel.item ?? []).map(item => {
    const description = text(item['content:encoded']) || text(item.description);
    const plain = htmlToText(description);
    const guid = text(item.guid) || text(item.link) || item.enclosure?.['@_url'];
    if (!guid) throw new Error(`Episode "${text(item.title)}" has no guid, link, or audio URL to match on`);
    const pub = new Date(text(item.pubDate));

    return {
      guid,
      title: text(item.title),
      episode_number: int(item['itunes:episode']),
      season: int(item['itunes:season']),
      pub_date: isNaN(pub) ? null : pub.toISOString(),
      duration: text(item['itunes:duration']) || null,
      summary: excerpt(plain),
      description,
      audio_url: item.enclosure?.['@_url'] ?? null,
      episode_url: text(item.link) || null,
      image_url: item['itunes:image']?.['@_href'] ?? null,
      _plain: plain, // used for topic matching only, not saved
    };
  });
}

// ---- topic suggestion -------------------------------------------------------

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// \b only on the left: "fossil" matches "fossils" and "paleontolog" matches "paleontology",
// but "gas" won't match "Vegas".
export function suggestTopics(episode, topics) {
  const haystack = `${episode.title} ${episode._plain}`;
  return topics
    .filter(t => (t.keywords ?? '')
      .split(/[,\n]/).map(k => k.trim()).filter(Boolean)
      .some(k => new RegExp(`\\b${escapeRegex(k)}`, 'i').test(haystack)))
    .map(t => t.id);
}

// ---- change detection -------------------------------------------------------

const norm = (field, v) => {
  if (v == null || v === '') return '';
  if (field === 'pub_date') return String(new Date(v).getTime());
  return String(v);
};
export const changedFields = (existing, episode) =>
  FEED_FIELDS.filter(f => norm(f, existing[f]) !== norm(f, episode[f]));

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));

// ---- Directus ---------------------------------------------------------------

function directusClient(baseUrl, token) {
  const base = baseUrl.replace(/\/$/, '');
  return async function api(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : (await res.json()).data;
  };
}

// ---- main -------------------------------------------------------------------

export async function sync({ directusUrl, token, feedUrl, feedFile, dryRun = false, log = console.log }) {
  const xml = feedFile
    ? await readFile(feedFile, 'utf8')
    : await fetch(feedUrl).then(r => { if (!r.ok) throw new Error(`Feed fetch → ${r.status}`); return r.text(); });

  const episodes = parseFeed(xml);
  const api = directusClient(directusUrl, token);

  const topics = await api('GET', '/items/podcast_topics?fields=id,name,keywords&limit=-1');
  const existing = await api('GET', `/items/podcast_episodes?fields=id,guid,${FEED_FIELDS.join(',')}&limit=-1`);
  const byGuid = new Map(existing.map(e => [e.guid, e]));
  const topicName = new Map(topics.map(t => [t.id, t.name]));

  const counts = { created: 0, updated: 0, unchanged: 0 };

  for (const ep of episodes) {
    const current = byGuid.get(ep.guid);

    if (!current) {
      const topicIds = suggestTopics(ep, topics);
      const names = topicIds.map(id => topicName.get(id)).join(', ') || 'no topics matched';
      log(`${dryRun ? 'would create' : 'create'}  ${ep.title}  [${names}]`);
      if (!dryRun) {
        await api('POST', '/items/podcast_episodes', {
          ...pick(ep, FEED_FIELDS),
          guid: ep.guid,
          status: 'published',
          topics: topicIds.map(id => ({ podcast_topics_id: id })),
        });
      }
      counts.created++;
      continue;
    }

    const changed = changedFields(current, ep);
    if (!changed.length) { counts.unchanged++; continue; }

    log(`${dryRun ? 'would update' : 'update'}  ${ep.title}  (${changed.join(', ')})`);
    if (!dryRun) await api('PATCH', `/items/podcast_episodes/${current.id}`, pick(ep, changed));
    counts.updated++;
  }

  log(`\n${episodes.length} in feed — ${counts.created} new, ${counts.updated} updated, ${counts.unchanged} unchanged${dryRun ? ' (dry run, nothing written)' : ''}`);
  return counts;
}

// Run only when executed directly, not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config();
  const { PUBLIC_DIRECTUS_URL, PODCAST_FEED_URL } = process.env;
  const token = process.env.DIRECTUS_PODCAST_TOKEN || process.env.DIRECTUS_ADMIN_TOKEN;
  const feedFile = process.argv.find(a => a.startsWith('--feed-file='))?.split('=')[1];
  const missing = [
    !PUBLIC_DIRECTUS_URL && 'PUBLIC_DIRECTUS_URL',
    !token && 'DIRECTUS_PODCAST_TOKEN (or DIRECTUS_ADMIN_TOKEN)',
    !feedFile && !PODCAST_FEED_URL && 'PODCAST_FEED_URL',
  ].filter(Boolean);
  if (missing.length) { console.error(`Missing in .env: ${missing.join(', ')}`); process.exit(1); }

  console.log(`Podcast sync — ${new Date().toISOString()}`);
  sync({
    directusUrl: PUBLIC_DIRECTUS_URL, token,
    feedUrl: PODCAST_FEED_URL, feedFile,
    dryRun: process.argv.includes('--dry-run'),
  }).catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
