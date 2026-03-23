import { createSubstrateConfig, createOpening, bumpNextId } from './initial-state';
import { createExteriorState } from './exterior-state';

/**
 * Migrate v0.2 state (flat drywall/trim/doors/windows/specialty) to v0.3 substrate model.
 */
export function migrateV02toV03(state) {
  if (!state || !state.rooms) return state;
  // Check if already v0.3: rooms have substrates object
  const needsMigration = state.rooms.some(r => r.drywall || r.trim || (r.doors && !r.substrates));
  if (!needsMigration) return state;

  console.log('[PaintScope] Migrating saved state from v0.2 to v0.3...');
  const migrated = JSON.parse(JSON.stringify(state));

  migrated.rooms = migrated.rooms.map(room => {
    if (room.substrates) return room; // Already v0.3

    const subs = {};

    // Migrate drywall → walls + ceiling
    if (room.drywall) {
      subs.walls = {
        substrate_state: null, texture: room.drywall.texture || null,
        sf_override: !!room.drywall.wall_field_override,
        sf_manual: parseFloat(room.drywall.wall_field_sf) || 0
      };
      subs.ceiling = {
        substrate_state: null, texture: room.drywall.texture || null,
        sf_override: !!room.drywall.ceiling_field_override,
        sf_manual: parseFloat(room.drywall.ceiling_field_sf) || 0
      };
    }

    // Migrate trim
    if (room.trim) {
      if (room.trim.baseboard_enabled) subs.baseboard = { substrate_state: null, lf_override: !!room.trim.baseboard_override, lf_manual: parseFloat(room.trim.baseboard_lf)||0 };
      if (room.trim.crown_enabled) subs.crown = { substrate_state: null, lf_override: !!room.trim.crown_override, lf_manual: parseFloat(room.trim.crown_lf)||0 };
      // Casing auto-included if doors/windows exist
      if ((room.doors||[]).length > 0) subs.door_casing = { substrate_state: null, style: null, lf_override: !!room.trim.door_casing_override, lf_manual: parseFloat(room.trim.door_casing_lf)||0 };
      if ((room.windows||[]).length > 0) subs.window_casing = { substrate_state: null, style: null, lf_override: !!room.trim.window_casing_override, lf_manual: parseFloat(room.trim.window_casing_lf)||0 };

      // Optional trim items
      ['chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold'].forEach(key => {
        if (room.trim[`${key}_enabled`]) subs[key] = { substrate_state: null, lf_manual: parseFloat(room.trim[`${key}_lf`])||0 };
      });
    }

    // Migrate doors → substrates.doors.items
    if (room.doors && room.doors.length > 0) {
      subs.doors = {
        items: room.doors.map(d => ({
          id: d.id, count: d.count, door_type: d.door_type,
          substrate_state: d.substrate || d.substrate_state || 'factory_primed',
          sides_per_door: d.sides_per_door || 2
        }))
      };
    }

    // Migrate windows → substrates.windows.items
    if (room.windows && room.windows.length > 0) {
      subs.windows = {
        items: room.windows.map(w => ({
          id: w.id, count: w.count, window_type: w.window_type,
          size_bucket: w.size_bucket,
          substrate_state: w.substrate || w.substrate_state || 'bare_wood'
        }))
      };
    }

    // Migrate specialty
    if (room.specialty) {
      const specMigration = [
        ['wainscot_panel_sf','wainscoting','sf_manual'], ['wood_feature_wall_sf','wood_feature_wall','sf_manual'],
        ['wood_ceiling_sf','wood_ceiling','sf_manual'], ['closet_shelving_lf','closet_shelving','lf_manual'],
        ['beam_wrap_ea','beams','ea_manual'], ['column_wrap_ea','columns','ea_manual'],
        ['fireplace_mantel_ea','mantels','ea_manual'], ['builtin_unit_ea','builtins','ea_manual'],
        ['stair_risers_ea','stair_risers','ea_manual'], ['stair_railing_ea','stair_railing','ea_manual']
      ];
      specMigration.forEach(([oldKey, newSubId, manualKey]) => {
        const v = parseFloat(room.specialty[oldKey])||0;
        if (v > 0) subs[newSubId] = { substrate_state: null, [manualKey]: v };
      });
    }

    // Build new room shape
    return {
      id: room.id, label: room.label, area_group: room.area_group || '',
      is_interior: room.is_interior !== undefined ? room.is_interior : true,
      length_ft: room.length_ft || 0, width_ft: room.width_ft || 0, height_ft: room.height_ft || 8,
      vaulted_ceiling: false, vaulted_ceiling_extra_sf: 0,
      gable_walls: 0, gable_wall_extra_sf: 0,
      quality_tier: room.quality_tier || null,
      complexity: room.complexity || null, application_method: room.application_method || null,
      substrates: subs,
      notes: room.notes || ''
    };
  });

  // Update UI tab reference
  if (migrated.ui && migrated.ui.activeTab === 'dimensions') migrated.ui.activeTab = 'scope';
  console.log('[PaintScope] Migration complete. Rooms:', migrated.rooms.length);
  return migrated;
}

