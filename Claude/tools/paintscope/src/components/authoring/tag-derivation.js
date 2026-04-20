// Pure functions that extract filterable tag categories from modules/scenarios.
// Heuristic — relies on naming convention (MOD_{PHASE}_{SUBSTRATE}_..._{METHOD}_QT{N})
// for modules, and the structured `match` object for scenarios.
//
// Returns a record of category → tag[] (strings). Missing category means
// "untagged in this dimension" — filter logic treats that as pass-through.

const SUBSTRATE_TOKENS = {
  // order matters — longer tokens first so WALL_PRIME doesn't match WALL when WALL_PRIME is intended as a wall prime module (still wall)
  // Stair sub-types (riser/railing/stringer/tread) all roll up under a single `stair` chip.
  WOOD_CEILING: 'wood_ceiling',
  WOOD_WALL: 'wood_wall',
  DOOR_FRAME: 'door_frame',
  STAIR_RISER: 'stair',
  STAIR_RAILING: 'stair',
  STAIR_STRINGER: 'stair',
  STAIR_TREAD: 'stair',
  STAIR: 'stair',
  CLOSET_SHELF: 'closet_shelf',
  CLOSET: 'closet',
  ARCH_ELEMENT: 'arch_element',
  ARCH_BEAM: 'beam',
  BEAM: 'beam',
  COLUMN: 'column',
  MANTEL: 'mantel',
  WAINSCOT: 'wainscot',
  BUILTIN: 'builtin',
  CABINET: 'cabinet',
  CEILING: 'ceiling',
  WALL: 'wall',
  WINDOW: 'window',
  TRIM: 'trim',
  DOOR: 'door',
};

const METHOD_TOKENS = {
  SPRAY_BACKROLL: 'spray_backroll',
  SPRAY_BACKBRUSH: 'spray_backbrush',
  BRUSH_ROLL: 'brush_roll',
  ROLLOFF: 'rolloff',
  SPRAY: 'spray',
  BRUSH: 'brush',
  ROLL: 'roll',
};

const COATING_TOKENS = {
  STAIN: 'stain',
  CLEAR: 'clear',
  PRIME: 'prime',
  PAINT: 'paint',
  FINISH: 'paint',
};

const STATE_TOKENS = {
  FACTORY_PRIMED: 'factory_primed',
  FACTORY_FINISH: 'factory_finish',
  SOUND_PAINT: 'sound_paint',
  FAILING: 'failing_paint',
  PEELING: 'peeling_paint',
  WEATHERED: 'weathered_wood',
  MELAMINE: 'melamine',
  STAINED: 'stained',
  PRIMED: 'primed',
  BARE: 'bare',
};

function extractFirstMatch(name, tokenMap) {
  const upper = name.toUpperCase();
  for (const [token, value] of Object.entries(tokenMap)) {
    if (upper.includes(token)) return value;
  }
  return null;
}

function extractQT(name) {
  const m = /_QT([2-5])/.exec(name.toUpperCase());
  return m ? `QT${m[1]}` : null;
}

function extractPhase(moduleId) {
  const m = /^MOD_([A-Z]+)_/.exec(moduleId);
  if (!m) return null;
  const p = m[1].toLowerCase();
  const valid = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];
  return valid.includes(p) ? p : null;
}

/**
 * Derive tags from a module record.
 * @param {object} mod — canonical or draft module object (expects module_id, phase, name)
 * @returns {{ phase: string|null, substrate: string|null, method: string|null, qt: string|null, coating: string|null, state: string|null }}
 */
export function deriveModuleTags(mod) {
  const id = mod.module_id || mod.id || '';
  const name = mod.name || '';
  const both = `${id} ${name}`;
  return {
    phase: mod.phase || extractPhase(id),
    substrate: extractFirstMatch(both, SUBSTRATE_TOKENS),
    method: extractFirstMatch(both, METHOD_TOKENS),
    qt: extractQT(id),
    coating: extractFirstMatch(both, COATING_TOKENS),
    state: extractFirstMatch(both, STATE_TOKENS),
  };
}

/**
 * Derive tags from a scenario record. Scenarios have structured `match` data,
 * which is far more reliable than name parsing.
 */
export function deriveScenarioTags(scn) {
  const match = scn.match || {};
  const id = scn.scenario_id || scn.id || '';
  const name = scn.name || '';
  const both = `${id} ${name}`;

  // match values can be string OR array — normalize to first value for tag display
  const first = (v) => Array.isArray(v) ? v[0] : v;

  const paintableItem = first(match.paintable_item);
  const substrate = paintableItem || extractFirstMatch(both, SUBSTRATE_TOKENS);

  return {
    domain: scn.domain || null,
    substrate: substrate,
    method: first(match.application_method) || extractFirstMatch(both, METHOD_TOKENS),
    qt: first(match.quality_tier) || extractQT(id),
    coating: first(match.coating_type) || extractFirstMatch(both, COATING_TOKENS),
    state: first(match.substrate_state) || extractFirstMatch(both, STATE_TOKENS),
  };
}

/**
 * Given a list of rows (each with a pre-computed `tags` object plus `source`/`status`),
 * and an activeTags map (category → Set<string>), return the counts for every possible
 * chip value. Rules:
 *   - A row matches a category if: (a) category has no active tags, OR
 *                                  (b) row's tag in that category is in the active set, OR
 *                                  (c) row has no tag in that category (pass-through).
 *   - Count for a chip = how many rows would match if ONLY that chip were added.
 */
export function computeChipCounts(rows, activeTags) {
  const categories = ['phase', 'domain', 'substrate', 'method', 'qt', 'coating', 'state', 'status'];
  const result = {};
  for (const cat of categories) result[cat] = {};

  for (const row of rows) {
    const rowTags = row.tags || {};
    // For each category, simulate "this category has chip X active" and check if row passes all OTHER categories
    for (const cat of categories) {
      const rowVal = cat === 'status' ? (row.source === 'canonical' ? 'canonical' : row.source) : rowTags[cat];
      if (!rowVal) continue;

      // Does the row pass all OTHER active filters? (Using current activeTags)
      let passesOthers = true;
      for (const otherCat of categories) {
        if (otherCat === cat) continue;
        const activeSet = activeTags[otherCat];
        if (!activeSet || activeSet.size === 0) continue;
        const otherVal = otherCat === 'status' ? (row.source === 'canonical' ? 'canonical' : row.source) : rowTags[otherCat];
        if (otherVal && !activeSet.has(otherVal)) { passesOthers = false; break; }
      }
      if (passesOthers) {
        result[cat][rowVal] = (result[cat][rowVal] || 0) + 1;
      }
    }
  }
  return result;
}

/**
 * Check if a row passes the active-tag filter.
 * Same AND/OR/pass-through rules as computeChipCounts.
 */
export function rowPassesFilters(row, activeTags) {
  const rowTags = row.tags || {};
  const categories = ['phase', 'domain', 'substrate', 'method', 'qt', 'coating', 'state', 'status'];
  for (const cat of categories) {
    const activeSet = activeTags[cat];
    if (!activeSet || activeSet.size === 0) continue;
    const rowVal = cat === 'status' ? (row.source === 'canonical' ? 'canonical' : row.source) : rowTags[cat];
    if (!rowVal) continue; // pass-through when row has no tag in this category
    if (!activeSet.has(rowVal)) return false;
  }
  return true;
}
