// ============================================================
// CLOSET SHELVING PROTECTION DATA TABLE (v2.0)
//
// Per-shelving-type defaults for masking + obstruction rates
// when a closet's shelving is NOT being painted but is in the
// closet during paint work on walls/ceiling/baseboard.
//
// v2.0 — migrated from legacy vocab (item_mask/partial_cover/
// full_cover) to canonical mask-level enum. See data/mask-levels.js.
// ============================================================

import { CLOSET_SHELF_LEVELS, MASK_LEVEL_LABELS } from './mask-levels';

export const SHELVING_PROTECTION_DEFAULTS = {
  wire_shelving: {
    defaultLevel: 'edge',
    setup_min_per_lf: 0.5,
    teardown_min_per_lf: 0.25,
    obstruction_min_per_lf: 0.3,
  },
  wood_shelving: {
    defaultLevel: 'partial',
    setup_min_per_lf: 1.5,
    teardown_min_per_lf: 0.5,
    obstruction_min_per_lf: 1.0,
  },
  builtin_system: {
    defaultLevel: 'full',
    setup_min_per_lf: 2.5,
    teardown_min_per_lf: 1.0,
    obstruction_min_per_lf: 2.0,
  },
};

// Allowed levels for closet shelving protection — Group A (7 canonical levels).
export const PROTECTION_LEVELS = CLOSET_SHELF_LEVELS.map(l => l.id);

export const PROTECTION_LEVEL_LABELS = MASK_LEVEL_LABELS;

// Multipliers applied to setup + teardown only.
// Obstruction is intrinsic to the shelving's physical bulk
// and does not scale with how thoroughly the painter wraps it.
// DRAFT calibration — base rates anchored at 'partial' = 1.0x.
export const PROTECTION_LEVEL_MULTIPLIERS = {
  edge:             0.5,
  partial:          1.0,
  full:             1.5,
  encapsulate:      2.0,
  edge_partial:     1.2,
  edge_full:        1.7,
  edge_encapsulate: 2.2,
};

/**
 * Resolve the effective protection level for a closet:
 * user override if set, else the shelving type's default.
 * Returns null if shelving_type is 'none' or unknown.
 */
export function resolveProtectionLevel(closet) {
  if (!closet || closet.shelving_type === 'none') return null;
  if (closet.protection_level) return closet.protection_level;
  return SHELVING_PROTECTION_DEFAULTS[closet.shelving_type]?.defaultLevel || null;
}

/**
 * Pretty-print the shelving type for task names.
 */
export function labelForShelvingType(type) {
  switch (type) {
    case 'wire_shelving':  return 'Wire Shelving';
    case 'wood_shelving':  return 'Wood Shelving';
    case 'builtin_system': return 'Built-In System';
    default: return 'Shelving';
  }
}
