// Maps Gemini structured JSON output to PaintScope room state patches.
// Uses existing factory functions and resolves enums.

import { createDoor, createWindow, createOpening, createSubstrateConfig } from '../../state/initial-state';
import { resolveEnum } from './enum-resolver';

/**
 * Map the room overview response to room-level fields.
 * @param {Object} overview - Gemini room overview response
 * @returns {Object} Partial room state patch
 */
export function mapOverviewToRoom(overview) {
  if (!overview) return {};
  const patch = {};

  if (overview.suggested_label) patch.label = overview.suggested_label;
  if (overview.estimated_length_ft) patch.length_ft = Math.round(overview.estimated_length_ft);
  if (overview.estimated_width_ft) patch.width_ft = Math.round(overview.estimated_width_ft);
  if (overview.ceiling_height_ft) patch.height_ft = Math.round(overview.ceiling_height_ft);
  if (overview.complexity) patch.complexity = resolveEnum('complexity', overview.complexity) || 'STD';

  // Ceiling type mapping
  if (overview.ceiling_type === 'vaulted' || overview.ceiling_type === 'cathedral') {
    patch.vaulted_ceiling = true;
    if (overview.ceiling_height_ft) patch.peak_height_ft = Math.round(overview.ceiling_height_ft);
  }
  if (overview.ceiling_type === 'beam_exposed') {
    patch.beams_enabled = true;
  }

  // Floor type
  if (overview.floor_type && overview.floor_type !== 'unknown') {
    patch.floor_type = resolveEnum('floor_type', overview.floor_type) || '';
  }

  return {
    roomPatch: patch,
    confidence: overview.confidence || 'medium',
    room_type: overview.room_type,
    notable_features: overview.notable_features || [],
  };
}

/**
 * Map the detailed surface analysis to substrate configs, doors, windows, etc.
 * Returns a structured result grouped by category for the review UI.
 * @param {Object} detail - Gemini detailed analysis response
 * @returns {Object} Categorized detections with confidence
 */
export function mapDetailToRoom(detail) {
  if (!detail) return {};

  const result = {
    surfaces: {},
    trim: {},
    doors: [],
    windows: [],
    openings: [],
    fixtures: [],
    specialty: {},
  };

  // --- Surfaces ---
  if (detail.surfaces) {
    for (const [id, data] of Object.entries(detail.surfaces)) {
      if (!data?.detected) continue;
      const config = { substrate_state: resolveEnum('substrate_state', data.substrate_state) };
      if (data.texture) config.texture = resolveEnum('texture', data.texture);
      result.surfaces[id] = { ...config, confidence: data.confidence || 'medium' };
    }
  }

  // --- Trim ---
  if (detail.trim) {
    for (const [id, data] of Object.entries(detail.trim)) {
      if (!data?.detected) continue;
      // Map crown_molding → crown (catalog id)
      const substrateId = id === 'crown_molding' ? 'crown' : id;
      const config = { substrate_state: resolveEnum('substrate_state', data.substrate_state) };
      if (data.estimated_sf) config.sf_manual = Math.round(data.estimated_sf);
      result.trim[substrateId] = { ...config, confidence: data.confidence || 'medium' };
    }
  }

  // --- Doors ---
  if (detail.doors && detail.doors.length > 0) {
    result.doors = detail.doors.map(d => ({
      door_type: resolveEnum('door_type', d.door_type) || 'panel_6',
      count: d.count || 1,
      substrate_state: resolveEnum('substrate_state', d.substrate_state) || 'factory_primed',
      sides_per_door: d.sides_per_door || 2,
      confidence: d.confidence || 'medium',
    }));
  }

  // --- Windows ---
  if (detail.windows && detail.windows.length > 0) {
    result.windows = detail.windows.map(w => ({
      window_type: resolveEnum('window_type', w.window_type) || 'double_hung',
      count: w.count || 1,
      size_bucket: resolveEnum('size_bucket', w.size_bucket) || 'M',
      substrate_state: resolveEnum('substrate_state', w.substrate_state) || 'bare_wood',
      confidence: w.confidence || 'medium',
    }));
  }

  // --- Openings ---
  if (detail.openings && detail.openings.length > 0) {
    result.openings = detail.openings.map(o => ({
      opening_type: resolveEnum('opening_type', o.opening_type) || 'single',
      count: o.count || 1,
      confidence: o.confidence || 'medium',
    }));
  }

  // --- Fixtures ---
  if (detail.fixtures && detail.fixtures.length > 0) {
    result.fixtures = detail.fixtures.map(f => ({
      fixture_id: f.fixture_id,
      count: f.count || 1,
      notes: f.notes || '',
      confidence: f.confidence || 'medium',
    }));
  }

  // --- Specialty ---
  if (detail.specialty) {
    for (const [id, data] of Object.entries(detail.specialty)) {
      if (!data?.detected) continue;
      result.specialty[id] = {
        count: data.count || 1,
        substrate_state: resolveEnum('substrate_state', data.substrate_state) || 'bare_wood',
        confidence: data.confidence || 'medium',
      };
    }
  }

  return result;
}

