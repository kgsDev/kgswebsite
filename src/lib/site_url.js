// src/lib/site_url.js
// The public origin of the site (e.g. https://kygs.uky.edu), for anything that leaves the site:
// canonical/og:url tags, share links, absolute image URLs.
//
// Don't use Astro.url.origin for this: behind nginx, the Node server sees the proxy's request
// to localhost, so Astro.url is http://localhost:<port>/...
//
// Order of preference:
//   1. PUBLIC_SITE_URL from .env (set per environment; read at build time, so rebuild after changing)
//   2. The Host / X-Forwarded-Host header nginx passes along, if it isn't a localhost address
//   3. The production site

const PRODUCTION_ORIGIN = 'https://kygs.uky.edu';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i;

export function getSiteUrl(astro) {
  const configured = import.meta.env.PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const headers = astro?.request?.headers;
  const host = headers?.get('x-forwarded-host')?.split(',')[0].trim() || headers?.get('host');
  if (host && !LOCAL_HOST.test(host)) {
    const proto = headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https';
    return `${proto}://${host}`;
  }

  return PRODUCTION_ORIGIN;
}

// Turn a path ("/podcast/58") or an internal absolute URL ("http://localhost:4321/podcast/58")
// into a public absolute URL. External absolute URLs (other hosts) pass through unchanged.
export function toPublicUrl(urlOrPath, astro) {
  const site = getSiteUrl(astro);
  if (!urlOrPath) return site;
  if (!/^https?:\/\//i.test(urlOrPath)) {
    return `${site}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
  }
  const u = new URL(urlOrPath);
  return LOCAL_HOST.test(u.host) ? `${site}${u.pathname}${u.search}${u.hash}` : urlOrPath;
}
