// src/lib/api_projects.js
import axios from 'axios';
import { isDraftMode, getContentFilter } from '../utils/preview.js';

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
 * Fetch a single project by slug with preview support
 */
export async function fetchProjectBySlug(slug, request = null) {
  try {
    const showDrafts = isDraftMode(request);

    const filter = {
      slug: { _eq: slug },
      ...getContentFilter(showDrafts)
    };

    const projects = await apiRequest('/items/lab_projects', {
      fields: ['*'],
      filter: JSON.stringify(filter),
      limit: 1
    });

    if (!projects || projects.length === 0) {
      return null;
    }

    return projects[0];
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return null;
  }
}

/**
 * Fetch labs associated with a specific project
 */
export async function fetchProjectLabs(projectId) {
  try {
    // Get the junction table entries for this project
    const projectLabRelations = await apiRequest('/items/labs_lab_projects', {
      fields: ['labs_id.*'],
      filter: JSON.stringify({
        lab_projects_id: {
          _eq: projectId
        }
      })
    });

    // Extract the actual labs from the relations
    const labs = projectLabRelations
      .map(relation => relation.labs_id)
      .filter(lab => lab) // Filter out any null/undefined entries
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return labs;
  } catch (error) {
    console.error('Error fetching project labs:', error);
    return [];
  }
}

/**
 * Fetch all projects with pagination and optional lab filtering
 */
export async function fetchAllProjects(options = {}) {
  const { 
    page = 1, 
    limit = 12, 
    labSlug = null, 
    status = null,
    request = null 
  } = options;
  
  try {
    const showDrafts = isDraftMode(request);
    const offset = (page - 1) * limit;
    
    // If filtering by lab, get projects through the junction table
    if (labSlug) {
      return await fetchProjectsByLab(labSlug, { page, limit, status, request });
    }
    
    // Build filter
    const filter = getContentFilter(showDrafts);
    
    // Add project status filter if specified
    if (status) {
      filter.project_status = { _eq: status };
    }
    
    const projects = await apiRequest('/items/lab_projects', {
      fields: ['*'],
      filter: JSON.stringify(filter),
      sort: '-featured,-sort,-start_date,title',
      limit: limit,
      offset: offset
    });

    // For each project, get associated labs
    for (const project of projects) {
      const labRelations = await apiRequest('/items/labs_lab_projects', {
        fields: ['labs_id.name', 'labs_id.slug', 'labs_id.logo', 'labs_id.primary_color'],
        filter: JSON.stringify({
          lab_projects_id: {
            _eq: project.id
          }
        })
      });
      
      project.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);
    }

    return projects;
  } catch (error) {
    console.error('Error fetching all projects:', error);
    return [];
  }
}

//**Fetch projects by lab */
export async function fetchProjectsByLab(labSlug, options = {}) {
  const { 
    page = 1, 
    limit = 12, 
    status = null,
    request = null 
  } = options;
  
  try {
    const showDrafts = isDraftMode(request);
    const offset = (page - 1) * limit;
    
    // First get the lab ID from slug
    const labs = await apiRequest('/items/labs', {
      fields: ['id', 'name', 'slug'],
      filter: JSON.stringify({
        slug: { _eq: labSlug }
      }),
      limit: 1
    });
    
    if (!labs || labs.length === 0) {
      return [];
    }

    const labId = labs[0].id;
    
    // Get projects through junction table
    const labProjectRelations = await apiRequest('/items/labs_lab_projects', {
      fields: ['lab_projects_id.*'],
      filter: JSON.stringify({
        labs_id: { _eq: labId }
      })
    });
    
    // Filter and sort projects
    let projects = labProjectRelations
      .map(relation => relation.lab_projects_id)
      .filter(project => {
        if (!project) return false;
        
        // Filter by draft status
        if (showDrafts) {
          if (!['published', 'draft'].includes(project.status)) return false;
        } else {
          if (project.status !== 'published') return false;
        }
        
        // Filter by project status if specified
        if (status && project.project_status !== status) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by featured first, then by sort order, then by start_date
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        if (a.sort !== b.sort) return (a.sort || 999) - (b.sort || 999);
        
        const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
        const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
        return dateB - dateA;
      });
    
    // Apply pagination
    const totalCount = projects.length;
    projects = projects.slice(offset, offset + limit);
    
    // Add lab information to each project
    for (const project of projects) {
      const labRelations = await apiRequest('/items/labs_lab_projects', {
        fields: ['labs_id.name', 'labs_id.slug', 'labs_id.logo', 'labs_id.primary_color'],
        filter: JSON.stringify({
          lab_projects_id: { _eq: project.id }
        })
      });
      
      project.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);
    }
    
    // Return just the projects array, not an object
    return projects;
  } catch (error) {
    console.error('Error fetching projects by lab:', error);
    return [];
  }
}

