// Pass-group resolver: coalesces N substrates sharing a coordinated painting
// pass into a single estimate input. Called once per room by the context
// adapter before the per-spec fan-out. Grouped substrates are excluded from
// spec iteration so only one input per group reaches the matcher.
//
// Current group types (see Claude/registries/pass_groups.json):
//   - walls_ceiling_prime_combined  (project flag)
//   - walls_ceiling_finish_combined (product match)
//
// Future groups (trim-family, ext body+trim) extend this function additively.

/**
 * @param {object|null} room     — room state from project_data.rooms[]
 * @param {object|null} project  — project state from project_data.project
 * @param {object|null} specData — resolved spec data (reserved for finish-group product lookup)
 * @returns {Array<PassGroup>}   — zero or more pass groups; empty array when no grouping applies
 *
 * PassGroup shape:
 *   {
 *     group_id: string,           // e.g. "walls_ceiling_prime_combined"
 *     substrates: string[],       // e.g. ["walls", "ceiling"]
 *     pass_type: "prime"|"finish",
 *     source: "project_flag"|"product_match"|"user_declared",
 *     metadata: Record<string, unknown>
 *   }
 */
export function resolvePassGroups(room, project, specData) {
  if (!room || !project) return [];
  const groups = [];

  const primeGroup = tryCombinedPrimeGroup(room, project);
  if (primeGroup) groups.push(primeGroup);

  const finishGroup = tryCombinedFinishGroup(room, project);
  if (finishGroup) groups.push(finishGroup);

  // Track substrates already claimed by pre-authored groups so the dynamic
  // resolver doesn't double-claim them. Walls/ceiling are excluded by default
  // but this defensive collection covers any future pre-authored groups that
  // target other substrates.
  const claimed = new Set();
  for (const g of groups) {
    for (const s of g.substrates) claimed.add(s);
  }

  const itemGroups = resolveItemAssignmentGroups(room, claimed);
  groups.push(...itemGroups);

  return groups;
}

function tryCombinedFinishGroup(room, project) {
  const finishMode = resolveFinishMode(room, project);
  if (finishMode !== 'combined') return null;

  const walls = room.substrates?.walls;
  const ceiling = room.substrates?.ceiling;
  if (!walls || !ceiling) return null;

  // substrate_state intentionally NOT checked here — in NC chain activation,
  // substrates start bare and become primed before the finish phase fires.
  // The scenarios themselves handle state matching (combined finish scenarios
  // match on pass_group_id + QT + method + sheen; they're phase-inherent
  // finish and don't gate on state). Letting the group form on bare_drywall
  // rooms is correct: the engine's finish-phase ctx gets the right state
  // via chain activation downstream.

  // Same application method, must be spray_backroll for combined to make sense
  const wallsMethod   = resolveMethod(walls, project);
  const ceilingMethod = resolveMethod(ceiling, project);
  if (wallsMethod !== 'spray_backroll') return null;
  if (wallsMethod !== ceilingMethod) return null;

  // Same QT
  const wallsQt   = resolveQt(walls, room, project);
  const ceilingQt = resolveQt(ceiling, room, project);
  if (wallsQt !== ceilingQt) return null;

  return {
    group_id: 'walls_ceiling_finish_combined',
    substrates: ['walls', 'ceiling'],
    pass_type: 'finish',
    source: 'project_flag',
    metadata: { finish_mode: 'combined' },
  };
}

function resolveFinishMode(room, project) {
  const override = room.combined_wc_finish_override;
  if (override === 'combined' || override === 'separate') return override;
  return project.default_combined_wc_finish ? 'combined' : 'separate';
}

