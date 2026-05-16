// Substrate ID → element parent bucket. Coarser than scope-tree's
// element_group (which has 'Surfaces' covering walls+ceilings); finer
// in that walls and ceilings can split into their own parents for
// certain phases (Walls Finish vs Ceilings Finish stay separate).

export const SUBSTRATE_TO_ELEMENT_PARENT = {
  walls: 'walls',
  ceiling: 'ceilings',

  baseboard: 'trim',
  crown: 'trim',
  chair_rail: 'trim',
  shoe_mold: 'trim',
  picture_rail: 'trim',
  door_casing: 'trim',
  window_casing: 'trim',
  door_frames: 'trim',
  window_jamb: 'trim',
  window_stool: 'trim',
  window_apron: 'trim',
  shadow_box: 'trim',
  panel_mold: 'trim',

  doors: 'doors',
  windows: 'windows',
  cabinets: 'cabinets',
  stairway: 'stairway',

  wainscoting: 'specialty',
  wood_feature_wall: 'specialty',
  wood_ceiling: 'specialty',
  beams: 'specialty',
  columns: 'specialty',
  mantels: 'specialty',
  builtins: 'specialty',
  closet_shelving: 'specialty',
};

// Virtual element parents — tasks routed here by ps_key / spec metadata
// rather than substrate ID (protection + setup + cleanup don't have a
// substrate in the usual sense).
export const VIRTUAL_PARENTS = ['project_setup', 'project_protection', 'project_cleanup'];

// Per-phase merge overrides. For (parent, phase) pairs in this map,
// the listed sub-parents collapse into one row.
//
// Example: in prep + prime phases, walls + ceilings collapse to
// 'drywall_prep' / 'drywall_prime'. In finish phase, they stay
// separate (walls_finish vs ceilings_finish).
export const PHASE_MERGE_RULES = {
  prep: {
    drywall_prep: ['walls', 'ceilings'],
  },
  prime: {
    drywall_prime: ['walls', 'ceilings'],
  },
};

// Display labels for every parent (including merged variants and virtuals).
export const ELEMENT_PARENT_LABELS = {
  walls:               'Walls',
  ceilings:            'Ceilings',
  trim:                'Trim',
  doors:               'Doors',
  windows:             'Windows',
  cabinets:            'Cabinets',
  stairway:            'Stairway',
  specialty:           'Specialty',
  drywall_prep:        'Drywall',
  drywall_prime:       'Drywall',
  project_setup:       'Project Setup',
  project_protection:  'Project Protection',
  project_cleanup:     'Project Cleanup',
};

/**
 * Map a substrate ID to its element parent bucket.
 */
export function getElementParent(substrateId) {
  return SUBSTRATE_TO_ELEMENT_PARENT[substrateId] ?? null;
}

/**
 * Given a base element parent + phase, apply the phase merge rule (if any)
 * and return the effective parent for that (parent, phase) pair.
 */
export function applyPhaseMergeRule(parent, phase) {
  const rules = PHASE_MERGE_RULES[phase];
  if (!rules) return parent;
  for (const [mergedParent, subParents] of Object.entries(rules)) {
    if (subParents.includes(parent)) return mergedParent;
  }
  return parent;
}
