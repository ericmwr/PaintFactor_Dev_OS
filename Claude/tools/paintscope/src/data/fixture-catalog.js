// ============================================================
// FIXTURE CATALOG — items present but not being painted (v0.5)
// ============================================================
export const FIXTURE_CATALOG = [
  // Kitchen
  { id: 'cabinets',    group: 'Kitchen',  label: 'Cabinets',         defaultProtection: 'heavy_mask' },
  { id: 'countertops', group: 'Kitchen',  label: 'Countertops',      defaultProtection: 'heavy_mask' },
  { id: 'appliances',  group: 'Kitchen',  label: 'Appliances',       defaultProtection: 'medium_mask' },
  { id: 'backsplash',  group: 'Kitchen',  label: 'Backsplash',       defaultProtection: 'medium_mask' },
  // Bathroom
  { id: 'bathtub',     group: 'Bathroom', label: 'Bathtub',          defaultProtection: 'heavy_mask' },
  { id: 'shower',      group: 'Bathroom', label: 'Shower/Enclosure', defaultProtection: 'heavy_mask' },
  { id: 'toilet',      group: 'Bathroom', label: 'Toilet',           defaultProtection: 'medium_mask' },
  { id: 'vanity',      group: 'Bathroom', label: 'Vanity',           defaultProtection: 'medium_mask' },
  // Features
  { id: 'fireplace',        group: 'Feature', label: 'Fireplace',         defaultProtection: 'heavy_mask' },
  { id: 'stone_fireplace',  group: 'Feature', label: 'Stone Fireplace',   defaultProtection: 'heavy_mask' },
  { id: 'builtin_shelving', group: 'Feature', label: 'Built-in Shelving', defaultProtection: 'medium_mask' },
  { id: 'light_fixtures',   group: 'Feature', label: 'Light Fixtures',    defaultProtection: 'light_mask' },
];

export const FIXTURE_MAP = Object.fromEntries(FIXTURE_CATALOG.map(f => [f.id, f]));

export const FIXTURE_GROUPS = [...new Set(FIXTURE_CATALOG.map(f => f.group))].map(g => ({
  group: g,
  items: FIXTURE_CATALOG.filter(f => f.group === g)
}));

export const FLOOR_TYPES = [
  { id: 'subfloor',  label: 'Subfloor (Plywood/OSB)', defaultProtection: 'light_mask' },
  { id: 'hardwood',  label: 'Hardwood',               defaultProtection: 'heavy_mask' },
  { id: 'tile',      label: 'Tile / Stone',            defaultProtection: 'medium_mask' },
  { id: 'carpet',    label: 'Carpet',                  defaultProtection: 'heavy_mask' },
  { id: 'lvp',       label: 'LVP / Laminate',          defaultProtection: 'medium_mask' },
  { id: 'concrete',  label: 'Concrete',                defaultProtection: 'light_mask' },
];

// Floor type → protection material label (for task name display)
export const FLOOR_PROTECTION_LABEL = {
  hardwood: 'Rosin Paper',
  tile: 'Drop Cloths',
  carpet: 'Plastic Sheeting',
  lvp: 'Drop Cloths',
  concrete: 'Drop Cloths',
};
