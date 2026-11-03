// src/lib/eventTypes.js
export const EVENT_TYPES = {
  speaker:    { label: "Speaker",       color: "bg-sky-100 text-sky-800",     iconColor: "text-sky-700",   icon: "fa-chalkboard-teacher" },
  tabling:    { label: "Tabling",       color: "bg-amber-100 text-amber-800", iconColor: "text-amber-700", icon: "fa-users" },
  kgs_hosted: { label: "KGS Hosted",    color: "bg-teal-100 text-teal-800",   iconColor: "text-teal-700",  icon: "fa-landmark" },
  other_orgs: { label: "Other Organizations", color: "bg-rose-100 text-rose-800",   iconColor: "text-rose-700",  icon: "fa-people" }, // ← keep your values, add iconColor
};

export function isValidEventType(key) {
  return Object.hasOwn(EVENT_TYPES, key);
}

export function getEventType(key) {
  if (!key) return null;
  return EVENT_TYPES[key] ?? {
    label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: "bg-gray-100 text-gray-800",
    icon: "fa-calendar-check",
  };
}

/**
 * Normalize an article's event types to an array of keys.
 * Handles: ['speaker','tabling'] | '["speaker","tabling"]' | 'speaker,tabling'
 */
export function parseEventTypeKeys(article) {
  let raw = article?.event_types;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.split(',');
    }
    if (typeof raw === 'string') raw = [raw];
  }

  let keys = Array.isArray(raw) ? raw : [];

  const set = new Set(keys.map((k) => String(k).trim()).filter(Boolean));
  // Known types in EVENT_TYPES order, then any unknown values
  const known = Object.keys(EVENT_TYPES).filter((k) => set.has(k));
  const unknown = [...set].filter((k) => !Object.hasOwn(EVENT_TYPES, k));
  return [...known, ...unknown];
}

/** Array of { key, label, color, iconColor, icon } for an article. */
export function getEventTypes(article) {
  return parseEventTypeKeys(article).map((key) => ({ key, ...getEventType(key) }));
}