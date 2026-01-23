// src/lib/api_research.js
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
 * Fetch presentations associated with a research team using many-to-many relationship
 */
export async function fetchTeamPresentations(teamId, options = {}) {
  const { limit = null, yearGroup = true } = options;
  
  try {
    // Fetch the junction table entries
    const presentationRelations = await apiRequest('/items/presentations_team', {
      fields: [
        'presentations_id.id',
        'presentations_id.title',
        'presentations_id.year',
        'presentations_id.citation',
        'presentations_id.venue',
        'presentations_id.location',
        'presentations_id.date',
        'presentations_id.abstract',
        'presentations_id.slides_url',
        'presentations_id.video_url',
        'presentations_id.DOI',
        'presentations_id.paper_url'
      ],
      filter: JSON.stringify({
        team_id: {
          _eq: teamId
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
        // Sort by year (most recent first), then by date if available, then by title
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        
        if (yearA !== yearB) {
          return yearB - yearA;
        }
        
        // If same year, sort by date if available
        if (a.date && b.date) {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateB - dateA;
          }
        }
        
        // Finally sort by title
        return (a.title || '').localeCompare(b.title || '');
      });
    
    // Apply limit if specified
    if (limit) {
      presentations = presentations.slice(0, limit);
    }
    
    // If yearGroup is true, group presentations by year
    if (yearGroup) {
      const groupedByYear = {};
      
      presentations.forEach(pres => {
        const year = pres.year || 'Unknown Year';
        
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(pres);
      });
      
      return groupedByYear;
    }
    
    return presentations;
  } catch (error) {
    console.error(`Error fetching presentations for team ${teamId}:`, error);
    return yearGroup ? {} : [];
  }
}