/**
 * Fetch projects by status with preview support
 */
export async function fetchProjectsByStatus(status, options = {}) {
  const { limit = null, request = null } = options;
  
  try {
    const showDrafts = isDraftMode(request);
    
    const filter = {
      project_status: { _eq: status },
      ...getContentFilter(showDrafts)
    };

    const params = {
      fields: ['*'],
      filter: JSON.stringify(filter),
      sort: '-featured,-sort,-start_date,title'
    };

    if (limit) {
      params.limit = limit;
    }

    const projects = await apiRequest('/items/lab_projects', params);

    // For each project, get associated labs
    for (const project of projects) {
      const labRelations = await apiRequest('/items/labs_lab_projects', {
        fields: ['labs_id.name', 'labs_id.slug', 'labs_id.logo', 'labs_id.primary_color'],
        filter: JSON.stringify({
          lab_projects_id: {
            _eq: project.id
          }
        })
      });
      
      project.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);
    }

    return projects;
  } catch (error) {
    console.error('Error fetching projects by status:', error);
    return [];
  }
}

/**
 * Get total count of projects with optional filters
 */
export async function getProjectsCount(options = {}) {
  const { labSlug = null, status = null, request = null } = options;
  
  try {
    const showDrafts = isDraftMode(request);
    
    if (labSlug) {
      // Get count through lab filtering - need to count the filtered results
      const projects = await fetchProjectsByLab(labSlug, { page: 1, limit: 1000, status, request });
      return projects.length;
    }
    
    // Build filter for direct count
    const filter = getContentFilter(showDrafts);
    
    if (status) {
      filter.project_status = { _eq: status };
    }

    const response = await api.get('/items/lab_projects', {
      params: {
        aggregate: JSON.stringify({
          count: ['id']
        }),
        filter: JSON.stringify(filter)
      }
    });

    return response.data.data[0]?.count?.id || 0;
  } catch (error) {
    console.error('Error getting projects count:', error);
    return 0;
  }
}

/**
 * Search projects by title or description with preview support
 */
export async function searchProjects(searchTerm, options = {}) {
  const { limit = 20, labSlug = null, request = null } = options;
  
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('Search term is empty');
      return [];
    }

    const showDrafts = isDraftMode(request);
    
    const filter = {
      _and: [
        getContentFilter(showDrafts),
        {
          _or: [
            {
              title: {
                _icontains: searchTerm
              }
            },
            {
              description: {
                _icontains: searchTerm
              }
            }
          ]
        }
      ]
    };

    let projects = await apiRequest('/items/lab_projects', {
      fields: ['*'],
      filter: JSON.stringify(filter),
      sort: '-featured,-sort,-start_date,title',
      limit: 1000 // Get more results for filtering
    });

    // For each project, get associated labs
    for (const project of projects) {
      const labRelations = await apiRequest('/items/labs_lab_projects', {
        fields: ['labs_id.name', 'labs_id.slug', 'labs_id.logo', 'labs_id.primary_color'],
        filter: JSON.stringify({
          lab_projects_id: {
            _eq: project.id
          }
        })
      });
      
      project.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);
    }

    // If filtering by lab, only return projects from that lab
    if (labSlug) {
      projects = projects.filter(project => 
        project.labs.some(lab => lab.slug === labSlug)
      );
    }

    return projects;
  } catch (error) {
    console.error('Error searching projects:', error);
    return [];
  }
}

/**
 * Get unique project statuses for filter options
 */
export async function getProjectStatuses(request = null) {
  try {
    const showDrafts = isDraftMode(request);
    
    const projects = await apiRequest('/items/lab_projects', {
      fields: ['project_status'],
      filter: JSON.stringify(getContentFilter(showDrafts))
    });
    
    const statuses = [...new Set(projects.map(p => p.project_status).filter(Boolean))];
    return statuses.sort();
  } catch (error) {
    console.error('Error fetching project statuses:', error);
    return ['active', 'completed', 'planned']; // fallback
  }
}