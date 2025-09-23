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
 * Check if a team exists in a division to be displayed as a "team"
 * (geoscience research, engagement and communications, information management, facilities, administration)
 */
export function isTeam(team) {
  if (!team || !team.division) return false;
  
  // Define which divisions are considered "geoscience research"
  // You can customize this list based on your actual division names/IDs
  const teamDivisions = [
    'geoscience research',
    'engagement and communications',
    'information management',
    'facilities',
    'administration'
    // Add more division names as needed
  ];
  
  const divisionName = team.division.name?.toLowerCase() || '';
  return teamDivisions.some(div => divisionName.includes(div));
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
 * Check if a staff member is a team leader for a specific team (this is set in API by doing a check for team leads in teams or staff tables in directus)
 */
export function isTeamLeadForTeam(member, team) {
  if (!team || !team.is_team_lead) return false;
  return team.is_team_lead === true;
}

/**
 * Check if a team is the primary team for a staff member
 * Updated to handle both the old logic and the new is_primary_team property
 */
export function isPrimaryTeamForMember(member, team) {
  if (!team) return false;
  
  // First check the new is_primary_team property (added by our API fix)
  if (team.is_primary_team === true) {
    return true;
  }
  
  // Fallback to old logic for backwards compatibility
  if (!member.team_primary) return false;
  
  // Handle both direct ID comparison and nested object comparison
  const primaryTeamId = typeof member.team_primary === 'object' 
    ? member.team_primary.id 
    : member.team_primary;
  const teamId = team.id;
  
  return primaryTeamId === teamId;
}

/**
 * Get team badge class based on role (leader, primary, or regular)
 */
export function getTeamBadgeClass(isTeamLead, isPrimary, isTeam) {
  if (isTeamLead && isTeam) {
    return getTeamLeadBadge().class;
  }
  
  if (isPrimary) {
    return getPrimaryTeamBadge().class;
  }
  
  return getRegularTeamBadge().class;
}

/**
 * Sort teams for display: leaders first, then primary, then regular
 * Note: A team should only appear once, even if someone is both leader and has it as primary
 */
export function sortTeamsForDisplay(member, teams) {
  if (!teams || !Array.isArray(teams)) return [];
  
  // Remove duplicates first (in case a team appears multiple times)
  const uniqueTeams = teams.filter((team, index, array) => 
    array.findIndex(t => t.id === team.id) === index
  );
  
  return uniqueTeams.sort((a, b) => {
    const aIsLead = isTeamLeadForTeam(member, a);
    const bIsLead = isTeamLeadForTeam(member, b);
    const aIsPrimary = isPrimaryTeamForMember(member, a);
    const bIsPrimary = isPrimaryTeamForMember(member, b);
    const aIsTeam = isTeam(a);
    const bIsTeam = isTeam(b);
    
    // Team leads (for geoscience research teams) come first
    if (aIsLead && aIsTeam && !(bIsLead && bIsTeam)) return -1;
    if (bIsLead && bIsTeam && !(aIsLead && aIsTeam)) return 1;
    
    // Primary teams come second (but after team leads)
    if (aIsPrimary && !bIsPrimary && !(bIsLead && bIsTeam)) return -1;
    if (bIsPrimary && !aIsPrimary && !(aIsLead && aIsTeam)) return 1;
    
    // Regular teams come last - sort alphabetically
    const aName = a.name || a.description || '';
    const bName = b.name || b.description || '';
    return aName.localeCompare(bName);
  });
}