// src/lib/api_labs.js
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
 * Fetch a lab by slug with preview support
 */
export async function fetchLabBySlug(slug, request = null) {
  try {
    // Check if we should show drafts
    const showDrafts = isDraftMode(request);

    // Build filter - Fixed the duplicate filter issue
    const filter = {
      slug: { _eq: slug },
      ...getContentFilter(showDrafts)
    };

    const labs = await apiRequest('/items/labs', {
      fields: [
        '*', // Get all fields
        'location.name',
        'director.id',
        'director.first_name',
        'director.last_name',
        'director.slug'
      ],
      filter: JSON.stringify(filter), // Fixed: removed the duplicate nested filter
      limit: 1
    });
    
    if (!labs || labs.length === 0) {
      return null;
    }
    
    return labs[0];
  } catch (error) {
    console.error(`Error fetching lab with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch all labs with preview support
 */
export async function fetchAllLabs(request = null) {
  try {
    const showDrafts = isDraftMode(request);

    const labs = await apiRequest('/items/labs', {
      fields: [
        'id',
        'name',
        'short_name',
        'slug',
        'short_description',
        'logo',
        'accent_color',
        'primary_color',
        'background_color',
        'secondary_color',
        'status' // Added status field for preview indicators
      ],
      filter: JSON.stringify(getContentFilter(showDrafts)),
      sort: 'sort,name'
    });
    
    return labs;
  } catch (error) {
    console.error('Error fetching all labs:', error);
    return [];
  }
}

/**
 * Fetch latest news related to a lab
 */
export async function fetchLabNews(labId, options = {}) {
  const { limit = 3, page = 1 } = options;
  
  try {
    // First, get news ID's linked to this lab
    const newsRelations = await apiRequest('/items/labs_articles', {
      fields: ['articles_id'],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });
    
    if (!newsRelations || newsRelations.length === 0) {
      return [];
    }
    
    // Extract news IDs
    const newsIds = newsRelations.map(relation => relation.articles_id);

    // Fetch the actual news items
    const news = await apiRequest('/items/articles', {
      fields: [
        '*', // Get all fields
        'main_image.*'
      ],
      filter: JSON.stringify({
        id: {
          _in: newsIds
        },
        status: {
          _eq: 'published'
        }
      }),
      sort: '-publication_date',
      limit: limit,
      page: page
    });
   
    return news;
  } catch (error) {
    console.error(`Error fetching news for lab ${labId}:`, error);
    return [];
  }
}

/**
 * Fetch staff members associated with a lab
 */
export async function fetchLabStaff(labId) {
  try {
    // First, get staff relations
    const staffRelations = await apiRequest('/items/labs_staff', {
      fields: [
        'staff_id.*',
        'lab_role'
      ],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
        // Removed the nested staff_id filter - this was causing issues
      }),
      sort: 'sort'
    });
    
    if (!staffRelations || staffRelations.length === 0) {
      return [];
    }
    
    // Transform the relations into staff members with added lab_role
    const staffMembers = staffRelations
      .map(relation => {
        // Extract the staff data from staff_id
        const staffData = relation.staff_id;
        
        // Skip if no staff data or staff is inactive
        if (!staffData || staffData.status !== 'active') {
          return null;
        }
        
        // Add the lab role to the staff data
        return {
          ...staffData,
          lab_role: relation.lab_role
        };
      })
      .filter(Boolean); // Remove null entries
    
    return staffMembers;
  } catch (error) {
    console.error(`Error fetching staff for lab ${labId}:`, error);
    return [];
  }
}

/**
 * Fetch projects for a specific lab using many-to-many relationship with preview support
 */
export async function fetchLabProjects(labId, request = null) {
  try {

    const showDrafts = isDraftMode(request);

    // First get the junction table entries for this lab
    const labProjectRelations = await apiRequest('/items/labs_lab_projects', {
      fields: ['lab_projects_id.*'],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });

    // Extract the actual projects from the relations
    const projects = labProjectRelations
      .map(relation => relation.lab_projects_id)
      .filter(project => {
        if (!project) return false;
        
        if (showDrafts) {
          return ['published', 'draft'].includes(project.status);
        } else {
          return project.status === 'published';
        }
      })
      .sort((a, b) => {
        // Sort by featured first, then by sort order, then by start_date
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        if (a.sort !== b.sort) return (a.sort || 999) - (b.sort || 999);
        
        const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
        const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
        return dateB - dateA; // Most recent first
      });

    return projects;
  } catch (error) {
    console.error('Error fetching lab projects:', error);
    return [];
  }
}

/**
 * Fetch publications for a specific lab using many-to-many relationship
 */
export async function fetchLabPublications(labId, options = {}) {
  const { limit = 10, page = 1, yearGroup = true } = options;
  
  try {
    // First get the junction table entries for this lab
    const labPublicationRelations = await apiRequest('/items/publications_labs', {
      fields: ['publications_id.*'],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });

    if (!labPublicationRelations || labPublicationRelations.length === 0) {
      return yearGroup ? {} : [];
    }

    // Extract the actual publications from the relations
    let publications = labPublicationRelations
      .map(relation => relation.publications_id)
      .filter(publication => publication) // Filter out any null/undefined entries
      .sort((a, b) => {
        // Sort by year (most recent first), then by title
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (yearA !== yearB) return yearB - yearA;
        
        return (a.title || '').localeCompare(b.title || '');
      });

    // If yearGroup is true, group publications by year
    if (yearGroup) {
      const groupedByYear = {};
      
      publications.forEach(pub => {
        const year = pub.year || 'Unknown Year';
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(pub);
      });
      
      return groupedByYear;
    }

    return publications;
  } catch (error) {
    console.error('Error fetching lab publications:', error);
    return yearGroup ? {} : [];
  }
}

/**
 * Fetch presentations associated with a lab using many-to-many relationship
 */
export async function fetchLabPresentations(labId, options = {}) {
  const { limit = 10, page = 1, yearGroup = true } = options;
  
  try {
    // First, get presentation relations through the junction table
    const presentationRelations = await apiRequest('/items/labs_presentations', {
      fields: ['presentations_id.*'],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });
    
    if (!presentationRelations || presentationRelations.length === 0) {
      return yearGroup ? {} : [];
    }
    
    // Extract presentation data
    let presentations = presentationRelations
      .map(relation => relation.presentations_id)
      .filter(presentation => presentation) // Filter out any null/undefined entries
      .sort((a, b) => {
        // Sort by date (most recent first)
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });
    
    // If yearGroup is true, group presentations by year
    if (yearGroup) {
      const groupedByYear = {};
      
      presentations.forEach(pres => {
        const date = pres.date ? new Date(pres.date) : null;
        const year = date ? date.getFullYear() : 'Unknown Year';
        
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(pres);
      });
      
      return groupedByYear;
    }
    
    return presentations;
  } catch (error) {
    console.error(`Error fetching presentations for lab ${labId}:`, error);
    return yearGroup ? {} : [];
  }
}

/**
 * Fetch funding sources associated with a lab using many-to-many relationship
 */
export async function fetchLabFunding(labId, options = {}) {
  const { active = null, limit = 50, sortBy = 'end_date' } = options;
  
  try {
    // First, get funding relations through the junction table
    const fundingRelations = await apiRequest('/items/labs_lab_funding', {
      fields: ['lab_funding_id.*'],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });
    
    if (!fundingRelations || fundingRelations.length === 0) {
      return [];
    }
    
    // Extract funding data
    let funding = fundingRelations
      .map(relation => relation.lab_funding_id)
      .filter(fundingItem => fundingItem); // Filter out any null/undefined entries
    
    // Apply active filter if specified
    if (active !== null) {
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      funding = funding.filter(fundingItem => {
        if (active) {
          // Active funding has end_date in the future or null
          return !fundingItem.end_date || fundingItem.end_date >= today;
        } else {
          // Past funding has end_date in the past
          return fundingItem.end_date && fundingItem.end_date < today;
        }
      });
    }
    
    // Sort the funding
    funding.sort((a, b) => {
      switch (sortBy) {
        case 'start_date':
          const startA = a.start_date ? new Date(a.start_date) : new Date(0);
          const startB = b.start_date ? new Date(b.start_date) : new Date(0);
          return startB - startA; // Most recent first
          
        case 'amount':
          return (b.amount || 0) - (a.amount || 0); // Largest first
          
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
          
        default: // end_date
          const endA = a.end_date ? new Date(a.end_date) : new Date('9999-12-31');
          const endB = b.end_date ? new Date(b.end_date) : new Date('9999-12-31');
          return endB - endA; // Most recent end date first
      }
    });
    
    // Apply limit
    if (limit) {
      funding = funding.slice(0, limit);
    }
    
    return funding;
  } catch (error) {
    console.error(`Error fetching funding for lab ${labId}:`, error);
    return [];
  }
}

/**
 * Fetch a single project by ID with lab information and preview support
 */
export async function fetchProjectById(projectId, request = null) {
  try {
    const showDrafts = isDraftMode(request);
    
    // Build filter based on preview mode
    const filter = {
      id: { _eq: projectId },
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

    const project = projects[0];

    // Get associated labs for this project
    const labRelations = await apiRequest('/items/labs_lab_projects', {
      fields: ['labs_id.*'],
      filter: JSON.stringify({
        lab_projects_id: {
          _eq: projectId
        }
      })
    });

    project.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);

    return project;
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    return null;
  }
}

/**
 * Fetch a single publication by ID with lab information
 */
export async function fetchPublicationById(publicationId) {
  try {
    const publications = await apiRequest('/items/publications', {
      fields: ['*'],
      filter: JSON.stringify({
        id: {
          _eq: publicationId
        }
      }),
      limit: 1
    });

    if (!publications || publications.length === 0) {
      return null;
    }

    const publication = publications[0];

    // Get associated labs for this publication
    const labRelations = await apiRequest('/items/publications_labs', {
      fields: ['labs_id.*'],
      filter: JSON.stringify({
        publications_id: {
          _eq: publicationId
        }
      })
    });

    publication.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);

    return publication;
  } catch (error) {
    console.error('Error fetching publication by ID:', error);
    return null;
  }
}

/**
 * Fetch featured projects across all labs (for homepage, etc.) with preview support
 */
export async function fetchFeaturedProjects(limit = 6, request = null) {
  try {
    const showDrafts = isDraftMode(request);
    
    const filter = {
      featured: { _eq: true },
      ...getContentFilter(showDrafts)
    };

    const projects = await apiRequest('/items/lab_projects', {
      fields: ['*'],
      filter: JSON.stringify(filter),
      sort: 'sort,-start_date',
      limit: limit
    });

    // For each project, get associated labs
    for (const project of projects) {
      const labRelations = await apiRequest('/items/labs_lab_projects', {
        fields: ['labs_id.*'],
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
    console.error('Error fetching featured projects:', error);
    return [];
  }
}

/**
 * Fetch recent publications across all labs (for homepage, etc.)
 */
export async function fetchRecentPublications(limit = 10) {
  try {
    const publications = await apiRequest('/items/publications', {
      fields: ['*'],
      sort: '-year,-publication_date,title',
      limit: limit
    });

    // For each publication, get associated labs
    for (const publication of publications) {
      const labRelations = await apiRequest('/items/publications_labs', {
        fields: ['labs_id.*'],
        filter: JSON.stringify({
          publications_id: {
            _eq: publication.id
          }
        })
      });
      
      publication.labs = labRelations.map(relation => relation.labs_id).filter(Boolean);
    }

    return publications;
  } catch (error) {
    console.error('Error fetching recent publications:', error);
    return [];
  }
}