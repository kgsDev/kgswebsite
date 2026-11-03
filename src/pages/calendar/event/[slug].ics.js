export const prerender = false;
import { fetchNewsBySlug } from '../../../lib/api_news';
import { buildCalendar, eventDates } from '../../../lib/ics';

export async function GET({ params }) {
  const ev = await fetchNewsBySlug(params.slug);
  if (!ev || ev.category !== 'event' || !eventDates(ev)) {
    return new Response('Event not found', { status: 404 });
  }
  const filename = params.slug.replace(/[^a-z0-9-]/gi, '') || 'kgs-event';
  return new Response(buildCalendar([ev]), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}