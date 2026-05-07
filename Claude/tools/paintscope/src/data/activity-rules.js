// Activity rules — taskId → painter-thinking activity name.
//
// Used by:
//   1. scope-tree.js Phase pivot — groups atomic merged_tasks under an
//      "activity" row (e.g., all CAULK_JOINTS tasks across substrates
//      collapse into one "Caulk Joints" row with substrate chips).
//   2. Authoring TaskList activity-family filter — lets the user walk
//      one activity at a time during the manual consolidation pass.
//
// Order matters — most specific patterns first. Tasks that don't match
// any rule fall through; consumers decide whether to use a fallback name
// (scope-tree.js falls back to the task's display label) or treat them
// as a separate "Other" bucket (Authoring filter shows "Unmatched").

export const ACTIVITY_RULES = [
  // ─── Setup / Protection (lifecycle pairs collapse to one row) ───
  { activity: 'Outlet/Switch Cover Cycle', match: /OUTLET_(SWITCH|COVER).*(REMOVE|REINSTALL|INSTALL)/ },
  { activity: 'HVAC Vent Cycle',           match: /HVAC_VENT.*(REMOVE|REINSTALL|INSTALL|MASK)/ },
  { activity: 'Floor Mask Cycle',          match: /FLOOR_(MASK|PROTECT)/ },
  { activity: 'Fixture Cover Cycle',       match: /FIXTURE_COVERS|FIXTURE_PROTECT/ },
  { activity: 'Wall Fixture Mask Cycle',   match: /MASK_WALL_FIXTURES?$/ },

  // ─── Prep ───
  { activity: 'Fill Fasteners',            match: /FILL_FASTENERS/ },
  { activity: 'Caulk Joints',              match: /CAULK_JOINTS/ },
  { activity: 'Touchup Caulk',             match: /TOUCHUP_CAULK/ },
  { activity: 'Touchup Fill',              match: /TOUCHUP_FILL/ },
  { activity: 'Sand Spackle',              match: /SAND_SPACKLE/ },
  { activity: 'Spackle Defects',           match: /SPACKLE.*(DEFECTS|IMPERFECTIONS|REPAIR|WALL|CEILING)/ },
  { activity: 'Light Sand',                match: /LIGHT_SAND/ },
  { activity: 'Sand Prep',                 match: /SAND_PREP$|SAND_PRIMER_PREP/ },
  { activity: 'Clean Dust (Prep)',         match: /CLEAN_DUST_(PREP|BEFORE)|CLEAN.*BEFORE_PAINT/ },
  { activity: 'Dust Wipe',                 match: /DUST_WIPE/ },
  { activity: 'Vacuum Dust',               match: /VACUUM/ },
  { activity: 'Spot Prime',                match: /SPOT_PRIME/ },
  { activity: 'Inspect Bare',              match: /INSPECT.*(PREPRIME|BARE)/ },
  { activity: 'Inspect Primer',            match: /INSPECT(_PRIMED|_PRIMER)/ },

  // ─── Apply ───
  { activity: 'Brush Finish',              match: /BRUSH_FINISH/ },
  { activity: 'Spray Finish',              match: /SPRAY_FINISH/ },
  { activity: 'Roll Finish',               match: /ROLL_(WALL|CEILING|FINISH)/ },
  { activity: 'Brush Prime',               match: /BRUSH_PRIME|PRIME_BRUSH/ },
  { activity: 'Spray Prime',               match: /SPRAY_PRIME|PRIME_SPRAY/ },
  { activity: 'Roll Prime',                match: /ROLL_PRIME|PRIME_ROLL/ },

  // ─── Between Coats ───
  { activity: 'Sand Between Coats',        match: /SAND_BETWEEN/ },
  { activity: 'Patch Defects',             match: /PATCH_DEFECTS/ },
  { activity: 'Spot Coat',                 match: /SPOT_COAT/ },
  { activity: 'Inspect Coat',              match: /INSPECT_COAT/ },
  { activity: 'Clean Dust (Interstage)',   match: /CLEAN_INTERSTAGE/ },

  // ─── Cleanup / Final ───
  { activity: 'Final Inspect',             match: /FINAL_INSPECT/ },
  { activity: 'Final Touchup',             match: /TOUCHUP_FINAL/ },
];

/**
 * Strict matcher. Returns the activity name from the first matching rule,
 * or null if no rule matches. Use this in filtering UIs that need to
 * distinguish "matched activity X" from "no rule matched."
 */
export function matchActivityRule(taskId) {
  if (!taskId) return null;
  for (const rule of ACTIVITY_RULES) {
    if (rule.match.test(taskId)) return rule.activity;
  }
  return null;
}

/**
 * Lenient matcher used by scope-tree.js. Returns the activity from a
 * matching rule, or the fallback label if no rule matches (so a task
 * without a rule still renders as its own activity row instead of being
 * lost). Use matchActivityRule when you need null-on-no-match semantics.
 */
export function deriveActivity(taskId, fallbackLabel) {
  return matchActivityRule(taskId) || fallbackLabel || taskId || 'Other';
}

/**
 * Sorted, deduplicated list of all activity names defined in the rules.
 * Stable across renders. Used to populate activity-filter dropdowns.
 */
export const ACTIVITY_NAMES = [...new Set(ACTIVITY_RULES.map(r => r.activity))].sort();
