// ============================================================
// CLOSET SHELVING PROTECTION DATA TABLE (v1.0)
//
// Per-shelving-type defaults for masking + obstruction rates
// when a closet's shelving is NOT being painted but is in the
// closet during paint work on walls/ceiling/baseboard.
//
// Consumed by engine/closet-shelf-protection.js — same shape
// as data/fixture-protection.js (rates are DRAFT, calibrate later).
// ============================================================

export const SHELVING_PROTECTION_DEFAULTS = {
  wire_shelving: {
    defaultLevel: 'item_mask',
    setup_min_per_lf: 0.5,
    teardown_min_per_lf: 0.25,
    obstruction_min_per_lf: 0.3,
  },
  wood_shelving: {
    defaultLevel: 'partial_cover',
    setup_min_per_lf: 1.5,
    teardown_min_per_lf: 0.5,
    obstruction_min_per_lf: 1.0,
  },
  builtin_system: {
    defaultLevel: 'full_cover',
    setup_min_per_lf: 2.5,
    teardown_min_per_lf: 1.0,
    obstruction_min_per_lf: 2.0,
  },
};

export const PROTECTION_LEVELS = ['item_mask', 'partial_cover', 'full_cover'];

export const PROTECTION_LEVEL_LABELS = {
  item_mask:     'Item Mask',
  partial_cover: 'Partial Cover',
  full_cover:    'Full Cover',
};

// Multipliers applied to setup + teardown only.
// Obstruction is intrinsic to the shelving's physical bulk
// and does not scale with how thoroughly the painter wraps it.
export const PROTECTION_LEVEL_MULTIPLIERS = {
  item_mask:     0.5,
  partial_cover: 1.0,
  full_cover:    1.5,
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
