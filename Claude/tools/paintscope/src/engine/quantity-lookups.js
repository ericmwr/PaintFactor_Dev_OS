import { deriveRoom, deriveCloset } from './derive-room.js';
import { SUBSTRATE_MAP, SUBSTRATE_CATALOG, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import { OPENING_TYPES } from '../data/opening-types.js';

/**
 * Build per-room quantity lookup from the prototype state.
 * Returns Map<roomIndex, Map<psKey, {value, uom}>>
 */
export function buildRoomQuantityLookups(state) {
  const { project, rooms } = state;
  const roomLookups = new Map();

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

    // Wall + Ceiling — conditional
    if (subs.walls) addQ('PS_SURFACE_SF.WALL_FIELD', 'SF', d.wall_field_sf);
    if (subs.ceiling) addQ('PS_SURFACE_SF.CEILING_FIELD', 'SF', d.ceiling_field_sf);

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

    // Aggregate all trim LF for specs that use PS_SURFACE_LF.TRIM_TOTAL (only painting trim)
    const allTrimLF = trimKeys.reduce((s, [subId, , derivedKey]) => {
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
      if (doorsPainting2) {
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
    // Door frames — emit stain key when coating_type is stain/clear
    if (subs.door_frames) {
      const frameCt = subs.door_frames.coating_type || 'paint';
      if (frameCt === 'paint') {
        addQ('PS_SURFACE_EA.DOOR_FRAME_SET', 'EA', d.door_frames_ea);
      } else {
        addQ('PS_SURFACE_EA.DOOR_FRAME_STAIN', 'EA', d.door_frames_ea);
      }
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
      addQ('PS_SURFACE_EA.WINDOW_JAMB', 'EA', d.window_jamb_ea);
      // Jamb count also contributes to WINDOW_TOTAL when windows not already painting
      if (!windowsPainting2 || !windowItems.length) {
        addQ('PS_OPENING_EA.WINDOW_TOTAL', 'EA', d.window_jamb_ea);
      }
    }

    // Specialty — conditional
    const specKeys = [
      ['wainscoting', 'PS_SURFACE_SF.WAINSCOTING', 'SF', 'sf_manual'], ['wood_feature_wall', 'PS_SURFACE_SF.WOOD_WALL', 'SF', 'sf_manual'],
      ['wood_ceiling', 'PS_SURFACE_SF.WOOD_CEILING', 'SF', 'sf_manual'], ['closet_shelving', 'PS_SURFACE_LF.CLOSET_SHELF', 'LF', 'lf_manual'],
      ['beams', 'PS_SURFACE_LF.ARCH_BEAM', 'LF', 'ea_manual'], ['columns', 'PS_SURFACE_EA.ARCH_COLUMN', 'EA', 'ea_manual'],
      ['mantels', 'PS_SURFACE_EA.ARCH_MANTEL', 'EA', 'ea_manual'],
      ['stair_risers', 'PS_SURFACE_EA.STAIR_RISER', 'EA', 'ea_manual'], ['stair_railing', 'PS_SURFACE_EA.STAIR_RAILING', 'EA', 'ea_manual']
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

    // Edges
    addQ('PS_EDGE_LF.TO_CEILING', 'LF', d.perimeter);
    const trimLF = d.baseboard_lf + d.door_casing_lf + d.window_casing_lf;
    addQ('PS_EDGE_LF.TO_TRIM', 'LF', trimLF);

    // Protection — floor level driven by floor_type + user override
    const floorProt2 = room.floor_protection || '';
    const hasFloorProt = room.floor_type && room.floor_type !== 'subfloor' && floorProt2;
    if (hasFloorProt) {
      addQ('PS_PROTECT_SF.FLOOR_EXPOSED', 'SF', d.ceilingSF);
      if (floorProt2 === 'full_cover' || floorProt2 === 'partial_cover') {
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

    // Fixture protection keys (v0.5)
    Object.entries(room.fixtures || {}).forEach(function ([fId, cfg]) {
      if (fId === 'cabinets') {
        const lf = parseFloat(cfg.linear_ft) || 0;
        if (lf > 0) addQ('PS_PROTECT_LF.FIXTURE_CABINETS', 'LF', lf);
      } else if (fId === 'feature_wall') {
        // Sum SF across all feature wall items (or legacy single config)
        const items = cfg.items || (cfg.length_ft ? [cfg] : []);
        const sf = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0) * (parseInt(i.count) || 1)), 0);
        if (sf > 0) addQ('PS_PROTECT_SF.FIXTURE_FEATURE_WALL', 'SF', sf);
      } else {
        const cnt = parseInt(cfg.count) || 1;
        addQ('PS_PROTECT_EA.FIXTURE_' + fId.toUpperCase(), 'EA', cnt);
      }
    });

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
      // Closet shelving
      if (closet.shelving_type !== 'none' && cd.shelving_lf > 0) {
        addClosetQ('PS_SURFACE_LF.CLOSET_SHELF', 'LF', cd.shelving_lf);
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

    roomLookups.set(ri, { qty, closetQty });
  });
  return roomLookups;
}

// Substrates whose specs should use the openings_quality_tier override
export const OPENING_SUBSTRATES = new Set(['doors', 'windows', 'door_casing', 'window_casing', 'door_frames', 'window_jamb']);
