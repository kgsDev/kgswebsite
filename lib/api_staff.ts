
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
 * Fetch all staff members grouped by department
 */
export async function fetchStaffByDepartment() {
  try {
    // First get all departments
    const departments = await apiRequest('/items/departments', {
      fields: ['id', 'name', 'slug'],
      sort: 'sort'
    });

    // Then get all active staff members with full department info
    const staff = await apiRequest('/items/staff', {
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
      sort: 'department_id.name,-department_head,sort,last_name,first_name'
    });

    // Group staff by department
    const staffByDepartment = {};

    // Initialize departments
    if (Array.isArray(departments)) {
      departments.forEach(dept => {
        staffByDepartment[dept.name] = [];
      });
    }

    // Add "Other" department for staff without a department
    staffByDepartment['Other'] = [];

    // Group staff into departments
    if (Array.isArray(staff)) {
      staff.forEach(member => {
        const departmentName = member.department_id?.name || 'Other';
        
        // Ensure the member has the department name directly as a property
        member.department = departmentName;
        
        // Add to the appropriate department
        if (!staffByDepartment[departmentName]) {
          staffByDepartment[departmentName] = [];
        }
        
        staffByDepartment[departmentName].push(member);
      });
      
      // Sort each department's staff to put department heads first
      Object.keys(staffByDepartment).forEach(dept => {
        staffByDepartment[dept].sort((a, b) => {
          // Department heads come first
          if (a.department_head && !b.department_head) return -1;
          if (!a.department_head && b.department_head) return 1;
          
          // Then sort by the sort field
          if (a.sort !== b.sort) return a.sort - b.sort;
          
          // Finally sort by last name, first name
          return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`);
        });
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
    // Note: This is a safer approach to avoid 404 errors
    const staff = await apiRequest('/items/staff', {
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
    
    if (!staff || staff.length === 0) {
      return null;
    }
    
    const member = staff[0];
    member.department = member.department_id?.name || 'Other';

    // After getting the basic staff member, fetch teams and locations separately
    try {
      // Fetch teams for this staff member
      const teams = await apiRequest('/items/staff_team', {
        fields: ['team_id.*'],
        filter: JSON.stringify({
          staff_id: {
            _eq: member.id
          }
        })
      });

      if (teams && teams.length > 0) {
        member.team = teams.map(t => t.team_id);
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