function tryCombinedPrimeGroup(room, project) {
  const primeMode = resolvePrimeMode(room, project);
  if (primeMode !== 'combined') return null;

  const walls = room.substrates?.walls;
  const ceiling = room.substrates?.ceiling;
  if (!walls || !ceiling) return null;

  // Both substrates must be present AND "being primed" — in the NC workflow
  // that's implicit when the substrate is bare (state === 'bare_drywall').
  // TODO (post-scope-c): handle non-drywall wall/ceiling materials when
  //   pass-group expansion covers wood_wall / wood_ceiling / etc.
  if (walls.substrate_state !== 'bare_drywall') return null;
  if (ceiling.substrate_state !== 'bare_drywall') return null;
  if (walls.substrate_state !== ceiling.substrate_state) return null;

  // Same application method, must be spray_backroll
  const wallsMethod   = resolveMethod(walls, project);
  const ceilingMethod = resolveMethod(ceiling, project);
  if (wallsMethod !== 'spray_backroll') return null;
  if (ceilingMethod !== 'spray_backroll') return null;
  if (wallsMethod !== ceilingMethod) return null;

  // Same QT
  const wallsQt   = resolveQt(walls, room, project);
  const ceilingQt = resolveQt(ceiling, room, project);
  if (wallsQt !== ceilingQt) return null;

  return {
    group_id: 'walls_ceiling_prime_combined',
    substrates: ['walls', 'ceiling'],
    pass_type: 'prime',
    source: 'project_flag',
    metadata: { prime_mode: 'combined' },
  };
}

function resolvePrimeMode(room, project) {
  const override = room.combined_prime_override;
  if (override === 'combined' || override === 'separate') return override;
  return project.default_combined_prime ? 'combined' : 'separate';
}

// Substrates that are never eligible for dynamic item-assignment grouping.
// Walls and ceiling are owned by walls_ceiling_*_combined groups (pre-authored
// pass-groups handle their finish behavior).
const ITEM_ASSIGNMENT_EXCLUDED = new Set(['walls', 'ceiling']);

/**
 * Dynamic pass-group resolution from per-item finish_group values.
 *
 * Collects all non-wall/ceiling substrates in a room by their finish_group,
 * emits one PassGroup per value that has >=2 members. Singletons are skipped.
 *
 * @param {object} room
 * @param {Set<string>} excludedSubstrates — substrates already claimed by a prior
 *   pass-group (precedence); these are skipped to preserve the "each substrate
 *   in at most one group" invariant.
 * @returns {Array<PassGroup>}
 */
function resolveItemAssignmentGroups(room, excludedSubstrates) {
  if (!room?.substrates) return [];
  const byGroup = new Map();
  for (const [id, cfg] of Object.entries(room.substrates)) {
    if (ITEM_ASSIGNMENT_EXCLUDED.has(id)) continue;
    if (excludedSubstrates?.has(id)) continue;
    const fg = cfg?.finish_group;
    if (!fg) continue;
    // Always-present substrates (doors, windows, door_casing, window_casing)
    // stay in state with painting=false when not being painted. Skip them
    // so their auto-seeded finish_group doesn't inflate group membership.
    if (cfg.painting !== undefined && cfg.painting !== true) continue;
    if (!byGroup.has(fg)) byGroup.set(fg, []);
    byGroup.get(fg).push(id);
  }
  const groups = [];
  for (const [fg, substrates] of byGroup.entries()) {
    if (substrates.length < 2) continue; // singleton skip

    // V1a: warn (but still pool) on coating_type / application_method mismatches.
    // These are authoring errors — one pass can't be both paint and stain_clear,
    // or both brush and spray simultaneously. Console warning is defensive;
    // strict validation is a V2 decision based on observed frequency.
    const coatingTypes = new Set();
    const methods = new Set();
    for (const s of substrates) {
      const cfg = room.substrates[s];
      coatingTypes.add(cfg?.coating_type || 'paint');
      if (cfg?.application_method) methods.add(cfg.application_method);
    }
    if (coatingTypes.size > 1) {
      console.warn(`[finish-group] Warning: group ${fg} has mixed coating_type (${[...coatingTypes].join(', ')}) — likely authoring mistake; pooling anyway.`);
    }
    if (methods.size > 1) {
      console.warn(`[finish-group] Warning: group ${fg} has mixed application_method (${[...methods].join(', ')}) — likely authoring mistake; pooling anyway.`);
    }

    groups.push({
      group_id: 'finish_group_assignment',
      substrates: substrates.slice().sort(),
      pass_type: 'finish',
      source: 'item_assignment',
      metadata: { finish_group: fg },
    });
  }
  return groups;
}

function resolveMethod(substrateConfig, project) {
  return substrateConfig.application_method
      || project.default_application_method
      || 'brush_roll';
}

function resolveQt(substrateConfig, room, project) {
  return substrateConfig.quality_tier
      || room.quality_tier
      || project.default_quality_tier
      || 'QT3';
}
