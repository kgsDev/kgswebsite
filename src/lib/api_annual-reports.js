// src/lib/api_annual-reports.js
// API functions for fetching annual reports from the publications database

const DIRECTUS_URL = 'https://kgs.uky.edu/dpub';

export async function fetchAllAnnualReports(request) {
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
    'filter[_and][0][status][_eq]': 'published',
    'filter[_and][1][comments][_icontains]': 'kgs annual report'
    });

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
      throw new Error(`Failed to fetch annual reports: ${response.statusText}`);
    }

    const result = await response.json();
    const annualReports = result.data || [];
    
    // Sort by publication year descending, then by title
    return annualReports.sort((a, b) => {
      if (b.publication_year !== a.publication_year) {
        return b.publication_year - a.publication_year;
      }
      return a.title.localeCompare(b.title);
    });
  } catch (error) {
    console.error('Error fetching annual reports:', error);
    return [];
  }
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

export function getPublicationYears(annualReports) {
  const years = new Set();
  annualReports.forEach(report => {
    if (report.publication_year) {
      years.add(report.publication_year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function getCoverImageUrl(coverId) {
  if (!coverId) return null;
  return `${DIRECTUS_URL}/assets/${coverId}?width=400&fit=contain`;
}