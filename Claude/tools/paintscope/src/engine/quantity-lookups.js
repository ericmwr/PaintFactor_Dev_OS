import { deriveRoom, deriveCloset } from './derive-room.js';
import { SUBSTRATE_MAP, SUBSTRATE_CATALOG, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import { OPENING_TYPES } from '../data/opening-types.js';
import { deriveStairway, getComponentQuantity } from './derive-stairway.js';

/**
 * Build per-room quantity lookup from the prototype state.
 * Returns Map<roomIndex, Map<psKey, {value, uom}>>
 */
export function buildRoomQuantityLookups(state) {
  const { project, rooms } = state;
  const roomLookups = new Map();

  // Project-wide allowance singletons fire on the FIRST room that triggers them.
  // Tracked across the rooms.forEach iteration so we emit exactly once per project.
  let lightFanMantelAllowanceEmitted = false;

  // Project-level protection heuristics — outlets per room, HVAC vents per room.
  // Closets are sub-rooms (room.closets[]), not entries in state.rooms[], so
  // rooms.length is automatically the non-closet count.
  const heur = project?.protection_heuristics || {};
  const outletsPerRoom = Number.isFinite(heur.outlets_per_room) ? heur.outlets_per_room : 4;
  const hvacPerRoom = Number.isFinite(heur.hvac_vents_per_room) ? heur.hvac_vents_per_room : 0.7;
  const hvacAction = heur.hvac_action || 'mask';  // 'mask' | 'remove'

  rooms.forEach((room, ri) => {
    const d = deriveRoom(room);
    const subs = room.substrates || {};
    const qty = new Map();
    const closetQty = new Map();

    function addQ(key, uom, val) {
      if (!val || val <= 0) return;
      const existing = qty.get(key);
      if (existing) existing.value += val;
      else qty.set(key, { value: val, uom });
    }
    function addClosetQ(key, uom, val) {
      if (!val || val <= 0) return;
      addQ(key, uom, val); // still rolls into main qty
      const existing = closetQty.get(key);
      if (existing) existing.value += val;
      else closetQty.set(key, { value: val, uom });
    }

    // Wall + Ceiling — conditional; material type controls PS key routing
    if (subs.walls) {
      const wallKey = room.wall_material === 'wood' ? 'PS_SURFACE_SF.WOOD_WALL' : 'PS_SURFACE_SF.WALL_FIELD';
      addQ(wallKey, 'SF', d.wall_field_sf);
    }
    if (subs.ceiling) {
      const ceilKey = room.ceiling_material === 'wood' ? 'PS_SURFACE_SF.WOOD_CEILING' : 'PS_SURFACE_SF.CEILING_FIELD';
      addQ(ceilKey, 'SF', d.ceiling_field_sf);
    }

    // Trim — conditional on substrate presence (casing: painting flag)
    const casingIds2 = new Set(['door_casing', 'window_casing']);
    const trimKeys = [
      ['baseboard', 'TRIM_BASEBOARD', 'baseboard_lf'],
      ['crown', 'TRIM_CROWN', 'crown_lf'],
      ['door_casing', 'TRIM_CASING_DOOR', 'door_casing_lf'],
      ['window_casing', 'TRIM_CASING_WINDOW', 'window_casing_lf'],
      ['chair_rail', 'TRIM_CHAIR_RAIL', 'chair_rail_lf'],
      ['shoe_mold', 'TRIM_SHOE_MOLD', 'shoe_mold_lf'],
      ['wainscot_cap', 'TRIM_WAINSCOT_CAP', 'wainscot_cap_lf'],
      ['picture_rail', 'TRIM_PICTURE_RAIL', 'picture_rail_lf'],
      ['window_stool', 'TRIM_WINDOW_STOOL', 'window_stool_lf'],
      ['window_apron', 'TRIM_WINDOW_APRON', 'window_apron_lf'],
      ['shadow_box', 'TRIM_SHADOW_BOX', 'shadow_box_lf'],
      ['panel_mold', 'TRIM_PANEL_MOLD', 'panel_mold_lf'],
    ];
    trimKeys.forEach(([subId, surfType, derivedKey]) => {
      const active = casingIds2.has(subId) ? subs[subId]?.painting : !!subs[subId];
      if (active) addQ(`PS_SURFACE_LF.${surfType}`, 'LF', d[derivedKey] || 0);
    });

    // Aggregate all trim LF for specs that use PS_SURFACE_LF.TRIM_TOTAL
    // (only painting trim). Substrates with their own extracted spec family
    // are EXCLUDED — they read their own PS_SURFACE_LF.TRIM_CASING_* keys
    // directly, so including them here would double-count. Other trim
    // substrates (baseboard, crown, chair_rail, etc.) still aggregate into
    // TRIM_TOTAL and fire via SF_TRIM_NC_PAINT anchored at baseboard.
    const TRIM_TOTAL_EXCLUDED = new Set(['window_casing', 'door_casing', 'crown', 'chair_rail', 'shoe_mold', 'picture_rail', 'wainscot_cap', 'window_stool', 'window_apron', 'shadow_box', 'panel_mold', 'baseboard']);
    const allTrimLF = trimKeys.reduce((s, [subId, , derivedKey]) => {
      if (TRIM_TOTAL_EXCLUDED.has(subId)) return s;
      const active = casingIds2.has(subId) ? subs[subId]?.painting : !!subs[subId];
      return s + (active ? (d[derivedKey] || 0) : 0);
    }, 0);
    addQ('PS_SURFACE_LF.TRIM_TOTAL', 'LF', allTrimLF);
    // Trim joints — approximately equal to total trim LF (every piece has joints)
    addQ('PS_EDGE_LF.TRIM_JOINTS', 'LF', allTrimLF);

    // Doors — from substrates.doors.items; emit paint or stain keys based on coating_type
    const doorItems = subs.doors?.items || [];
    const doorsPainting2 = subs.doors?.painting;
    doorItems.forEach(door => {
      const cnt = parseInt(door.count) || 0;
      const sides = cnt * (parseInt(door.sides_per_door) || 2);
      const itemPainting = door.painting !== false;
      if (doorsPainting2 && itemPainting) {
        const ct = door.coating_type || 'paint';
        if (ct === 'paint') {
          addQ('PS_SURFACE_EA_SIDE.DOOR_SLAB', 'EA_SIDE', sides);
        } else {
          // Stain/clear specs use EA (not EA_SIDE) — count of doors, not sides
          addQ('PS_SURFACE_EA.DOOR_SLAB_STAIN', 'EA', cnt);
        }
      }
    });
    // Opening counts from openings table (structural, always emit)
    addQ('PS_OPENING_EA.DOOR_OPENINGS_TOTAL', 'EA', d.totalOpenings);
    // Door frames — LF-based for both paint and stain. Derived LF accounts
    // for fixed LF-per-variant (single=17, double=20, etc.) × openings count.
    if (subs.door_frames) {
      addQ('PS_SURFACE_LF.DOOR_FRAME', 'LF', d.door_frame_lf);
    }

    // Windows — from substrates.windows.items; surface keys only when painting, opening counts always
    const windowItems = subs.windows?.items || [];
    const windowsPainting2 = subs.windows?.painting;
    windowItems.forEach(win => {
      const cnt = parseInt(win.count) || 0;
      addQ(`PS_OPENING_EA.WINDOW_${win.size_bucket}`, 'EA', cnt);
      addQ('PS_OPENING_EA.WINDOW_TOTAL', 'EA', cnt);
      addQ('PS_OPENING_EA.WINDOW_OPENINGS_TOTAL', 'EA', cnt);
    });
    if (subs.window_jamb) {
      addQ('PS_SURFACE_LF.WINDOW_JAMB', 'LF', d.window_jamb_lf);
      // Jamb also contributes to WINDOW_TOTAL (EA count) when window panels
      // aren't already painting — lets jamb work activate window-aware specs.
      if (!windowsPainting2 || !windowItems.length) {
        addQ('PS_OPENING_EA.WINDOW_TOTAL', 'EA', d.totalWindows);
      }
    }

    // Specialty — conditional
    const specKeys = [
      ['wainscoting', 'PS_SURFACE_SF.WAINSCOTING', 'SF', 'sf_manual'], ['wood_feature_wall', 'PS_SURFACE_SF.WOOD_WALL', 'SF', 'sf_manual'],
      ['wood_ceiling', 'PS_SURFACE_SF.WOOD_CEILING', 'SF', 'sf_manual'], ['closet_shelving', 'PS_SURFACE_LF.CLOSET_SHELF', 'LF', 'lf_manual'],
      ['beams', 'PS_SURFACE_LF.ARCH_BEAM', 'LF', 'ea_manual'], ['columns', 'PS_SURFACE_EA.ARCH_COLUMN', 'EA', 'ea_manual'],
      ['mantels', 'PS_SURFACE_EA.ARCH_MANTEL', 'EA', 'ea_manual'],
    ];
    specKeys.forEach(([subId, psKey, uom, manualKey]) => {
      if (subs[subId]) {
        const cfg = subs[subId];
        const cat = SUBSTRATE_MAP[subId];
        // Use manual value if overridden, otherwise try auto-derive
        let v = parseFloat(cfg[manualKey]) || 0;
        if (v === 0 && !cfg.sf_override && !cfg.lf_override && cat?.autoDerive) {
          v = cat.autoDerive(d) || 0;
        }
        if (v > 0) addQ(psKey, uom, v);
      }
    });

    // Built-ins — emit per-tier opening counts (spec uses PS_OPENING_EA.BUILTIN_SHELF.*)
    if (subs.builtins) {
      const bi = subs.builtins;
      if (bi.openings_s > 0) addQ('PS_OPENING_EA.BUILTIN_SHELF.S', 'EA', bi.openings_s);
      if (bi.openings_m > 0) addQ('PS_OPENING_EA.BUILTIN_SHELF.M', 'EA', bi.openings_m);
      if (bi.openings_l > 0) addQ('PS_OPENING_EA.BUILTIN_SHELF.L', 'EA', bi.openings_l);
      if (bi.openings_xl > 0) addQ('PS_OPENING_EA.BUILTIN_SHELF.XL', 'EA', bi.openings_xl);
    }

    // Stairway — emit per-component PS keys from derived or overridden quantities
    if (subs.stairway) {
      const derived = deriveStairway(subs.stairway);
      const comps = subs.stairway.components || {};
      if (derived) {
        const emit = (comp, key, uom, derivedVal) => {
          if (comp?.enabled === false) return;
          const qty = getComponentQuantity(comp, derivedVal);
          if (qty > 0) addQ(key, uom, qty);
        };
        emit(comps.risers, 'PS_SURFACE_EA.STAIR_RISER', 'EA', derived.total_risers);
        emit(comps.treads, 'PS_SURFACE_EA.STAIR_TREAD', 'EA', derived.total_treads);
        emit(comps.balusters, 'PS_SURFACE_EA.STAIR_BALUSTER', 'EA', derived.total_balusters);
        emit(comps.newel_posts, 'PS_SURFACE_EA.STAIR_NEWEL', 'EA', derived.newel_posts);
        emit(comps.open_rail, 'PS_SURFACE_LF.STAIR_OPEN_RAIL', 'LF', derived.total_rake_lf);
        if (comps.wall_rail?.enabled !== false && (comps.wall_rail?.lf || 0) > 0)
          addQ('PS_SURFACE_LF.STAIR_WALL_RAIL', 'LF', comps.wall_rail.lf);
        emit(comps.skirtboard, 'PS_SURFACE_LF.STAIR_SKIRTBOARD', 'LF', derived.skirtboard_lf);
        emit(comps.stringer, 'PS_SURFACE_LF.STAIR_STRINGER', 'LF', derived.total_rake_lf);
      }
    }

    // Ceiling beams — geometry-derived LF from vault config, feeds ARCH_BEAM spec
    if (room.vaulted_ceiling && room.beams_enabled && d.beamTotalLF > 0) {
      addQ('PS_SURFACE_LF.ARCH_BEAM', 'LF', d.beamTotalLF);
    }

    // Grain Fill — aggregate SF from all substrates with grain_fill enabled
    // UOM conversion: LF→SF 1:1, EA→SF 20 SF/EA baseline, SF direct
    // Also checks per-item grain_fill on doors and windows (items-based substrates)
    // Tracks per-substrate breakdown for attribution to parent specs
    let grainFillSF = 0;
    const grainFillBreakdown = {}; // { substrateId: sfContribution }
    Object.entries(subs).forEach(([subId, cfg]) => {
      if (!cfg) return;
      let subSF = 0;
      // Top-level grain_fill (trim, specialty substrates)
      if (cfg.grain_fill) {
        const cat = SUBSTRATE_MAP[subId];
        if (cat) {
          const uomSub = cat.uom;
          if (uomSub === 'SF') {
            // SF: manual override or auto-derived
            subSF += parseFloat(cfg.sf_manual) || (cat.autoDerive ? (cat.autoDerive(d) || 0) : 0);
          } else if (uomSub === 'LF') {
            // LF→SF 1:1: manual override or auto-derived
            subSF += parseFloat(cfg.lf_manual) || (d[subId + '_lf'] || 0);
          } else if (uomSub === 'EA') {
            // EA→SF: manual or auto-derived (door_frames, window_jamb, etc.) × 20 SF baseline
            const eaCount = parseInt(cfg.ea_manual) || (d[subId + '_ea'] || 0);
            subSF += eaCount * 20;
          }
        }
      }
      // Per-item grain_fill (doors, windows — each item can have grain_fill independently)
      if (cfg.items) {
        cfg.items.forEach(item => {
          if (item.grain_fill && item.substrate_state === 'bare_wood' && (item.coating_type || 'paint') === 'paint') {
            const cnt = parseInt(item.count) || 0;
            const sides = (subId === 'doors') ? cnt * (parseInt(item.sides_per_door) || 2) : cnt;
            subSF += sides * 20; // ~20 SF per EA/side baseline
          }
        });
      }
      if (subSF > 0) {
        grainFillSF += subSF;
        grainFillBreakdown[subId] = (grainFillBreakdown[subId] || 0) + subSF;
      }
    });
    // Debug: log grain fill state for each substrate
    Object.entries(subs).forEach(([subId, cfg]) => {
      if (cfg && cfg.grain_fill) {
        const cat = SUBSTRATE_MAP[subId];
        const eaDerived = d[subId + '_ea'] || 0;
        const lfDerived = d[subId + '_lf'] || 0;
        console.warn(`[GrainFill] ${subId}: grain_fill=${cfg.grain_fill}, uom=${cat?.uom}, ea_manual=${cfg.ea_manual}, ea_derived=${eaDerived}, lf_manual=${cfg.lf_manual}, lf_derived=${lfDerived}, sf_manual=${cfg.sf_manual}, breakdown=${grainFillBreakdown[subId] || 0}`);
      }
    });
    if (grainFillSF > 0) {
      console.warn(`[GrainFill] Total SF=${grainFillSF}, breakdown=`, grainFillBreakdown);
      addQ('PS_SURFACE_SF.GRAIN_FILL', 'SF', grainFillSF);
      // Store breakdown for parent spec attribution (not a PS key — metadata only)
      qty.set('_GRAIN_FILL_BREAKDOWN', grainFillBreakdown);
    } else {
      // Check if any substrates have grain_fill enabled but produced 0 SF
      const gfSubs = Object.entries(subs).filter(([, cfg]) => cfg && cfg.grain_fill);
      if (gfSubs.length > 0) {
        console.warn(`[GrainFill] WARNING: ${gfSubs.length} substrates have grain_fill=true but total SF=0`, gfSubs.map(([id]) => id));
      }
    }

    // Edges — wall↔ceiling perimeter is the same LF from either side.
    // TO_CEILING names it from the wall's perspective (used by wall cut-in tasks);
    // TO_WALL names it from the ceiling's perspective (used by ceiling cut-in
    // and ceiling-adjacent masking tasks). Same underlying value.
    addQ('PS_EDGE_LF.TO_CEILING', 'LF', d.perimeter);
    addQ('PS_EDGE_LF.TO_WALL', 'LF', d.perimeter);
    const trimLF = d.baseboard_lf + d.door_casing_lf + d.window_casing_lf;
    addQ('PS_EDGE_LF.TO_TRIM', 'LF', trimLF);

    // Protection — floor level driven by floor_type + user override.
    // floor_protection is canonical mask-level vocab (edge/partial/full/etc.).
    const floorProt2 = room.floor_protection || '';
    const hasFloorProt = room.floor_type && room.floor_type !== 'subfloor' && floorProt2;
    if (hasFloorProt) {
      addQ('PS_PROTECT_SF.FLOOR_EXPOSED', 'SF', d.ceilingSF);
      if (floorProt2 === 'full' || floorProt2 === 'partial' ||
          floorProt2 === 'edge_full' || floorProt2 === 'edge_partial' ||
          floorProt2 === 'encapsulate' || floorProt2 === 'edge_encapsulate') {
        addQ('PS_PROTECT_SF.FLOOR_PERIMETER', 'SF', d.perimeter * 2);
      }
    }
    // WORKZONE = localized spray zones: 8ft radius semicircle per opening, quarter-circle per window
    const wzSF = Math.min(
      Math.round(d.totalOpenings * (Math.PI * 64 / 2) + d.totalWindows * (Math.PI * 64 / 4)),
      d.ceilingSF
    );
    addQ('PS_PROTECT_SF.FLOOR_WORKZONE', 'SF', wzSF);
    addQ('PS_PROTECT_LF.TRIM_EDGES', 'LF', trimLF);
    if (subs.baseboard) addQ('PS_PROTECT_LF.TRIM_BASEBOARD', 'LF', d.baseboard_lf);
    // Casing protection always emits when walls are painted (masking casing during wall work)
    if (subs.walls) {
      addQ('PS_PROTECT_LF.TRIM_CASING_DOOR', 'LF', d.door_casing_lf);
      addQ('PS_PROTECT_LF.TRIM_CASING_WINDOW', 'LF', d.window_casing_lf);
    }
    addQ('PS_PROTECT_LF.CEILING_LINE', 'LF', d.perimeter);

    // === Room Protection v1 quantity emissions ===
    // New protection scenario (SCN_ROOM_PROTECTION_NC) consumes these. Modules
    // gate by floor/wall/ceiling mask_level — engine emits all keys; the
    // scenario's modules pick which level's task to fire. Quantities reflect
    // what would be masked at any chosen level (engine doesn't know level here).
    const wallTotalSF = d.perimeter * (parseFloat(room.height_ft) || 8);
    // Floor
    addQ('PS_PROTECT_LF.FLOOR_EDGE', 'LF', d.perimeter);
    addQ('PS_PROTECT_LF.FLOOR_PARTIAL', 'LF', d.perimeter);
    addQ('PS_PROTECT_SF.FLOOR_AREA', 'SF', d.ceilingSF);
    // Wall — edge/partial = LF perimeter, full/encapsulate = total wall SF
    addQ('PS_PROTECT_LF.WALL_EDGE', 'LF', d.perimeter);
    addQ('PS_PROTECT_LF.WALL_PARTIAL', 'LF', d.perimeter);
    addQ('PS_PROTECT_SF.WALL_AREA', 'SF', wallTotalSF);
    // Ceiling — edge/partial perimeter, encapsulate area
    addQ('PS_PROTECT_LF.CEILING_EDGE', 'LF', d.perimeter);
    addQ('PS_PROTECT_LF.CEILING_PARTIAL', 'LF', d.perimeter);
    addQ('PS_PROTECT_SF.CEILING_AREA', 'SF', d.ceilingSF);
    // Adjacent-surface masks — emit only when neighbor NOT in paint/stain scope.
    // Doors not in scope: count = totalOpenings - active door panels
    const doorsActiveCnt = (subs.doors?.painting && subs.doors?.items) ? subs.doors.items.reduce((s, di) => s + (parseInt(di.count) || 0), 0) : 0;
    const doorsUnpaintedCnt = Math.max(0, d.totalOpenings - doorsActiveCnt);
    if (doorsUnpaintedCnt > 0) addQ('PS_PROTECT_EA.DOOR_SLAB', 'EA', doorsUnpaintedCnt);
    // Door frame / casing / window jamb / window casing — mask when not in scope
    if (!subs.door_frames && d.door_frame_lf > 0) {
      addQ('PS_PROTECT_LF.DOOR_FRAME_ADJACENT', 'LF', d.door_frame_lf);
    }
    if (!subs.door_casing?.painting && d.door_casing_lf > 0) {
      addQ('PS_PROTECT_LF.DOOR_CASING_ADJACENT', 'LF', d.door_casing_lf);
    }
    if (!subs.window_casing?.painting && d.window_casing_lf > 0) {
      addQ('PS_PROTECT_LF.WINDOW_CASING_ADJACENT', 'LF', d.window_casing_lf);
    }
    if (!subs.window_jamb && d.window_jamb_lf > 0) {
      addQ('PS_PROTECT_LF.WINDOW_JAMB_ADJACENT', 'LF', d.window_jamb_lf);
    }
    // Trim tape line — total trim LF being painted (for crisp finished edge before walls)
    const tapelineLF = (subs.baseboard ? d.baseboard_lf : 0)
      + (subs.crown ? d.crown_lf || 0 : 0)
      + (subs.door_casing?.painting ? d.door_casing_lf : 0)
      + (subs.window_casing?.painting ? d.window_casing_lf : 0)
      + (subs.chair_rail ? d.chair_rail_lf || 0 : 0);
    if (tapelineLF > 0) addQ('PS_PROTECT_LF.TRIM_TAPELINE', 'LF', tapelineLF);
    // Containment — singleton (engine handles FIXED tasks via quantity=1 sentinel)
    addQ('PS_PROTECT_FIXED.CONTAINMENT', 'FIXED', 1);
    addQ('PS_PROTECT_FIXED.CONTAINMENT_ZIPPER', 'FIXED', 1);
    // Spot mask quantities — opening counts for floor/ceiling spot tasks.
    // Floor spot fires at base of door casing/frame (door openings only).
    // Ceiling spot fires above doors + windows (any opening with ceiling above).
    addQ('PS_PROTECT_EA.OPENING_BASE_FLOOR', 'EA', d.totalOpenings);
    addQ('PS_PROTECT_EA.OPENING_ABOVE_CEILING', 'EA', d.totalOpenings + d.totalWindows);

    // Fixture protection keys (v0.5 — legacy + v1.0 — Protection tab v2 mask tasks)
    Object.entries(room.fixtures || {}).forEach(function ([fId, cfg]) {
      if (fId === 'cabinets') {
        const lf = parseFloat(cfg.linear_ft) || 0;
        if (lf > 0) {
          // Cabinet Path 1 (paint_cabinets=false): single PS key, quantity =
          // linear_ft × stack_multiplier (1 lower-only, 2 lower+upper). Feeds
          // the 7 SCN_CABINET_PROTECT_* canonical-mask-level scenarios.
          //
          // Per-zone keys (CABINET_FACE_COVERS, COUNTERTOP_EDGE from cabinet
          // branch, ASSET.HARDWARE, FLOOR_FULL_KITCHEN, BACKSPLASH_MASK,
          // ASSET.APPLIANCES) are RESERVED for Path 2 (paint_cabinets=true) —
          // not emitted here. The standalone Countertops fixture still emits
          // PS_PROTECT_LF.COUNTERTOP_EDGE via its own branch below.
          const stackMult = (cfg.layout === 'lower_upper') ? 2 : 1;
          addQ('PS_PROTECT_LF.CABINET', 'LF', lf * stackMult);
        }
      } else if (fId === 'feature_wall') {
        const items = cfg.items || (cfg.length_ft ? [cfg] : []);
        const sf = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0) * (parseInt(i.count) || 1)), 0);
        if (sf > 0) {
          addQ('PS_PROTECT_SF.FEATURE_WALL', 'SF', sf);          // new key
          addQ('PS_PROTECT_SF.FIXTURE_FEATURE_WALL', 'SF', sf);  // legacy
        }
      } else if (fId === 'fireplace' || fId === 'stone_fireplace') {
        // Both fireplace and stone fireplace use the same PS key — masking method
        // differs (delicate vs duct tape) but UOM and quantity formula match.
        const sf = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
        if (sf > 0) addQ('PS_PROTECT_SF.FIREPLACE', 'SF', sf);
      } else if (fId === 'builtin_shelving') {
        const sf = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
        if (sf > 0) addQ('PS_PROTECT_SF.BUILTIN', 'SF', sf);
      } else if (fId === 'shower') {
        const sf = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
        if (sf > 0) addQ('PS_PROTECT_SF.SHOWER', 'SF', sf);
      } else if (fId === 'vanity') {
        // Vanity rule: width LF for all levels EXCEPT encapsulate when width<3 LF.
        // In that special case, emit the singleton fixed-min key instead so the
        // 5-min minimum task fires (and the regular LF task gracefully skips at 0).
        const width = parseFloat(cfg.width_ft) || 0;
        const count = parseInt(cfg.count) || 1;
        const lf = width * count;
        const level = cfg.protection || 'full';
        const isEncap = level === 'encapsulate' || level === 'edge_encapsulate';
        if (width < 3 && isEncap && count > 0) {
          addQ('PS_PROTECT_EA.VANITY_SMALL_ENCAP', 'EA', count);
        } else if (lf > 0) {
          addQ('PS_PROTECT_LF.VANITY', 'LF', lf);
        }
      } else if (fId === 'bathtub') {
        const cnt = parseInt(cfg.count) || 1;
        if (cnt > 0) addQ('PS_PROTECT_EA.BATHTUB', 'EA', cnt);
      } else if (fId === 'toilet') {
        const cnt = parseInt(cfg.count) || 1;
        if (cnt > 0) addQ('PS_PROTECT_EA.TOILET', 'EA', cnt);
      } else if (fId === 'appliances') {
        const cnt = parseInt(cfg.count) || 1;
        if (cnt > 0) addQ('PS_PROTECT_EA.APPLIANCES', 'EA', cnt);
      } else if (fId === 'countertops') {
        const lf = parseFloat(cfg.linear_ft) || 0;
        if (lf > 0) addQ('PS_PROTECT_LF.COUNTERTOP_EDGE', 'LF', lf);
      } else {
        // Generic fixture — fall through to legacy FIXTURE_* key
        const cnt = parseInt(cfg.count) || 1;
        addQ('PS_PROTECT_EA.FIXTURE_' + fId.toUpperCase(), 'EA', cnt);
      }
    });

    // Project-wide allowance for light fixtures + ceiling fans + fireplace mantels.
    // Single fire per project — emit on the FIRST room with any of these checked.
    if (!lightFanMantelAllowanceEmitted) {
      const f = room.fixtures || {};
      if (f.light_fixtures || f.ceiling_fan || f.fireplace || f.stone_fireplace) {
        addQ('PS_PROTECT_EA.LIGHT_FAN_MANTEL_ALLOWANCE', 'EA', 1);
        lightFanMantelAllowanceEmitted = true;
      }
    }

    // Outlet/switch heuristic — emit only when spraying walls/ceiling/trim.
    // Brush+roll only → no outlet mask (covers stay on, get cut around).
    const wallsSprayQ = (subs.walls?.application_method || '').toString().includes('spray');
    const ceilingSprayQ = (subs.ceiling?.application_method || '').toString().includes('spray');
    const anyTrimSprayQ = ['baseboard','crown','door_casing','window_casing','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold','door_frames','window_jamb']
      .some(id => {
        const s = subs[id];
        if (!s) return false;
        if (s.painting === false) return false;
        return (s.application_method || '').toString().includes('spray');
      });
    const anySprayInRoom = wallsSprayQ || ceilingSprayQ || anyTrimSprayQ;
    if (anySprayInRoom && outletsPerRoom > 0) {
      const cnt = (room.protection?.outlets_count_override != null ? Number(room.protection.outlets_count_override) : outletsPerRoom);
      if (cnt > 0) addQ('PS_PROTECT_EA.OUTLET_SWITCH', 'EA', cnt);
    }
    // HVAC vent heuristic — emit count regardless of method; tasks gate on hvac_action.
    if (hvacPerRoom > 0) {
      const cnt = (room.protection?.hvac_vents_count_override != null ? Number(room.protection.hvac_vents_count_override) : hvacPerRoom);
      if (cnt > 0) addQ('PS_PROTECT_EA.HVAC_VENT', 'EA', cnt);
    }

    // Meta
    addQ('PS_META.EA.ROOMS_TOTAL', 'EA', 1);
    addQ('PS_META.EA.CASING_END_COUNT', 'EA', d.totalOpenings * 2 + d.totalWindows * 4);
    addQ('PS_META.SF.FLOOR_VACUUM_AREA', 'SF', d.ceilingSF);

    // Closets — sub-rooms that roll up quantities into the parent room
    // Uses addClosetQ to track closet contributions separately for display
    const closets = room.closets || [];
    closets.forEach((closet) => {
      const cd = deriveCloset(closet, room);
      // Closet walls
      if (subs.walls && cd.wall_field_sf > 0) {
        addClosetQ('PS_SURFACE_SF.WALL_FIELD', 'SF', cd.wall_field_sf);
      }
      // Closet ceiling
      if (subs.ceiling && cd.ceiling_field_sf > 0) {
        addClosetQ('PS_SURFACE_SF.CEILING_FIELD', 'SF', cd.ceiling_field_sf);
      }
      // Closet baseboard
      if (subs.baseboard && cd.baseboard_lf > 0) {
        addClosetQ('PS_SURFACE_LF.TRIM_BASEBOARD', 'LF', cd.baseboard_lf);
        addClosetQ('PS_SURFACE_LF.TRIM_TOTAL', 'LF', cd.baseboard_lf);
        addClosetQ('PS_EDGE_LF.TRIM_JOINTS', 'LF', cd.baseboard_lf);
      }
      // Closet shelving — emit paint surface key only when paint_shelving is true.
      // When paint_shelving is false, masking + obstruction is handled by
      // resolveClosetShelfProtection() in the run-estimate pipeline.
      if (closet.shelving_type !== 'none' && cd.shelving_lf > 0) {
        if (closet.paint_shelving !== false) {
          addClosetQ('PS_SURFACE_LF.CLOSET_SHELF', 'LF', cd.shelving_lf);
        }
      }
      // Closet shelf protection — emit LF when NOT painting shelves.
      // Consumed by MOD_PROTECT_CLOSET_SHELF_* modules via SCN_CLOSET_SHELF_PROTECT_* scenarios.
      if (closet.shelving_type !== 'none' && cd.shelving_lf > 0 && closet.paint_shelving === false) {
        addClosetQ('PS_PROTECT_LF.CLOSET_SHELF_MASK', 'LF', cd.shelving_lf);
      }
      // Closet perimeter edges + protection
      addClosetQ('PS_EDGE_LF.TO_CEILING', 'LF', cd.perimeter);
      if (cd.baseboard_lf > 0) {
        addClosetQ('PS_EDGE_LF.TO_TRIM', 'LF', cd.baseboard_lf);
        if (subs.baseboard) addClosetQ('PS_PROTECT_LF.TRIM_BASEBOARD', 'LF', cd.baseboard_lf);
      }
      addClosetQ('PS_PROTECT_LF.CEILING_LINE', 'LF', cd.perimeter);
      // Floor protection (inherits parent floor type)
      if (hasFloorProt) {
        addClosetQ('PS_PROTECT_SF.FLOOR_EXPOSED', 'SF', cd.ceilingSF);
      }
      // Meta
      addClosetQ('PS_META.SF.FLOOR_VACUUM_AREA', 'SF', cd.ceilingSF);
    });
    if (closets.length > 0) {
      addQ('PS_META.EA.CLOSETS_TOTAL', 'EA', closets.length);
    }

    // ── Cabinet paint surface emission ──
    // Emit paint surface keys only when paint_cabinets is true.
    // When paint_cabinets is false, protection is handled by
    // resolveCabinetProtection() in the run-estimate pipeline.
    const cab = subs.cabinets;
    if (cab && cab.paint_cabinets) {
      const scope = cab.scope || 'full_exterior';
      // Always emit doors + drawers + hardware (all scope levels)
      if (cab.door_count > 0) addQ('PS_SURFACE_EA.CABINET_DOOR', 'EA', cab.door_count);
      if (cab.drawer_count > 0) addQ('PS_SURFACE_EA.CABINET_DRAWER', 'EA', cab.drawer_count);
      if (cab.hardware_count > 0) addQ('PS_SURFACE_EA.ASSET.CABINET_HARDWARE', 'EA', cab.hardware_count);
      // Frame + caulk only for full_exterior and full_with_interior
      if (scope !== 'doors_only') {
        if (cab.frame_sf > 0) addQ('PS_SURFACE_SF.CABINET_FRAME', 'SF', cab.frame_sf);
        if (cab.caulk_lf > 0) addQ('PS_SURFACE_LF.CABINET_CAULK', 'LF', cab.caulk_lf);
      }
      // Interior only for full_with_interior
      if (scope === 'full_with_interior' && cab.interior_sf > 0) {
        addQ('PS_SURFACE_SF.CABINET_INTERIOR', 'SF', cab.interior_sf);
      }
    }
    // ── Cabinet protection PS key emission (substrate fallback) ──
    // Path 1 (paint_cabinets=false): single PS_PROTECT_LF.CABINET key drives
    // the 7 SCN_CABINET_PROTECT_* scenarios. The substrate carries cabinet_count
    // (not linear_ft) so we derive linear_ft ≈ cabinet_count × 2 LF/box.
    // Stack multiplier defaults to 2 (typical lower+upper kitchen). For exact
    // accounting, add cabinets via the Protection-tab fixture which carries
    // linear_ft and layout directly.
    //
    // Per-zone keys (CABINET_FACE_COVERS, COUNTERTOP_EDGE, ASSET.HARDWARE,
    // FLOOR_FULL_KITCHEN, BACKSPLASH_MASK, ASSET.APPLIANCES) are RESERVED
    // for Path 2 (paint_cabinets=true) — wired in a later pass.
    if (cab && cab.paint_cabinets === false) {
      const cabCount = cab.cabinet_count || 0;
      if (cabCount > 0) {
        const derivedLF = cabCount * 2;
        const stackMult = 2;
        addQ('PS_PROTECT_LF.CABINET', 'LF', derivedLF * stackMult);
      }
    }

    roomLookups.set(ri, { qty, closetQty });
  });
  return roomLookups;
}

// Substrates whose specs should use the openings_quality_tier override
export const OPENING_SUBSTRATES = new Set(['doors', 'windows', 'door_casing', 'window_casing', 'door_frames', 'window_jamb']);
