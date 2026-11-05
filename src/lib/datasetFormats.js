// src/lib/datasetFormats.js
// Shared label / icon / color helpers for Directus dataset cards
// (used by DatasetCard.astro on the oil & gas, groundwater, and other data pages)

const FORMATS = {
  shp:     { label: 'Shapefile', icon: 'fa-map',          color: 'bg-blue-100 text-blue-800' },
  csv:     { label: 'CSV',       icon: 'fa-file-csv',     color: 'bg-green-100 text-green-800' },
  xls:     { label: 'Excel',     icon: 'fa-file-excel',   color: 'bg-emerald-100 text-emerald-800' },
  xlsx:    { label: 'Excel',     icon: 'fa-file-excel',   color: 'bg-emerald-100 text-emerald-800' },
  geojson: { label: 'GeoJSON',   icon: 'fa-map',          color: 'bg-teal-100 text-teal-800' },
  txt:     { label: 'Text',      icon: 'fa-file-lines',   color: 'bg-gray-100 text-gray-600' },
  doc:     { label: 'Word',      icon: 'fa-file-word',    color: 'bg-sky-100 text-sky-800' },
  docx:    { label: 'Word',      icon: 'fa-file-word',    color: 'bg-sky-100 text-sky-800' },
  pdf:     { label: 'PDF',       icon: 'fa-file-pdf',     color: 'bg-red-100 text-red-700' },
  zip:     { label: 'ZIP',       icon: 'fa-file-zipper',  color: 'bg-amber-100 text-amber-700' },
  rest:    { label: 'REST API',  icon: 'fa-code',         color: 'bg-indigo-100 text-indigo-800' },
};

const DEFAULT_COLOR = 'bg-gray-100 text-gray-600';

export function formatBadge(format) {
  if (!format) return null;
  return FORMATS[format.toLowerCase()]?.label ?? format.toUpperCase();
}

export function formatIcon(format) {
  if (!format) return 'fa-file';
  return FORMATS[format.toLowerCase()]?.icon ?? 'fa-file';
}

export function badgeColor(format) {
  if (!format) return DEFAULT_COLOR;
  return FORMATS[format.toLowerCase()]?.color ?? DEFAULT_COLOR;
}

// Extension label for the download button, e.g. ".../wells.zip?v=2" -> "ZIP"
const EXT_LABELS = { geojson: 'GeoJSON' };

export function getUrlExtension(url) {
  if (!url) return null;
  const match = url.split('?')[0].split('#')[0].match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return EXT_LABELS[ext] ?? ext.toUpperCase();
}

// "Data last updated: November 5, 2026" / "Data link added: ..." / null
export function datasetDateLine(dataset) {
  const raw = dataset.last_refreshed || dataset.date_updated || dataset.date_created;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  const label = dataset.last_refreshed || dataset.date_updated ? 'Data last updated' : 'Data link added';
  return `${label}: ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}