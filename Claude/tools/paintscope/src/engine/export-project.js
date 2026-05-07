import { deriveRoom } from './derive-room.js';
import { SUBSTRATE_MAP } from '../data/substrate-catalog.js';
import { OPENING_TYPES } from '../data/opening-types.js';

export function exportProject(state) {
  const { project, rooms } = state;
  const quantities = {};
  const roomsData = [];
  const surfacesData = [];
  const assetsData = [];
  const edgesData = [];

  function addQty(key, uom, value) {
    if (value === 0 || value === null || value === undefined) return;
    if (!quantities[key]) quantities[key] = { uom, value: 0 };
    if (typeof value === 'number') quantities[key].value += value;
    else quantities[key].value = value;
  }

  rooms.forEach((room, ri) => {
    const d = deriveRoom(room);
    const subs = room.substrates || {};
    const effectiveQT = project.default_quality_tier;
    const effectiveHeight = d.heightBand;
    const effectiveComplexity = room.complexity || project.default_complexity;
    const effectiveMethod = room.application_method || project.default_application_method;
    const effectiveTexture = (subs.walls?.texture) || (subs.ceiling?.texture) || project.default_texture;

    roomsData.push({
      room_index: ri, room_label: room.label, area_group: room.area_group,
      length_ft: d.L, width_ft: d.W, height_ft: d.H,
      is_interior: room.is_interior, is_new_construction: project.new_construction,
      quality_tier: effectiveQT, height_band: effectiveHeight,
      complexity: effectiveComplexity, application_method: effectiveMethod, texture: effectiveTexture,
      vaulted_ceiling: !!room.vaulted_ceiling, gable_walls: parseInt(room.gable_walls)||0,
      openings_quality_tier: room.openings_quality_tier || null,
      substrates_in_scope: Object.keys(subs).filter(k => {
        const alwaysPresent = k === 'doors' || k === 'windows' || k === 'door_casing' || k === 'window_casing';
        return alwaysPresent ? subs[k]?.painting : true;
      }),
      notes: room.notes || null
    });

    // Surfaces — per-room (only emit if substrate is checked)
    function addSurface(type, uom, qty, method='derived', attrs={}) {
      if (qty <= 0) return;
      surfacesData.push({ room_label:room.label, room_index:ri, surface_type:type, uom_basis:uom, qty_value:Math.round(qty*1000)/1000, measurement_method:method, attributes:attrs });
    }

    // Walls + Ceiling — conditional
    if (subs.walls) addSurface('WALL_FIELD', 'SF', d.wall_field_sf, subs.walls.sf_override?'manual':'derived', {texture:effectiveTexture, substrate_state:subs.walls.substrate_state});
    if (subs.ceiling) addSurface('CEILING_FIELD', 'SF', d.ceiling_field_sf, subs.ceiling.sf_override?'manual':'derived', {texture:effectiveTexture, substrate_state:subs.ceiling.substrate_state});

    // Trim — conditional on substrate presence
    const trimSurfaces = [
      ['baseboard', 'TRIM_BASEBOARD', 'baseboard_lf'],
      ['crown', 'TRIM_CROWN', 'crown_lf'],
      ['door_casing', 'TRIM_CASING_DOOR', 'door_casing_lf'],
      ['window_casing', 'TRIM_CASING_WINDOW', 'window_casing_lf'],
      ['chair_rail', 'TRIM_CHAIR_RAIL', 'chair_rail_lf'],
      ['shoe_mold', 'TRIM_SHOE_MOLD', 'shoe_mold_lf'],
      ['picture_rail', 'TRIM_PICTURE_RAIL', 'picture_rail_lf'],
      ['window_stool', 'TRIM_WINDOW_STOOL', 'window_stool_lf'],
      ['window_apron', 'TRIM_WINDOW_APRON', 'window_apron_lf'],
      ['shadow_box', 'TRIM_SHADOW_BOX', 'shadow_box_lf'],
      ['panel_mold', 'TRIM_PANEL_MOLD', 'panel_mold_lf'],
    ];
    const casingIds = new Set(['door_casing','window_casing']);
    trimSurfaces.forEach(([subId, surfType, derivedKey]) => {
      // Casing always present — only emit surface when painting flag is on
      const present = casingIds.has(subId) ? subs[subId]?.painting : !!subs[subId];
      if (present) {
        const lf = d[derivedKey] || 0;
        const isOverride = subs[subId].lf_override || (!SUBSTRATE_MAP[subId]?.autoDerive);
        addSurface(surfType, 'LF', lf, isOverride?'manual':'derived', {substrate_state:subs[subId].substrate_state});
      }
    });

    // Doors — from substrates.doors.items (surfaces only when painting)
    const doorItems = subs.doors?.items || [];
    const doorsPainting = subs.doors?.painting;
    doorItems.forEach(door => {
      const cnt = parseInt(door.count)||0;
      const sides = cnt * (parseInt(door.sides_per_door)||2);
      const itemPainting = door.painting !== false;
      if (cnt > 0) {
        if (doorsPainting && itemPainting) addSurface('DOOR_SLAB', 'EA_SIDE', sides, 'manual', {door_type:door.door_type, substrate_state:door.substrate_state});
        assetsData.push({ room_label:room.label, room_index:ri, asset_category:'DOOR', asset_subtype:door.door_type, protect_uom:'EA', protect_qty:cnt, attributes:{substrate_state:door.substrate_state, sides_per_door:door.sides_per_door, painting:itemPainting} });
      }
    });

    // Door Frames — independent substrate
    if (subs.door_frames) addSurface('DOOR_FRAME', 'EA', d.door_frames_ea, 'derived', {substrate_state:subs.door_frames.substrate_state});

    // Windows — from substrates.windows.items (surfaces only when painting)
    const windowItems = subs.windows?.items || [];
    const windowsPainting = subs.windows?.painting;
    windowItems.forEach(win => {
      const cnt = parseInt(win.count)||0;
      if (cnt > 0) {
        if (windowsPainting) addSurface(`WINDOW_${win.size_bucket}`, 'EA', cnt, 'manual', {window_type:win.window_type, substrate_state:win.substrate_state});
        assetsData.push({ room_label:room.label, room_index:ri, asset_category:'WINDOW', asset_subtype:win.window_type, protect_uom:'EA', protect_qty:cnt, attributes:{size_bucket:win.size_bucket, substrate_state:win.substrate_state} });
      }
    });

    // Window Jambs — independent substrate
    if (subs.window_jamb) addSurface('WINDOW_JAMB', 'EA', d.window_jamb_ea, 'derived', {substrate_state:subs.window_jamb.substrate_state});

    // Specialty — conditional on substrate presence
    const specSurfaces = [
      ['wainscoting','WAINSCOTING','SF','sf_manual'], ['wood_feature_wall','WOOD_WALL','SF','sf_manual'],
      ['wood_ceiling','WOOD_CEILING','SF','sf_manual'], ['closet_shelving','CLOSET_SHELF','LF','lf_manual'],
      ['beams','ARCH_BEAM','LF','lf_manual'], ['columns','ARCH_COLUMN','EA','ea_manual'],
      ['mantels','ARCH_MANTEL','SF','lf_manual'], ['builtins','BUILTIN','EA','ea_manual'],
      ['stairway','STAIRWAY','EA','ea_manual']
    ];
    specSurfaces.forEach(([subId, surfType, uom, manualKey]) => {
      if (subs[subId]) {
        const v = parseFloat(subs[subId][manualKey])||0;
        if (v > 0) addSurface(surfType, uom, v, 'manual', {substrate_state:subs[subId].substrate_state});
      }
    });

    // Edges — per-room
    if (d.perimeter > 0 && d.ceiling_field_sf > 0) edgesData.push({ room_label:room.label, room_index:ri, edge_target:'TO_CEILING', length_lf:Math.round(d.perimeter), edge_class:null });
    const trimLF = d.baseboard_lf + d.door_casing_lf + d.window_casing_lf;
    if (trimLF > 0) edgesData.push({ room_label:room.label, room_index:ri, edge_target:'TO_TRIM', length_lf:Math.round(trimLF), edge_class:null });

    // Quantity keys (rolled up) — conditional on substrates
    if (subs.walls) addQty('PS_SURFACE_SF.WALL_FIELD', 'SF', d.wall_field_sf);
    if (subs.ceiling) addQty('PS_SURFACE_SF.CEILING_FIELD', 'SF', d.ceiling_field_sf);

    trimSurfaces.forEach(([subId, surfType, derivedKey]) => {
      const active = casingIds.has(subId) ? subs[subId]?.painting : !!subs[subId];
      if (active) addQty(`PS_SURFACE_LF.${surfType}`, 'LF', d[derivedKey]||0);
    });

    // Door quantity keys — surface keys only when painting (doors are painting scope)
    doorItems.forEach(door => {
      const cnt = parseInt(door.count)||0;
      const sides = cnt * (parseInt(door.sides_per_door)||2);
      if (doorsPainting) {
        addQty('PS_SURFACE_EA_SIDE.DOOR_SLAB', 'EA_SIDE', sides);
        const dtMap = { flush:'SLAB', panel_4:'PANEL', panel_6:'PANEL', french:'FRENCH', bifold:'BIFOLD', louvered:'LOUVERED' };
        if (dtMap[door.door_type]) addQty(`PS_META.EA_SIDE.DOOR_SLAB.${dtMap[door.door_type]}`, 'EA_SIDE', sides);
      }
    });
    // Opening counts from openings table (structural, always emit)
    addQty('PS_OPENING_EA.DOOR_OPENINGS_TOTAL', 'EA', d.totalOpenings);
    if (subs.door_frames) {
      addQty('PS_SURFACE_EA.DOOR_FRAME_SET', 'EA', d.door_frames_ea);
      // Per-substrate joint caulk LF (mirrors quantity-lookups.js)
      addQty('PS_EDGE_LF.TRIM_JOINTS_DOOR_FRAME', 'LF', d.door_frame_lf);
    }

    // Window quantity keys — opening counts always emit, surface keys only when painting
    windowItems.forEach(win => {
      const cnt = parseInt(win.count)||0;
      addQty(`PS_OPENING_EA.WINDOW_${win.size_bucket}`, 'EA', cnt);
      addQty('PS_OPENING_EA.WINDOW_TOTAL', 'EA', cnt);
      addQty('PS_OPENING_EA.WINDOW_OPENINGS_TOTAL', 'EA', cnt);
    });
    if (subs.window_jamb) {
      addQty('PS_SURFACE_EA.WINDOW_JAMB', 'EA', d.window_jamb_ea);
      // Per-substrate joint caulk LF (mirrors quantity-lookups.js)
      addQty('PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB', 'LF', d.window_jamb_lf);
      if (!windowsPainting || !windowItems.length) {
        addQty('PS_OPENING_EA.WINDOW_TOTAL', 'EA', d.window_jamb_ea);
      }
    }

    // Specialty quantity keys
    specSurfaces.forEach(([subId, surfType, uom, manualKey]) => {
      if (subs[subId]) {
        const v = parseFloat(subs[subId][manualKey])||0;
        const psPrefix = uom === 'SF' ? 'PS_SURFACE_SF' : uom === 'LF' ? 'PS_SURFACE_LF' : 'PS_SURFACE_EA';
        if (v > 0) addQty(`${psPrefix}.${surfType}`, uom, v);
      }
    });

    // Per-substrate joint caulk LF — every painted trim substrate has joints
    // (trim-to-wall seam) equal to its own LF. Each per-substrate prep module
    // reads its own TRIM_JOINTS_<SUBSTRATE> key (Track A: 2026-05-02).
    const isTrimActiveExp = (subId) => casingIds.has(subId) ? subs[subId]?.painting : !!subs[subId];
    trimSurfaces.forEach(([subId, surfType, derivedKey]) => {
      if (isTrimActiveExp(subId)) {
        const subKey = surfType.replace(/^TRIM_/, '');
        addQty(`PS_EDGE_LF.TRIM_JOINTS_${subKey}`, 'LF', d[derivedKey]||0);
      }
    });
    // Note: legacy PS_SURFACE_LF.TRIM_TOTAL and PS_EDGE_LF.TRIM_JOINTS were
    // emitted here for the soft-retired SF_TRIM_NC_PAINT/PRIME spec families.
    // Both retired in 2026-05-03; per-substrate keys are the canonical source.

    // Edge quantity keys
    addQty('PS_EDGE_LF.TO_CEILING', 'LF', d.perimeter);
    addQty('PS_EDGE_LF.TO_TRIM', 'LF', trimLF);

    // Protection quantity keys (derived) — floor level driven by floor_type
    const floorProt = room.floor_protection || '';
    const hasFloorProtection = room.floor_type && room.floor_type !== 'subfloor' && floorProt;
    if (hasFloorProtection) {
      addQty('PS_PROTECT_SF.FLOOR_EXPOSED', 'SF', d.ceilingSF);
      if (floorProt === 'full' || floorProt === 'partial' ||
          floorProt === 'edge_full' || floorProt === 'edge_partial' ||
          floorProt === 'encapsulate' || floorProt === 'edge_encapsulate') {
        addQty('PS_PROTECT_SF.FLOOR_PERIMETER', 'SF', d.perimeter * 2);
      }
    }
    // WORKZONE = localized spray overspray zones: 8ft radius semicircle per opening (~101 SF),
    // 8ft radius quarter-circle per window (~50 SF, half arc since against wall), capped at floor area
    const workzoneSF = Math.min(
      Math.round(d.totalOpenings * (Math.PI * 64 / 2) + d.totalWindows * (Math.PI * 64 / 4)),
      d.ceilingSF
    );
    addQty('PS_PROTECT_SF.FLOOR_WORKZONE', 'SF', workzoneSF);

    // === Per-substrate trim wall-collateral keys (Track A: 2026-05-02) ===
    // Mask + cut-in driven per painted trim substrate. Wall-adjacent substrates
    // only (excludes shoe_mold and door_frames). Each fires only when walls are
    // being painted AND the trim substrate is being painted.
    const WALL_ADJACENT_TRIM_EXP = new Set([
      'baseboard', 'door_casing', 'window_casing', 'window_stool', 'window_apron',
      'crown', 'chair_rail', 'picture_rail', 'panel_mold', 'shadow_box',
    ]);
    let allWallTrimLF = 0;
    if (subs.walls) {
      trimSurfaces.forEach(([subId, surfType, derivedKey]) => {
        if (!WALL_ADJACENT_TRIM_EXP.has(subId)) return;
        if (!isTrimActiveExp(subId)) return;
        const lf = d[derivedKey] || 0;
        if (lf <= 0) return;
        const subKey = surfType.replace(/^TRIM_/, '');
        addQty(`PS_PROTECT_LF.TRIM_${subKey}`, 'LF', lf);
        addQty(`PS_EDGE_LF.CUTIN_WALL_TO_${subKey}`, 'LF', lf);
        allWallTrimLF += lf;
      });
    }
    // Legacy lump — derived sum for backward compat.
    addQty('PS_PROTECT_LF.TRIM_EDGES', 'LF', allWallTrimLF);
    addQty('PS_PROTECT_LF.CEILING_LINE', 'LF', d.perimeter);
    addQty('PS_META.SF.FLOOR_VACUUM_AREA', 'SF', d.ceilingSF);

    // Fixture protection keys (v0.5)
    Object.entries(room.fixtures || {}).forEach(function([fId, cfg]) {
      if (fId === 'cabinets') {
        const lf = parseFloat(cfg.linear_ft) || 0;
        if (lf > 0) addQty('PS_PROTECT_LF.FIXTURE_CABINETS', 'LF', lf);
      } else {
        const cnt = parseInt(cfg.count) || 1;
        addQty('PS_PROTECT_EA.FIXTURE_' + fId.toUpperCase(), 'EA', cnt);
      }
    });

    // Meta
    addQty('PS_META.EA.ROOMS_TOTAL', 'EA', 1);
    addQty('PS_META.EA.CASING_END_COUNT', 'EA', d.totalOpenings*2 + d.totalWindows*4);
  });

  return {
    ps_scope_run: {
      project_name: project.name || 'Untitled Project',
      new_construction: project.new_construction,
      default_quality_tier: project.default_quality_tier,
      default_application_method: project.default_application_method,
      default_texture: project.default_texture,
      status: 'draft',
      created_at: new Date().toISOString()
    },
    ps_rooms: roomsData,
    ps_surfaces: surfacesData,
    ps_assets: assetsData,
    ps_edges: edgesData,
    ps_quantities: Object.entries(quantities)
      .filter(([,v]) => v.value !== 0)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        quantity_key: key, uom: val.uom,
        value: typeof val.value === 'number' ? Math.round(val.value * 1000) / 1000 : null,
        text_value: typeof val.value === 'string' ? val.value : null,
        source: 'derived'
      })),
    _meta: {
      tool: 'PaintScope Prototype',
      version: '0.3.0',
      exported_at: new Date().toISOString(),
      room_count: rooms.length,
      total_wall_sf: quantities['PS_SURFACE_SF.WALL_FIELD']?.value || 0,
      total_ceiling_sf: quantities['PS_SURFACE_SF.CEILING_FIELD']?.value || 0
    }
  };
}
