// One-time setup: creates the podcast collections in Directus and seeds starter topics.
// Safe to re-run — anything that already exists is skipped.
//
// Usage (from the Astro project root):
//   node scripts/podcast-setup.mjs
//
// Reads from .env: PUBLIC_DIRECTUS_URL, DIRECTUS_ADMIN_TOKEN (schema changes need an admin token)

import dotenv from 'dotenv';
dotenv.config();

const { PUBLIC_DIRECTUS_URL: DIRECTUS_URL, DIRECTUS_ADMIN_TOKEN } = process.env;
if (!DIRECTUS_URL || !DIRECTUS_ADMIN_TOKEN) {
  console.error('Set PUBLIC_DIRECTUS_URL and DIRECTUS_ADMIN_TOKEN in .env');
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL.replace(/\/$/, '')}${path}`, {
    method,
    headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function exists(path) {
  const res = await fetch(`${DIRECTUS_URL.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}` },
  });
  return res.ok;
}

// ---- field builders ---------------------------------------------------------

const pk = {
  field: 'id', type: 'integer',
  meta: { hidden: true, readonly: true, interface: 'input' },
  schema: { is_primary_key: true, has_auto_increment: true },
};
const str = (field, meta = {}, schema = {}) => ({
  field, type: 'string', meta: { interface: 'input', width: 'half', ...meta }, schema: { max_length: 1024, ...schema },
});
const txt = (field, meta = {}) => ({ field, type: 'text', meta: { interface: 'input-multiline', ...meta }, schema: {} });
const int = (field, meta = {}) => ({ field, type: 'integer', meta: { interface: 'input', width: 'half', ...meta }, schema: {} });

// ---- collections ------------------------------------------------------------

const topicsCollection = {
  collection: 'podcast_topics',
  meta: { icon: 'label', note: 'Topics used to organize Big Blue Rock Pod episodes', display_template: '{{name}}', sort_field: 'sort' },
  schema: {},
  fields: [
    pk,
    str('name', { required: true }),
    str('slug', { required: true, note: 'URL-safe, e.g. "earthquakes" → /podcast?topic=earthquakes' }, { is_unique: true }),
    txt('keywords', { note: 'Comma-separated words. New episodes whose title or description contain any of these get this topic automatically.' }),
    int('sort', { hidden: true }),
  ],
};

const episodesCollection = {
  collection: 'podcast_episodes',
  meta: {
    icon: 'podcasts', note: 'Synced monthly from the Podbean RSS feed',
    display_template: '{{title}}', sort_field: null,
    archive_field: 'status', archive_value: 'archived', unarchive_value: 'draft',
  },
  schema: {},
  fields: [
    pk,
    {
      field: 'status', type: 'string',
      meta: {
        interface: 'select-dropdown', width: 'half', note: 'Only "published" episodes show on the site',
        options: { choices: [
          { text: 'Published', value: 'published' },
          { text: 'Draft', value: 'draft' },
          { text: 'Archived', value: 'archived' },
        ] },
      },
      schema: { default_value: 'published', is_nullable: false },
    },
    str('guid', { readonly: true, note: 'Podbean episode ID — the sync matches on this' }, { is_unique: true }),
    str('title', { width: 'full', readonly: true }),
    int('episode_number', { readonly: true }),
    int('season', { readonly: true }),
    { field: 'pub_date', type: 'timestamp', meta: { interface: 'datetime', width: 'half', readonly: true }, schema: {} },
    str('duration', { readonly: true }),
    txt('summary', { readonly: true, note: 'Plain-text excerpt of the description' }),
    { field: 'description', type: 'text', meta: { interface: 'input-rich-text-html', readonly: true }, schema: {} },
    str('audio_url', { readonly: true }),
    str('episode_url', { readonly: true }),
    str('image_url', { readonly: true }),
  ],
};

const junctionCollection = {
  collection: 'podcast_episodes_topics',
  meta: { hidden: true, icon: 'import_export' },
  schema: {},
  fields: [
    pk,
    { field: 'podcast_episodes_id', type: 'integer', meta: { hidden: true }, schema: {} },
    { field: 'podcast_topics_id', type: 'integer', meta: { hidden: true }, schema: {} },
  ],
};

const starterTopics = [
  { name: 'Coal', slug: 'coal', keywords: 'coal, mining, mine reclamation', sort: 1 },
  { name: 'Earthquakes & Hazards', slug: 'hazards', keywords: 'earthquake, seismic, fault, landslide, sinkhole, hazard', sort: 2 },
  { name: 'Water', slug: 'water', keywords: 'groundwater, aquifer, karst, spring, well water, watershed', sort: 3 },
  { name: 'Fossils', slug: 'fossils', keywords: 'fossil, paleontolog, trilobite, dinosaur', sort: 4 },
  { name: 'Energy', slug: 'energy', keywords: 'oil, natural gas, geothermal, carbon storage, energy', sort: 5 },
  { name: 'Minerals & Rocks', slug: 'minerals', keywords: 'mineral, rock, limestone, geode, crystal, critical mineral', sort: 6 },
  { name: 'Maps & Data', slug: 'maps-data', keywords: 'map, mapping, gis, lidar, data', sort: 7 },
];

// ---- run --------------------------------------------------------------------

for (const c of [topicsCollection, episodesCollection, junctionCollection]) {
  if (await exists(`/collections/${c.collection}`)) {
    console.log(`skip   ${c.collection} (exists)`);
  } else {
    await api('POST', '/collections', c);
    console.log(`create ${c.collection}`);
  }
}

if (await exists('/fields/podcast_episodes/topics')) {
  console.log('skip   podcast_episodes.topics (exists)');
} else {
  await api('POST', '/fields/podcast_episodes', {
    field: 'topics', type: 'alias',
    meta: {
      special: ['m2m'], interface: 'list-m2m',
      options: { template: '{{podcast_topics_id.name}}', enableCreate: false },
      note: 'Auto-suggested for new episodes from topic keywords — edit freely; the sync never changes these after creation',
    },
  });

  // episodes ←→ junction
  await api('POST', '/relations', {
    collection: 'podcast_episodes_topics', field: 'podcast_episodes_id', related_collection: 'podcast_episodes',
    meta: { one_field: 'topics', junction_field: 'podcast_topics_id' },
    schema: { on_delete: 'CASCADE' },
  });
  // topics ←→ junction
  await api('POST', '/relations', {
    collection: 'podcast_episodes_topics', field: 'podcast_topics_id', related_collection: 'podcast_topics',
    meta: { one_field: null, junction_field: 'podcast_episodes_id' },
    schema: { on_delete: 'CASCADE' },
  });
  console.log('create podcast_episodes.topics (M2M)');
}

const { data: existingTopics } = await api('GET', '/items/podcast_topics?limit=1');
if (existingTopics.length) {
  console.log('skip   starter topics (topics already exist)');
} else {
  await api('POST', '/items/podcast_topics', starterTopics);
  console.log(`seed   ${starterTopics.length} starter topics`);
}

console.log('\nDone. Next: grant read permissions (see notes), then run podcast-sync.mjs.');
