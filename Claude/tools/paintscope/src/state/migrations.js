import { createSubstrateConfig, createOpening, bumpNextId, genId } from './initial-state';
import { createExteriorState } from './exterior-state';
import { migrateMaskLevel } from '../data/mask-levels';

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
      ['chair_rail','shoe_mold','picture_rail','window_stool','window_apron','shadow_box','panel_mold'].forEach(key => {
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
        ['stair_risers_ea','stairway','ea_manual'], ['stair_railing_ea','stairway','ea_manual']
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
    // Per-item paint/protect flag on door items (added so a room can mix painted + protected doors).
    // Existing items default to true to preserve prior behavior.
    (subs.doors.items || []).forEach(d => { if (d.painting === undefined) d.painting = true; });
    r.substrates = subs;
    // v0.8 migration: ensure openings_quality_tier exists
    if (r.openings_quality_tier === undefined) r.openings_quality_tier = null;
    // Initialize closets array
    if (!r.closets) r.closets = [];
    // v1.5: Closet shelving paint-or-protect toggle.
    // Existing closets default to paint_shelving=true (preserves prior behavior).
    (r.closets || []).forEach(c => {
      if (c.paint_shelving === undefined) c.paint_shelving = true;
      if (c.protection_level === undefined) c.protection_level = null;
    });
    // v1.6: Backfill cabinet substrate defaults on existing rooms.
    const existingCab = subs.cabinets;
    if (existingCab) {
      if (existingCab.paint_cabinets === undefined) existingCab.paint_cabinets = false;
      if (existingCab.protection_level === undefined) existingCab.protection_level = 'partial';
      if (existingCab.scope === undefined) existingCab.scope = 'full_exterior';
      if (existingCab.door_style === undefined) existingCab.door_style = 'shaker';
      if (existingCab.kitchen_complexity === undefined) existingCab.kitchen_complexity = 'galley';
      if (existingCab.height_band === undefined) existingCab.height_band = 'standard';
      if (existingCab.cabinet_count === undefined) existingCab.cabinet_count = 0;
      if (existingCab.door_count === undefined) existingCab.door_count = 0;
      if (existingCab.drawer_count === undefined) existingCab.drawer_count = 0;
      if (existingCab.frame_sf === undefined) existingCab.frame_sf = 0;
      if (existingCab.interior_sf === undefined) existingCab.interior_sf = 0;
      if (existingCab.hardware_count === undefined) existingCab.hardware_count = 0;
      if (existingCab.caulk_lf === undefined) existingCab.caulk_lf = 0;
    }
    if (!r.extra_walls) r.extra_walls = [];
    if (!r.wall_deductions) r.wall_deductions = [];
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
    'beams', 'columns', 'mantels', 'builtins', 'stairway'];
  for (const room of parsed.rooms || []) {
    for (const [id, sub] of Object.entries(room.substrates || {})) {
      if (woodSubstrates.includes(id) && sub.substrate_state === 'bare_wood' && !sub.coating_type) {
        sub.coating_type = 'paint';
      }
    }
  }

  // v1.1: migrate builtins from flat ea_manual to opening tier counts
  for (const room of parsed.rooms || []) {
    const bi = room.substrates?.builtins;
    if (bi && bi.openings_m === undefined) {
      bi.openings_s = 0;
      bi.openings_m = bi.ea_manual || 0;
      bi.openings_l = 0;
      bi.openings_xl = 0;
      bi.full_height_sides = 0;
      if (bi.depth_modifier === undefined) bi.depth_modifier = 'deep';
      if (bi.detail_modifier === undefined) bi.detail_modifier = 'simple_box';
      if (bi.access_modifier === undefined) bi.access_modifier = 'open_access';
      if (bi.quality_tier === undefined) bi.quality_tier = null;
      if (bi.grain_fill === undefined) bi.grain_fill = false;
      if (bi.coating_type === undefined) bi.coating_type = 'paint';
    }
  }

  // v1.2: migrate closet_shelving from flat lf_manual to shelf count + dimensions
  for (const room of parsed.rooms || []) {
    const cs = room.substrates?.closet_shelving;
    if (cs && cs.shelf_count === undefined) {
      cs.shelf_count = 0;
      cs.lf_per_shelf = cs.lf_manual || 0;
      if (cs.lf_manual > 0) cs.shelf_count = 1;
      cs.depth_in = 12;
      if (cs.quality_tier === undefined) cs.quality_tier = null;
      if (cs.grain_fill === undefined) cs.grain_fill = false;
      if (cs.coating_type === undefined) cs.coating_type = 'paint';
      if (cs.title === undefined) cs.title = '';
    }
  }

  // v1.3: migrate stair_risers + stair_railing to unified stairway
  for (const room of parsed.rooms || []) {
    const subs = room.substrates || {};
    if ((subs.stair_risers || subs.stair_railing) && !subs.stairway) {
      const riserCount = subs.stair_risers?.ea_manual || 0;
      const railCount = subs.stair_railing?.ea_manual || 0;
      const riserState = subs.stair_risers?.substrate_state || 'bare_wood';
      const railState = subs.stair_railing?.substrate_state || 'bare_wood';
      const riserCoating = subs.stair_risers?.coating_type || 'paint';
      const railCoating = subs.stair_railing?.coating_type || 'paint';

      // Create stairway with default structure
      subs.stairway = {
        title: '', runs: 1, layout: 'l_shape', run1_risers: 0, run2_risers: 0,
        stair_width: 3.5, landing_depth: 0,
        components: {
          risers:      { count: riserCount, count_override: riserCount > 0, substrate_state: riserState, quality_tier: null, application_method: null, coating_type: riserCoating, grain_fill: false },
          treads:      { count: null, count_override: false, enabled: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
          balusters:   { count: railCount, count_override: railCount > 0, substrate_state: railState, quality_tier: null, application_method: null, coating_type: railCoating, grain_fill: false, baluster_type: 'square', material: 'wood' },
          newel_posts: { count: null, count_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
          open_rail:   { lf: null, lf_override: false, substrate_state: railState, quality_tier: null, application_method: null, coating_type: railCoating, grain_fill: false },
          wall_rail:   { lf: 0, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
          skirtboard:  { lf: null, lf_override: false, substrate_state: 'bare_wood', quality_tier: null, application_method: null, coating_type: 'paint', grain_fill: false },
        }
      };
      delete subs.stair_risers;
      delete subs.stair_railing;
    }
  }

  // v1.7: Seed finish_group on existing non-wall/ceiling substrates based on
  // coating_type. Walls/ceiling are driven by the combined-finish toggle
  // (see context-adapter + resolver) and never get this field via migration.
  const FINISH_GROUP_EXCLUDED_MIG = new Set(['walls', 'ceiling']);
  for (const room of parsed.rooms || []) {
    for (const [id, sub] of Object.entries(room.substrates || {})) {
      if (FINISH_GROUP_EXCLUDED_MIG.has(id)) continue;
      if (sub.finish_group !== undefined) continue; // don't clobber
      const ct = sub.coating_type;
      if (ct === 'stain_clear' || ct === 'stain_only' || ct === 'clear_only') {
        sub.finish_group = 'D';
      } else {
        sub.finish_group = 'C';
      }
    }
  }

  // v1.8: Rename opening_type 'wide' → '4_door'. Also introduces '3_door'
  // (no existing rooms use it yet, so no conversion needed there).
  for (const room of parsed.rooms || []) {
    for (const opn of room.openings || []) {
      if (opn.opening_type === 'wide') opn.opening_type = '4_door';
    }
  }

  // v1.0: Initialize colors state
  if (!parsed.colors) {
    parsed.colors = { defaults: {}, substrate_overrides: {}, room_overrides: {}, room_group_overrides: {}, elevation_overrides: {}, elevation_group_overrides: {} };
  }
  // v1.1: Add room/elevation group overrides
  if (!parsed.colors.room_group_overrides) parsed.colors.room_group_overrides = {};
  if (!parsed.colors.elevation_group_overrides) parsed.colors.elevation_group_overrides = {};
  // v1.2: Add color notes
  if (parsed.colors.project_notes === undefined) parsed.colors.project_notes = '';
  if (!parsed.colors.room_notes) parsed.colors.room_notes = {};
  // v1.3: Wall/ceiling material type
  if (parsed.rooms) {
    parsed.rooms.forEach(r => {
      if (!r.wall_material) r.wall_material = 'drywall';
      if (!r.ceiling_material) r.ceiling_material = 'drywall';
    });
  }
  // v1.4: Room categories — auto-populate from existing area_group values
  if (!parsed.room_categories) {
    const existing = new Set();
    (parsed.rooms || []).forEach(r => { if (r.area_group?.trim()) existing.add(r.area_group.trim()); });
    parsed.room_categories = [...existing].sort();
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

  // v1.0: material catalog integration — add brand preference and overrides
  if (parsed.project) {
    if (parsed.project.default_brand === undefined) parsed.project.default_brand = null;
    if (!parsed.project.material_overrides) parsed.project.material_overrides = { system: {}, manual: {} };
  }

  // v1.0.4: Backfill EVERY protection_heuristics field independently — counts,
  // toggle, action, and the rate-override fields. Per-field backfill so a
  // partial heuristics object (from older state where some fields were
  // wiped) gets fully restored. Rate fields default to null = use canonical
  // task rate; a number = override the install + remove tasks in that
  // category. Wired through useEstimateScenario → overlayMap.
  if (parsed.project) {
    if (!parsed.project.protection_heuristics) parsed.project.protection_heuristics = {};
    const ph = parsed.project.protection_heuristics;
    if (ph.outlets_per_room === undefined)             ph.outlets_per_room = 4;
    if (ph.hvac_vents_per_room === undefined)          ph.hvac_vents_per_room = 0.7;
    if (ph.outlet_remove_reinstall === undefined)      ph.outlet_remove_reinstall = false;
    if (ph.hvac_action === undefined)                  ph.hvac_action = 'mask';
    if (ph.outlet_mask_rate === undefined)             ph.outlet_mask_rate = null;
    if (ph.outlet_remove_reinstall_rate === undefined) ph.outlet_remove_reinstall_rate = null;
    if (ph.hvac_mask_rate === undefined)               ph.hvac_mask_rate = null;
    if (ph.hvac_remove_reinstall_rate === undefined)   ph.hvac_remove_reinstall_rate = null;
  }

  // W-16 Phase 2: convert room.fixtures.light_fixtures from single
  // {count, protection} into {items: [...]} so a room can carry multiple
  // light-fixture types (recessed + ceiling fan + bulb, etc.) with per-type
  // protection level, action mode (mask vs remove), and optional time
  // overrides. Legacy single-row state becomes one 'other' item preserving
  // count + protection.
  parsed.rooms.forEach(r => {
    const lf = r.fixtures?.light_fixtures;
    if (!lf || typeof lf !== 'object') return;
    if (Array.isArray(lf.items)) return; // already migrated
    const legacyCount = parseInt(lf.count) || 0;
    const legacyProt = lf.protection || null;
    if (legacyCount > 0 || legacyProt) {
      lf.items = [{
        id: genId('lfi'),
        type: 'other',
        custom_label: 'Light Fixtures',
        count: legacyCount || 1,
        protection: legacyProt || 'full',
        action_mode: 'mask',
        mask_time_min_override: null,
        remove_time_min_override: null,
      }];
    } else {
      lf.items = [];
    }
    // Drop legacy scalar fields now that they're in items[0]
    delete lf.count;
    delete lf.protection;
  });

  // Bump nextId past all existing IDs to prevent collisions
  let maxId = 0;
  const extractNum = (s) => { const m = s && s.match(/_(\d+)$/); return m ? parseInt(m[1]) : 0; };
  parsed.rooms.forEach(r => {
    maxId = Math.max(maxId, extractNum(r.id));
    const subs = r.substrates || {};
    (subs.doors?.items || []).forEach(d => { maxId = Math.max(maxId, extractNum(d.id)); });
    (subs.windows?.items || []).forEach(w => { maxId = Math.max(maxId, extractNum(w.id)); });
    (r.fixtures?.light_fixtures?.items || []).forEach(i => { maxId = Math.max(maxId, extractNum(i.id)); });
    (r.openings || []).forEach(o => { maxId = Math.max(maxId, extractNum(o.id)); });
    (r.closets || []).forEach(c => { maxId = Math.max(maxId, extractNum(c.id)); });
  });
  bumpNextId(maxId);

  // v1.0.1: One-time repair for duplicate room IDs — caused by HMR resetting
  // the module-level genId counter mid-session. If two rooms share an id,
  // assign the second-onward instances a fresh suffix past maxId.
  const seenRoomIds = new Set();
  parsed.rooms.forEach(r => {
    if (seenRoomIds.has(r.id)) {
      maxId += 1;
      r.id = `room_${maxId}`;
    }
    seenRoomIds.add(r.id);
  });
  bumpNextId(maxId);

  // v1.0.2: Clean up legacy room.protection defaults. createRoom previously
  // initialized {floor_mask_level: 'edge', wall_mask_level: 'edge',
  // ceiling_mask_level: 'none'} — that made every new room show OVERRIDE in
  // the Protection tab. Fix: if the persisted values exactly match those
  // legacy defaults, delete them so the deriver re-takes control (AUTO).
  parsed.rooms.forEach(r => {
    const p = r.protection;
    if (p && p.floor_mask_level === 'edge' && p.wall_mask_level === 'edge' && p.ceiling_mask_level === 'none') {
      delete p.floor_mask_level;
      delete p.wall_mask_level;
      delete p.ceiling_mask_level;
    }
  });

  // v1.0.3: Migrate legacy mask-level vocabulary to canonical 9-value enum.
  //   Legacy: edge_only / item_mask / partial_cover / full_cover / full_mask
  //           + cabinet-only: light / standard / heavy
  //   New:    edge / partial / full / encapsulate (+ edge_partial / edge_full /
  //           edge_encapsulate / spot / none)
  parsed.rooms.forEach(r => {
    // Adjacent fixtures
    const fix = r.fixtures || {};
    Object.keys(fix).forEach(fId => {
      const cfg = fix[fId];
      if (!cfg || typeof cfg !== 'object') return;
      if (cfg.protection) cfg.protection = migrateMaskLevel(cfg.protection);
      // Feature wall items carry their own protection field
      if (Array.isArray(cfg.items)) {
        cfg.items.forEach(item => {
          if (item.protection) item.protection = migrateMaskLevel(item.protection);
        });
      }
    });

    // Cabinet substrate "Protect" mode (CabinetsDetailPanel) — light/standard/heavy
    const cab = r.substrates?.cabinets;
    if (cab && cab.protection_level) {
      cab.protection_level = migrateMaskLevel(cab.protection_level);
    }

    // Closet shelving protection level
    (r.closets || []).forEach(c => {
      if (c.protection_level) c.protection_level = migrateMaskLevel(c.protection_level);
    });

    // Legacy floor protection field (room.floor_protection) — separate from
    // room.protection.floor_mask_level. Some rooms may still carry this.
    if (r.floor_protection) r.floor_protection = migrateMaskLevel(r.floor_protection);
  });

  // v1.0.5: Per-window position + sill height band for clerestory/transom
  // height_band override on window_casing/stool/apron/jamb specs. Existing
  // window items default to ground level (uses room band; no override).
  parsed.rooms.forEach(r => {
    const items = r.substrates?.windows?.items;
    if (!Array.isArray(items)) return;
    items.forEach(w => {
      if (typeof w.window_position === 'undefined') w.window_position = 'ground';
      if (typeof w.sill_height_band === 'undefined') w.sill_height_band = 'STD';
    });
  });

  // Phase A rate editing: backfill empty rate_overrides map if the project predates this feature.
  if (parsed.project && !parsed.project.rate_overrides) {
    parsed.project.rate_overrides = {};
  }

  // Project Tracker MVP: backfill status + tracker_roster on projects predating the feature.
  // Existing enum was draft / estimated / in_progress / completed; we add 'approved'
  // between estimated and in_progress. No value migration needed — old statuses stay valid.
  if (parsed.project) {
    if (parsed.project.status === undefined) {
      parsed.project.status = 'draft';
    }
    if (!Array.isArray(parsed.project.tracker_roster)) {
      parsed.project.tracker_roster = [];
    }
  }

  return parsed;
}

/**
 * Prune rate overrides for tasks that have been archived, renamed, or shape-shifted
 * (e.g., a task that used to have flat rate_per_hour now uses rates_by_tier).
 * Pure function — returns a new state object; never mutates input.
 *
 * @param {object} state - The state object (must have state.project)
 * @param {object} tasks - The bundle's tasks table (task_id -> canonical task)
 * @returns {object} - State with pruned rate_overrides + optional _lastRateOverridePruneReport
 */
export function pruneStaleRateOverrides(state, tasks) {
  if (!state || !state.project) return state;
  const overrides = state.project.rate_overrides;
  if (!overrides || Object.keys(overrides).length === 0) return state;

  const pruned = {};
  const dropped = [];
  for (const [task_id, ov] of Object.entries(overrides)) {
    const canonical = tasks && tasks[task_id];
    if (!canonical) {
      dropped.push({ task_id, reason: 'task archived/missing' });
      continue;
    }
    const ineligible = (
      typeof canonical.rate_per_hour !== 'number' ||
      canonical.rates ||
      canonical.rates_by_tier ||
      canonical.rates_by_coat ||
      canonical.fixed_minutes != null
    );
    if (ineligible) {
      dropped.push({ task_id, reason: 'task no longer uses flat rate_per_hour' });
      continue;
    }
    pruned[task_id] = ov;
  }

  if (dropped.length === 0) {
    return state;
  }
  console.warn('[PaintScope] Dropped stale rate overrides:', dropped);
  return {
    ...state,
    project: { ...state.project, rate_overrides: pruned },
    _lastRateOverridePruneReport: { dropped, ts: Date.now() },
  };
}
