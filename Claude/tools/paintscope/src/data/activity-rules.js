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

/**
 * Derive the lifecycle stage of a task from its ID suffix.
 *   _INSTALL or _REINSTALL or _SETUP    → 'install'
 *   _REMOVE   or _TEARDOWN              → 'remove'
 *   anything else                       → null
 *
 * Anchored at end-of-string so middle-of-ID matches don't false-positive.
 * Used by build-snapshot.js to split merged lifecycle activities (Outlet
 * Cycle, HVAC Vent Cycle, Cabinet Encapsulate Mask, etc.) into install/
 * remove sub-stages so the Tracker can log install hours separately from
 * remove hours.
 */
export function deriveStage(taskId) {
  if (!taskId) return null;
  if (/_(REINSTALL|INSTALL|SETUP)$/.test(taskId)) return 'install';
  if (/_(REMOVE|TEARDOWN)$/.test(taskId)) return 'remove';
  return null;
}

/**
 * Generic fallback that pairs install/remove tasks by stripping the verb
 * from the task's display name. Runs AFTER the explicit ACTIVITY_RULES in
 * build-snapshot.js — so named rules like "Outlet/Switch Cover Cycle" win,
 * and only the long tail of un-named lifecycle pairs goes through here.
 *
 * Recognized taskName shapes (from the scenario bundle):
 *   "Toilet Mask — Install"                       → "Toilet Mask"
 *   "Light Fixtures + ... — Remove (project ...)" → "Light Fixtures + ..."
 *   "Install Floor Encapsulation"                 → "Floor Encapsulation"
 *   "Remove Floor Partial Drop"                   → "Floor Partial Drop"
 *   "Trim Tape Line Install"                      → "Trim Tape Line"  (no em-dash)
 *   "Trim Tape Line Install — Finish"             → "Trim Tape Line"  (peel coating then verb)
 *
 * Returns the derived activity name when both: (a) taskId ends in a
 * lifecycle suffix, and (b) the taskName matches one of the strip patterns.
 * Returns null otherwise — caller falls back to the raw taskName.
 */
export function deriveLifecycleActivityName(taskId, taskName) {
  if (!taskId || !taskName) return null;
  if (!/_(INSTALL|REINSTALL|REMOVE)$/.test(taskId)) return null;

  const trailingDash   = / —\s*(Install|Reinstall|Remove)(\s*\([^)]*\))?\s*$/i;
  const trailingPlain  = /\s+(Install|Reinstall|Remove)(\s*\([^)]*\))?\s*$/i;
  const leading        = /^(Install|Reinstall|Remove)\s+/i;
  // Trailing coating-role suffix appended by the engine's displayTaskName
  // when the base name doesn't already convey the role. For lifecycle pair
  // halves, "Remove" is in NAME_CONVEYS_TASK but "Install" is not — so the
  // install half can land here with an extra " — Finish" that the verb
  // strips above can't see past. Peel it off, then retry the verb strip.
  const materialLabel  = / —\s*(Finish|Primer|Clear|Sealer|Stain|Coat \d+)\s*$/i;

  const tryStrip = (s) => {
    if (trailingDash.test(s))  return s.replace(trailingDash, '').trim();
    if (trailingPlain.test(s)) return s.replace(trailingPlain, '').trim();
    if (leading.test(s))       return s.replace(leading, '').trim();
    return null;
  };

  const name = taskName.trim();
  const direct = tryStrip(name);
  if (direct !== null) return direct;

  if (materialLabel.test(name)) {
    const stripped = name.replace(materialLabel, '').trim();
    const second = tryStrip(stripped);
    if (second !== null) return second;
  }
  return null;
}

/**
 * Canonical activity name for protection-mask tasks that follow the
 * `TSK_<SUBJECT>_PROT_<VARIANT>_(SETUP|TEARDOWN)` shape. Used as a
 * second-stage fallback in build-snapshot.js when taskName-based stripping
 * fails — these tasks have asymmetric naming between the SETUP half
 * ("Mask Cabinets — Encapsulate (setup)") and the TEARDOWN half
 * ("Remove Cabinet Encapsulate Mask") so neither pure leading- nor
 * trailing-verb strip can produce the same name from both.
 *
 * Returns e.g. "Cabinet Encapsulate Mask" for both
 * TSK_CABT_PROT_ENCAP_SETUP and TSK_CABT_PROT_ENCAP_TEARDOWN.
 */
const PROT_SUBJECT_LABELS = {
  CABT:         'Cabinet',
  CLOSET_SHELF: 'Closet Shelf',
};
const PROT_VARIANT_LABELS = {
  EDGE:    'Edge',
  ENCAP:   'Encapsulate',
  FULL:    'Full Drape',
  PARTIAL: 'Partial',
};

export function deriveProtectionMaskName(taskId) {
  if (!taskId) return null;
  const m = taskId.match(/^TSK_(CABT|CLOSET_SHELF)_PROT_(EDGE|ENCAP|FULL|PARTIAL)_(SETUP|TEARDOWN)$/);
  if (!m) return null;
  const subject = PROT_SUBJECT_LABELS[m[1]];
  const variant = PROT_VARIANT_LABELS[m[2]];
  return `${subject} ${variant} Mask`;
}
