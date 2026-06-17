// ============================================================
// CLOSET SHELVING PROTECTION DATA TABLE (v3.0)
//
// Per-shelving-type defaults for the canonical 7-level mask vocab
// + wire/wood type multiplier (wire = 2× wood baseline because of brackets).
//
// "Closet shelving" here means simple end-to-end shelves at the top of
// a closet (wire or wood). Built-in systems are NOT covered by this
// model — they exist as a separate fixture (builtin_shelving) with
// their own SF-based protection design (deferred).
//
// Quantity formula (emitted from quantity-lookups.js):
//   PS_PROTECT_LF.CLOSET_SHELF = shelving_lf × 3.6 × type_multiplier
//
//   3.6  = perimeter heuristic for a 5-foot shelf at 2-ft depth (5+5 top/
//          bottom + 4×2 sides = 18 LF perimeter / 5 LF shelf).
//   type_multiplier = 1.0 (wood), 2.0 (wire — slower because of brackets).
//   builtin_system  = SKIP (not emitted; will get its own SF-based design).
// ============================================================

import { CLOSET_SHELF_LEVELS, MASK_LEVEL_LABELS } from './mask-levels';

// Perimeter heuristic — 5-foot shelf at 2-ft depth. See module header.
export const CLOSET_SHELF_PERIMETER_FACTOR = 3.6;

// Type multiplier on top of the per-mask-level rate. Wire shelving is
// slower because of the brackets; wood is the baseline.
export const SHELVING_TYPE_MULTIPLIER = {
  wire_shelving: 2.0,
  wood_shelving: 1.0,
  // builtin_system intentionally absent — not protected via this code path.
};

// Per-shelving-type defaults — used to seed the protection level dropdown
// when the user hasn't explicitly overridden it.
export const SHELVING_DEFAULT_LEVEL = {
  wire_shelving: 'edge',
  wood_shelving: 'partial',
  // builtin_system intentionally absent.
};

// Allowed levels for closet shelving protection — Group A (7 canonical).
export const PROTECTION_LEVELS = CLOSET_SHELF_LEVELS.map(l => l.id);
export const PROTECTION_LEVEL_LABELS = MASK_LEVEL_LABELS;

// Setup + teardown rates per mask level (LF/hr), against the calculated
// perimeter LF. Mirrored from the TSK_CLOSET_SHELF_PROT_*_{SETUP,TEARDOWN}
// task JSONs; kept here so the in-tab hours preview doesn't need to read
// from the scenario bundle.
//
// Edge+ scenarios use additive setup (edge + base) and reuse the base
// teardown rate.
export const CLOSET_SHELF_SETUP_RATE_LF_HR = {
  edge: 180,
  partial: 160,
  full: 720,
  encapsulate: 100,
};
export const CLOSET_SHELF_TEARDOWN_RATE_LF_HR = {
  edge: 400,
  partial: 400,
  full: 800,
  encapsulate: 200,
};

/**
 * Compute the in-tab preview hours for a given closet under a given mask
 * level. Mirrors the engine math:
 *   qty = shelving_lf × 3.6 × type_mult
 *   base levels: hrs = qty/setup_rate + qty/teardown_rate
 *   edge+ levels: hrs = qty/edge_setup + qty/base_setup + qty/base_teardown
 */
export function previewClosetShelfMaskHours(closet, level) {
  if (!closet || !isClosetShelfType(closet.shelving_type)) return 0;
  const shelvingLf = parseFloat(closet.shelving_lf) || 0;
  if (shelvingLf <= 0 || !level) return 0;
  const typeMult = SHELVING_TYPE_MULTIPLIER[closet.shelving_type] ?? 1;
  const qty = shelvingLf * CLOSET_SHELF_PERIMETER_FACTOR * typeMult;
  const isEdgePlus = level.startsWith('edge_');
  const baseLevel = isEdgePlus ? level.slice('edge_'.length) : level;
  const baseSetup    = CLOSET_SHELF_SETUP_RATE_LF_HR[baseLevel];
  const baseTeardown = CLOSET_SHELF_TEARDOWN_RATE_LF_HR[baseLevel];
  if (!baseSetup || !baseTeardown) return 0;
  let hrs = qty / baseSetup + qty / baseTeardown;
  if (isEdgePlus) hrs += qty / CLOSET_SHELF_SETUP_RATE_LF_HR.edge;
  return Math.round(hrs * 100) / 100;
}

/**
 * Resolve the effective protection level for a closet:
 * user override if set, else the shelving type's default.
 * Returns null for shelving_type 'none', 'builtin_system', or unknown.
 */
export function resolveProtectionLevel(closet) {
  if (!closet) return null;
  if (closet.protection_level) return closet.protection_level;
  return SHELVING_DEFAULT_LEVEL[closet.shelving_type] || null;
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

/**
 * Returns true if this shelving_type contributes to closet-shelf protection
 * (i.e., emits PS_PROTECT_LF.CLOSET_SHELF and matches a SCN_CLOSET_SHELF_PROTECT_*
 * scenario). builtin_system is excluded — it has a separate SF-based path.
 */
export function isClosetShelfType(type) {
  return type === 'wire_shelving' || type === 'wood_shelving';
}
