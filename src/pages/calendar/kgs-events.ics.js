export const prerender = false;
import { fetchCalendarEvents } from '../../lib/api_news';
import { buildCalendar } from '../../lib/ics';

export async function GET() {
  try {
    const events = await fetchCalendarEvents(6);
    return new Response(buildCalendar(events, { feed: true }), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="kgs-events.ics"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Calendar feed error:', err.message);
    return new Response('Calendar temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '3600' },
    });
  }
}