/**
 * Build the final room state patch from accepted analysis fields.
 * This is called after the user reviews and accepts/rejects detections.
 * @param {Object} accepted - The accepted fields from the review UI
 * @returns {Object} Room state patch ready for dispatch
 */
export function buildRoomPatch(accepted) {
  const substrates = {};
  const openings = [];
  const fixtures = {};
  const roomFields = {};

  // Surfaces
  if (accepted.surfaces) {
    for (const [id, data] of Object.entries(accepted.surfaces)) {
      if (!data.accepted) continue;
      const config = {};
      if (data.substrate_state) config.substrate_state = data.substrate_state;
      if (data.texture) config.texture = data.texture;
      substrates[id] = createSubstrateConfig(id, config);
    }
  }

  // Trim
  if (accepted.trim) {
    for (const [id, data] of Object.entries(accepted.trim)) {
      if (!data.accepted) continue;
      const config = {};
      if (data.substrate_state) config.substrate_state = data.substrate_state;
      if (data.sf_manual) config.sf_manual = data.sf_manual;
      substrates[id] = createSubstrateConfig(id, config);
    }
  }

  // Doors
  if (accepted.doors && accepted.doors.length > 0) {
    const doorItems = accepted.doors
      .filter(d => d.accepted)
      .flatMap(d => {
        // Create `count` door items of this type
        const items = [];
        for (let i = 0; i < (d.count || 1); i++) {
          items.push(createDoor({
            door_type: d.door_type,
            substrate_state: d.substrate_state,
            sides_per_door: d.sides_per_door,
            count: 1,
          }));
        }
        return items;
      });

    if (doorItems.length > 0) {
      substrates.doors = createSubstrateConfig('doors', { items: doorItems, painting: true });
    }
  }

  // Windows
  if (accepted.windows && accepted.windows.length > 0) {
    const winItems = accepted.windows
      .filter(w => w.accepted)
      .flatMap(w => {
        const items = [];
        for (let i = 0; i < (w.count || 1); i++) {
          items.push(createWindow({
            window_type: w.window_type,
            size_bucket: w.size_bucket,
            substrate_state: w.substrate_state,
            count: 1,
          }));
        }
        return items;
      });

    if (winItems.length > 0) {
      substrates.windows = createSubstrateConfig('windows', { items: winItems, painting: true });
    }
  }

  // Openings
  if (accepted.openings) {
    for (const o of accepted.openings) {
      if (!o.accepted) continue;
      openings.push(createOpening({ opening_type: o.opening_type, count: o.count }));
    }
  }

  // Fixtures
  if (accepted.fixtures) {
    for (const f of accepted.fixtures) {
      if (!f.accepted) continue;
      fixtures[f.fixture_id] = { protection: 'medium_mask', count: f.count || 1, size: '', notes: f.notes || '' };
    }
  }

  // Specialty
  if (accepted.specialty) {
    for (const [id, data] of Object.entries(accepted.specialty)) {
      if (!data.accepted) continue;
      const config = { substrate_state: data.substrate_state };
      if (data.count) config.ea_manual = data.count;
      substrates[id] = createSubstrateConfig(id, config);
    }
  }

  // Room-level fields from overview
  if (accepted.roomPatch) {
    Object.assign(roomFields, accepted.roomPatch);
  }

  return { substrates, openings, fixtures, ...roomFields };
}
