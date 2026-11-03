// src/lib/ics.js — iCalendar + Google Calendar helpers for KGS events
import { getEventTypes } from './eventTypes';

export const SITE = (import.meta.env.PUBLIC_SITE_URL || 'https://kygs.uky.edu').replace(/\/$/, '');

const pad = (n) => String(n).padStart(2, '0');

// Parse 'YYYY-MM-DD' (or the date part of a datetime) with no timezone shifting
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
}
const ymd = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
const nextDay = (dt) => new Date(dt.getTime() + 86_400_000);

/** All-day dates in calendar format; end is EXCLUSIVE (day after the last day). */
export function eventDates(ev) {
  const start = parseDate(ev.event_date) ?? parseDate(ev.event_end);
  if (!start) return null;
  let end = parseDate(ev.event_end) ?? start;
  if (end < start) end = start;
  return { start: ymd(start), endExclusive: ymd(nextDay(end)) };
}

export const eventUrl = (ev) => `${SITE}/news/${ev.slug}`;

const plainText = (s = '') => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function eventDetails(ev) {
  return [
    plainText(ev.excerpt),
    ev.event_website ? `Event website: ${ev.event_website}` : '',
    `More info: ${eventUrl(ev)}`,
  ].filter(Boolean).join('\n\n');
}

export function googleCalendarUrl(ev) {
  const d = eventDates(ev);
  if (!d) return null;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${d.start}/${d.endExclusive}`,
    details: eventDetails(ev),
    location: ev.event_location || '',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

// --- iCalendar (RFC 5545) ---
const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Fold lines at 75 octets; continuation lines start with a space (UTF-8 safe)
const enc = new TextEncoder();
function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const max = out.length === 0 ? 75 : 74;
    if (bytes + b > max) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const utcStamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function vevent(ev, dtstamp) {
  const d = eventDates(ev);
  if (!d) return [];
  const lines = [
    'BEGIN:VEVENT',
    `UID:kgs-event-${ev.id}@kygs.uky.edu`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${d.start}`,
    `DTEND;VALUE=DATE:${d.endExclusive}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(eventDetails(ev))}`,
    `URL:${eventUrl(ev)}`,
  ];
  if (ev.event_location) lines.push(`LOCATION:${esc(ev.event_location)}`);
  const types = getEventTypes(ev);
  if (types.length) lines.push(`CATEGORIES:${types.map((t) => esc(t.label)).join(',')}`);
  lines.push('TRANSP:TRANSPARENT', 'END:VEVENT');
  return lines;
}

export function buildCalendar(events, { feed = false } = {}) {
  const dtstamp = utcStamp();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kentucky Geological Survey//KGS Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (feed) {
    lines.push(
      'X-WR-CALNAME:KGS in the Community',
      'X-WR-CALDESC:Talks\\, outreach\\, and events from the Kentucky Geological Survey',
      'X-WR-TIMEZONE:America/New_York',
      'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
      'X-PUBLISHED-TTL:PT6H',
    );
  }
  for (const ev of events) lines.push(...vevent(ev, dtstamp));
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}