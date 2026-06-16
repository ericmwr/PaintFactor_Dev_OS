import { SPEC_SUBSTRATE_MAP, UI_STATE_TO_SPEC_STATE, SPEC_VALID_INPUT_STATES, SPEC_OUTPUT_STATES } from '../data/scenario-maps.js';
import { SUBSTRATE_MAP, SUBSTRATE_CATALOG } from '../data/substrate-catalog.js';

/**
 * Resolve the spec system state (SS_*) for a spec's primary substrate in a room.
 * For items-based substrates (doors/windows), checks the first item's state.
 * Falls back to SUBSTRATE_CATALOG default when substrate_state is null.
 */
export function resolveSubstrateStateForSpec(specId, room) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (!primarySub) return null;

  const subs = room.substrates || {};

  // For trim specs, check all trim-group substrates (they share prime/paint specs)
  // For window spec, also check window_jamb as a fallback when windows aren't selected
  // For arch element specs, beams/columns/mantels share one spec — read state from
  // whichever substrate is present (priority order matches activation fallback).
  const archSpec = specId === 'SF_ARCH_ELEMENT_NC' || specId === 'SF_ARCH_ELEMENT_NC_STAIN';
  let subIds = (primarySub === 'baseboard')
    ? SUBSTRATE_CATALOG.filter(s => s.group === 'Trim').map(s => s.id).filter(id => subs[id])
    : (primarySub === 'windows')
      ? [subs.windows?.painting ? 'windows' : null, subs.window_jamb ? 'window_jamb' : null].filter(Boolean)
      : archSpec
        ? ['beams', 'columns', 'mantels'].filter(id => subs[id])
        : (subs[primarySub] ? [primarySub] : []);
  // Fallback: wood wall/ceiling specs read from walls/ceiling when material is wood
  if (subIds.length === 0) {
    if (primarySub === 'wood_feature_wall' && room.wall_material === 'wood' && subs.walls) subIds = ['walls'];
    else if (primarySub === 'wood_ceiling' && room.ceiling_material === 'wood' && subs.ceiling) subIds = ['ceiling'];
  }

  // Return array of resolved SS_* states for all relevant substrates in this room
  const states = [];
  for (const sid of subIds) {
    const config = subs[sid];
    if (!config) continue;

    let uiState = config.substrate_state;
    // Items-based substrates: use first item's state
    if (!uiState && config.items && config.items.length > 0) {
      uiState = config.items[0].substrate_state;
    }
    // Fall back to catalog default
    if (!uiState) {
      const cat = SUBSTRATE_MAP[sid];
      if (cat && cat.defaultConfig) uiState = cat.defaultConfig.substrate_state;
    }
    if (uiState) {
      const mapped = UI_STATE_TO_SPEC_STATE[uiState];
      if (mapped) states.push(mapped);
    }
  }
  return states;
}

/**
 * Check if a spec's valid_input_states accepts a given SS_* state.
 * Handles 'SS_PAINTED' prefix matching for previously_painted substrates.
 */
export function specAcceptsState(specId, specState) {
  const validStates = SPEC_VALID_INPUT_STATES[specId];
  if (!validStates) return true;
  if (!specState) return true;
  if (validStates.includes(specState)) return true;
  // Prefix match: previously_painted maps to generic SS_PAINTED
  if (specState === 'SS_PAINTED') {
    return validStates.some(s => s.startsWith('SS_PAINTED'));
  }
  return false;
}

/**
 * Check if a spec should activate for a room based on substrate state compatibility.
 * Uses direct match + one-level chain activation: if another spec produces a state
 * this spec accepts (e.g., wall prime outputs SS_PRIMED_FIELD -> wall finish accepts it).
 */
export function isSpecStateCompatible(specId, room) {
  const states = resolveSubstrateStateForSpec(specId, room);
  if (!states || states.length === 0) return true; // No state info = allow

  for (const specState of states) {
    // Direct match: substrate state is in this spec's valid_input_states
    if (specAcceptsState(specId, specState)) return true;

    // Chain match: another spec produces a state this spec accepts
    const primarySub = SPEC_SUBSTRATE_MAP[specId];
    for (const [producerSpecId, outputState] of Object.entries(SPEC_OUTPUT_STATES)) {
      if (producerSpecId === specId) continue;
      // Producer must serve the same substrate group
      if (SPEC_SUBSTRATE_MAP[producerSpecId] !== primarySub) continue;
      // Producer must accept the current substrate state
      if (!specAcceptsState(producerSpecId, specState)) continue;
      // This spec must accept the producer's output
      const validStates = SPEC_VALID_INPUT_STATES[specId];
      if (validStates && validStates.includes(outputState)) return true;
    }
  }
  return false;
}
