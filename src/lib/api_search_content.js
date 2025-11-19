// src/lib/api_search_content.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PUBLIC_DIRECTUS_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

async function apiRequest(path, params) {
  try {
    const response = await api.get(path, { params });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    return [];
  }
}

// ===== PAGES =====
export async function fetchAllPages() {
  return await apiRequest('/items/pages', {
    fields: ['*'],
    sort: 'title'
  });
}

export async function fetchPageBySlug(slug) {
  const pages = await apiRequest('/items/pages', {
    fields: ['*'],
    filter: JSON.stringify({ slug: { _eq: slug } }),
    limit: 1
  });
  return pages[0] || null;
}

// ===== RESEARCH =====
export async function fetchAllResearch() {
  return await apiRequest('/items/research', {
    fields: ['*'],
    sort: '-date_created'
  });
}

export async function fetchResearchBySlug(slug) {
  const research = await apiRequest('/items/research', {
    fields: ['*'],
    filter: JSON.stringify({ slug: { _eq: slug } }),
    limit: 1
  });
  return research[0] || null;
}

// ===== ASSOCIATED ORGS =====
export async function fetchAllAssociatedOrgs() {
  return await apiRequest('/items/associated_orgs', {
    fields: ['*'],
    sort: 'name'
  });
}

// ===== MONITORING NETWORKS =====
export async function fetchAllMonitoringNetworks() {
  return await apiRequest('/items/monitoring_networks', {
    fields: ['*'],
    sort: 'title'
  });
}

// ===== ADVISORY BOARD =====
export async function fetchAllAdvisoryBoard() {
  return await apiRequest('/items/advisory_board', {
    fields: ['*'],
    sort: 'last,first'
  });
}

// ===== LOCATIONS =====
export async function fetchAllLocations() {
  return await apiRequest('/items/locations', {
    fields: ['*'],
    sort: 'name'
  });
}

export async function fetchLocationBySlug(slug) {
  const locations = await apiRequest('/items/locations', {
    fields: ['*'],
    filter: JSON.stringify({ slug: { _eq: slug } }),
    limit: 1
  });
  return locations[0] || null;
}

// ===== INTERN DETAILS =====
export async function fetchInternDetails() {
  return await apiRequest('/items/intern_details', {
    fields: ['*']
  });
}

// ===== INTERN FAQS =====
export async function fetchInternFAQs() {
  return await apiRequest('/items/intern_faqs', {
    fields: ['*'],
    sort: 'sort'
  });
}

// ===== INTERN FINAL PROJECT DETAILS =====
export async function fetchInternFinalProjects() {
  return await apiRequest('/items/intern_final_projects_details', {
    fields: ['*'],
    sort: '-project_year'
  });
}

export async function fetchInternFinalProjectByYear(year) {
  const projects = await apiRequest('/items/intern_final_projects_details', {
    fields: ['*'],
    filter: JSON.stringify({ project_year: { _eq: year } }),
    limit: 1
  });
  return projects[0] || null;
}

// ===== INTERN PROJECTS =====
export async function fetchAllInternProjects() {
  return await apiRequest('/items/intern_projects', {
    fields: ['*'],
    sort: '-date_created'
  });
}

export async function fetchInternProjectsByYear(year) {
  return await apiRequest('/items/intern_projects', {
    fields: ['*'],
    filter: JSON.stringify({ 
      year: { _eq: year } 
    }),
    sort: 'name_intern'
  });
}

// ===== LABS =====
export async function fetchAllLabs() {
  return await apiRequest('/items/labs', {
    fields: ['*'],
    sort: 'name'
  });
}

export async function fetchLabBySlug(slug) {
  const labs = await apiRequest('/items/labs', {
    fields: ['*'],
    filter: JSON.stringify({ slug: { _eq: slug } }),
    limit: 1
  });
  return labs[0] || null;
}

//News
export async function fetchAllNews() {
  return await apiRequest('/items/articles', {
    fields: ['*'],
    filter: JSON.stringify({
      status: { _eq: 'published' }  // Only fetch published articles
    }),
    sort: '-publication_date'
  });
}

export async function fetchNewsBySlug(slug) {
  const news = await apiRequest('/items/articles', {
    fields: ['*'],
    filter: JSON.stringify({ slug: { _eq: slug } }),
    limit: 1
  });
  return news[0] || null;
}