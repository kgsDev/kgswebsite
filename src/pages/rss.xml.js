export const prerender = false;

import { fetchRecentNews } from '../lib/api_news.js';

const SITE_URL = 'https://kygs.uky.edu';
const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL;

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const { articles } = await fetchRecentNews(50, 1);

  const items = articles.map(article => {
    const pubDate = new Date(article.publication_date).toUTCString();
    const link = `${SITE_URL}/news/${article.slug}`;
    const image = article.main_image
      ? `${DIRECTUS_URL}assets/${article.main_image}?width=600&quality=80&format=auto`
      : null;

    return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(article.excerpt || '')}</description>
      ${image ? `<enclosure url="${image}" type="image/jpeg" length="0" />` : ''}
      ${article.category ? `<category>${escapeXml(article.category)}</category>` : ''}
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kentucky Geological Survey News</title>
    <link>${SITE_URL}/news</link>
    <description>Latest news, press releases, and announcements from the Kentucky Geological Survey.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}