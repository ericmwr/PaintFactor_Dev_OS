import { OPENING_SUBSTRATES } from './quantity-lookups.js';
import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import { inferDefaultSystem } from '../data/system-catalog.js';

// Items-based substrates (doors, windows) store per-item fields like
// coating_type, substrate_state, wood_species_group on each item rather
// than on the top-level substrate config. This helper reads a field from
// the first item that has it set, falling back to the top-level config.
const ITEMS_SUBSTRATES = new Set(['doors', 'windows']);
function resolveItemField(config, subId, field, fallback) {
  // Try top-level config first
  if (config?.[field] != null) return config[field];
  // For items-based substrates, check items
  if (ITEMS_SUBSTRATES.has(subId) && config?.items?.length > 0) {
    for (const item of config.items) {
      if (item[field] != null) return item[field];
    }
  }
  return fallback;
}

// When wall_material='wood', wood wall specs should read from the walls
// substrate config instead of wood_feature_wall. Same for ceiling.
function resolveSubstrateConfig(specId, room) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (!primarySub) return null;
  const config = room.substrates?.[primarySub];
  if (config) return config;
  // Fallback: wood wall specs can read from walls when wall_material is wood
  if (primarySub === 'wood_feature_wall' && room.wall_material === 'wood') {
    return room.substrates?.walls || null;
  }
  if (primarySub === 'wood_ceiling' && room.ceiling_material === 'wood') {
    return room.substrates?.ceiling || null;
  }
  return null;
}

export function resolveQualityTier(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  // Opening QT override takes priority for opening-related specs
  if (primarySub && OPENING_SUBSTRATES.has(primarySub) && room.openings_quality_tier) {
    return room.openings_quality_tier;
  }
  if (primarySub) {
    const subConfig = room.substrates && room.substrates[primarySub];
    if (subConfig && subConfig.quality_tier) {
      return subConfig.quality_tier;
    }
  }
  // Room-level override (mirrors multi-qt.js:151 and resolveApplicationMethod cascade)
  if (room.quality_tier) return room.quality_tier;
  return project.default_quality_tier;
}

/**
 * Resolve the effective `system` (workflow intent) for a spec's substrate.
 * Cascade, most→least specific:
 *   1. Per-substrate override (`room.substrates[sub].system`)
 *   2. Backward-compat: legacy `coating_type` on wood substrates maps to an
 *      equivalent system value (no migration required on saved projects)
 *   3. Per-room override (`room.system`)
 *   4. Inferred default from (substrate × substrate_state) via system-catalog
 *
 * Returns null if nothing matches — the adapter treats null as "unknown"
 * (activates all spec roles with input state, matching pre-Pass-A behavior).
 */
export function resolveSystem(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const subConfig = primarySub && room.substrates?.[primarySub];

  // 1. Stain/clear coating_type asserts workflow intent over any stale
  // `system` value. Coating Type is the user-facing toggle for wood substrates;
  // picking "Stain + Clear" must suppress paint specs even if a prior session
  // left config.system = 'paint_full' cached on the substrate.
  if (subConfig?.substrate_state === 'bare_wood') {
    if (subConfig?.coating_type === 'stain_clear')  return 'stain_sealer_clear';
    if (subConfig?.coating_type === 'stain_only')   return 'stain_only';
    if (subConfig?.coating_type === 'clear_only')   return 'clear_refresh';
    if (subConfig?.coating_type === 'stain')        return 'stain_sealer_clear';
  }

  // 2. Per-substrate explicit system override (e.g. user picked paint_finish
  // via the System dropdown when the inferred default would've been paint_full).
  if (subConfig?.system) return subConfig.system;

  // 3. Paint coating_type on bare wood → full paint system (default inference).
  if (subConfig?.substrate_state === 'bare_wood' && subConfig?.coating_type === 'paint') {
    return 'paint_full';
  }

  // 3. Per-room override
  if (room.system) return room.system;

  // 4. Inferred default — read top-level substrate_state, or fall back to
  // items[0].substrate_state for items-based substrates (doors, windows).
  if (primarySub) {
    const stateForInference = subConfig?.substrate_state
      ?? (Array.isArray(subConfig?.items) && subConfig.items.length > 0
          ? subConfig.items[0].substrate_state
          : undefined);
    if (stateForInference) {
      const inferred = inferDefaultSystem(primarySub, stateForInference);
      if (inferred) return inferred;
    }
  }

  return null;
}

export function resolveApplicationMethod(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (primarySub) {
    const subConfig = room.substrates && room.substrates[primarySub];
    // 1. Substrate-level override (user explicitly set it on the tab)
    if (subConfig && subConfig.application_method) {
      return subConfig.application_method;
    }
    // 2. Substrate type default (e.g. brush for trim, spray_backroll for walls)
    const sam = SUBSTRATE_APPLICATION_METHODS[primarySub];
    if (sam) {
      return sam.default;
    }
  }
  // 3. Room-level override, then project default
  return room.application_method || project.default_application_method;
}

/**
 * Resolve the effective surface_texture for a given spec+room combination.
 * For wall/ceiling specs, use the substrate's texture. Otherwise project default.
 */
export function resolveTextureForSpec(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (primarySub) {
    const subConfig = room.substrates && room.substrates[primarySub];
    if (subConfig && subConfig.texture) return subConfig.texture;
  }
  // Fallback: walls texture -> ceiling texture -> project default
  return (room.substrates?.walls?.texture) || (room.substrates?.ceiling?.texture) || project.default_texture;
}

export function resolveCoatingType(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  if (!primarySub) return 'paint';
  const config = resolveSubstrateConfig(specId, room);
  return resolveItemField(config, primarySub, 'coating_type', 'paint');
}

export function resolveStainMethod(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = resolveSubstrateConfig(specId, room);
  return resolveItemField(config, primarySub, 'application_method_stain', 'brush');
}

export function resolveClearMethod(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = resolveSubstrateConfig(specId, room);
  return resolveItemField(config, primarySub, 'application_method_clear', 'brush');
}

export function resolveCoatCounts(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = resolveSubstrateConfig(specId, room);
  const coatingType = resolveItemField(config, primarySub, 'coating_type', 'paint');
  const counts = {
    stain_coats: resolveItemField(config, primarySub, 'stain_coats', 1),
    sealer_coats: resolveItemField(config, primarySub, 'sealer_coats', 0),
    clear_coats: resolveItemField(config, primarySub, 'clear_coats', 1),
  };
  // Gate irrelevant phases by coating_type — UI hides the dropdowns but may
  // have stale saved values. dynamic_coats uses these to skip phase modules.
  if (coatingType === 'stain_only') { counts.sealer_coats = 0; counts.clear_coats = 0; }
  if (coatingType === 'clear_only') { counts.stain_coats = 0; counts.sealer_coats = 0; }
  return counts;
}

export function resolveClearSheen(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = resolveSubstrateConfig(specId, room);
  return resolveItemField(config, primarySub, 'clear_sheen', 'satin');
}

export function resolveWoodSpecies(specId, room, project) {
  const primarySub = SPEC_SUBSTRATE_MAP[specId];
  const config = resolveSubstrateConfig(specId, room);
  return resolveItemField(config, primarySub, 'wood_species_group', 'hardwood');
}
