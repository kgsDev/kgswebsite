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
 * Fetch a lab by slug with preview support (ENHANCED with location & principal investigator)
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
        'location.id',
        'location.name',
        'location.description',
        'location.address',
        'location.city',
        'location.state',
        'location.zip',
        'location.regular_phone',
        'location.toll_free_phone',
        'location.email',
        'location.regular_hours',
        'location.url',
        'location.slug',
        'director.id',
        'director.first_name',
        'director.last_name',
        'director.slug',
        'principal_investigator.id',
        'principal_investigator.first_name',
        'principal_investigator.last_name',
        'principal_investigator.slug',
        'principal_investigator.working_title',
        'principal_investigator.email',
        'principal_investigator.phone',
        'principal_investigator.photo',
        // Enhanced fields for rich lab pages
        'hardware_description',
        'workflows_description',
        'lab_photo'
      ],
      filter: JSON.stringify(filter),
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
 * Fetch staff members associated with a lab (ENHANCED with proper categorization)
 */
export async function fetchLabStaff(labId) {
  try {
    // Get staff relations with lab roles
    const staffRelations = await apiRequest('/items/labs_staff', {
      fields: [
        'staff_id.*',
        'lab_role'
      ],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      }),
      sort: 'sort'
    });
    
    if (!staffRelations || staffRelations.length === 0) {
      return { 
        principal_investigators: [], 
        researchers: [],
        affiliate_faculty: [],
        students: [],
        staff: [] 
      };
    }
    
    // Transform and categorize staff
    const principal_investigators = [];
    const researchers = [];
    const affiliate_faculty = [];
    const students = [];
    const staff = [];
    
    staffRelations.forEach(relation => {
      const staffData = relation.staff_id;
      
      // Skip if no staff data or staff is inactive
      if (!staffData || staffData.status !== 'active') {
        return;
      }
      
      // Add the lab role to the staff data
      const enhancedStaffData = {
        ...staffData,
        lab_role: relation.lab_role
      };
      
      // Categorize based on lab_role
      const role = relation.lab_role?.toLowerCase() || '';
      
      if (role.includes('principal investigator') || role.includes('pi') || role.includes('director')) {
        principal_investigators.push(enhancedStaffData);
      } else if (role.includes('researcher') || role.includes('research scientist') || role.includes('postdoc')) {
        researchers.push(enhancedStaffData);
      } else if (role.includes('affiliate') || role.includes('adjunct') || role.includes('collaborator')) {
        affiliate_faculty.push(enhancedStaffData);
      } else if (role.includes('student') || role.includes('graduate') || role.includes('undergraduate') || role.includes('phd')) {
        students.push(enhancedStaffData);
      } else {
        staff.push(enhancedStaffData);
      }
    });
    
    return { 
      principal_investigators, 
      researchers,
      affiliate_faculty,
      students,
      staff 
    };
  } catch (error) {
    console.error(`Error fetching staff for lab ${labId}:`, error);
    return { 
      principal_investigators: [], 
      researchers: [],
      affiliate_faculty: [],
      students: [],
      staff: [] 
    };
  }
}

/**
 * Fetch projects for a specific lab using many-to-many relationship with preview support (ENHANCED)
 */
export async function fetchLabProjects(labId, options = {}) {
  try {
    const { 
      featured = null, 
      limit = null, 
      status = null,
      request = null 
    } = options;

    const showDrafts = isDraftMode(request);

    // First get the junction table entries for this lab
    const labProjectRelations = await apiRequest('/items/labs_lab_projects', {
      fields: [
        'lab_projects_id.*',
        // Get related data
        'lab_projects_id.principal_investigator.first_name',
        'lab_projects_id.principal_investigator.last_name',
        'lab_projects_id.principal_investigator.slug',
        'lab_projects_id.principal_investigator.working_title',
        // Get featured image directly
        'lab_projects_id.featured_image',
        // Get gallery through junction table - this is the key fix
        'lab_projects_id.gallery.directus_files_id',
        // Get funding relationships - not now
        //'lab_projects_id.funding.funding_id.title',
        //'lab_projects_id.funding.funding_id.funding_agency.name',
        //'lab_projects_id.funding.funding_id.funding_agency.acronymn',
        //'lab_projects_id.funding.funding_id.funding_agency.logo',
        //'lab_projects_id.funding.funding_id.url',
      ],
      filter: JSON.stringify({
        labs_id: {
          _eq: labId
        }
      })
    });

    // Extract and filter the actual projects
    let projects = labProjectRelations
      .map(relation => {
        const project = relation.lab_projects_id;
        
        // Fix gallery field - extract file IDs from junction table
        if (project.gallery && Array.isArray(project.gallery)) {
          project.gallery = project.gallery.map(galleryItem => {
            // Extract the actual file ID from the junction table
            return galleryItem.directus_files_id;
          }).filter(Boolean); // Remove any null/undefined values
        }
        
        return project;
      })
      .filter(project => {
        if (!project) return false;
        
        // Status filtering
        if (status && project.status !== status) return false;
        
        // Draft mode filtering
        if (showDrafts) {
          return ['published', 'draft'].includes(project.status);
        } else {
          return project.status === 'published';
        }
      });

    // Featured filtering
    if (featured !== null) {
      projects = projects.filter(project => project.featured === featured);
    }

    // Sorting
    projects.sort((a, b) => {
      // Sort by featured first, then by sort order, then by start_date
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.sort !== b.sort) return (a.sort || 999) - (b.sort || 999);
      
      const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
      const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
      return dateB - dateA; // Most recent first
    });

    // Limit results
    if (limit) {
      projects = projects.slice(0, limit);
    }

    return projects;
  } catch (error) {
    console.error('Error fetching lab projects:', error);
    return [];
  }
}

