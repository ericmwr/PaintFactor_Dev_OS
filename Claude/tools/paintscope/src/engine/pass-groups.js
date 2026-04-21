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

  const finishGroup = tryCombinedFinishGroup(room, project, specData);
  if (finishGroup) groups.push(finishGroup);

  return groups;
}

function tryCombinedFinishGroup(room, project, specData) {
  if (!specData?.resolvedFinishByRoomSubstrate) return null;
  if (!room.id) return null;

  const walls = room.substrates?.walls;
  const ceiling = room.substrates?.ceiling;
  if (!walls || !ceiling) return null;

  const wallsFinish   = specData.resolvedFinishByRoomSubstrate[`${room.id}:walls`];
  const ceilingFinish = specData.resolvedFinishByRoomSubstrate[`${room.id}:ceiling`];
  if (!wallsFinish || !ceilingFinish) return null;

  // All four product fields must match for a combined pass to make sense
  if (wallsFinish.system_id  !== ceilingFinish.system_id)  return null;
  if (wallsFinish.product_id !== ceilingFinish.product_id) return null;
  if (wallsFinish.sheen      !== ceilingFinish.sheen)      return null;
  if (wallsFinish.color_code !== ceilingFinish.color_code) return null;

  // Method + QT must match
  const wallsMethod   = resolveMethod(walls, project);
  const ceilingMethod = resolveMethod(ceiling, project);
  if (wallsMethod !== ceilingMethod) return null;

  const wallsQt   = resolveQt(walls, room, project);
  const ceilingQt = resolveQt(ceiling, room, project);
  if (wallsQt !== ceilingQt) return null;

  return {
    group_id: 'walls_ceiling_finish_combined',
    substrates: ['walls', 'ceiling'],
    pass_type: 'finish',
    source: 'product_match',
    metadata: {
      system_id:  wallsFinish.system_id,
      product_id: wallsFinish.product_id,
      sheen:      wallsFinish.sheen,
      color_code: wallsFinish.color_code,
    },
  };
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
