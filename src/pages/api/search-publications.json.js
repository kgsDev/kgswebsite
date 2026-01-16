// src/pages/api/search-publications.json.js
// API endpoint to search publications from the external database

export const prerender = false;

export async function GET({ request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  
  if (!query || query.length < 2) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Build the Directus publications API URL
    const baseUrl = "https://kgs.uky.edu/dpub/items/publications";
    const fields = [
      "id",
      "status",
      "title",
      "publication_year",
      "series",
      "issue",
      "url_webpage",
      "url_download",
      "doi",
      "pages",
      "comments",
      "author_id.authors_id.last_name",
      "author_id.authors_id.first_name",
      "author_id.authors_id.middle_name",
      "type.name",
      "source.sources_code"
    ];

    // Create filters for title and keyword search
    // Search in title, comments, and normalize spaces/hyphens
    const normalizedSearch = query.replace(/\s+/g, '-');
    const spacedSearch = query.replace(/-/g, ' ');
    
    const filters = [
      `filter[_or][0][title][_icontains]=${encodeURIComponent(query)}`,
      `filter[_or][1][title][_icontains]=${encodeURIComponent(normalizedSearch)}`,
      `filter[_or][2][title][_icontains]=${encodeURIComponent(spacedSearch)}`,
      `filter[_or][3][comments][_icontains]=${encodeURIComponent(query)}`,
      `filter[_or][4][comments][_icontains]=${encodeURIComponent(normalizedSearch)}`,
      `filter[_or][5][comments][_icontains]=${encodeURIComponent(spacedSearch)}`
    ];

    const apiUrl = `${baseUrl}?limit=50&fields[]=${fields.join("&fields[]=")}&${filters.join("&")}`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Publications API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data into a format suitable for search results
    const results = (data.data || []).map(item => {
      // Format authors
      const authors = (item.author_id || [])
        .map(author => {
          const a = author.authors_id;
          return `${a.last_name}, ${a.first_name}${a.middle_name ? ' ' + a.middle_name : ''}`;
        })
        .join('; ');

      // Format type
      const type = item.type?.name || 'Publication';

      // Format sources
      const sources = (item.source || [])
        .map(s => s.sources_code)
        .join(', ');

      // Create excerpt from comments or title
      let excerpt = '';
      if (item.comments) {
        excerpt = item.comments.substring(0, 200);
        if (item.comments.length > 200) excerpt += '...';
      } else {
        excerpt = `${authors} (${item.publication_year || 'n/a'})`;
      }

      return {
        id: item.id,
        title: item.title,
        url: `https://kgs.uky.edu/kygeode/services/pubs/pub.html?id=${item.id}`,
        type: 'publication',
        category: 'Publications',
        authors: authors,
        year: item.publication_year,
        pubType: type,
        series: item.series,
        issue: item.issue,
        pages: item.pages,
        sources: sources,
        url_download: item.url_download,
        url_webpage: item.url_webpage,
        doi: item.doi,
        excerpt: excerpt,
        content: `${item.title} ${authors} ${item.comments || ''}`
      };
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('Publications search error:', error);
    return new Response(JSON.stringify({ error: 'Failed to search publications' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}