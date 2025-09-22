// src/lib/badgeUtils.js

/**
 * Get all director badges for a staff member
 * Uses a cohesive color scheme with proper hierarchy
 */
export function getDirectorBadges(member) {
  const badges = [];
  
  // State Geologist - Highest authority (deep red/burgundy)
  if (member.director_kgs) {
    badges.push({ 
      label: 'State Geologist', 
      class: 'bg-purple-900/10 text-purple-900 border-purple-900/20',
      priority: 1
    });
  }
  
  // Associate Director - Second highest (deep blue)
  if (member.associate_dir) {
    badges.push({ 
      label: 'Associate Director', 
      class: 'bg-purple-900/10 text-purple-900 border-purple-900/20',
      priority: 2
    });
  }
  
  // Assistant Director - Third level (deep purple)
  if (member.assistant_dir) {
    badges.push({ 
      label: 'Assistant Director', 
      class: 'bg-purple-900/10 text-purple-900 border-purple-900/20',
      priority: 3
    });
  }
  
  // Division Director - Department level (deep teal)
  if (member.div_director) {
    badges.push({ 
      label: 'Division Director', 
      class: 'bg-purple-900/10 text-purple-900 border-purple-900/20',
      priority: 4
    });
  }
  
  // Sort by priority (lowest number = highest priority)
  return badges.sort((a, b) => a.priority - b.priority);
}

/**
 * Check if team is in Geoscience Research division
 */
export function isGeoscienceResearchTeam(team) {
  return team.division === 4 || team.division === "Geoscience Research" || team.division_name === "Geoscience Research";
}

/**
 * Get team lead badge configuration
 */
export function getTeamLeadBadge() {
  return {
    label: 'Team Lead',
    class: 'bg-amber-100/80 text-amber-800 border-amber-200'
  };
}

/**
 * Get team badge configuration (more subtle than before)
 */
export function getTeamBadgeClass(isTeamLead = false, isGeoscienceResearch = false) {
  if (isTeamLead && isGeoscienceResearch) {
    return 'bg-amber-100/80 text-amber-800 border-amber-200';
  }
  // Much more subtle team badges - light gray with subtle blue tint
  return 'bg-slate-100/80 text-slate-700 border-slate-200';
}

/**
 * Check if a person is the lead of a specific team
 * This should check team-specific leadership, not global leadership
 */
export function isTeamLeadForTeam(member, team) {
  // First check if there's team-specific leadership data
  if (team.is_team_lead !== undefined) {
    return team.is_team_lead;
  }
  
  // If no team-specific data and this is a Geoscience Research team,
  // fall back to global team lead status
  if (isGeoscienceResearchTeam(team) && member.is_team_lead) {
    return true;
  }
  
  return false;
}