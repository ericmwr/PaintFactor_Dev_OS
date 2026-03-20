// ============================================================
// FIXTURE CATALOG — items present but not being painted (v0.6)
// defaultProtection uses controlled_enums.json protection_level values.
// These represent worst-case (spray) protection. Context-dependent
// resolution happens at estimation time.
// ============================================================
export const FIXTURE_CATALOG = [
  // Kitchen
  { id: 'cabinets',    group: 'Kitchen',  label: 'Cabinets',         defaultProtection: 'full_cover' },
  { id: 'countertops', group: 'Kitchen',  label: 'Countertops',      defaultProtection: 'full_cover' },
  { id: 'appliances',  group: 'Kitchen',  label: 'Appliances',       defaultProtection: 'partial_cover' },
  { id: 'backsplash',  group: 'Kitchen',  label: 'Backsplash',       defaultProtection: 'partial_cover' },
  // Bathroom
  { id: 'bathtub',     group: 'Bathroom', label: 'Bathtub',          defaultProtection: 'full_cover' },
  { id: 'shower',      group: 'Bathroom', label: 'Shower/Enclosure', defaultProtection: 'full_cover' },
  { id: 'toilet',      group: 'Bathroom', label: 'Toilet',           defaultProtection: 'item_mask' },
  { id: 'vanity',      group: 'Bathroom', label: 'Vanity',           defaultProtection: 'partial_cover' },
  // Features
  { id: 'fireplace',        group: 'Feature', label: 'Fireplace',         defaultProtection: 'full_cover' },
  { id: 'stone_fireplace',  group: 'Feature', label: 'Stone Fireplace',   defaultProtection: 'full_cover' },
  { id: 'feature_wall',     group: 'Feature', label: 'Feature Wall',      defaultProtection: 'full_mask' },
  { id: 'builtin_shelving', group: 'Feature', label: 'Built-in Shelving', defaultProtection: 'partial_cover' },
  { id: 'light_fixtures',   group: 'Feature', label: 'Light Fixtures',    defaultProtection: 'item_mask' },
];

export const FIXTURE_MAP = Object.fromEntries(FIXTURE_CATALOG.map(f => [f.id, f]));

export const FIXTURE_GROUPS = [...new Set(FIXTURE_CATALOG.map(f => f.group))].map(g => ({
  group: g,
  items: FIXTURE_CATALOG.filter(f => f.group === g)
}));

export const FLOOR_TYPES = [
  { id: 'subfloor',  label: 'Subfloor (Plywood/OSB)', defaultProtection: 'edge_only' },
  { id: 'hardwood',  label: 'Hardwood',               defaultProtection: 'full_cover' },
  { id: 'tile',      label: 'Tile / Stone',            defaultProtection: 'partial_cover' },
  { id: 'carpet',    label: 'Carpet',                  defaultProtection: 'full_cover' },
  { id: 'lvp',       label: 'LVP / Laminate',          defaultProtection: 'partial_cover' },
  { id: 'concrete',  label: 'Concrete',                defaultProtection: 'edge_only' },
];

// Floor type → protection material label (for task name display)
export const FLOOR_PROTECTION_LABEL = {
  hardwood: 'Rosin Paper',
  tile: 'Drop Cloths',
  carpet: 'Plastic Sheeting',
  lvp: 'Drop Cloths',
  concrete: 'Drop Cloths',
};
