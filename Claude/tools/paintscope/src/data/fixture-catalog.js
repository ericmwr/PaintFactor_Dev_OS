// ============================================================
// FIXTURE CATALOG — items present but not being painted (v0.7)
// defaultProtection uses canonical mask-level vocab from data/mask-levels.js.
// These represent worst-case (spray) protection. Context-dependent
// resolution happens at estimation time.
// ============================================================
export const FIXTURE_CATALOG = [
  // Kitchen
  { id: 'cabinets',    group: 'Kitchen',  label: 'Cabinets',         defaultProtection: 'full' },
  { id: 'countertops', group: 'Kitchen',  label: 'Countertops',      defaultProtection: 'full' },
  { id: 'appliances',  group: 'Kitchen',  label: 'Appliances',       defaultProtection: 'partial' },
  { id: 'backsplash',  group: 'Kitchen',  label: 'Backsplash',       defaultProtection: 'partial' },
  // Bathroom
  { id: 'bathtub',     group: 'Bathroom', label: 'Bathtub',          defaultProtection: 'full' },
  { id: 'shower',      group: 'Bathroom', label: 'Shower/Enclosure', defaultProtection: 'full' },
  { id: 'toilet',      group: 'Bathroom', label: 'Toilet',           defaultProtection: 'partial' },
  { id: 'vanity',      group: 'Bathroom', label: 'Vanity',           defaultProtection: 'partial' },
  // Features
  { id: 'fireplace',        group: 'Feature', label: 'Fireplace',         defaultProtection: 'full' },
  { id: 'stone_fireplace',  group: 'Feature', label: 'Stone Fireplace',   defaultProtection: 'full' },
  { id: 'feature_wall',     group: 'Feature', label: 'Feature Wall',      defaultProtection: 'encapsulate' },
  { id: 'builtin_shelving', group: 'Feature', label: 'Built-in Shelving', defaultProtection: 'partial' },
  { id: 'light_fixtures',   group: 'Feature', label: 'Light Fixtures',    defaultProtection: 'edge' },
];

export const FIXTURE_MAP = Object.fromEntries(FIXTURE_CATALOG.map(f => [f.id, f]));

export const FIXTURE_GROUPS = [...new Set(FIXTURE_CATALOG.map(f => f.group))].map(g => ({
  group: g,
  items: FIXTURE_CATALOG.filter(f => f.group === g)
}));

export const FLOOR_TYPES = [
  { id: 'subfloor',  label: 'Subfloor (Plywood/OSB)', defaultProtection: 'edge' },
  { id: 'hardwood',  label: 'Hardwood',               defaultProtection: 'full' },
  { id: 'tile',      label: 'Tile / Stone',            defaultProtection: 'partial' },
  { id: 'carpet',    label: 'Carpet',                  defaultProtection: 'full' },
  { id: 'lvp',       label: 'LVP / Laminate',          defaultProtection: 'partial' },
  { id: 'concrete',  label: 'Concrete',                defaultProtection: 'edge' },
];

// Floor type → protection material label (for task name display)
export const FLOOR_PROTECTION_LABEL = {
  hardwood: 'Rosin Paper',
  tile: 'Drop Cloths',
  carpet: 'Plastic Sheeting',
  lvp: 'Drop Cloths',
  concrete: 'Drop Cloths',
};
