// Add this to your existing src/lib/api_staff.js or create a new API file
// src/lib/api_orgs.js

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
 * Fetch all associated organizations
 */
export async function fetchAssociatedOrganizations() {
  try {
    return await apiRequest('/items/associated_orgs', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: 'sort,name'
    });
  } catch (error) {
    console.error('Error fetching associated organizations:', error);
    return [];
  }
}