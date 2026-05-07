// Modifier registry helper. Reads modifier definitions from the scenario
// bundle (which can be overlaid with IndexedDB drafts via overlay-loader).
// Falls back to hardcoded defaults for backward compatibility — but every
// FAC_* should exist in the bundle after build-scenario-bundle.mjs runs.
//
// Two kinds of modifiers:
//   - static: one-per-eligibility-flag modifiers (QT, HEIGHT, TEXTURE,
//     COMPLEXITY, CONDITION). Module must have modifier_eligibility[<key>]
//     = true to receive the factor.
//   - dynamic: scenario-declared. Scenario.modifiers[] lists which apply.
//     Unconditional unless `gated_by_eligibility` names an eligibility key.

// Hardcoded fallback defaults. Used when a bundle doesn't include a given
// FAC_* (shouldn't happen in practice — the bundle ships all 25).
const FALLBACK = {
  FAC_QT:           { factors: { QT1: 0.80, QT2: 0.80, QT3: 1.00, QT4: 1.30, QT5: 1.50 }, default: 'QT3' },
  FAC_HEIGHT:       { factors: { STD: 1.00, STEP: 1.30, EXT: 1.50, SCAFFOLD: 2.00 }, default: 'STD' },
  FAC_TEXTURE:      { factors: { smooth: 1.00, orange_peel: 1.15, knockdown: 1.25 }, default: 'smooth' },
  FAC_COMPLEXITY:   { factors: { OPEN: 0.85, STD: 1.00, MOD: 1.20, COMPLEX: 1.20, VCOMPLEX: 1.50 }, default: 'STD' },
  FAC_CONDITION:    { factors: { good: 0.70, fair: 1.00, poor: 1.50 }, default: 'fair' },
  FAC_EXT_ACCESS:   { factors: { ground: 1.00, ladder: 1.35, scaffold: 1.60, lift: 1.50 }, default: 'ground' },
  // FAC_OVERHEAD: ceiling-orientation penalty (1.25 time = 0.8 rate). Module
  // opt-in via modifier_eligibility.overhead = true. Engine derives
  // surface_orientation from the resolved task's ps_key — CEILING_FIELD →
  // CEILING, anything else → WALL.
  FAC_OVERHEAD:     { factors: { WALL: 1.00, CEILING: 1.25 }, default: 'WALL' },
};

function getDef(bundle, modId) {
  const fromBundle = bundle?.modifiers?.[modId];
  if (fromBundle && fromBundle.factors) return fromBundle;
  return FALLBACK[modId] || null;
}

/**
 * Look up a factor for a given modifier + ctx-value.
 * Returns 1.0 if the modifier is unknown, or if the ctx-value isn't in the table.
 */
export function getFactor(bundle, modId, ctxValue) {
  const def = getDef(bundle, modId);
  if (!def) return 1.0;
  const key = ctxValue ?? def.default;
  const val = def.factors?.[key];
  return typeof val === 'number' ? val : 1.0;
}

/**
 * Get the full modifier definition (for UI / impact preview).
 */
export function getModifier(bundle, modId) {
  return getDef(bundle, modId);
}

/**
 * List every modifier id known to the bundle (for the Modifiers tab).
 */
export function listModifiers(bundle) {
  const ids = new Set([
    ...Object.keys(bundle?.modifiers || {}),
    ...Object.keys(FALLBACK),
  ]);
  return [...ids].sort();
}
