// src/js/pagefind-search.js
// This file handles the search functionality for the site, combining Pagefind results 
// with custom indexed content and publications from the external database

let searchIndex = [];
let pagefind = null;
let pagefindLoaded = false;
const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL;

// Load Pagefind (only works after build in production)
async function loadPagefind() {
  try {
    if (typeof window !== 'undefined') {
      // Use a dynamic import with string concatenation to prevent Vite from analyzing it
      const pagefindPath = '/pagefind/' + 'pagefind.js';
      
      // Check if pagefind exists first
      const response = await fetch(pagefindPath, { method: 'HEAD' }).catch(() => ({ ok: false }));
      
      if (response.ok) {
        // Dynamic import using Function constructor to bypass Vite static analysis
        pagefind = await new Function('return import("' + pagefindPath + '")')();
        await pagefind.options({
          baseUrl: '/'
        });
        pagefindLoaded = true;
        console.log('Pagefind loaded successfully');
      } else {
        console.log('Pagefind not available (run build first)');
      }
    }
  } catch (error) {
    console.log('Pagefind not available:', error.message);
    pagefindLoaded = false;
  }
}

// Load custom search index
async function loadSearchIndex() {
  try {
    const now = new Date();
    const version = now.getFullYear() + 
                  String(now.getMonth() + 1).padStart(2, '0') + 
                  String(now.getDate()).padStart(2, '0') +
                  String(now.getHours()).padStart(2, '0');
    
    const response = await fetch(`/js/search-index.json?v=${version}`);
    searchIndex = await response.json();
  } catch (error) {
    console.error('Failed to load search index:', error);
  }
}

// Search custom content
function searchContent(query, category = '') {
  const lowerQuery = query.toLowerCase();
  
  return searchIndex.filter(item => {
    // Add null checks for content and title
    const itemContent = item.content || '';
    const itemTitle = item.title || '';
    
    const matchesQuery = 
      itemContent.toLowerCase().includes(lowerQuery) ||
      itemTitle.toLowerCase().includes(lowerQuery);
    
    const matchesCategory = !category || item.category === category;
    
    return matchesQuery && matchesCategory;
  });
}

// Search Pagefind static pages
async function searchPagefind(query) {
  if (!pagefind || !pagefindLoaded) {
    return [];
  }
  
  try {
    const search = await pagefind.search(query);
    const results = await Promise.all(
      search.results.map(async (result) => {
        const data = await result.data();
        
        // Use the custom category metadata if available, otherwise default to 'Information'
        const category = data.meta?.category || 'Information';
        
        return {
          title: data.meta?.title || 'Untitled',
          url: data.url,
          content: data.content || data.excerpt || '',
          type: 'page',
          category: category,
          excerpt: data.excerpt || ''
        };
      })
    );
    return results;
  } catch (error) {
    console.error('Pagefind search error:', error);
    return [];
  }
}

