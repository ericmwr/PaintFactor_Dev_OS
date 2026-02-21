// Fuzzy fallback matching for enum values Gemini might return slightly wrong.
// The responseSchema should enforce exact values, but this is a safety net.

const ENUM_MAPS = {
  door_type: {
    flush: 'flush', slab: 'flush', flat: 'flush',
    panel_4: 'panel_4', '4_panel': 'panel_4', '4panel': 'panel_4', 'four_panel': 'panel_4',
    panel_6: 'panel_6', '6_panel': 'panel_6', '6panel': 'panel_6', 'six_panel': 'panel_6',
    french: 'french', glass: 'french',
    bifold: 'bifold', 'bi_fold': 'bifold',
    louvered: 'louvered', louver: 'louvered', slat: 'louvered',
    sliding_glass: 'sliding_glass', slider_door: 'sliding_glass', patio: 'sliding_glass', patio_door: 'sliding_glass',
  },
  window_type: {
    single_hung: 'single_hung', 'single-hung': 'single_hung',
    double_hung: 'double_hung', 'double-hung': 'double_hung',
    casement: 'casement', crank: 'casement',
    fixed: 'fixed', picture: 'fixed',
    slider: 'slider', sliding: 'slider',
  },
  size_bucket: {
    S: 'S', small: 'S', sm: 'S',
    M: 'M', medium: 'M', std: 'M', standard: 'M',
    L: 'L', large: 'L', lg: 'L',
    O: 'O', oversized: 'O', xl: 'O', extra_large: 'O',
  },
  substrate_state: {
    bare_drywall: 'bare_drywall', 'new_drywall': 'bare_drywall', drywall: 'bare_drywall',
    field_primed: 'field_primed', primed: 'field_primed',
    factory_primed: 'factory_primed', 'pre_primed': 'factory_primed',
    previously_painted: 'previously_painted', painted: 'previously_painted', repaint: 'previously_painted',
    bare_wood: 'bare_wood', wood: 'bare_wood', raw_wood: 'bare_wood',
    stained: 'stained',
    vinyl_clad: 'vinyl_clad', vinyl: 'vinyl_clad',
  },
  texture: {
    smooth: 'smooth', flat: 'smooth',
    orange_peel: 'orange_peel', 'orange-peel': 'orange_peel',
    knockdown: 'knockdown',
    heavy_texture: 'heavy_texture', heavy: 'heavy_texture',
    skip_trowel: 'skip_trowel', 'skip-trowel': 'skip_trowel',
  },
  floor_type: {
    hardwood: 'hardwood', wood: 'hardwood',
    tile: 'tile', stone: 'tile', ceramic: 'tile',
    carpet: 'carpet',
    lvp: 'lvp', laminate: 'lvp', vinyl: 'lvp',
    concrete: 'concrete',
    subfloor: 'subfloor', plywood: 'subfloor', osb: 'subfloor',
  },
  opening_type: {
    single: 'single',
    double: 'double',
    wide: 'wide', archway: 'wide', cased_opening: 'wide',
  },
  complexity: {
    OPEN: 'OPEN', open: 'OPEN',
    STD: 'STD', standard: 'STD',
    MOD: 'MOD', moderate: 'MOD',
    COMPLEX: 'COMPLEX', complex: 'COMPLEX',
    VCOMPLEX: 'VCOMPLEX', very_complex: 'VCOMPLEX',
  },
};

/**
 * Resolve an enum value to its canonical form.
 * @param {string} field - The enum field name (e.g., 'door_type', 'substrate_state')
 * @param {string} value - The value to resolve
 * @returns {string|null} Canonical value, or null if unresolvable
 */
export function resolveEnum(field, value) {
  if (!value) return null;
  const map = ENUM_MAPS[field];
  if (!map) return value;
  const normalized = String(value).toLowerCase().trim().replace(/[- ]/g, '_');
  return map[normalized] || map[value] || null;
}
