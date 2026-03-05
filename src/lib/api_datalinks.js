// src/lib/api_datalinks.js
// API functions for fetching downloadable data links from Directus
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.PUBLIC_DIRECTUS_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to handle errors consistently
async function apiRequest(path, params) {
  try {
    const response = await api.get(path, { params });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    return [];
  }
}

/**
 * Fetch all published datalinks, optionally filtered by category tag.
 *
 * Expected Directus collection: "datalinks"
 * Fields:
 *   id, status, sort, title, description, file_size, file_format,
 *   download_url, external_url, category, date_updated, contact_name,
 *   contact_email, notes, featured
 *
 * "category" is a string field (or M2M tag) — e.g. "oil_gas", "coal", "water"
 * For simplicity this uses a single-value string field.
 * If you use a M2M tags relationship, adjust the filter accordingly.
 */
export async function fetchDatasets(category = null) {
  const filter = { status: { _eq: 'published' } };

  if (category) {
    filter.category = { _eq: category };
  }

  const datasets = await apiRequest('/items/datalinks', {
    fields: [
      'id',
      'status',
      'sort',
      'featured',
      'title',
      'description',
      'file_format',
      'download_url',
      'metadata_url',
      'external_url',
      'category',
      'last_refreshed',
      'date_created',
      'date_updated',
      'contact_name',
      'contact_email',
      'notes'
    ],
    filter: JSON.stringify(filter),
    sort: '-featured,sort,title',
    limit: -1
  });

  return datasets;
}

/**
 * Get all unique categories from published datasets.
 * Useful for building a landing index of data categories.
 */
export async function fetchDatasetCategories() {
  const datasets = await apiRequest('/items/datalinks', {
    fields: ['category'],
    filter: JSON.stringify({ status: { _eq: 'published' } }),
    limit: -1
  });

  const categories = new Set();
  datasets.forEach(d => {
    if (d.category) categories.add(d.category);
  });

  return Array.from(categories).sort();
}

/**
 * Human-readable label for a category slug.
 */
export function formatDatasetCategory(category) {
  const map = {
    oilgas: 'Oil & Gas',
    coal: 'Coal',
    water: 'Water Resources',
    geology: 'General Geology',
    hazards: 'Geologic Hazards',
    minerals: 'Mineral Resources',
    geochemistry: 'Geochemistry',
    environmental: 'Environmental'
  };
  return map[category] || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Icon class for a category (Font Awesome 6).
 */
export function getDatasetCategoryIcon(category) {
  const icons = {
    oilgas: 'fa-oil-well',
    coal: 'fa-industry',
    water: 'fa-water',
    geology: 'fa-mountain',
    hazards: 'fa-triangle-exclamation',
    minerals: 'fa-gem',
    geochemistry: 'fa-flask',
    environmental: 'fa-leaf'
  };
  return icons[category] || 'fa-database';
}