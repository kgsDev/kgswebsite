// src/lib/api_factsheets.js
// API functions for fetching fact sheets from the publications database

const DIRECTUS_URL = 'https://kgs.uky.edu/dpub';

export async function fetchAllFactsheets(request) {
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
      'filter[_and][0][[type]][_eq]': 'ft'
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
      throw new Error(`Failed to fetch factsheets: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Filter out superseded factsheets
    const activeFactsheets = result.data.filter(factsheet => {
      const comments = (factsheet.comments || '').toLowerCase();
      return !comments.includes('superseded by');
    });
    
    // Sort by publication year descending, then by title
    return activeFactsheets.sort((a, b) => {
      if (b.publication_year !== a.publication_year) {
        return b.publication_year - a.publication_year;
      }
      return a.title.localeCompare(b.title);
    });
  } catch (error) {
    console.error('Error fetching factsheets:', error);
    return [];
  }
}

export function getFactsheetCategories(factsheets) {
  const categories = new Set();
  
  factsheets.forEach(factsheet => {
    const category = categorizeFactsheet(factsheet);
    if (category) {
      categories.add(category);
    }
  });
  
  return Array.from(categories).sort();
}

export function categorizeFactsheet(factsheet) {
  const title = factsheet.title.toLowerCase();
  const comments = (factsheet.comments || '').toLowerCase();
  const searchText = `${title} ${comments}`;
  
  // Categorize based on keywords in title and comments
  if (searchText.includes('water') || searchText.includes('groundwater') || searchText.includes('hydro')) {
    return 'Water Resources';
  }
  if (searchText.includes('earthquake') || searchText.includes('seismic') || searchText.includes('landslide') || searchText.includes('sinkhole') || searchText.includes('karst')) {
    return 'Geologic Hazards';
  }
  if (searchText.includes('carbon') || searchText.includes('co2') || searchText.includes('storage')) {
    return 'Carbon Storage';
  }
  if (searchText.includes('coal') || searchText.includes('oil') || searchText.includes('gas') || searchText.includes('methane') || searchText.includes('fracking') || searchText.includes('fracturing') || searchText.includes('energy') || searchText.includes('orphaned')) {
    return 'Energy Resources';
  }
  if (searchText.includes('mineral') || searchText.includes('limestone')) {
    return 'Minerals';
  }
  if (searchText.includes('fossil') || searchText.includes('trilobite') || searchText.includes('meteorite')) {
    return 'Earth Sciences';
  }
  if (searchText.includes('pipeline') || searchText.includes('lidar') || searchText.includes('earl') || searchText.includes('repository')) {
    return 'Research Infrastructure';
  }
  
  return 'General';
}

export function getCategoryColor(category) {
  const colors = {
    'Water Resources': 'blue',
    'Geologic Hazards': 'red',
    'Carbon Storage': 'green',
    'Energy Resources': 'yellow',
    'Minerals': 'purple',
    'Earth Sciences': 'amber',
    'Research Infrastructure': 'cyan',
    'General': 'gray'
  };
  
  return colors[category] || 'gray';
}

export function getCategoryIcon(category) {
  const icons = {
    'Water Resources': 'fa-water',
    'Geologic Hazards': 'fa-house-damage',
    'Carbon Storage': 'fa-cloud',
    'Energy Resources': 'fa-bolt',
    'Minerals': 'fa-gem',
    'Earth Sciences': 'fa-mountain',
    'Research Infrastructure': 'fa-database',
    'General': 'fa-file-alt'
  };
  
  return icons[category] || 'fa-file-alt';
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

export function getPublicationYears(factsheets) {
  const years = new Set();
  factsheets.forEach(fs => {
    if (fs.publication_year) {
      years.add(fs.publication_year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function getCoverImageUrl(coverId) {
  if (!coverId) return null;
  return `${DIRECTUS_URL}/assets/${coverId}?width=400&fit=contain`;
}