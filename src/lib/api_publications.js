// src/lib/api_publications.js
const DIRECTUS_URL = 'https://kgs.uky.edu/dpub';

/**
 * Fetch publications filtered by a collection field
 * @param {Object} options - Configuration options
 * @param {string} options.collectionField - Field name to filter by (e.g., 'Coal_Browsing_Collection')
 * @param {string} options.collectionValue - Value to filter for (default: 'true')
 * @param {Request} options.request - Astro request object
 * @returns {Promise<Array>} - Array of publications
 */
export async function fetchPublications({ collectionField, collectionValue = 'true', request }) {
  try {
    const fields = [
      'id',
      'status',
      'title',
      'cover',
      'publication_year',
      'series',
      'issue',
      'url_webpage',
      'url_download',
      'doi',
      'pages',
      'comments',
      'author_id.authors_id.last_name',
      'author_id.authors_id.first_name',
      'author_id.authors_id.middle_name',
      'type.name',
      'source.sources_code',
      'area_ids.area_id.id',
      'area_ids.area_id.name',
      'area_ids.area_id.areatype'
    ];

    const params = new URLSearchParams({
      'limit': '-1',
      'meta': '*',
      [`filter[_and][0][[${collectionField}][_eq]`]: collectionValue,
    });

    // Add fields as multiple parameters
    fields.forEach(field => {
      params.append('fields[]', field);
    });

    const url = `${DIRECTUS_URL}/items/publications?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch publications: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Filter out superseded publications
    const activePublications = result.data.filter(publication => {
      const comments = (publication.comments || '').toLowerCase();
      return !comments.includes('superseded by');
    });
    
    // Sort by publication year descending, then by title
    return activePublications.sort((a, b) => {
      if (b.publication_year !== a.publication_year) {
        return b.publication_year - a.publication_year;
      }
      return a.title.localeCompare(b.title);
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    return [];
  }
}

export function getPublicationCategories(publications, categorizer) {
  const categories = new Set();
  
  publications.forEach(publication => {
    const category = categorizer(publication);
    if (category) {
      categories.add(category);
    }
  });
  
  return Array.from(categories).sort();
}

export function getPublicationYears(publications) {
  const years = new Set();
  publications.forEach(pub => {
    if (pub.publication_year) {
      years.add(pub.publication_year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function formatAuthors(authors) {
  if (!authors || authors.length === 0) return '';
  
  return authors.map(author => {
    const { first_name, middle_name, last_name } = author.authors_id;
    if (middle_name) {
      return `${first_name} ${middle_name} ${last_name}`;
    }
    return `${first_name} ${last_name}`;
  }).join(', ');
}

export function getCoverImageUrl(coverId) {
  if (!coverId) return null;
  return `${DIRECTUS_URL}/assets/${coverId}?width=400&fit=contain`;
}