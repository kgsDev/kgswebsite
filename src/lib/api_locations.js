// src/lib/api_locations.js
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
 * Fetch all KGS directory locations
 * Only returns locations where kgs_directory = true
 */
export async function fetchKGSLocations() {
  try {
    const locations = await apiRequest('/items/locations', {
      fields: [
        'id',
        'name',
        'address', 
        'city',
        'state',
        'zip',
        'regular_hours',
        'regular_phone',
        'toll_free_phone',
        'email',
        'url',
        'slug'
      ],
      filter: JSON.stringify({
        kgs_directory: {
          _eq: true
        },
        status: {
          _eq: true
        }
      }),
      sort: 'sort,state,city,name'
    });

    console.log(`Fetched ${locations.length} KGS directory locations`);
    return locations;
  } catch (error) {
    console.error('Error fetching KGS locations:', error);
    return [];
  }
}

/**
 * Fetch a specific location by slug
 */
export async function fetchLocationBySlug(slug) {
  try {
    const locations = await apiRequest('/items/locations', {
      fields: [
        '*'
      ],
      filter: JSON.stringify({
        slug: {
          _eq: slug
        },
        status: {
          _eq: 'published'
        }
      }),
      limit: 1
    });

    if (!locations || locations.length === 0) {
      return null;
    }

    return locations[0];
  } catch (error) {
    console.error(`Error fetching location with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all location slugs for generating static paths
 */
export async function fetchAllLocationSlugs() {
  try {
    const locations = await apiRequest('/items/locations', {
      fields: ['slug'],
      filter: JSON.stringify({
        kgs_directory: {
          _eq: true
        },
        status: {
          _eq: 'published'
        }
      })
    });
    
    return locations.map(location => location.slug).filter(Boolean);
  } catch (error) {
    console.error('Error fetching location slugs:', error);
    return [];
  }
}

/**
 * Fetch locations by state
 */
export async function fetchLocationsByState(state) {
  try {
    const locations = await apiRequest('/items/locations', {
      fields: [
        'id',
        'name',
        'address', 
        'city',
        'state',
        'zip',
        'regular_hours',
        'regular_phone',
        'toll_free_phone',
        'email',
        'url',
        'slug'
      ],
      filter: JSON.stringify({
        kgs_directory: {
          _eq: true
        },
        state: {
          _eq: state
        },
        status: {
          _eq: 'published'
        }
      }),
      sort: 'sort,city,name'
    });

    return locations;
  } catch (error) {
    console.error(`Error fetching locations for state ${state}:`, error);
    return [];
  }
}

/**
 * Fetch staff members associated with a location
 */
export async function fetchStaffByLocation(locationId) {
  try {
    // First get the staff-location relationships
    const staffLocationRelations = await apiRequest('/items/staff_locations', {
      fields: ['staff_id'],
      filter: JSON.stringify({
        locations_id: {
          _eq: locationId
        }
      })
    });

    if (!staffLocationRelations || staffLocationRelations.length === 0) {
      return [];
    }

    // Extract staff IDs
    const staffIds = staffLocationRelations.map(rel => rel.staff_id);

    // Fetch the actual staff data
    const staff = await apiRequest('/items/staff', {
      fields: [
        'id',
        'first_name',
        'last_name', 
        'working_title',
        'email',
        'phone',
        'photo',
        'slug'
      ],
      filter: JSON.stringify({
        id: {
          _in: staffIds
        },
        status: {
          _eq: 'active'
        }
      }),
      sort: 'last_name,first_name'
    });

    return staff;
  } catch (error) {
    console.error(`Error fetching staff for location ${locationId}:`, error);
    return [];
  }
}