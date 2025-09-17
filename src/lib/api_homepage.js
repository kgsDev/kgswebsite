// src/lib/api_homepage.js
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
    return response.data.data || null;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    return null;
  }
}

/**
 * Fetch a specific homepage section by status - only one should be fetched - otherwise will get first or fallback to default
 * @returns {Object|null} The section data or null if not found
 */
export async function fetchHomepageSection() {
  try {
    const sections = await apiRequest('/items/homepage_sections', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      limit: 1,
      sort: 'sort'
    });
    
    return sections && sections.length > 0 ? sections[0] : null;
  } catch (error) {
    console.error(`Error fetching homepage section:`, error);
    return null;
  }
}

/**
 * Fetch all published homepage sections, sorted by sort field
 * @returns {Array} Array of section objects
 */
export async function fetchAllHomepageSections() {
  try {
    const sections = await apiRequest('/items/homepage_sections', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: 'sort'
    });
    
    return sections || [];
  } catch (error) {
    console.error('Error fetching all homepage sections:', error);
    return [];
  }
}