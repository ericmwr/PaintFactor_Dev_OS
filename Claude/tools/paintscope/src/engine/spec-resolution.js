import { OPENING_SUBSTRATES } from './quantity-lookups.js';
import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';

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
  return project.default_quality_tier;
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