/**
 * Fetch lab tools/software
 */
export async function fetchLabTools(labId) {
  try {
    // First get the junction table entries for this lab
    const labToolRelations = await apiRequest('/items/lab_tools_labs', {
      fields: ['lab_tools_id.*'],
      filter: JSON.stringify({
        labs_id: { _eq: labId }
      })
    });

    if (!labToolRelations || labToolRelations.length === 0) {
      return [];
    }

    // Extract the actual tools from the relations and filter by status
    const tools = labToolRelations
      .map(relation => relation.lab_tools_id)
      .filter(tool => {
        if (!tool) return false;
        // Handle both array and string status fields
        if (Array.isArray(tool.status)) {
          return tool.status.includes('published');
        } else {
          return tool.status === 'published';
        }
      })
      .sort((a, b) => {
        // Sort by sort_order, then by name
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 999) - (b.sort_order || 999);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

    return tools;
  } catch (error) {
    console.error('Error fetching lab tools:', error);
    return [];
  }
}

/**
 * Fetch research areas for a lab
 */
export async function fetchLabResearchAreas(labId) {
  try {
    // First get the research areas
    const researchAreas = await apiRequest('/items/research_areas', {
      fields: ['*'],
      filter: JSON.stringify({
        lab_id: { _eq: labId },
        status: { _eq: 'published' }
      }),
      sort: 'sort_order,title'
    });

    // Then get content blocks for each research area
    for (const area of researchAreas) {
      const contentBlocks = await apiRequest('/items/research_area_content_blocks', {
        fields: ['*'],
        filter: JSON.stringify({
          research_area_id: { _eq: area.id },
          status: { _eq: 'published' }
        }),
        sort: 'sort_order'
      });
      
      area.content_blocks = contentBlocks || [];
    }

    return researchAreas;
  } catch (error) {
    console.error('Error fetching research areas:', error);
    return [];
  }
}

/**
 * Fetch content blocks for a lab page (ENHANCED with better block type support)
 */
export async function fetchLabContentBlocks(labId, pageSlug = 'home') {
  try {
    return await apiRequest('/items/lab_content_blocks', {
      fields: ['*'],
      filter: JSON.stringify({
        lab_id: { _eq: labId },
        page_slug: { _eq: pageSlug },
        status: { _eq: 'published' }
      }),
      sort: 'sort_order'
    });
  } catch (error) {
    console.error('Error fetching content blocks:', error);
    return [];
  }
}

/**
 * Fetch funding information for a project
 */
export async function fetchProjectFunding(projectId) {
  try {
    const fundingRelations = await apiRequest('/items/lab_projects_funding', {
      fields: [
        'funding_id.title',
        'funding_id.grant_number', 
        'funding_id.amount',
        'funding_id.start_date',
        'funding_id.end_date',
        'funding_id.description',
        'funding_id.url',
        'funding_id.logo',
        'funding_id.funding_agency.name',
        'funding_id.funding_agency.acronymn',
        'funding_id.funding_agency.logo',
        'funding_id.funding_agency.website'
      ],
      filter: JSON.stringify({
        lab_projects_id: { _eq: projectId }
      })
    });

    return fundingRelations.map(rel => rel.funding_id) || [];
  } catch (error) {
    console.error('Error fetching project funding:', error);
    return [];
  }
}

/**
 * Fetch a specific project by slug with enhanced data
 */
export async function fetchLabProjectBySlug(labId, projectSlug) {
  try {
    // First get projects for this lab
    const labProjectRelations = await apiRequest('/items/labs_lab_projects', {
      fields: ['lab_projects_id'],
      filter: JSON.stringify({
        labs_id: { _eq: labId }
      })
    });

    if (!labProjectRelations.length) return null;

    const projectIds = labProjectRelations.map(rel => rel.lab_projects_id);

    const projects = await apiRequest('/items/lab_projects', {
      fields: [
        '*',
        'featured_image',
        'gallery',
        'principal_investigator.*',
        'funding.funding_id.*',
        'funding.funding_id.funding_agency.*'
      ],
      filter: JSON.stringify({
        id: { _in: projectIds },
        slug: { _eq: projectSlug },
        status: { _eq: 'published' }
      }),
      limit: 1
    });

    return projects.length > 0 ? projects[0] : null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
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