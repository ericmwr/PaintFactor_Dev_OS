// ============================================================
// MASK LEVELS — canonical protection vocabulary (v1.0)
//
// Single source of truth for protection level enums used across
// Surfaces (floor/wall/ceiling) and Adjacent Items (fixtures).
//
// Replaces the legacy mixed vocab (edge_only / item_mask /
// partial_cover / full_cover / full_mask / item_mask /
// light/standard/heavy) with one unified 9-value enum + curated
// per-fixture subsets.
// ============================================================

// --- Canonical 9-value list (id + label, ordered light → heavy) ---
export const MASK_LEVELS = [
  { id: 'none',             label: 'None',                          short: 'None' },
  { id: 'edge',             label: 'Edge tape only',                short: 'Edge' },
  { id: 'spot',             label: 'Spot (per opening)',            short: 'Spot' },
  { id: 'partial',          label: 'Partial (perimeter)',           short: 'Partial' },
  { id: 'full',             label: 'Full drape',                    short: 'Full' },
  { id: 'encapsulate',      label: 'Encapsulate (taped/sealed)',    short: 'Encapsulate' },
  { id: 'edge_partial',     label: 'Edge+ Partial',                 short: 'Edge+ Partial' },
  { id: 'edge_full',        label: 'Edge+ Full',                    short: 'Edge+ Full' },
  { id: 'edge_encapsulate', label: 'Edge+ Encapsulate',             short: 'Edge+ Encapsulate' },
];

const byId = (id) => MASK_LEVELS.find(l => l.id === id);
export const MASK_LEVEL_LABELS = Object.fromEntries(MASK_LEVELS.map(l => [l.id, l.label]));
export const MASK_LEVEL_SHORT  = Object.fromEntries(MASK_LEVELS.map(l => [l.id, l.short]));

// --- Surface-level allowed lists (existing in ProtectionTab; restated here) ---
//   floor: all 9
//   wall:  no 'spot' (no per-opening drops on walls)
//   ceiling: no 'full' / 'edge_full' (gravity prevents full-ceiling drape)
export const MASK_LEVELS_FLOOR = MASK_LEVELS.slice();
export const MASK_LEVELS_WALL  = MASK_LEVELS.filter(l => l.id !== 'spot');
export const MASK_LEVELS_CEILING = MASK_LEVELS.filter(l =>
  l.id !== 'full' && l.id !== 'edge_full');

// --- Fixture allowed-level groups ---
// Group A — fixtures that can receive full coverage + edge+ variants.
// 7 levels, no 'none' (must be wrapped if checked) and no 'spot' (spot is
// reserved for surface-level trim spillover, not fixtures).
const GROUP_A = ['edge', 'partial', 'full', 'encapsulate', 'edge_partial', 'edge_full', 'edge_encapsulate'];

// Group B — light/incidental items. 4 levels, no edge+ variants.
const GROUP_B = ['none', 'edge', 'partial', 'full'];

// Cabinets-IN-SCOPE (Surfaces tab → CabinetsDetailPanel "Protect" mode).
// 4 levels — no edge+ variants (surrounding-area protection while cabinets
// are themselves NOT being painted).
const CAB_PROTECT = ['edge', 'partial', 'full', 'encapsulate'];

const filterTo = (ids) => MASK_LEVELS.filter(l => ids.includes(l.id));

// "Full drape" is the canonical surface-protection wording, but for fixtures
// you wrap rather than drape — the user-facing label "Full cover" reads truer
// for Group B (light fixtures, ceiling fans, appliances, etc.). Same `id: 'full'`
// under the hood, only the display label changes. See W-16.
const relabelFullAsCover = (levels) => levels.map(l =>
  l.id === 'full' ? { ...l, label: 'Full cover', short: 'Full cover' } : l
);