/**
 * Run v0.6+ inline migrations on parsed state:
 * - v0.6: ensure doors/windows/casing always present with painting flag
 * - v0.7: initialize openings array from existing door items
 * - v0.8: ensure openings_quality_tier exists
 * Also bumps nextId past all existing IDs to prevent collisions.
 */
export function migrateInline(parsed) {
  parsed.rooms.forEach(r => {
    const subs = r.substrates || {};
    if (!subs.doors) subs.doors = createSubstrateConfig('doors');
    if (!subs.windows) subs.windows = createSubstrateConfig('windows');
    if (!subs.door_casing) subs.door_casing = createSubstrateConfig('door_casing');
    if (!subs.window_casing) subs.window_casing = createSubstrateConfig('window_casing');
    // Existing substrates had painting implicitly true (they were opted-in)
    if (subs.doors.painting === undefined) subs.doors.painting = true;
    if (subs.windows.painting === undefined) subs.windows.painting = true;
    if (subs.door_casing.painting === undefined) subs.door_casing.painting = true;
    if (subs.window_casing.painting === undefined) subs.window_casing.painting = true;
    r.substrates = subs;
    // v0.8 migration: ensure openings_quality_tier exists
    if (r.openings_quality_tier === undefined) r.openings_quality_tier = null;
    // Initialize closets array
    if (!r.closets) r.closets = [];
    // v0.7 migration: initialize openings array; convert existing door items to single openings
    if (!r.openings) {
      const doorItems = subs.doors?.items || [];
      const totalDoors = doorItems.reduce((s,d) => s + (parseInt(d.count)||0), 0);
      r.openings = totalDoors > 0 ? [createOpening({ count: totalDoors })] : [];
    }
  });

  // Ensure exterior state exists (added in Phase 9)
  if (!parsed.exterior) {
    parsed.exterior = createExteriorState();
  }

  // Ensure exterior project_type exists (NC/RP toggle)
  if (parsed.exterior.project_type === undefined) {
    parsed.exterior.project_type = 'NC';
  }
  if (parsed.exterior.defaults && parsed.exterior.defaults.condition_scale === undefined) {
    parsed.exterior.defaults.condition_scale = 'GOOD';
  }

  // Ensure UI has scopeMode and activeElevationId (added in UI restructure)
  if (parsed.ui) {
    if (!parsed.ui.scopeMode) parsed.ui.scopeMode = 'interior';
    if (parsed.ui.activeElevationId === undefined) parsed.ui.activeElevationId = null;
    // Migrate old view names to new 4-view structure
    if (parsed.ui.view === 'editor' || parsed.ui.view === 'exterior') parsed.ui.view = 'scope';
    if (parsed.ui.view === 'summary') parsed.ui.view = 'estimate';
    if (parsed.ui.view === 'workorder' || parsed.ui.view === 'export') parsed.ui.view = 'output';
  }

  // v0.9 migration: inject coating_type defaults for existing wood substrates
  const woodSubstrates = ['doors', 'door_frames', 'door_casing', 'window_casing', 'windows', 'window_jamb',
    'baseboard', 'crown', 'chair_rail', 'shoe_mold', 'wainscoting', 'wood_feature_wall', 'wood_ceiling',
    'beams', 'columns', 'mantels', 'builtins', 'stair_risers', 'stair_railing'];
  for (const room of parsed.rooms || []) {
    for (const [id, sub] of Object.entries(room.substrates || {})) {
      if (woodSubstrates.includes(id) && sub.substrate_state === 'bare_wood' && !sub.coating_type) {
        sub.coating_type = 'paint';
      }
    }
  }

  // v1.0: Initialize colors state
  if (!parsed.colors) {
    parsed.colors = { defaults: {}, substrate_overrides: {}, room_overrides: {}, elevation_overrides: {} };
  }

  // v0.9: COMPLEX tier removed — map to MOD
  if (parsed.project && parsed.project.default_complexity === 'COMPLEX') {
    parsed.project.default_complexity = 'MOD';
  }
  if (parsed.rooms) {
    parsed.rooms.forEach(room => {
      if (room.complexity === 'COMPLEX') {
        room.complexity = 'MOD';
      }
    });
  }

  // Bump nextId past all existing IDs to prevent collisions
  let maxId = 0;
  const extractNum = (s) => { const m = s && s.match(/_(\d+)$/); return m ? parseInt(m[1]) : 0; };
  parsed.rooms.forEach(r => {
    maxId = Math.max(maxId, extractNum(r.id));
    const subs = r.substrates || {};
    (subs.doors?.items || []).forEach(d => { maxId = Math.max(maxId, extractNum(d.id)); });
    (subs.windows?.items || []).forEach(w => { maxId = Math.max(maxId, extractNum(w.id)); });
    (r.openings || []).forEach(o => { maxId = Math.max(maxId, extractNum(o.id)); });
    (r.closets || []).forEach(c => { maxId = Math.max(maxId, extractNum(c.id)); });
  });
  bumpNextId(maxId);

  return parsed;
}
