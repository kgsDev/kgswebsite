// src/lib/api_staff.js
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
 * Determine leadership level for sorting (higher number = higher priority)
 */
function getLeadershipLevel(member) {
  if (member.director_kgs) return 4; // State Geologist - highest
  if (member.associate_dir) return 3; // Associate Director
  if (member.assistant_dir) return 2; // Assistant Director  
  if (member.div_director) return 1; // Division Director
  return 0; // Regular staff
}

/**
 * Fetch all staff members grouped by leadership and department
 */
export async function fetchStaffByDepartment() {
  try {
    // First get only departments marked for directory display
    const departments = await apiRequest('/items/departments', {
      fields: ['id', 'name', 'slug'],
      filter: JSON.stringify({
        directory: {
          _eq: true
        }
      }),
      sort: 'sort'
    });

    // Try to get staff with primary team first, fallback if permissions issue
    let staff = [];
    try {
      staff = await apiRequest('/items/staff', {
        fields: [
          '*', 
          'department_id.name', 
          'department_id.slug',
          'team_primary.id',
          'team_primary.name',
          'team_primary.team_icon',
          'team_primary.description',
          'team_primary.division.id',
          'team_primary.division.name',
          'team_primary.research.id',
          'team_primary.research.slug',
          'team_primary.research.title'
        ],
        filter: JSON.stringify({
          status: {
            _eq: 'active'
          }
        }),
        sort: 'department_id.name,sort,last_name,first_name'
      });
    } catch (error) {
      console.warn('Failed to fetch staff with team_primary, trying without:', error.message);
      // Fallback: fetch without team_primary fields
      staff = await apiRequest('/items/staff', {
        fields: [
          '*', 
          'department_id.name', 
          'department_id.slug'
        ],
        filter: JSON.stringify({
          status: {
            _eq: 'active'
          }
        }),
        sort: 'department_id.name,sort,last_name,first_name'
      });
    }

    // Initialize the structure with leadership section first
    const staffByDepartment = {
      'State Geologist and Directors': []
    };

    // Initialize departments (only those marked for directory)
    if (Array.isArray(departments)) {
      departments.forEach(dept => {
        staffByDepartment[dept.name] = [];
      });
    }

    // Add "Other" department for staff without a department
    staffByDepartment['Other'] = [];

    // Group staff into departments
    if (Array.isArray(staff) && staff.length > 0) {
      // Fetch teams for all staff members
      const allStaffIds = staff.map(member => member.id);
      
      // Get all staff-team membership relationships (who belongs to which teams)
      const allTeamRelations = await apiRequest('/items/staff_team', {
        fields: ['staff_id', 'team_id'],
        filter: JSON.stringify({
          staff_id: {
            _in: allStaffIds
          }
        })
      });
      
      // Also get all team leadership relationships (who leads which teams)
      const allTeamLeaderRelations = await apiRequest('/items/team_staff', {
        fields: ['staff_id', 'team_id'],
        filter: JSON.stringify({
          staff_id: {
            _in: allStaffIds
          }
        })
      });
      
      // Extract all unique team IDs we need to fetch (from both membership and leadership)
      const teamIds = [];
      if (allTeamRelations && allTeamRelations.length > 0) {
        allTeamRelations.forEach(relation => {
          if (relation.team_id && !teamIds.includes(relation.team_id)) {
            teamIds.push(relation.team_id);
          }
        });
      }
      if (allTeamLeaderRelations && allTeamLeaderRelations.length > 0) {
        allTeamLeaderRelations.forEach(relation => {
          if (relation.team_id && !teamIds.includes(relation.team_id)) {
            teamIds.push(relation.team_id);
          }
        });
      }
      
      // Now fetch all team data at once
      let teamData = [];
      if (teamIds.length > 0) {
        teamData = await apiRequest('/items/team', {
          fields: [
            '*', 
            'division.id', 
            'division.name',
            'research.id',
            'research.slug', 
            'research.title'
          ],
          filter: JSON.stringify({
            id: {
              _in: teamIds
            }
          })
        });
        
      }
      
      // Fetch team leader relationships for all teams (who leads which teams)
      let teamLeaderRelations = [];
      if (teamIds.length > 0) {
        teamLeaderRelations = await apiRequest('/items/team_staff', {
          fields: ['team_id', 'staff_id'],
          filter: JSON.stringify({
            team_id: {
              _in: teamIds
            }
          })
        });
      }
      
      // Create a map of team ID to team leaders
      const teamLeadersMap = {};
      teamLeaderRelations.forEach(relation => {
        if (!teamLeadersMap[relation.team_id]) {
          teamLeadersMap[relation.team_id] = [];
        }
        teamLeadersMap[relation.team_id].push(relation.staff_id);
      });
      
      // Create a map of team ID to team data for quick lookup
      const teamMap = {};
      teamData.forEach(team => {
        teamMap[team.id] = {
          ...team,
          team_leaders: teamLeadersMap[team.id] || []
        };
      });
      
      // Create a map of staff ID to teams (from both membership and leadership)
      const staffTeamsMap = {};
      
      // Process membership relationships
      if (allTeamRelations && allTeamRelations.length > 0) {
        allTeamRelations.forEach(relation => {
          const staffId = relation.staff_id;
          const teamId = relation.team_id;
          
          if (!staffTeamsMap[staffId]) {
            staffTeamsMap[staffId] = new Map(); // Use Map to avoid duplicates
          }
          
          // Only add the team if we have data for it and it's not null
          if (teamId && teamMap[teamId]) {
            const team = teamMap[teamId];
            staffTeamsMap[staffId].set(teamId, {
              ...team,
              is_team_lead: team.team_leaders.includes(staffId),
              source: 'membership'
            });
          }
        });
      }
      
      // Process leadership relationships (these take precedence for leadership status)
      if (allTeamLeaderRelations && allTeamLeaderRelations.length > 0) {
        allTeamLeaderRelations.forEach(relation => {
          const staffId = relation.staff_id;
          const teamId = relation.team_id;
          
          if (!staffTeamsMap[staffId]) {
            staffTeamsMap[staffId] = new Map();
          }
          
          if (teamId && teamMap[teamId]) {
            const team = teamMap[teamId];
            // If team already exists from membership, update it; otherwise add it
            staffTeamsMap[staffId].set(teamId, {
              ...team,
              is_team_lead: true,
              source: staffTeamsMap[staffId].has(teamId) ? 'both' : 'leadership'
            });
          }
        });
      }
      
      // Convert Maps back to arrays
      Object.keys(staffTeamsMap).forEach(staffId => {
        staffTeamsMap[staffId] = Array.from(staffTeamsMap[staffId].values());
      });
      
      // Process staff members
      staff.forEach(member => {
        const departmentName = member.department_id?.name || 'Other';
        
        // Ensure the member has the department name directly as a property
        member.department = departmentName;
        
        // Add team data from the lookup map
        member.team = staffTeamsMap[member.id] || [];
        
        // Generate team names string for filtering
        if (member.team.length > 0) {
          member.teamNames = member.team
            .map(team => team.name || team.description || team.title || '')
            .filter(Boolean)
            .join('|');
        } else {
          member.teamNames = '';
        }
        
        // Check if member is a team leader (only from leading specific teams)
        member.is_team_lead = member.team && member.team.some(team => team.is_team_lead);
        
        // Ensure primary team is included even if not in membership table
        if (member.team_primary && member.team_primary.id) {
          const primaryTeamExists = member.team.some(team => team.id === member.team_primary.id);
          if (!primaryTeamExists) {
            member.team.push({
              ...member.team_primary,
              is_team_lead: false // We don't know leadership status for non-membership teams
            });
          }
        }
        
        // Determine where to place this staff member
        const leadershipLevel = getLeadershipLevel(member);
        
        if (leadershipLevel > 0) {
          // This person is a director - add to leadership section
          staffByDepartment['State Geologist and Directors'].push(member);
        } else {
          // Regular staff member - add to their department
          // But only if their department is marked for directory display
          if (staffByDepartment[departmentName]) {
            staffByDepartment[departmentName].push(member);
          } else if (departmentName === 'Other') {
            // Always allow "Other" department
            staffByDepartment['Other'].push(member);
          }
          // If department not marked for directory, staff member is excluded
        }
      });
      
      // Now fetch locations for all staff members (only if we have staff)
      const allLocationRelations = await apiRequest('/items/staff_locations', {
        fields: ['staff_id', 'locations_id.*'],
        filter: JSON.stringify({
          staff_id: {
            _in: allStaffIds
          }
        })
      });
      
      // Create a map of staff ID to locations
      const staffLocationsMap = {};
      if (allLocationRelations && allLocationRelations.length > 0) {
        allLocationRelations.forEach(relation => {
          const staffId = relation.staff_id;
          if (!staffLocationsMap[staffId]) {
            staffLocationsMap[staffId] = [];
          }
          if (relation.locations_id) {
            staffLocationsMap[staffId].push(relation.locations_id);
          }
        });
      }
      
      // Add location data to all staff members
      Object.values(staffByDepartment).flat().forEach(member => {
        member.location = staffLocationsMap[member.id] || [];
      });
      
      // Sort leadership section by hierarchy
      staffByDepartment['State Geologist and Directors'].sort((a, b) => {
        const aLevel = getLeadershipLevel(a);
        const bLevel = getLeadershipLevel(b);
        
        // Higher leadership level comes first
        if (aLevel !== bLevel) return bLevel - aLevel;
        
        // Within same level, sort by sort field, then name
        if (a.sort !== b.sort) return a.sort - b.sort;
        
        return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`);
      });
      
      // Sort each department's staff (excluding leadership section)
      Object.keys(staffByDepartment).forEach(dept => {
        if (dept !== 'State Geologist and Directors') {
          staffByDepartment[dept].sort((a, b) => {
            // Team leads first
            if (a.is_team_lead && !b.is_team_lead) return -1;
            if (!a.is_team_lead && b.is_team_lead) return 1;
            
            // Then sort by the sort field
            if (a.sort !== b.sort) return a.sort - b.sort;
            
            // Finally sort by last name, first name
            return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`);
          });
        }
      });
    }
    
    // Remove empty departments
    Object.keys(staffByDepartment).forEach(dept => {
      if (staffByDepartment[dept].length === 0) {
        delete staffByDepartment[dept];
      }
    });
    
    return staffByDepartment;
  } catch (error) {
    console.error('Error fetching staff by department:', error);
    return {};
  }
}

