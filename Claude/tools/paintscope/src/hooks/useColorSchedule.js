import { useMemo } from 'react';
import { getColorGroup } from '../state/color-state.js';

function resolveColor(substrate, locationOverrides, colors) {
  const group = getColorGroup(substrate);
  const layers = [
    locationOverrides?.[substrate],
    colors.substrate_overrides?.[substrate],
    group ? colors.defaults?.[group] : null,
  ];

  const sourceLabels = ['room', 'substrate', 'default'];
  const merged = { color_code: null, color_name: null, product: null, sheen: null };
  let hasAny = false;

  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer) continue;
    for (const field of ['color_code', 'color_name', 'product', 'sheen']) {
      if (layer[field] != null && layer[field] !== '') {
        merged[field] = layer[field];
        hasAny = true;
      }
    }
  }

  if (!hasAny) return null;

  let source = 'default';
  for (let i = 0; i < layers.length; i++) {
    if (layers[i]?.color_code) {
      source = sourceLabels[i];
      break;
    }
  }
  merged.source = source;
  return merged;
}

export function useColorSchedule(state) {
  const { colors, rooms, exterior } = state;

  return useMemo(() => {
    const result = { rooms: {}, elevations: {} };
    if (!colors) return result;

    for (const room of (rooms || [])) {
      const roomColors = {};
      const subs = room.substrates || {};
      for (const subId of Object.keys(subs)) {
        if (subs[subId].painting === false) continue;
        const resolved = resolveColor(subId, colors.room_overrides?.[room.id], colors);
        if (resolved) roomColors[subId] = resolved;
      }
      if (Object.keys(roomColors).length > 0 || colors.room_overrides?.[room.id]) {
        result.rooms[room.id] = roomColors;
      }
    }

    const elevations = exterior?.elevations || [];
    for (const elev of elevations) {
      const elevColors = {};
      if (elev.siding_sections?.length > 0) {
        const resolved = resolveColor('siding', colors.elevation_overrides?.[elev.id], colors);
        if (resolved) elevColors.siding = resolved;
      }
      if (elev.trim) {
        for (const trimType of Object.keys(elev.trim)) {
          if (!elev.trim[trimType].enabled) continue;
          const resolved = resolveColor(trimType, colors.elevation_overrides?.[elev.id], colors);
          if (resolved) elevColors[trimType] = resolved;
        }
      }
      if (elev.windows?.length > 0) {
        const resolved = resolveColor('ext_windows', colors.elevation_overrides?.[elev.id], colors);
        if (resolved) elevColors.ext_windows = resolved;
      }
      if (elev.doors?.length > 0) {
        const resolved = resolveColor('ext_doors', colors.elevation_overrides?.[elev.id], colors);
        if (resolved) elevColors.ext_doors = resolved;
      }
      if (Object.keys(elevColors).length > 0 || colors.elevation_overrides?.[elev.id]) {
        result.elevations[elev.id] = elevColors;
      }
    }

    return result;
  }, [colors, rooms, exterior]);
}
