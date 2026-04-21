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
  // Phase 1 stub: no groups formed yet.
  // Phase 2 adds combined-prime precheck.
  // Phase 3 adds combined-finish precheck.
  return [];
}