// Search publications from external database
async function searchPublications(query) {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(`/api/search-publications.json?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      console.error('Publications search failed:', response.status);
      return [];
    }

    const results = await response.json();
    return results;
  } catch (error) {
    console.error('Publications search error:', error);
    return [];
  }
}

// Get icon for content type
function getIcon(type) {
  const icons = {
    staff: 'fa-user',
    research: 'fa-flask',
    lab: 'fa-microscope',
    location: 'fa-location-dot',
    organization: 'fa-building',
    monitoring: 'fa-chart-line',
    news: 'fa-newspaper',
    board: 'fa-users',
    faq: 'fa-circle-question',
    intern_project: 'fa-graduation-cap',
    intern_year: 'fa-calendar',
    page: 'fa-file-lines',
    annual_report: 'fa-file-pdf',
    factsheet: 'fa-file-alt',
    publication: 'fa-book'
  };
  return icons[type] || 'fa-file';
}

function createExcerpt(text, query, length) {
  const textOnly = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lowerText = textOnly.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return textOnly.substring(0, length) + '...';
  }
  
  const start = Math.max(0, index - 50);
  const end = Math.min(textOnly.length, index + query.length + 100);
  
  let excerpt = textOnly.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < textOnly.length) excerpt = excerpt + '...';
  
  return highlightText(excerpt, query);
}

function highlightText(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

// Main search function
async function performSearch(query, category = '') {
  const searchLoading = document.getElementById('search-loading');
  const searchResults = document.getElementById('search-results');
  const noResults = document.getElementById('no-results');

  searchLoading.classList.remove('hidden');
  searchResults.innerHTML = '';
  noResults.classList.add('hidden');

  // Search all three systems in parallel
  const [customResults, pagefindResults, publicationsResults] = await Promise.all([
    Promise.resolve(searchContent(query, category)),
    searchPagefind(query),
    searchPublications(query)
  ]);

  // Merge results, avoiding duplicates by URL
  const urlSet = new Set();
  const mergedResults = [];

  // Add custom results first (they're more detailed)
  customResults.forEach(result => {
    if (!urlSet.has(result.url)) {
      urlSet.add(result.url);
      mergedResults.push(result);
    }
  });

  // Add Pagefind results that aren't already in custom results
  pagefindResults.forEach(result => {
    if (!urlSet.has(result.url)) {
      urlSet.add(result.url);
      mergedResults.push(result);
    }
  });

  // Add publications results (these will have unique URLs from external system)
  publicationsResults.forEach(result => {
    if (!urlSet.has(result.url)) {
      urlSet.add(result.url);
      mergedResults.push(result);
    }
  });

  // Filter by category if needed
  const filteredResults = category 
    ? mergedResults.filter(r => r.category === category)
    : mergedResults;

  searchLoading.classList.add('hidden');

  if (filteredResults.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }

  // Group by category
  const grouped = filteredResults.reduce((acc, result) => {
    const cat = result.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(result);
    return acc;
  }, {});

  // Display results
  const resultsHTML = Object.entries(grouped).map(([category, items]) => {
    const itemsHTML = items.map(result => {
      const excerpt = result.excerpt || createExcerpt(result.content, query, 150);
      
      // Special rendering for publications
      if (result.type === 'publication') {
        return `
          <div class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border-2 border-gray-200 mb-4">
            <div class="flex items-start">
              <div class="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <i class="fa-solid ${getIcon(result.type)} text-green-600 text-2xl"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">${result.category}</span>
                  ${result.year ? `<span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">${result.year}</span>` : ''}
                  ${result.pubType ? `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">${result.pubType}</span>` : ''}
                </div>
                <h3 class="text-xl font-semibold text-blue-900 mb-1">
                  <a href="${result.url}" target="_blank" class="hover:underline">${highlightText(result.title, query)}</a>
                </h3>
                ${result.authors ? `<p class="text-sm text-gray-700 mb-2"><strong>Authors:</strong> ${result.authors}</p>` : ''}
                ${result.series || result.issue ? `
                  <p class="text-sm text-gray-600 mb-2">
                    ${result.series ? `<strong>Series:</strong> ${result.series}` : ''}
                    ${result.series && result.issue ? ' | ' : ''}
                    ${result.issue ? `<strong>Issue:</strong> ${result.issue}` : ''}
                  </p>
                ` : ''}
                ${excerpt ? `<p class="text-gray-600 mb-2">${excerpt}</p>` : ''}
                <div class="flex gap-3 text-sm flex-wrap">
                  <a href="${result.url}" target="_blank" class="text-blue-600 hover:underline">
                    <i class="fa-solid fa-circle-info mr-1"></i>View Details
                  </a>
                  ${result.url_download ? `
                    <a href="${result.url_download}" target="_blank" class="text-blue-600 hover:underline">
                      <i class="fa-solid fa-download mr-1"></i>Download
                    </a>
                  ` : ''}
                  ${result.url_webpage ? `
                    <a href="${result.url_webpage}" target="_blank" class="text-blue-600 hover:underline">
                      <i class="fa-solid fa-globe mr-1"></i>Web Page
                    </a>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      // Standard rendering for other content types
      return `
        <a href="${result.url}" class="block p-6 bg-white rounded-lg shadow hover:shadow-md transition border-2 border-transparent hover:border-blue-500 mb-4">
          <div class="flex items-start">
            ${result.image ? `
              <img 
                src="${directusUrl}/assets/${result.image}?width=80&height=80&fit=cover" 
                alt="${result.title}"
                class="w-20 h-20 rounded-lg object-cover mr-4"
              />
            ` : `
              <div class="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <i class="fa-solid ${getIcon(result.type)} text-blue-600 text-2xl"></i>
              </div>
            `}
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${result.category}</span>
              </div>
              <h3 class="text-xl font-semibold text-blue-900 mb-1">${highlightText(result.title, query)}</h3>
              ${result.subtitle ? `<p class="text-sm text-gray-500 mb-2">${result.subtitle}</p>` : ''}
              ${result.address ? `<p class="text-sm text-gray-500 mb-2"><i class="fa-solid fa-location-dot mr-1"></i>${result.address}</p>` : ''}
              <p class="text-gray-600 mb-2">${excerpt}</p>
              <span class="text-sm text-blue-600 hover:underline">
                <i class="fa-solid fa-arrow-right mr-1"></i>
                View details
              </span>
            </div>
          </div>
        </a>
      `;
    }).join('');

    return `
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
          ${category} (${items.length})
        </h2>
        ${itemsHTML}
      </div>
    `;
  }).join('');

  searchResults.innerHTML = `
    <div class="mb-4 text-gray-600">
      Found ${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}
      ${!pagefindLoaded ? ' <span class="text-sm text-gray-500">(static content search not available in dev mode)</span>' : ''}
    </div>
    ${resultsHTML}
  `;
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Load Pagefind and search index
  await Promise.all([
    loadPagefind(),
    loadSearchIndex()
  ]);

  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  let searchTimeout;

  // Debounced search function
  const debouncedSearch = () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    const category = categoryFilter.value;

    if (query.length < 2) {
      document.getElementById('search-results').innerHTML = '';
      document.getElementById('no-results').classList.add('hidden');
      return;
    }

    searchTimeout = setTimeout(() => {
      performSearch(query, category);
    }, 300);
  };

  // Event listeners
  searchInput.addEventListener('input', debouncedSearch);
  categoryFilter.addEventListener('change', debouncedSearch);

  // Check for URL parameters on page load
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  const initialCategory = urlParams.get('category');

  if (initialQuery) {
    searchInput.value = initialQuery;
    if (initialCategory) {
      categoryFilter.value = initialCategory;
    }
    performSearch(initialQuery, initialCategory || '');
  }
});