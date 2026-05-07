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
    id: 'door_frames', group: 'Doors & Windows', label: 'Door Frames', uom: 'LF',
    autoDerive: (d) => d.door_frame_lf, defaultConfig: { substrate_state: 'factory_primed', application_method: null }
  },
  {
    id: 'windows', group: 'Doors & Windows', label: 'Windows', uom: 'EA',
    autoDerive: null, defaultConfig: { items: [], application_method: null, painting: false }
  },
  {
    id: 'window_jamb', group: 'Doors & Windows', label: 'Window Jambs', uom: 'LF',
    autoDerive: (d) => d.window_jamb_lf, defaultConfig: { substrate_state: 'bare_wood', application_method: null }
  },

  // --- Specialty ---
  {
    id: 'wainscoting', group: 'Specialty', label: 'Wainscot Panel', uom: 'SF',
    autoDerive: null, defaultConfig: {
      substrate_state: 'bare_wood', application_method: null,
      // SF is computed from lf_manual × wainscot_height_ft. sf_override +
      // sf_manual let the user override when geometry isn't a clean rectangle
      // (varying panel heights, partial coverage, etc.).
      sf_override: false, sf_manual: 0,
      // Length of the panel run along the wall (LF). Drives both the SF
      // calculation (lf × height) and the synced wainscot_cap when has_cap.
      lf_manual: 0,
      // Panel height in feet. Default 3 ft (36") — typical residential
      // wainscot. Tall variants: chair-rail height ~32" (2.67), full-height
      // paneling ~7-8 ft.
      wainscot_height_ft: 3,
      has_cap: true,
      cap_profile: 'flat',  // 'flat' | 'ogee' | 'beveled' | 'custom'
    }
  },
  {
    id: 'wood_feature_wall', group: 'Specialty', label: 'Wood Feature Wall', uom: 'SF',
    autoDerive: null, defaultConfig: { substrate_state: 'bare_wood', application_method: null, sf_manual: 0 }
  },
  {
    id: 'wood_ceiling', group: 'Specialty', label: 'Wood Ceiling', uom: 'SF',
    autoDerive: (d) => d.ceiling_field_sf, defaultConfig: { substrate_state: 'bare_wood', application_method: null, sf_override: false, sf_manual: 0 }
  },
  {
    id: 'closet_shelving', group: 'Specialty', label: 'Closet Shelving', uom: 'LF',
    autoDerive: null, defaultConfig: {
      substrate_state: 'bare_wood', application_method: null, quality_tier: null,
      coating_type: 'paint', grain_fill: false, title: '',
      shelf_count: 0, lf_per_shelf: 0, depth_in: 12,
      lf_manual: 0
    }
  },
  {
    id: 'cabinets', group: 'Cabinets', label: 'Cabinets', uom: 'EA',
    autoDerive: null, defaultConfig: {
      title: '', substrate_state: 'factory_finish', paint_cabinets: false,
      protection_level: 'partial', quality_tier: null, application_method: 'spray',
      coating_type: 'paint', sheen: 'satin', scope: 'full_exterior',
      door_style: 'shaker', kitchen_complexity: 'galley', height_band: 'standard',
      cabinet_count: 0, door_count: 0, drawer_count: 0,
      frame_sf: 0, interior_sf: 0, hardware_count: 0, caulk_lf: 0,
    }
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
    autoDerive: null, defaultConfig: {
      substrate_state: 'bare_wood', application_method: null, quality_tier: null,
      coating_type: 'paint', grain_fill: false, title: '',
      openings_s: 0, openings_m: 0, openings_l: 0, openings_xl: 0, full_height_sides: 0,
      ea_manual: 0,
      depth_modifier: 'deep', detail_modifier: 'simple_box', access_modifier: 'open_access'
    }
  },
  {
    id: 'stairway', group: 'Stairway', label: 'Stairway', uom: 'EA',
    autoDerive: null, defaultConfig: {
      title: '',
      runs: 1, layout: 'l_shape', run1_risers: 0, run2_risers: 0, stair_width: 3.5, landing_depth: 0,
      components: {
        risers:      { enabled: true, count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        treads:      { enabled: false, count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        balusters:   { enabled: true, count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false, baluster_type: 'square', material: 'wood' },
        newel_posts: { enabled: true, count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        open_rail:   { enabled: true, lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        wall_rail:   { enabled: false, lf: 0, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        skirtboard:  { enabled: true, lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        stringer:    { enabled: true, lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
      }
    }
  },
];

// Substrates that support stain/clear coating_type when set to bare_wood
export const WOOD_SUBSTRATES = new Set([
  'doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
  'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting',
  'wood_feature_wall', 'wood_ceiling', 'beams', 'columns', 'mantels',
  'builtins', 'stairway',
]);

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
  // Trim: brush, spray — default spray (typical for NC trim packages)
  baseboard: { methods: ['brush', 'spray'], default: 'spray' },
  crown: { methods: ['brush', 'spray'], default: 'spray' },
  door_casing: { methods: ['brush', 'spray'], default: 'spray' },
  window_casing: { methods: ['brush', 'spray'], default: 'spray' },
  chair_rail: { methods: ['brush', 'spray'], default: 'spray' },
  shoe_mold: { methods: ['brush', 'spray'], default: 'spray' },
  wainscot_cap: { methods: ['brush', 'spray'], default: 'spray' },
  picture_rail: { methods: ['brush', 'spray'], default: 'spray' },
  window_stool: { methods: ['brush', 'spray'], default: 'spray' },
  window_apron: { methods: ['brush', 'spray'], default: 'spray' },
  shadow_box: { methods: ['brush', 'spray'], default: 'spray' },
  panel_mold: { methods: ['brush', 'spray'], default: 'spray' },
  // Doors & Frames: brush, spray — default spray (typical for NC trim packages)
  doors: { methods: ['brush', 'spray'], default: 'spray' },
  door_frames: { methods: ['brush', 'spray'], default: 'spray' },
  // Windows: brush, spray — default spray (typical for NC trim packages)
  windows: { methods: ['brush', 'spray'], default: 'spray' },
  window_jamb: { methods: ['brush', 'spray'], default: 'spray' },
  // Specialty
  wainscoting: { methods: ['brush', 'spray'], default: 'brush' },
  wood_feature_wall: { methods: ['brush', 'spray'], default: 'brush' },
  wood_ceiling: { methods: ['brush', 'spray'], default: 'brush' },
  closet_shelving: { methods: ['brush_roll', 'spray', 'spray_rolloff'], default: 'brush_roll' },
  cabinets: { methods: ['spray', 'brush'], default: 'spray' },
  beams: { methods: ['brush', 'spray'], default: 'brush' },
  columns: { methods: ['brush', 'spray'], default: 'brush' },
  mantels: { methods: ['brush', 'spray'], default: 'brush' },
  builtins: { methods: ['brush', 'spray'], default: 'brush' },
  stairway: { methods: ['brush', 'spray'], default: 'brush' },
};
