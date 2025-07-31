// src/lib/api_funding.js
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
 * Helper function to fetch labs for a funding project
 */
async function fetchLabsForFunding(fundingId) {
  try {
    
    // Get labs through lab projects
    const labProjects = await apiRequest('/items/lab_projects_funding', {
      fields: ['lab_projects_id'],
      filter: JSON.stringify({
        funding_id: { _eq: fundingId }
      })
    });

    if (labProjects.length === 0) {
      return [];
    }

    const labProjectIds = labProjects.map(rel => rel.lab_projects_id).filter(Boolean);
    
    const labRelations = await apiRequest('/items/labs_lab_projects', {
      fields: [
        'labs_id.id',
        'labs_id.name',
        'labs_id.short_name',
        'labs_id.slug',
        'labs_id.logo'
      ],
      filter: JSON.stringify({
        lab_projects_id: { _in: labProjectIds }
      })
    });

    // Remove duplicates
    const uniqueLabs = [];
    const seenLabIds = new Set();
    
    labRelations.forEach(rel => {
      if (rel.labs_id && !seenLabIds.has(rel.labs_id.id)) {
        seenLabIds.add(rel.labs_id.id);
        uniqueLabs.push(rel.labs_id);
      }
    });

    return uniqueLabs;
  } catch (error) {
    console.error('Error fetching labs for funding:', error);
    return [];
  }
}

/**
 * Fetch all funding/sponsored projects with related data
 */
export async function fetchAllFunding(request = null) {
  try {
    const showDrafts = isDraftMode(request);
    
    const funding = await apiRequest('/items/funding', {
      fields: [
        '*',
        'funding_agency.id',
        'funding_agency.name',
        'funding_agency.acronymn',
        'funding_agency.logo',
        'funding_agency.website'
      ],
      filter: JSON.stringify(getContentFilter(showDrafts)),
      sort: '-date_created,title'
    });

    // For each funding project, get related staff, teams, and lab projects
    for (const project of funding) {
      // Get staff (PIs and Co-PIs)
      const staffRelations = await apiRequest('/items/funding_staff', {
        fields: [
          'staff_id.id',
          'staff_id.first_name',
          'staff_id.last_name',
          'staff_id.working_title',
          'staff_id.slug',
          'staff_id.email',
          'staff_id.phone',
          'staff_id.photo',
          'staff_id.department_id.name'
        ],
        filter: JSON.stringify({
          funding_id: { _eq: project.id }
        })
      });
      
      project.staff = staffRelations.map(rel => rel.staff_id).filter(Boolean);

      // Get teams
      const teamRelations = await apiRequest('/items/funding_team', {
        fields: [
          'team_id.id',
          'team_id.name',
          'team_id.description',
        ],
        filter: JSON.stringify({
          funding_id: { _eq: project.id }
        })
      });
      
      project.teams = teamRelations.map(rel => rel.team_id).filter(Boolean);

      // Get associated lab projects
      const labProjectRelations = await apiRequest('/items/lab_projects_funding', {
        fields: [
          'lab_projects_id.id',
          'lab_projects_id.title',
          'lab_projects_id.slug',
          'lab_projects_id.short_description',
          'lab_projects_id.project_status',
          'lab_projects_id.start_date',
          'lab_projects_id.end_date'
        ],
        filter: JSON.stringify({
          funding_id: { _eq: project.id }
        })
      });
      
      project.lab_projects = labProjectRelations.map(rel => rel.lab_projects_id).filter(Boolean);

      // Get associated labs through lab projects - simplified approach
      if (project.lab_projects.length > 0) {
        const labProjectIds = project.lab_projects.map(lp => lp.id);
        
        const allLabRelations = await apiRequest('/items/labs_lab_projects', {
          fields: [
            'labs_id.id',
            'labs_id.name',
            'labs_id.short_name',
            'labs_id.slug',
            'labs_id.logo'
          ],
          filter: JSON.stringify({
            lab_projects_id: { _in: labProjectIds }
          })
        });
        
        // Remove duplicates by lab ID
        const uniqueLabs = [];
        const seenLabIds = new Set();
        
        allLabRelations.forEach(rel => {
          if (rel.labs_id && !seenLabIds.has(rel.labs_id.id)) {
            seenLabIds.add(rel.labs_id.id);
            uniqueLabs.push(rel.labs_id);
          }
        });
        
        project.labs = uniqueLabs;
      } else {
        project.labs = [];
      }
    }

    return funding;
  } catch (error) {
    console.error('Error fetching funding projects:', error);
    return [];
  }
}

/**
 * Fetch all funding agencies for filter dropdown
 */
export async function fetchFundingAgencies() {
  try {
    return await apiRequest('/items/funding_agencies', {
      fields: ['*'],
      sort: 'name'
    });
  } catch (error) {
    console.error('Error fetching funding agencies:', error);
    return [];
  }
}

/**
 * Fetch a specific funding project by ID with full details
 */
export async function fetchFundingById(fundingId, request = null) {
  try {
    const showDrafts = isDraftMode(request);
    
    const filter = {
      id: { _eq: fundingId },
      ...getContentFilter(showDrafts)
    };

    const funding = await apiRequest('/items/funding', {
      fields: [
        '*',
        'funding_agency.*'
      ],
      filter: JSON.stringify(filter),
      limit: 1
    });

    if (!funding || funding.length === 0) {
      return null;
    }

    const project = funding[0];

    // Get all related data as in fetchAllFunding
    const staffRelations = await apiRequest('/items/funding_staff', {
      fields: [
        'staff_id.*',
        'staff_id.department_id.name'
      ],
      filter: JSON.stringify({
        funding_id: { _eq: project.id }
      })
    });
    
    project.staff = staffRelations.map(rel => rel.staff_id).filter(Boolean);

    const teamRelations = await apiRequest('/items/funding_team', {
      fields: ['team_id.*'],
      filter: JSON.stringify({
        funding_id: { _eq: project.id }
      })
    });
    
    project.teams = teamRelations.map(rel => rel.team_id).filter(Boolean);

    const labProjectRelations = await apiRequest('/items/lab_projects_funding', {
      fields: ['lab_projects_id.*'],
      filter: JSON.stringify({
        funding_id: { _eq: project.id }
      })
    });
    
    project.lab_projects = labProjectRelations.map(rel => rel.lab_projects_id).filter(Boolean);

    // Get associated labs using the helper function
    project.labs = await fetchLabsForFunding(project.id);

    return project;
  } catch (error) {
    console.error('Error fetching funding project by ID:', error);
    return null;
  }
}

/**
 * Get unique grant statuses for filtering
 */
export async function fetchGrantStatuses() {
  try {
    const funding = await apiRequest('/items/funding', {
      fields: ['grant_status'],
      filter: JSON.stringify({
        grant_status: { _nnull: true }
      })
    });

    const statuses = [...new Set(funding.map(f => f.grant_status).filter(Boolean))];
    return statuses.sort();
  } catch (error) {
    console.error('Error fetching grant statuses:', error);
    return [];
  }
}