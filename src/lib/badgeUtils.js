// src/lib/badgeUtils.js

/**
 * Get director badges for a staff member
 */
export function getDirectorBadges(member) {
  const badges = [];
  
  if (member.director_kgs) {
    badges.push({
      label: 'State Geologist',
      class: 'bg-amber-100 text-amber-800 border-amber-300'
    });
  }
  
  if (member.associate_dir) {
    badges.push({
      label: 'Associate Director',
      class: 'bg-amber-100 text-amber-800 border-amber-300'
    });
  }
  
  if (member.assistant_dir) {
    badges.push({
      label: 'Assistant Director', 
      class: 'bg-amber-100 text-amber-800 border-amber-300'
    });
  }
  
  if (member.div_director) {
    badges.push({
      label: 'Division Director',
      class: 'bg-amber-100 text-amber-800 border-amber-300'
    });
  }
  
  return badges;
}

/**
 * Check if a team is a Geoscience Research team
 */
export function isGeoscienceResearchTeam(team) {
  if (!team || !team.division) return false;
  
  const divisionName = team.division.name?.toLowerCase() || '';
  return divisionName.includes('geoscience research');
}

/**
 * Check if a team is an informal team (not Geoscience Research)
 */
export function isInformalTeam(team) {
  return !isGeoscienceResearchTeam(team);
}

/**
 * Get team lead badge styling
 */
export function getTeamLeadBadge() {
  return {
    label: 'Team Lead',
    class: 'bg-amber-50 text-amber-800 border-amber-300'
  };
}

/**
 * Get primary team badge styling
 */
export function getPrimaryTeamBadge() {
  return {
    class: 'bg-blue-50 text-blue-800 border-blue-300'
  };
}

/**
 * Get regular team badge styling
 */
export function getRegularTeamBadge() {
  return {
    class: 'bg-gray-100 text-gray-700 border-gray-300'
  };
}

/**
 * Check if a staff member is a team leader for a specific team
 */
export function isTeamLeadForTeam(member, team) {
  if (!team || !team.is_team_lead) return false;
  return team.is_team_lead === true;
}

/**
 * Check if a team is the primary team for a staff member
 */
export function isPrimaryTeamForMember(member, team) {
  if (!team) return false;
  
  // First check the new is_primary_team property
  if (team.is_primary_team === true) {
    return true;
  }
  
  // Fallback to old logic for backwards compatibility
  if (!member.team_primary) return false;
  
  const primaryTeamId = typeof member.team_primary === 'object' 
    ? member.team_primary.id 
    : member.team_primary;
  const teamId = team.id;
  
  return primaryTeamId === teamId;
}

/**
 * Get team badge class based on role (leader, primary, or regular)
 */
export function getTeamBadgeClass(isTeamLead, isPrimary) {
  if (isTeamLead) {
    return getTeamLeadBadge().class;
  }
  
  if (isPrimary) {
    return getPrimaryTeamBadge().class;
  }
  
  return getRegularTeamBadge().class;
}

/**
 * Get research page URL from team's research slug
 * Handles various possible data structures from the API
 */
export function getResearchUrl(team) {
  if (!team) return null;
  
  // Handle if research is an array with objects
  if (Array.isArray(team.research) && team.research.length > 0) {
    const research = team.research[0];
    // If it's an object with slug
    if (typeof research === 'object' && research.slug) {
      return `/research/${research.slug}`;
    }
    // If it's just an ID, we can't create a link (need to update API)
    return null;
  }
  
  // Handle if research is a direct object
  if (team.research?.slug) {
    return `/research/${team.research.slug}`;
  }
  
  // Try other possible paths
  const slug = team.research_id?.slug || team.research_slug || null;
  
  if (!slug) return null;
  return `/research/${slug}`;
}

/**
 * Separate teams into Geoscience Research teams and informal teams
 */
export function separateTeams(teams) {
  if (!teams || !Array.isArray(teams)) {
    return { researchTeams: [], informalTeams: [] };
  }
  
  const researchTeams = [];
  const informalTeams = [];
  
  teams.forEach(team => {
    if (isGeoscienceResearchTeam(team)) {
      researchTeams.push(team);
    } else {
      informalTeams.push(team);
    }
  });
  
  return { researchTeams, informalTeams };
}

/**
 * Sort Geoscience Research teams for display: leaders first, then primary, then regular
 */
export function sortResearchTeams(member, teams) {
  if (!teams || !Array.isArray(teams)) return [];
  
  // Remove duplicates first
  const uniqueTeams = teams.filter((team, index, array) => 
    array.findIndex(t => t.id === team.id) === index
  );
  
  return uniqueTeams.sort((a, b) => {
    const aIsLead = isTeamLeadForTeam(member, a);
    const bIsLead = isTeamLeadForTeam(member, b);
    const aIsPrimary = isPrimaryTeamForMember(member, a);
    const bIsPrimary = isPrimaryTeamForMember(member, b);
    
    // Team leads come first
    if (aIsLead && !bIsLead) return -1;
    if (bIsLead && !aIsLead) return 1;
    
    // Primary teams come second
    if (aIsPrimary && !bIsPrimary) return -1;
    if (bIsPrimary && !aIsPrimary) return 1;
    
    // Sort alphabetically
    const aName = a.name || a.description || '';
    const bName = b.name || b.description || '';
    return aName.localeCompare(bName);
  });
}

/**
 * Sort informal teams alphabetically
 */
export function sortInformalTeams(teams) {
  if (!teams || !Array.isArray(teams)) return [];
  
  return [...teams].sort((a, b) => {
    const aName = a.name || a.description || '';
    const bName = b.name || b.description || '';
    return aName.localeCompare(bName);
  });
}