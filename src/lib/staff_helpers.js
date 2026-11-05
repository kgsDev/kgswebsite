// Departments whose staff are identified by their primary team instead
const TEAM_DEPARTMENTS = new Set(['geoscience research', 'facilities']);
const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * Which group label to show under a staff member's name.
 * Returns { name, kind: 'team' | 'department' } or null.
 */
export function staffGroup(person) {
  const dept = person?.department_id?.name?.trim() || null;
  const team = person?.team_primary?.name?.trim() || null;

  if (dept && TEAM_DEPARTMENTS.has(norm(dept)) && team) {
    return { name: team, kind: 'team' };
  }
  if (dept) return { name: dept, kind: 'department' };
  if (team) return { name: team, kind: 'team' };   // no department on record
  return null;
}