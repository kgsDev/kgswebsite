// src/lib/api_mapservices.js
// API functions for fetching map services from Directus
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
    console.error('Full error:', error);
    return [];
  }
}

/**
 * Fetch all map services from Directus
 */
export async function fetchAllMapServices() {
  try {
    const mapServices = await apiRequest('/items/map_services', {
      fields: [
        'id',
        'status',
        'sort',
        'sort_title',
        'title',
        'description',
        'map_url',
        'help_url',
        'category',
        'browse_graphic',
        'date_created',
        'date_updated'
      ],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: 'sort, sort_title',
      limit: -1
    });
    
    return mapServices;
  } catch (error) {
    console.error('Error fetching map services:', error);
    return [];
  }
}

/**
 * Get unique categories from map services
 */
export function getMapServiceCategories(mapServices) {
  const categories = new Set();
  
  mapServices.forEach(service => {
    if (service.category) {
      categories.add(service.category);
    }
  });
  
  return Array.from(categories).sort();
}

/**
 * Format category name for display
 */
export function formatCategoryName(category) {
  const categoryMap = {
    'general_geology': 'General Geology',
    'water': 'Water Resources',
    'coal': 'Coal Resources',
    'oil_gas': 'Oil & Gas',
    'minerals': 'Mineral Resources',
    'hazards': 'Geologic Hazards',
    'geohealth': 'Geohealth',
    'coordinates': 'Coordinates & Tools'
  };
  
  return categoryMap[category] || category;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category) {
  const iconMap = {
    'general_geology': 'fa-mountain',
    'water': 'fa-water',
    'coal': 'fa-gem',
    'oil_gas': 'fa-oil-well',
    'minerals': 'fa-cubes',
    'hazards': 'fa-triangle-exclamation',
    'geohealth': 'fa-heartbeat',
    'coordinates': 'fa-map-marked-alt'
  };
  
  return iconMap[category] || 'fa-map';
}

/**
 * Get category color
 */
export function getCategoryColor(category) {
  const colorMap = {
    'general_geology': 'bg-blue-100 text-blue-800',
    'water': 'bg-cyan-100 text-cyan-800',
    'coal': 'bg-gray-100 text-gray-800',
    'oil_gas': 'bg-amber-100 text-amber-800',
    'minerals': 'bg-purple-100 text-purple-800',
    'hazards': 'bg-red-100 text-red-800',
    'geohealth': 'bg-green-100 text-green-800',
    'coordinates': 'bg-indigo-100 text-indigo-800'
  };
  
  return colorMap[category] || 'bg-gray-100 text-gray-800';
}

/**
 * Get browse graphic URL
 */
export function getBrowseGraphicUrl(graphicId) {
  if (!graphicId) return null;
  const baseUrl = import.meta.env.PUBLIC_DIRECTUS_URL;
  return `${baseUrl}/assets/${graphicId}?width=800&height=600&fit=cover&quality=80`;
}