/**
 * Fetch all staff slugs for generating static paths
 */
export async function fetchAllStaffSlugs() {
  try {
    const staff = await apiRequest('/items/staff', {
      fields: ['slug'],
      filter: JSON.stringify({
        status: {
          _eq: 'active'
        }
      })
    });
    
    return staff.map(member => member.slug);
  } catch (error) {
    console.error('Error fetching staff slugs:', error);
    return [];
  }
}

/**
 * Fetch a staff member by slug
 */
export async function fetchStaffBySlug(slug) {
  try {
    // Try to get staff with primary team first, fallback if permissions issue
    let staff = [];
    try {
      staff = await apiRequest('/items/staff', {
        fields: [
          '*',
          'department_id.name', 
          'department_id.slug',
          'team_primary.id',
          'team_primary.name',
          'team_primary.team_icon',
          'team_primary.description',
          'team_primary.division.id',
          'team_primary.division.name',
          'team_primary.research.id',
          'team_primary.research.slug',
          'team_primary.research.title'
        ],
        filter: JSON.stringify({
          slug: {
            _eq: slug
          },
          status: {
            _eq: 'active'
          }
        }),
        limit: 1
      });
    } catch (error) {
      console.warn('Failed to fetch staff with team_primary, trying without:', error.message);
      // Fallback: fetch without team_primary fields
      staff = await apiRequest('/items/staff', {
        fields: [
          '*',
          'department_id.id',
          'department_id.name', 
          'department_id.slug'
        ],
        filter: JSON.stringify({
          slug: {
            _eq: slug
          },
          status: {
            _eq: 'active'
          }
        }),
        limit: 1
      });
    }
    
    if (!staff || staff.length === 0) {
      return null;
    }
    
    const member = staff[0];
    member.department = member.department_id?.name || 'Other';
    
    
    // After getting the basic staff member, fetch teams and locations and labs separately
    try {
      // Fetch teams for this staff member (membership)
      const teams = await apiRequest('/items/staff_team', {
        fields: [
          'team_id.*', 
          'team_id.division.id', 
          'team_id.division.name',
          'team_id.research.id',
          'team_id.research.slug',
          'team_id.research.title'
        ],
        filter: JSON.stringify({
          staff_id: {
            _eq: member.id
          }
        })
      });
      
      // Also fetch teams where this person is a leader
      const leadershipTeams = await apiRequest('/items/team_staff', {
        fields: [
          'team_id.*', 
          'team_id.division.id', 
          'team_id.division.name',
          'team_id.research.id',
          'team_id.research.slug',
          'team_id.research.title'
        ],
        filter: JSON.stringify({
          staff_id: {
            _eq: member.id
          }
        })
      });
      
      // Combine membership and leadership teams, removing nulls and duplicates
      const allTeamsData = [];
      const seenTeamIds = new Set();
      
      // FIRST: Add primary team if it exists (this was missing before!)
      if (member.team_primary && member.team_primary.id) {
        allTeamsData.push({
          team_data: member.team_primary,
          is_leader: false, // Primary team doesn't automatically mean leadership
          is_primary: true
        });
        seenTeamIds.add(member.team_primary.id);
      }
      
      // Add membership teams (filter out nulls and duplicates)
      if (teams && teams.length > 0) {
        teams.forEach(t => {
          if (t && t.team_id && t.team_id.id && !seenTeamIds.has(t.team_id.id)) {
            allTeamsData.push({
              team_data: t.team_id,
              is_leader: false,
              is_primary: false
            });
            seenTeamIds.add(t.team_id.id);
          }
        });
      }
      
      // Add leadership teams and update existing ones
      if (leadershipTeams && leadershipTeams.length > 0) {
        leadershipTeams.forEach(t => {
          if (t && t.team_id && t.team_id.id) {
            if (!seenTeamIds.has(t.team_id.id)) {
              // New team where they're a leader
              allTeamsData.push({
                team_data: t.team_id,
                is_leader: true,
                is_primary: false
              });
              seenTeamIds.add(t.team_id.id);
            } else {
              // Already in the list, mark as leader
              const existingTeam = allTeamsData.find(team => team.team_data.id === t.team_id.id);
              if (existingTeam) {
                existingTeam.is_leader = true;
              }
            }
          }
        });
      }
      
      if (allTeamsData.length > 0) {
        member.team = allTeamsData.map(teamInfo => ({
          ...teamInfo.team_data,
          is_team_lead: teamInfo.is_leader,
          is_primary_team: teamInfo.is_primary
        }));
        
        // Check if member is a team leader for any teams
        member.is_team_lead = member.team.some(team => team.is_team_lead);
        
      } else {
        // If no teams, not a team leader
        member.is_team_lead = false;
        member.team = [];
      }
      
      // Fetch locations for this staff member
      const locations = await apiRequest('/items/staff_locations', {
        fields: ['locations_id.*'],
        filter: JSON.stringify({
          staff_id: {
            _eq: member.id
          }
        })
      });
      
      if (locations && locations.length > 0) {
        member.location = locations.map(l => l.locations_id);
      }

      // Fetch labs for this staff member
      const labs = await apiRequest('/items/labs_staff', {
        fields: ['labs_id.*'],
        filter: JSON.stringify({
          staff_id: {
            _eq: member.id
          }
        })
      });

      if (labs && labs.length > 0) {
        member.labs = labs.map(l => l.labs_id);
      }

    } catch (error) {
      console.error('Error fetching teams or locations:', error);
      // Don't fail the whole request if just teams/locations fail
    }
    
    return member;
  } catch (error) {
    console.error(`Error fetching staff member with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch related staff in the same department
 */
export async function fetchRelatedStaff(departmentId, excludeId, limit = 4) {
  try {
    const staff = await apiRequest('/items/staff', {
      fields: [
        'id', 
        'first_name', 
        'last_name', 
        'working_title', 
        'slug', 
        'photo'
      ],
      filter: JSON.stringify({
        department_id: {
          _eq: departmentId
        },
        id: {
          _neq: excludeId
        },
        status: {
          _eq: 'active'
        }
      }),
      sort: 'sort,last_name,first_name',
      limit: limit
    });
    
    return staff;
  } catch (error) {
    console.error('Error fetching related staff:', error);
    return [];
  }
}

/**
 * Fetch all departments
 */
export async function fetchAllDepartments() {
  try {
    return await apiRequest('/items/departments', {
      fields: ['*'],
      sort: 'name'
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}