// src/lib/api_intern.js
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

//fetch map image information
export async function fetchInternMapImage() {
  try {
    const images = await apiRequest('/files', {
      filter: JSON.stringify({
        filename_download: {
          _eq: 'intern_map_image.png'
        }
      })
    });
    
    return images.length > 0 ? images[0] : null;
  } catch (error) {
    console.error('Error fetching intern map image:', error);
    return null;
  }
}


/**
 * Fetch current internship details (most recent year)
 */
export async function fetchCurrentInternDetails() {
  try {
    const details = await apiRequest('/items/intern_details', {
      fields: ['*'],
      sort: '-program_year',
      limit: 1
    });
    
    return details.length > 0 ? details[0] : null;
  } catch (error) {
    console.error('Error fetching current intern details:', error);
    return null;
  }
}

/**
 * Fetch all internship details (for archive/historical access)
 */
export async function fetchAllInternDetails() {
  try {
    return await apiRequest('/items/intern_details', {
      fields: ['*'],
      sort: '-program_year'
    });
  } catch (error) {
    console.error('Error fetching all intern details:', error);
    return [];
  }
}

/**
 * Fetch internship details for a specific year
 */
export async function fetchInternDetailsByYear(year) {
  try {
    const details = await apiRequest('/items/intern_details', {
      fields: ['*'],
      filter: JSON.stringify({
        program_year: {
          _eq: year
        }
      })
    });
    
    return details.length > 0 ? details[0] : null;
  } catch (error) {
    console.error(`Error fetching intern details for year ${year}:`, error);
    return null;
  }
}

/**
 * Fetch all FAQs
 */
export async function fetchInternFAQs() {
  try {
    return await apiRequest('/items/intern_faqs', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: 'sort,id'
    });
  } catch (error) {
    console.error('Error fetching intern FAQs:', error);
    return [];
  }
}

/**
 * Fetch all intern projects
 */
export async function fetchAllInternProjects() {
  try {
    return await apiRequest('/items/intern_projects', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: '-year_internship,sort,id'
    });
  } catch (error) {
    console.error('Error fetching all intern projects:', error);
    return [];
  }
}

/**
 * Fetch intern projects grouped by year
 */
export async function fetchInternProjectsByYear() {
  try {
    const projects = await fetchAllInternProjects();
    
    // Group projects by year
    const projectsByYear = {};
    projects.forEach(project => {
      const year = project.year_internship;
      if (!projectsByYear[year]) {
        projectsByYear[year] = [];
      }
      projectsByYear[year].push(project);
    });
    
    return projectsByYear;
  } catch (error) {
    console.error('Error fetching projects by year:', error);
    return {};
  }
}

/**
 * Fetch intern projects for a specific year
 */
export async function fetchInternProjectsForYear(year) {
  try {
    return await apiRequest('/items/intern_projects', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        },
        year_internship: {
          _eq: year
        }
      }),
      sort: 'sort,id'
    });
  } catch (error) {
    console.error(`Error fetching projects for year ${year}:`, error);
    return [];
  }
}

/**
 * Fetch final project details for all years
 */
export async function fetchAllFinalProjectDetails() {
  try {
    return await apiRequest('/items/intern_final_projects_details', {
      fields: ['*'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: '-project_year'
    });
  } catch (error) {
    console.error('Error fetching final projects details:', error);
    return [];
  }
}

/**
 * Fetch final project details for a specific year
 */
export async function fetchFinalProjectDetailsByYear(year) {
  try {
    const details = await apiRequest('/items/intern_final_projects_details', {
      fields: ['*'],
      filter: JSON.stringify({
        project_year: {
          _eq: year
        },
        status: {
          _eq: 'published'
        }
      })
    });
    
    return details.length > 0 ? details[0] : null;
  } catch (error) {
    console.error(`Error fetching final projects details for year ${year}:`, error);
    return null;
  }
}

/**
 * Get all years that have intern projects (for navigation/archive)
 */
export async function fetchInternProjectYears() {
  try {
    const projects = await apiRequest('/items/intern_projects', {
      fields: ['year_internship'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      }),
      sort: '-year_internship'
    });
    
    // Get unique years
    const years = [...new Set(projects.map(p => p.year_internship))];
    return years.filter(year => year != null);
  } catch (error) {
    console.error('Error fetching project years:', error);
    return [];
  }
}