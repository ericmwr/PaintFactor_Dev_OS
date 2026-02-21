// ============================================================
// SUBSTRATE CATALOG — defines all paintable substrate types
// ============================================================
export const SUBSTRATE_CATALOG = [
  // --- Surfaces ---
  {
    id: 'walls', group: 'Surfaces', label: 'Walls', uom: 'SF',
    autoDerive: (d) => d.wall_field_sf, defaultConfig: { substrate_state: 'bare_drywall', texture: 'smooth', application_method: null, sf_override: false, sf_manual: 0 }
  },
  {
    id: 'ceiling', group: 'Surfaces', label: 'Ceiling', uom: 'SF',
    autoDerive: (d) => d.ceiling_field_sf, defaultConfig: { substrate_state: 'bare_drywall', texture: 'smooth', application_method: null, sf_override: false, sf_manual: 0 }
  },

  // --- Trim ---
  {
    id: 'baseboard', group: 'Trim', label: 'Baseboard', uom: 'LF',
    autoDerive: (d) => d.perimeter, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_override: false, lf_manual: 0 }
  },
  {
    id: 'crown', group: 'Trim', label: 'Crown Molding', uom: 'LF',
    autoDerive: (d) => d.perimeter, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_override: false, lf_manual: 0 }
  },
  {
    id: 'door_casing', group: 'Trim', label: 'Door Casing', uom: 'LF',
    autoDerive: (d) => d.openingCasingLF, defaultConfig: { substrate_state: 'factory_primed', application_method: null, style: null, lf_override: false, lf_manual: 0, painting: false }
  },
  {
    id: 'window_casing', group: 'Trim', label: 'Window Casing', uom: 'LF',
    autoDerive: (d) => d.totalWindows * 12, defaultConfig: { substrate_state: 'factory_primed', application_method: null, style: null, lf_override: false, lf_manual: 0, painting: false }
  },
  {
    id: 'chair_rail', group: 'Trim', label: 'Chair Rail', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'shoe_mold', group: 'Trim', label: 'Shoe Mold', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'wainscot_cap', group: 'Trim', label: 'Wainscot Cap', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'picture_rail', group: 'Trim', label: 'Picture Rail', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'window_stool', group: 'Trim', label: 'Window Stool', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'window_apron', group: 'Trim', label: 'Window Apron', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'shadow_box', group: 'Trim', label: 'Shadow Box', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },
  {
    id: 'panel_mold', group: 'Trim', label: 'Panel Mold', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'factory_primed', application_method: null, lf_manual: 0 }
  },

  // --- Doors & Windows ---
  {
    id: 'doors', group: 'Doors & Windows', label: 'Door Slabs', uom: 'EA_SIDE',
    autoDerive: null, defaultConfig: { items: [], application_method: null, painting: false }
  },
  {
    id: 'door_frames', group: 'Doors & Windows', label: 'Door Frames', uom: 'EA',
    autoDerive: (d) => d.totalOpenings, defaultConfig: { substrate_state: 'factory_primed', application_method: null }
  },
  {
    id: 'windows', group: 'Doors & Windows', label: 'Windows', uom: 'EA',
    autoDerive: null, defaultConfig: { items: [], application_method: null, painting: false }
  },
  {
    id: 'window_jamb', group: 'Doors & Windows', label: 'Window Jambs', uom: 'EA',
    autoDerive: (d) => d.totalWindows, defaultConfig: { substrate_state: 'bare_wood', application_method: null }
  },

  // --- Specialty ---
  {
    id: 'wainscoting', group: 'Specialty', label: 'Wainscot Panel', uom: 'SF',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, sf_manual: 0 }
  },
  {
    id: 'wood_feature_wall', group: 'Specialty', label: 'Wood Feature Wall', uom: 'SF',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, sf_manual: 0 }
  },
  {
    id: 'wood_ceiling', group: 'Specialty', label: 'Wood Ceiling', uom: 'SF',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, sf_manual: 0 }
  },
  {
    id: 'closet_shelving', group: 'Specialty', label: 'Closet Shelving', uom: 'LF',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, lf_manual: 0 }
  },
  {
    id: 'beams', group: 'Specialty', label: 'Beams', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
  {
    id: 'columns', group: 'Specialty', label: 'Columns', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
  {
    id: 'mantels', group: 'Specialty', label: 'Mantels', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
  {
    id: 'builtins', group: 'Specialty', label: 'Built-ins', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
  {
    id: 'stair_risers', group: 'Specialty', label: 'Stair Risers', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
  {
    id: 'stair_railing', group: 'Specialty', label: 'Stair Railing', uom: 'EA',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, ea_manual: 0 }
  },
];

// Quick lookup by substrate id
export const SUBSTRATE_MAP = Object.fromEntries(SUBSTRATE_CATALOG.map(s => [s.id, s]));

// Grouped for the Scope panel checklist
export const SUBSTRATE_GROUPS = [...new Set(SUBSTRATE_CATALOG.map(s => s.group))].map(g => ({
  group: g,
  items: SUBSTRATE_CATALOG.filter(s => s.group === g)
}));

// Valid application methods and defaults per substrate type
export const SUBSTRATE_APPLICATION_METHODS = {
  // Surfaces: spray_backroll, roll, spray
  walls: { methods: ['spray_backroll', 'roll', 'spray'], default: 'spray_backroll' },
  ceiling: { methods: ['spray_backroll', 'roll', 'spray'], default: 'spray_backroll' },
  // Trim: brush, spray
  baseboard: { methods: ['brush', 'spray'], default: 'brush' },
  crown: { methods: ['brush', 'spray'], default: 'brush' },
  door_casing: { methods: ['brush', 'spray'], default: 'brush' },
  window_casing: { methods: ['brush', 'spray'], default: 'brush' },
  chair_rail: { methods: ['brush', 'spray'], default: 'brush' },
  shoe_mold: { methods: ['brush', 'spray'], default: 'brush' },
  wainscot_cap: { methods: ['brush', 'spray'], default: 'brush' },
  picture_rail: { methods: ['brush', 'spray'], default: 'brush' },
  window_stool: { methods: ['brush', 'spray'], default: 'brush' },
  window_apron: { methods: ['brush', 'spray'], default: 'brush' },
  shadow_box: { methods: ['brush', 'spray'], default: 'brush' },
  panel_mold: { methods: ['brush', 'spray'], default: 'brush' },
  // Doors & Frames: brush, spray
  doors: { methods: ['brush', 'spray'], default: 'brush' },
  door_frames: { methods: ['brush', 'spray'], default: 'brush' },
  // Windows: brush, spray
  windows: { methods: ['brush', 'spray'], default: 'brush' },
  window_jamb: { methods: ['brush', 'spray'], default: 'brush' },
  // Specialty
  wainscoting: { methods: ['brush', 'spray'], default: 'brush' },
  wood_feature_wall: { methods: ['brush', 'spray'], default: 'brush' },
  wood_ceiling: { methods: ['brush', 'spray'], default: 'brush' },
  closet_shelving: { methods: ['brush_roll', 'spray', 'spray_rolloff'], default: 'brush_roll' },
  beams: { methods: ['brush', 'spray'], default: 'brush' },
  columns: { methods: ['brush', 'spray'], default: 'brush' },
  mantels: { methods: ['brush', 'spray'], default: 'brush' },
  builtins: { methods: ['brush', 'spray'], default: 'brush' },
  stair_risers: { methods: ['brush', 'spray'], default: 'brush' },
  stair_railing: { methods: ['brush', 'spray'], default: 'brush' },
};
