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
    return [];
  }
}

/**
 * Fetch funding sources for a specific project
 */
export async function fetchProjectFunding(projectId) {
  try {
    // Get funding relations through the junction table
    const fundingRelations = await apiRequest('/items/lab_projects_funding', {
      fields: ['funding_id.*,funding_id.funding_agency.*'],
      filter: JSON.stringify({
        lab_projects_id: {
          _eq: projectId
        }
      })
    });

    if (!fundingRelations || fundingRelations.length === 0) {
      return [];
    }

    // Extract funding data and sort by amount (largest first)
    const funding = fundingRelations
      .map(relation => relation.funding_id)
      .filter(fundingItem => fundingItem) // Filter out any null/undefined entries
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));

    return funding;
  } catch (error) {
    console.error(`Error fetching funding for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Fetch all funding sources with pagination
 */
export async function fetchAllFunding(options = {}) {
  const { page = 1, limit = 50, active = null } = options;
  
  try {
    const offset = (page - 1) * limit;
    const filter = {};

    // Apply active filter if specified
    if (active !== null) {
      const today = new Date().toISOString().split('T')[0];
      if (active) {
        // Active funding has end_date in the future or null
        filter._or = [
          { end_date: { _null: true } },
          { end_date: { _gte: today } }
        ];
      } else {
        // Past funding has end_date in the past
        filter.end_date = { _lt: today };
      }
    }

    const funding = await apiRequest('/items/lab_funding', {
      fields: ['*'],
      filter: JSON.stringify(filter),
      sort: '-amount,-start_date',
      limit: limit,
      offset: offset
    });

    return funding;
  } catch (error) {
    console.error('Error fetching all funding:', error);
    return [];
  }
}

/**
 * Get total funding amount for a project
 */
export async function getProjectFundingTotal(projectId) {
  try {
    const funding = await fetchProjectFunding(projectId);
    return funding.reduce((total, grant) => total + (grant.amount || 0), 0);
  } catch (error) {
    console.error(`Error calculating total funding for project ${projectId}:`, error);
    return 0;
  }
}