export const FIXTURE_MASK_LEVELS = {
  // Group A
  cabinets:         filterTo(GROUP_A),
  vanity:           filterTo(GROUP_A),
  builtin_shelving: filterTo(GROUP_A),
  shower:           filterTo(GROUP_A),
  bathtub:          filterTo(GROUP_A),
  toilet:           filterTo(GROUP_A),
  fireplace:        filterTo(GROUP_A),
  stone_fireplace:  filterTo(GROUP_A),
  feature_wall:     filterTo(GROUP_A),
  closet_shelving:  filterTo(GROUP_A),
  // Group B (light / incidental — also handles deferred countertop/backsplash for now)
  // "Full" renders as "Full cover" for these — see relabelFullAsCover above.
  light_fixtures:   relabelFullAsCover(filterTo(GROUP_B)),
  ceiling_fan:      relabelFullAsCover(filterTo(GROUP_B)),
  appliances:       relabelFullAsCover(filterTo(GROUP_B)),
  countertops:      relabelFullAsCover(filterTo(GROUP_B)),
  backsplash:       relabelFullAsCover(filterTo(GROUP_B)),
  hardware_covers:  relabelFullAsCover(filterTo(GROUP_B)),
  mantel:           relabelFullAsCover(filterTo(GROUP_B)),
  generic:          relabelFullAsCover(filterTo(GROUP_B)),
};

// Default mask level per fixture (used when no override is set).
export const FIXTURE_MASK_DEFAULTS = {
  cabinets:         'full',
  vanity:           'partial',
  builtin_shelving: 'partial',
  shower:           'full',
  bathtub:          'full',
  toilet:           'partial',
  fireplace:        'full',
  stone_fireplace:  'full',
  feature_wall:     'encapsulate',
  closet_shelving:  'partial',
  light_fixtures:   'edge',
  ceiling_fan:      'edge',
  appliances:       'partial',
  countertops:      'full',
  backsplash:       'partial',
  hardware_covers:  'edge',
  mantel:           'edge',
  generic:          'partial',
};

// CabinetsDetailPanel (Surfaces tab) — distinct 4-level subset.
export const CABINET_PROTECT_LEVELS = filterTo(CAB_PROTECT);
export const CABINET_PROTECT_DEFAULT = 'partial';

// Closet shelving — kept for the closet shelving detail panel which uses
// per-shelving-type defaults from data/closet-shelving-protection.js.
export const CLOSET_SHELF_LEVELS = filterTo(GROUP_A);

// --- Legacy → canonical migration map (one-shot, then deleted) ---
// Used by:
//   - state/migrations.js to convert saved localStorage state
//   - any read-site that may receive a legacy value from older code paths
//     during the transition (display fallthrough only).
export const LEGACY_TO_CANONICAL = {
  // shared fixture vocabulary
  none:          'none',
  edge_only:     'edge',
  item_mask:     'edge',          // lightest fixture wrap
  partial_cover: 'partial',
  full_cover:    'full',
  full_mask:     'encapsulate',
  light_mask:    'edge',          // legacy in derive-protection.js
  // Cabinet-only legacy (light/standard/heavy)
  light:         'edge',
  standard:      'partial',
  heavy:         'full',
};

/**
 * Convert a legacy mask-level value to the canonical vocab. Returns the
 * input unchanged if it is already canonical (or unknown).
 */
export function migrateMaskLevel(value) {
  if (!value) return value;
  if (Object.prototype.hasOwnProperty.call(MASK_LEVEL_LABELS, value)) return value;
  return LEGACY_TO_CANONICAL[value] || value;
}

/**
 * Returns the per-fixture allowed levels list, falling back to generic
 * (Group B) for unrecognized fixture IDs.
 */
export function getFixtureLevels(fixtureId) {
  return FIXTURE_MASK_LEVELS[fixtureId] || FIXTURE_MASK_LEVELS.generic;
}

/**
 * Returns the per-fixture default mask level, falling back to 'partial'.
 */
export function getFixtureDefault(fixtureId) {
  return FIXTURE_MASK_DEFAULTS[fixtureId] || 'partial';
}

/**
 * Display-safe label resolver — accepts either canonical or legacy values.
 * Useful for read-side views that may encounter older saved data.
 */
export function maskLabel(value, { short = false } = {}) {
  const canon = migrateMaskLevel(value);
  const map = short ? MASK_LEVEL_SHORT : MASK_LEVEL_LABELS;
  return map[canon] || canon || '—';
}
