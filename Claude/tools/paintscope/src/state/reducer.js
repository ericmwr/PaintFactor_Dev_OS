import { createRoom, createDoor, createWindow, createOpening, createCloset, createSubstrateConfig, genId, bumpNextIdFromState } from './initial-state';
import { FIXTURE_MAP } from '../data/fixture-catalog';
import { inferDefaultSystem, coatingTypeFromSystem } from '../data/system-catalog.js';
import { PAINTING_SCOPE_PRESET_MAP, ALWAYS_PRESENT_SUBSTRATES } from '../data/painting-scope-presets.js';
import { LIGHT_FIXTURE_TYPE_MAP } from '../data/light-fixture-types.js';

// Build a fresh light-fixture item. Time fields are null on creation —
// the user enters them in the inline panel (50% auto-fill on the mask
// remove side happens UI-side when they type the install time).
function createLightFixtureItem(type = 'other') {
  const taxonomy = LIGHT_FIXTURE_TYPE_MAP[type] || LIGHT_FIXTURE_TYPE_MAP['other'];
  return {
    id: genId('lfi'),
    type,
    custom_label: taxonomy.is_custom ? '' : null,
    count: 1,
    protection: taxonomy.default_protection || 'full',
    action_mode: 'mask',
    mask_install_time_min:     null,  // user input
    mask_remove_time_min:      null,  // user input; UI auto-fills 50% of install
    fixture_uninstall_time_min: null, // user input
    fixture_reinstall_time_min: null, // user input
  };
}
import {
  createElevation, createSidingSection, createTrimConfig, createExtWindow, createExtDoor,
  createBumpOut, createDormer, createGable, createGarageDoor, createDeck, createFence,
  createFoundation, createPorch, createMetalSurface, createSiteConditions
} from './exterior-state';

export function reducer(state, action) {
  const { type, payload } = action;
  // Helper: update a single room by id
  function mapRoom(roomId, fn) {
    return { ...state, rooms: state.rooms.map(r => r.id === roomId ? fn(r) : r) };
  }
  switch (type) {
    case 'SET_PROJECT': return { ...state, project: { ...state.project, [payload.field]: payload.value } };
    case 'SET_RATE_OVERRIDE': {
      const { task_id, rate_per_hour } = payload || {};
      if (!task_id) return state;
      const cur = state.project.rate_overrides || {};
      if (rate_per_hour == null || rate_per_hour <= 0) {
        const next = { ...cur };
        delete next[task_id];
        return { ...state, project: { ...state.project, rate_overrides: next } };
      }
      return {
        ...state,
        project: {
          ...state.project,
          rate_overrides: {
            ...cur,
            [task_id]: { rate_per_hour, ts: Date.now() },
          },
        },
      };
    }
    case 'CLEAR_RATE_OVERRIDE': {
      const { task_id } = payload || {};
      if (!task_id) return state;
      const cur = state.project.rate_overrides || {};
      if (!cur[task_id]) return state;
      const next = { ...cur };
      delete next[task_id];
      return { ...state, project: { ...state.project, rate_overrides: next } };
    }
    case 'CLEAR_PRUNE_REPORT': {
      const next = { ...state };
      delete next._lastRateOverridePruneReport;
      return next;
    }
    case 'SET_PROJECT_STATUS': {
      const valid = ['draft', 'estimated', 'approved', 'in_progress', 'completed'];
      if (!valid.includes(payload)) return state;
      return { ...state, project: { ...state.project, status: payload } };
    }
    case 'APPEND_ROSTER_NAME': {
      if (typeof payload !== 'string') return state;
      const name = payload.trim();
      if (!name) return state;
      const roster = state.project.tracker_roster || [];
      const lower = name.toLowerCase();
      if (roster.some(n => n.toLowerCase() === lower)) return state;
      return { ...state, project: { ...state.project, tracker_roster: [...roster, name] } };
    }
    case 'REMOVE_ROSTER_NAME': {
      if (typeof payload !== 'string') return state;
      const roster = state.project.tracker_roster || [];
      const next = roster.filter(n => n !== payload);
      if (next.length === roster.length) return state;
      return { ...state, project: { ...state.project, tracker_roster: next } };
    }
    case 'ADD_MANUAL_MATERIAL': {
      const { product_id, gallons, notes } = payload || {};
      if (!product_id || !(gallons > 0)) return state;
      const mo = state.project.material_overrides || { system: {}, manual: [] };
      const manual = Array.isArray(mo.manual) ? mo.manual : [];
      const entry = {
        id: `mm_${Date.now()}`,
        product_id,
        gallons: Number(gallons),
        notes: (notes || '').trim(),
        added_at: new Date().toISOString(),
      };
      return {
        ...state,
        project: {
          ...state.project,
          material_overrides: { ...mo, manual: [...manual, entry] },
        },
      };
    }
    case 'UPDATE_MANUAL_MATERIAL': {
      const { id, gallons, notes } = payload || {};
      if (!id) return state;
      const mo = state.project.material_overrides || { system: {}, manual: [] };
      const manual = Array.isArray(mo.manual) ? mo.manual : [];
      const idx = manual.findIndex(m => m.id === id);
      if (idx < 0) return state;
      const updated = { ...manual[idx] };
      if (gallons != null && gallons > 0) updated.gallons = Number(gallons);
      if (notes != null) updated.notes = String(notes).trim();
      const next = [...manual]; next[idx] = updated;
      return {
        ...state,
        project: { ...state.project, material_overrides: { ...mo, manual: next } },
      };
    }
    case 'REMOVE_MANUAL_MATERIAL': {
      const id = payload;
      if (!id) return state;
      const mo = state.project.material_overrides || { system: {}, manual: [] };
      const manual = Array.isArray(mo.manual) ? mo.manual : [];
      const next = manual.filter(m => m.id !== id);
      if (next.length === manual.length) return state;
      return {
        ...state,
        project: { ...state.project, material_overrides: { ...mo, manual: next } },
      };
    }
    case 'TOGGLE_PROJECT_SUBSTRATE': {
      const subs = state.project.default_substrates || [];
      const id = payload;
      const next = subs.includes(id) ? subs.filter(s => s !== id) : [...subs, id];
      return { ...state, project: { ...state.project, default_substrates: next } };
    }
    case 'SET_VIEW': return { ...state, ui: { ...state.ui, view: payload } };
    case 'SET_TAB': return { ...state, ui: { ...state.ui, activeTab: payload } };
    case 'SET_SCOPE_MODE': return { ...state, ui: { ...state.ui, scopeMode: payload } };
    case 'SET_ACTIVE_ROOM': return { ...state, ui: { ...state.ui, activeRoomId: payload, scopeMode: 'interior' } };
    case 'REORDER_ROOM': {
      const { dragId, dropId } = payload;
      if (dragId === dropId) return state;
      const rooms = [...state.rooms];
      const dragIdx = rooms.findIndex(r => r.id === dragId);
      const dropIdx = rooms.findIndex(r => r.id === dropId);
      if (dragIdx < 0 || dropIdx < 0) return state;
      const [moved] = rooms.splice(dragIdx, 1);
      rooms.splice(dropIdx, 0, moved);
      return { ...state, rooms };
    }
    case 'ADD_ROOM_CATEGORY': {
      const name = (payload?.name || 'New Category').trim();
      if (!name || (state.room_categories || []).includes(name)) return state;
      return { ...state, room_categories: [...(state.room_categories || []), name] };
    }
    case 'REMOVE_ROOM_CATEGORY': {
      const name = payload;
      return {
        ...state,
        room_categories: (state.room_categories || []).filter(c => c !== name),
        rooms: state.rooms.map(r => r.area_group === name ? { ...r, area_group: '' } : r),
      };
    }
    case 'RENAME_ROOM_CATEGORY': {
      const { oldName, newName } = payload;
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) return state;
      return {
        ...state,
        room_categories: (state.room_categories || []).map(c => c === oldName ? trimmed : c),
        rooms: state.rooms.map(r => r.area_group === oldName ? { ...r, area_group: trimmed } : r),
      };
    }
    case 'ADD_ROOM': {
      bumpNextIdFromState(state);
      const room = createRoom(payload || {});
      const projSubs = state.project.default_substrates || [];
      projSubs.forEach(subId => {
        if (subId === 'doors' || subId === 'windows') {
          // doors/windows always exist from createRoom; project default sets painting flag + default item
          room.substrates[subId].painting = true;
          if ((room.substrates[subId].items || []).length === 0) {
            room.substrates[subId].items = subId === 'doors' ? [createDoor()] : [createWindow()];
          }
        } else if (subId === 'door_casing' || subId === 'window_casing') {
          // casing always exists from createRoom; project default sets painting flag
          room.substrates[subId].painting = true;
        } else if (!room.substrates[subId]) {
          room.substrates[subId] = createSubstrateConfig(subId);
        }
      });
      return { ...state, rooms:[...state.rooms, room], ui:{...state.ui, activeRoomId:room.id, activeTab:'scope', view:'scope', scopeMode:'interior'} };
    }
    case 'REMOVE_ROOM': {
      const rooms = state.rooms.filter(r => r.id !== payload);
      const activeId = state.ui.activeRoomId === payload ? (rooms[0]?.id || null) : state.ui.activeRoomId;
      const room_overrides = { ...state.colors.room_overrides };
      delete room_overrides[payload];
      return { ...state, rooms, ui:{...state.ui, activeRoomId:activeId}, colors: { ...state.colors, room_overrides } };
    }
    case 'DUPLICATE_ROOM': {
      const src = state.rooms.find(r => r.id === payload);
      if (!src) return state;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = genId('room');
      copy.label = src.label + ' (copy)';
      // Re-stamp IDs on door/window items and openings
      if (copy.substrates.doors?.items) copy.substrates.doors.items.forEach(d => d.id = genId('door'));
      if (copy.substrates.windows?.items) copy.substrates.windows.items.forEach(w => w.id = genId('win'));
      if (copy.openings) copy.openings.forEach(o => o.id = genId('opn'));
      if (copy.closets) copy.closets.forEach(c => c.id = genId('closet'));
      const idx = state.rooms.findIndex(r => r.id === payload);
      const rooms = [...state.rooms]; rooms.splice(idx+1, 0, copy);
      return { ...state, rooms, ui:{...state.ui, activeRoomId:copy.id} };
    }
    case 'SET_ROOM': {
      return mapRoom(payload.roomId, r => {
        const updated = { ...r, [payload.field]: payload.value };
        // When switching wall/ceiling material to wood, initialize coating fields on the substrate
        if (payload.field === 'wall_material' && payload.value === 'wood' && updated.substrates?.walls) {
          const w = { ...updated.substrates.walls };
          if (!w.coating_type) w.coating_type = 'paint';
          if (!w.wood_species_group) w.wood_species_group = 'hardwood';
          if (!w.application_method_stain) w.application_method_stain = 'brush';
          if (!w.application_method_clear) w.application_method_clear = 'brush';
          if (w.stain_coats == null) w.stain_coats = 1;
          if (w.sealer_coats == null) w.sealer_coats = 0;
          if (w.clear_coats == null) w.clear_coats = 1;
          if (!w.clear_sheen) w.clear_sheen = 'satin';
          if (!w.substrate_state) w.substrate_state = 'bare_wood';
          updated.substrates = { ...updated.substrates, walls: w };
        }
        if (payload.field === 'ceiling_material' && payload.value === 'wood' && updated.substrates?.ceiling) {
          const c = { ...updated.substrates.ceiling };
          if (!c.coating_type) c.coating_type = 'paint';
          if (!c.wood_species_group) c.wood_species_group = 'hardwood';
          if (!c.application_method_stain) c.application_method_stain = 'brush';
          if (!c.application_method_clear) c.application_method_clear = 'brush';
          if (c.stain_coats == null) c.stain_coats = 1;
          if (c.sealer_coats == null) c.sealer_coats = 0;
          if (c.clear_coats == null) c.clear_coats = 1;
          if (!c.clear_sheen) c.clear_sheen = 'satin';
          if (!c.substrate_state) c.substrate_state = 'bare_wood';
          updated.substrates = { ...updated.substrates, ceiling: c };
        }
        return updated;
      });
    }

    // v0.10: Set a single field on room.protection. Used by Protection tab v2
    // to record per-room overrides for floor/wall/ceiling mask levels, tape
    // line, containment, etc. Empty / null values delete the key (= revert to
    // auto-derived default).
    case 'SET_ROOM_PROTECTION_FIELD': {
      const { roomId, field, value } = payload;
      return mapRoom(roomId, r => {
        const prot = { ...(r.protection || {}) };
        if (value === null || value === undefined || value === '') delete prot[field];
        else prot[field] = value;
        return { ...r, protection: prot };
      });
    }

    // v0.10: Set the painting scope preset for a room. When the preset has a
    // substrates list, bulk-replace the room's active substrate set:
    //   - Substrates IN the preset get added (or painting=true for always-present openings)
    //   - Substrates NOT in the preset get removed (or painting=false for openings)
    // 'custom' preset is a no-op on substrate state — user manages manually.
    case 'SET_PAINTING_SCOPE_PRESET': {
      const { roomId, presetId } = payload;
      const preset = PAINTING_SCOPE_PRESET_MAP[presetId];
      if (!preset) return state;
      return mapRoom(roomId, r => {
        const updated = { ...r, painting_scope_preset: presetId };
        if (preset.substrates === null) return updated; // 'custom' — no substrate change
        const targetSet = new Set(preset.substrates);
        const newSubs = { ...r.substrates };
        // Activate target substrates
        for (const subId of targetSet) {
          if (ALWAYS_PRESENT_SUBSTRATES.has(subId)) {
            if (!newSubs[subId]) newSubs[subId] = createSubstrateConfig(subId);
            newSubs[subId] = { ...newSubs[subId], painting: true };
          } else if (!newSubs[subId]) {
            newSubs[subId] = createSubstrateConfig(subId);
          }
        }
        // Deactivate non-target substrates
        for (const subId of Object.keys(newSubs)) {
          if (targetSet.has(subId)) continue;
          if (ALWAYS_PRESENT_SUBSTRATES.has(subId)) {
            newSubs[subId] = { ...newSubs[subId], painting: false };
          } else {
            delete newSubs[subId];
          }
        }
        updated.substrates = newSubs;
        return updated;
      });
    }

    // v0.3: Toggle a substrate on/off
    case 'TOGGLE_SUBSTRATE': {
      const { roomId, substrateId } = payload;
      return mapRoom(roomId, r => {
        const subs = { ...r.substrates };
        if (substrateId === 'doors' || substrateId === 'windows' || substrateId === 'door_casing' || substrateId === 'window_casing') {
          // Never delete always-present substrates — toggle painting flag instead
          if (!subs[substrateId]) subs[substrateId] = createSubstrateConfig(substrateId);
          subs[substrateId] = { ...subs[substrateId], painting: !subs[substrateId].painting };
        } else if (subs[substrateId]) {
          // Remove substrate (uncheck)
          delete subs[substrateId];
        } else {
          // Add substrate with default config from catalog
          subs[substrateId] = createSubstrateConfig(substrateId);
        }
        return { ...r, substrates: subs };
      });
    }

    // v0.3: Set a field within a specific substrate config
    case 'SET_SUBSTRATE': {
      const { roomId, substrateId, field, value } = payload;
      return mapRoom(roomId, r => {
        if (!r.substrates[substrateId]) return r;
        // Apply the primary field change
        let updated = { ...r.substrates[substrateId], [field]: value };

        // QT-driven coat count defaults helper
        const COAT_DEFAULTS = {
          QT3: { stain_coats: 1, sealer_coats: 0, clear_coats: 1 },
          QT4: { stain_coats: 1, sealer_coats: 1, clear_coats: 2 },
          QT5: { stain_coats: 1, sealer_coats: 2, clear_coats: 3 },
        };

        // When coating_type changes to stain/clear, set coat count defaults from current QT
        if (field === 'coating_type' && value !== 'paint') {
          const qt = updated.quality_tier || state.project.default_quality_tier || 'QT3';
          const d = COAT_DEFAULTS[qt] || COAT_DEFAULTS.QT3;
          updated = { ...updated, ...d };
        }

        // When QT changes and coating_type is stain/clear, reset coat defaults
        if (field === 'quality_tier' && updated.coating_type && updated.coating_type !== 'paint') {
          const d = COAT_DEFAULTS[value] || COAT_DEFAULTS.QT3;
          updated = { ...updated, ...d };
        }

        // V1a: re-seed finish_group when coating_type flips, but preserve
        // manual overrides. Re-seeds only if current finish_group matches the
        // previous coating_type's default (i.e., the user hasn't manually
        // picked E/F/etc.).
        if (field === 'coating_type') {
          const STAIN_LIKE = new Set(['stain_clear', 'stain_only', 'clear_only']);
          const prevCoatingType = r.substrates[substrateId].coating_type;
          const prevDefault = STAIN_LIKE.has(prevCoatingType) ? 'D' : 'C';
          const newDefault  = STAIN_LIKE.has(value) ? 'D' : 'C';
          if (updated.finish_group === prevDefault) {
            updated.finish_group = newDefault;
          }
        }

        // Recompute ea_manual when builtin opening tier counts change
        if (substrateId === 'builtins' && ['openings_s', 'openings_m', 'openings_l', 'openings_xl'].includes(field)) {
          updated.ea_manual = (updated.openings_s || 0) + (updated.openings_m || 0) + (updated.openings_l || 0) + (updated.openings_xl || 0);
        }

        // Recompute lf_manual when closet shelving dimensions change
        if (substrateId === 'closet_shelving' && ['shelf_count', 'lf_per_shelf'].includes(field)) {
          updated.lf_manual = (updated.shelf_count || 0) * (updated.lf_per_shelf || 0);
        }

        // When substrate_state changes, re-infer system (only if current system
        // matches the previous inferred value — i.e., the user hasn't explicitly
        // picked a system yet). This keeps auto-inference fresh as the surface
        // state changes, but never overrides an explicit choice.
        if (field === 'substrate_state') {
          const prevInferred = inferDefaultSystem(substrateId, r.substrates[substrateId]?.substrate_state);
          const currentSystem = r.substrates[substrateId]?.system;
          if (currentSystem === prevInferred || currentSystem == null) {
            updated.system = inferDefaultSystem(substrateId, value) || null;
          }
        }

        // System is the source of truth for coating_type now that the UI field
        // was retired. Keep config.coating_type synced so the engine context
        // still has it (read by scenario-resolution + scenario matchers).
        if (field === 'system' || field === 'substrate_state') {
          const sys = updated.system;
          if (sys) updated.coating_type = coatingTypeFromSystem(sys);
          // Seed default stain scope (stain+clear, sealer opt-in) the first time
          // a wood substrate enters a STAIN-based coating, if not already chosen.
          // clear-only (ct === 'clear_only') is intentionally NOT seeded here —
          // decomposed families require stain as the base; clear-over-bare is
          // deferred until those scenarios are authored (Design Decision #7).
          const ct = updated.coating_type;
          const noScopeYet = !updated.stain_on && !updated.sealer_on && !updated.clear_on;
          if (ct && noScopeYet) {
            if (ct === 'stain_clear' || ct === 'stain_only') {
              updated.stain_on = true;
              updated.clear_on = ct === 'stain_clear';
              updated.sealer_on = false;
            }
            // ct === 'clear_only': leave all flags false (deferred — no clear-over-bare scenarios)
          }
        }

        // Keep coating_type synced when a presence toggle changes so derived
        // consumers (engine context, scenario matchers) stay consistent.
        if (field === 'stain_on' || field === 'sealer_on' || field === 'clear_on') {
          const s = updated.stain_on, se = updated.sealer_on, c = updated.clear_on;
          updated.coating_type =
            (s && c) ? 'stain_clear' :
            (s && !c) ? 'stain_only' :
            (!s && c) ? 'clear_only' : updated.coating_type;
        }

        return {
          ...r,
          substrates: { ...r.substrates, [substrateId]: updated }
        };
      });
    }

    // Doors — now operate on substrates.doors.items
    case 'ADD_DOOR': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        const doors = r.substrates.doors || createSubstrateConfig('doors');
        return { ...r, substrates: { ...r.substrates, doors: { ...doors, items: [...(doors.items||[]), createDoor()] } } };
      });
    }
    case 'REMOVE_DOOR': {
      return mapRoom(payload.roomId, r => {
        if (!r.substrates.doors) return r;
        return { ...r, substrates: { ...r.substrates, doors: { ...r.substrates.doors, items: r.substrates.doors.items.filter(d => d.id !== payload.doorId) } } };
      });
    }
    case 'SET_DOOR': {
      return mapRoom(payload.roomId, r => {
        if (!r.substrates.doors) return r;
        return { ...r, substrates: { ...r.substrates, doors: { ...r.substrates.doors, items: r.substrates.doors.items.map(d => d.id === payload.doorId ? { ...d, [payload.field]: payload.value } : d) } } };
      });
    }

    // Windows — now operate on substrates.windows.items
    case 'ADD_WINDOW': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        const wins = r.substrates.windows || createSubstrateConfig('windows');
        return { ...r, substrates: { ...r.substrates, windows: { ...wins, items: [...(wins.items||[]), createWindow()] } } };
      });
    }
    case 'REMOVE_WINDOW': {
      return mapRoom(payload.roomId, r => {
        if (!r.substrates.windows) return r;
        return { ...r, substrates: { ...r.substrates, windows: { ...r.substrates.windows, items: r.substrates.windows.items.filter(w => w.id !== payload.winId) } } };
      });
    }
    case 'SET_WINDOW': {
      return mapRoom(payload.roomId, r => {
        if (!r.substrates.windows) return r;
        return { ...r, substrates: { ...r.substrates, windows: { ...r.substrates.windows, items: r.substrates.windows.items.map(w => w.id === payload.winId ? { ...w, [payload.field]: payload.value } : w) } } };
      });
    }

    // v0.7: Openings — structural wall holes
    case 'ADD_OPENING': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        return { ...r, openings: [...(r.openings||[]), createOpening()] };
      });
    }
    case 'REMOVE_OPENING': {
      return mapRoom(payload.roomId, r => {
        return { ...r, openings: (r.openings||[]).filter(o => o.id !== payload.openingId) };
      });
    }
    case 'SET_OPENING': {
      return mapRoom(payload.roomId, r => {
        return { ...r, openings: (r.openings||[]).map(o => o.id === payload.openingId ? { ...o, [payload.field]: payload.value } : o) };
      });
    }

    // Extra walls — partitions, shower walls, nooks
    case 'ADD_EXTRA_WALL': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: [...(r.extra_walls || []), { id: genId('xw'), label: '', length_ft: 0, height_ft: 0, both_sides: false }] };
      });
    }
    case 'REMOVE_EXTRA_WALL': {
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: (r.extra_walls || []).filter(w => w.id !== payload.wallId) };
      });
    }
    case 'SET_EXTRA_WALL': {
      return mapRoom(payload.roomId, r => {
        return { ...r, extra_walls: (r.extra_walls || []).map(w => w.id === payload.wallId ? { ...w, [payload.field]: payload.value } : w) };
      });
    }

    // Wall deductions — cabinets, tile, built-ins covering wall area
    case 'ADD_WALL_DEDUCTION': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        return { ...r, wall_deductions: [...(r.wall_deductions || []), { id: genId('wd'), label: '', length_ft: 0, height_ft: 0, both_sides: false }] };
      });
    }
    case 'REMOVE_WALL_DEDUCTION': {
      return mapRoom(payload.roomId, r => {
        return { ...r, wall_deductions: (r.wall_deductions || []).filter(w => w.id !== payload.wallId) };
      });
    }
    case 'SET_WALL_DEDUCTION': {
      return mapRoom(payload.roomId, r => {
        return { ...r, wall_deductions: (r.wall_deductions || []).map(w => w.id === payload.wallId ? { ...w, [payload.field]: payload.value } : w) };
      });
    }

    // Closets — sub-rooms with own dimensions, inherited substrates
    case 'ADD_CLOSET': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        return { ...r, closets: [...(r.closets || []), createCloset()] };
      });
    }
    case 'REMOVE_CLOSET': {
      return mapRoom(payload.roomId, r => {
        return { ...r, closets: (r.closets || []).filter(c => c.id !== payload.closetId) };
      });
    }
    case 'SET_CLOSET': {
      return mapRoom(payload.roomId, r => {
        return {
          ...r,
          closets: (r.closets || []).map(c =>
            c.id === payload.closetId ? { ...c, [payload.field]: payload.value } : c
          )
        };
      });
    }
    case 'SET_CLOSET_SUBSTRATE': {
      const { roomId, closetId, substrateId, field, value } = payload;
      return mapRoom(roomId, r => {
        return {
          ...r,
          closets: (r.closets || []).map(c => {
            if (c.id !== closetId) return c;
            const overrides = { ...c.substrate_overrides };
            if (!overrides[substrateId]) overrides[substrateId] = {};
            overrides[substrateId] = { ...overrides[substrateId], [field]: value };
            return { ...c, substrate_overrides: overrides };
          })
        };
      });
    }
    case 'RESET_CLOSET_SUBSTRATE': {
      const { roomId, closetId, substrateId } = payload;
      return mapRoom(roomId, r => {
        return {
          ...r,
          closets: (r.closets || []).map(c => {
            if (c.id !== closetId) return c;
            const overrides = { ...c.substrate_overrides };
            delete overrides[substrateId];
            return { ...c, substrate_overrides: overrides };
          })
        };
      });
    }

    // v0.5: Fixture toggle on/off
    case 'TOGGLE_FIXTURE': {
      const { roomId, fixtureId } = payload;
      return mapRoom(roomId, r => {
        const fixtures = { ...r.fixtures };
        if (fixtures[fixtureId]) {
          delete fixtures[fixtureId];
        } else {
          const cat = FIXTURE_MAP[fixtureId];
          if (fixtureId === 'cabinets') {
            fixtures[fixtureId] = { protection: 'full', layout: 'lower_upper', linear_ft: 0, upper_height_ft: 2.5, notes: '' };
          } else if (fixtureId === 'feature_wall') {
            fixtures[fixtureId] = { items: [{ id: genId('fw'), length_ft: 0, height_ft: 0, protection: 'encapsulate', deduct_baseboard: false, notes: '' }] };
          } else {
            fixtures[fixtureId] = { protection: cat ? cat.defaultProtection : 'partial', count: 1, size: '', notes: '' };
          }
        }
        return { ...r, fixtures };
      });
    }

    // v0.5: Set a field within a specific fixture config
    case 'SET_FIXTURE': {
      const { roomId, fixtureId, field, value } = payload;
      return mapRoom(roomId, r => {
        if (!r.fixtures[fixtureId]) return r;
        return { ...r, fixtures: { ...r.fixtures, [fixtureId]: { ...r.fixtures[fixtureId], [field]: value } } };
      });
    }

    case 'ADD_FEATURE_WALL': {
      bumpNextIdFromState(state);
      return mapRoom(payload.roomId, r => {
        const fw = r.fixtures?.feature_wall;
        // Migrate legacy format (single config without items array)
        const existing = fw?.items ? fw.items
          : (fw && fw.length_ft ? [{ id: genId('fw'), length_ft: fw.length_ft, height_ft: fw.height_ft, protection: fw.protection || 'encapsulate', deduct_baseboard: fw.deduct_baseboard || false, notes: fw.notes || '' }] : []);
        const newItem = { id: genId('fw'), length_ft: 0, height_ft: 0, protection: 'encapsulate', deduct_baseboard: false, notes: '' };
        return { ...r, fixtures: { ...r.fixtures, feature_wall: { items: [...existing, newItem] } } };
      });
    }
    case 'REMOVE_FEATURE_WALL': {
      return mapRoom(payload.roomId, r => {
        if (!r.fixtures?.feature_wall) return r;
        const items = (r.fixtures.feature_wall.items || []).filter(i => i.id !== payload.itemId);
        if (items.length === 0) {
          const fixtures = { ...r.fixtures };
          delete fixtures.feature_wall;
          return { ...r, fixtures };
        }
        return { ...r, fixtures: { ...r.fixtures, feature_wall: { items } } };
      });
    }
    case 'SET_FEATURE_WALL': {
      const { roomId, itemId, field, value } = payload;
      return mapRoom(roomId, r => {
        if (!r.fixtures?.feature_wall?.items) return r;
        const items = r.fixtures.feature_wall.items.map(i => i.id === itemId ? { ...i, [field]: value } : i);
        return { ...r, fixtures: { ...r.fixtures, feature_wall: { ...r.fixtures.feature_wall, items } } };
      });
    }

    // W-16 Phase 2: per-room light-fixture items (recessed + ceiling fan +
    // bulb + transparent glass + other) with per-type protection, action
    // mode (mask vs remove), count, and optional time-min overrides.
    case 'ADD_LIGHT_FIXTURE_ITEM': {
      bumpNextIdFromState(state);
      const { roomId, type } = payload;
      return mapRoom(roomId, r => {
        const lf = r.fixtures?.light_fixtures || {};
        const items = Array.isArray(lf.items) ? lf.items : [];
        return { ...r, fixtures: { ...r.fixtures, light_fixtures: { ...lf, items: [...items, createLightFixtureItem(type || 'other')] } } };
      });
    }
    case 'REMOVE_LIGHT_FIXTURE_ITEM': {
      const { roomId, itemId } = payload;
      return mapRoom(roomId, r => {
        if (!r.fixtures?.light_fixtures?.items) return r;
        const items = r.fixtures.light_fixtures.items.filter(i => i.id !== itemId);
        return { ...r, fixtures: { ...r.fixtures, light_fixtures: { ...r.fixtures.light_fixtures, items } } };
      });
    }
    case 'SET_LIGHT_FIXTURE_ITEM': {
      const { roomId, itemId, field, value } = payload;
      return mapRoom(roomId, r => {
        if (!r.fixtures?.light_fixtures?.items) return r;
        const items = r.fixtures.light_fixtures.items.map(i => {
          if (i.id !== itemId) return i;
          const next = { ...i, [field]: value };
          // When the user switches the type, reseed defaults from the new
          // taxonomy entry (but only for fields the user hasn't already
          // overridden away from the previous type's defaults).
          if (field === 'type') {
            const tx = LIGHT_FIXTURE_TYPE_MAP[value];
            if (tx) {
              if (tx.default_protection && !i.protection_override_by_user) next.protection = tx.default_protection;
              // If the new type doesn't allow remove mode, force mask
              if (tx.allow_remove === false) next.action_mode = 'mask';
              // Reset custom_label to '' for is_custom types, null otherwise
              next.custom_label = tx.is_custom ? (i.custom_label || '') : null;
            }
          }
          return next;
        });
        return { ...r, fixtures: { ...r.fixtures, light_fixtures: { ...r.fixtures.light_fixtures, items } } };
      });
    }

    // Photo analysis — apply scoped detections to an existing room
    case 'APPLY_PHOTO_ANALYSIS': {
      const { roomId, patch, analysisResult } = payload;
      return mapRoom(roomId, r => {
        const updated = { ...r };
        // Save raw analysis result so the review panel can be re-opened
        if (analysisResult) updated.photoAnalysis = analysisResult;
        // Merge room-level scalar fields (label, dimensions, complexity, etc.)
        const { substrates: newSubs, openings: newOpenings, fixtures: newFixtures, ...roomFields } = patch;
        Object.assign(updated, roomFields);

        // Merge substrates — photo detections override existing
        if (newSubs) {
          const merged = { ...r.substrates };
          for (const [id, config] of Object.entries(newSubs)) {
            if (id === 'doors' || id === 'windows') {
              // For doors/windows, merge items into existing
              const existing = merged[id] || createSubstrateConfig(id);
              const existingItems = existing.items || [];
              const newItems = config.items || [];
              merged[id] = { ...existing, ...config, items: [...existingItems, ...newItems], painting: true };
            } else if (id === 'door_casing' || id === 'window_casing') {
              merged[id] = { ...(merged[id] || createSubstrateConfig(id)), ...config, painting: true };
            } else {
              merged[id] = config;
            }
          }
          updated.substrates = merged;
        }

        // Merge openings
        if (newOpenings && newOpenings.length > 0) {
          updated.openings = [...(r.openings || []), ...newOpenings];
        }

        // Merge fixtures
        if (newFixtures) {
          updated.fixtures = { ...r.fixtures, ...newFixtures };
        }

        return updated;
      });
    }

    // Photo analysis — create a new room pre-populated from photo analysis
    case 'CREATE_ROOM_FROM_PHOTO': {
      const room = createRoom();
      const { substrates: newSubs, openings: newOpenings, fixtures: newFixtures, ...roomFields } = payload.patch;
      Object.assign(room, roomFields);

      if (newSubs) {
        for (const [id, config] of Object.entries(newSubs)) {
          if (id === 'doors' || id === 'windows') {
            room.substrates[id] = { ...room.substrates[id], ...config, painting: true };
          } else if (id === 'door_casing' || id === 'window_casing') {
            room.substrates[id] = { ...room.substrates[id], ...config, painting: true };
          } else {
            room.substrates[id] = config;
          }
        }
      }
      if (newOpenings) room.openings = newOpenings;
      if (newFixtures) room.fixtures = newFixtures;
      // Save raw analysis result so the review panel can be re-opened
      if (payload.analysisResult) room.photoAnalysis = payload.analysisResult;

      return { ...state, rooms: [...state.rooms, room], ui: { ...state.ui, activeRoomId: room.id, view: 'editor' } };
    }

    // ============================================================
    // EXTERIOR — Elevation CRUD
    // ============================================================
    case 'ADD_ELEVATION': {
      const elev = createElevation(payload || {});
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: [...state.exterior.elevations, elev]
        },
        ui: { ...state.ui, activeElevationId: elev.id, scopeMode: 'exterior', view: 'scope' }
      };
    }
    case 'REMOVE_ELEVATION': {
      const elevs = state.exterior.elevations.filter(e => e.id !== payload);
      const activeId = state.ui.activeElevationId === payload ? (elevs[0]?.id || null) : state.ui.activeElevationId;
      const elevation_overrides = { ...state.colors.elevation_overrides };
      delete elevation_overrides[payload];
      return {
        ...state,
        exterior: { ...state.exterior, elevations: elevs },
        ui: { ...state.ui, activeElevationId: activeId, scopeMode: elevs.length > 0 ? 'exterior' : state.ui.scopeMode },
        colors: { ...state.colors, elevation_overrides }
      };
    }
    case 'DUPLICATE_ELEVATION': {
      const src = state.exterior.elevations.find(e => e.id === payload);
      if (!src) return state;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = genId('elev');
      copy.label = src.label + ' (copy)';
      // Re-stamp IDs on child objects
      copy.siding_sections.forEach(s => s.id = genId('sid'));
      copy.windows.forEach(w => w.id = genId('xwin'));
      copy.doors.forEach(d => d.id = genId('xdoor'));
      copy.bump_outs.forEach(b => b.id = genId('bump'));
      copy.dormers.forEach(d => d.id = genId('dorm'));
      copy.gables.forEach(g => g.id = genId('gable'));
      const idx = state.exterior.elevations.findIndex(e => e.id === payload);
      const elevs = [...state.exterior.elevations];
      elevs.splice(idx + 1, 0, copy);
      return {
        ...state,
        exterior: { ...state.exterior, elevations: elevs },
        ui: { ...state.ui, activeElevationId: copy.id }
      };
    }
    case 'SET_ELEVATION': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId ? { ...e, [payload.field]: payload.value } : e
          )
        }
      };
    }
    case 'SET_ACTIVE_ELEVATION': {
      return { ...state, ui: { ...state.ui, activeElevationId: payload, scopeMode: 'exterior' } };
    }

    // ── Siding Sections ──
    case 'ADD_SIDING_SECTION': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, siding_sections: [...e.siding_sections, createSidingSection(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_SIDING_SECTION': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, siding_sections: e.siding_sections.filter(s => s.id !== payload.sectionId) }
              : e
          )
        }
      };
    }
    case 'SET_SIDING_SECTION': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? {
                  ...e,
                  siding_sections: e.siding_sections.map(s =>
                    s.id === payload.sectionId ? { ...s, [payload.field]: payload.value } : s
                  )
                }
              : e
          )
        }
      };
    }

    // ── Trim Types ──
    case 'TOGGLE_TRIM_TYPE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e => {
            if (e.id !== payload.elevId) return e;
            const trim = { ...e.trim };
            if (trim[payload.trimType]) {
              delete trim[payload.trimType];
            } else {
              trim[payload.trimType] = createTrimConfig(payload.trimType);
            }
            return { ...e, trim };
          })
        }
      };
    }
    case 'SET_TRIM_TYPE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e => {
            if (e.id !== payload.elevId) return e;
            if (!e.trim[payload.trimType]) return e;
            return {
              ...e,
              trim: {
                ...e.trim,
                [payload.trimType]: { ...e.trim[payload.trimType], [payload.field]: payload.value }
              }
            };
          })
        }
      };
    }

    // ── Exterior Windows ──
    case 'ADD_EXT_WINDOW': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, windows: [...e.windows, createExtWindow(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_EXT_WINDOW': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, windows: e.windows.filter(w => w.id !== payload.winId) }
              : e
          )
        }
      };
    }
    case 'SET_EXT_WINDOW': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, windows: e.windows.map(w => w.id === payload.winId ? { ...w, [payload.field]: payload.value } : w) }
              : e
          )
        }
      };
    }

    // ── Exterior Doors ──
    case 'ADD_EXT_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, doors: [...e.doors, createExtDoor(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_EXT_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, doors: e.doors.filter(d => d.id !== payload.doorId) }
              : e
          )
        }
      };
    }
    case 'SET_EXT_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, doors: e.doors.map(d => d.id === payload.doorId ? { ...d, [payload.field]: payload.value } : d) }
              : e
          )
        }
      };
    }

    // ── Sub-Elements (Bump-Outs, Dormers, Gables) ──
    case 'ADD_BUMP_OUT': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, bump_outs: [...e.bump_outs, createBumpOut(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_BUMP_OUT': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, bump_outs: e.bump_outs.filter(b => b.id !== payload.bumpId) }
              : e
          )
        }
      };
    }
    case 'SET_BUMP_OUT': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, bump_outs: e.bump_outs.map(b => b.id === payload.bumpId ? { ...b, [payload.field]: payload.value } : b) }
              : e
          )
        }
      };
    }
    case 'ADD_DORMER': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, dormers: [...e.dormers, createDormer(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_DORMER': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, dormers: e.dormers.filter(d => d.id !== payload.dormerId) }
              : e
          )
        }
      };
    }
    case 'SET_DORMER': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, dormers: e.dormers.map(d => d.id === payload.dormerId ? { ...d, [payload.field]: payload.value } : d) }
              : e
          )
        }
      };
    }
    case 'ADD_GABLE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, gables: [...e.gables, createGable(payload.overrides || {})] }
              : e
          )
        }
      };
    }
    case 'REMOVE_GABLE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, gables: e.gables.filter(g => g.id !== payload.gableId) }
              : e
          )
        }
      };
    }
    case 'SET_GABLE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          elevations: state.exterior.elevations.map(e =>
            e.id === payload.elevId
              ? { ...e, gables: e.gables.map(g => g.id === payload.gableId ? { ...g, [payload.field]: payload.value } : g) }
              : e
          )
        }
      };
    }

    // ============================================================
    // EXTERIOR — Standalone Items
    // ============================================================
    case 'ADD_GARAGE_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            garage_doors: [...state.exterior.standalone.garage_doors, createGarageDoor(payload || {})]
          }
        }
      };
    }
    case 'REMOVE_GARAGE_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            garage_doors: state.exterior.standalone.garage_doors.filter(g => g.id !== payload)
          }
        }
      };
    }
    case 'SET_GARAGE_DOOR': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            garage_doors: state.exterior.standalone.garage_doors.map(g =>
              g.id === payload.itemId ? { ...g, [payload.field]: payload.value } : g
            )
          }
        }
      };
    }
    case 'SET_STANDALONE': {
      // Generic setter for standalone items: foundation, deck, fence, porch
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            [payload.itemType]: { ...state.exterior.standalone[payload.itemType], [payload.field]: payload.value }
          }
        }
      };
    }
    case 'ADD_METAL_SURFACE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            metal_surfaces: [...state.exterior.standalone.metal_surfaces, createMetalSurface(payload || {})]
          }
        }
      };
    }
    case 'REMOVE_METAL_SURFACE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            metal_surfaces: state.exterior.standalone.metal_surfaces.filter(m => m.id !== payload)
          }
        }
      };
    }
    case 'SET_METAL_SURFACE': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            metal_surfaces: state.exterior.standalone.metal_surfaces.map(m =>
              m.id === payload.itemId ? { ...m, [payload.field]: payload.value } : m
            )
          }
        }
      };
    }

    // ── Porch sub-fields (floor/ceiling) ──
    case 'SET_PORCH': {
      const { section, field, value } = payload; // section = 'floor' | 'ceiling'
      return {
        ...state,
        exterior: {
          ...state.exterior,
          standalone: {
            ...state.exterior.standalone,
            porch: {
              ...state.exterior.standalone.porch,
              [section]: { ...state.exterior.standalone.porch[section], [field]: value }
            }
          }
        }
      };
    }

    // ============================================================
    // EXTERIOR — Site Conditions & Defaults
    // ============================================================
    case 'SET_SITE_CONDITION': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          site_conditions: { ...state.exterior.site_conditions, [payload.field]: payload.value }
        }
      };
    }
    case 'SET_EXTERIOR_DEFAULT': {
      return {
        ...state,
        exterior: {
          ...state.exterior,
          defaults: { ...state.exterior.defaults, [payload.field]: payload.value }
        }
      };
    }
    case 'SET_EXTERIOR_PROJECT_TYPE': {
      const newType = payload; // 'NC' | 'RP'
      const defaultState = newType === 'RP' ? 'sound_paint' : 'factory_primed';
      const defaultTrimState = newType === 'RP' ? 'sound_paint' : 'bare_wood';
      const defaultCondition = newType === 'RP' ? 'GOOD' : null;
      return {
        ...state,
        exterior: {
          ...state.exterior,
          project_type: newType,
          defaults: {
            ...state.exterior.defaults,
            siding_substrate_state: defaultState,
            trim_substrate_state: defaultTrimState,
            condition_scale: defaultCondition,
          }
        }
      };
    }

    case 'IMPORT_PROJECT': {
      return payload;
    }

    // ── Color Management ──────────────────────────────────
    case 'SET_COLOR_DEFAULT': {
      const { group, data } = payload;
      return { ...state, colors: { ...state.colors,
        defaults: { ...state.colors.defaults, [group]: { ...(state.colors.defaults[group] || {}), ...data } }
      }};
    }
    case 'REMOVE_COLOR_DEFAULT': {
      const { group } = payload;
      const defaults = { ...state.colors.defaults };
      delete defaults[group];
      return { ...state, colors: { ...state.colors, defaults } };
    }
    case 'SET_COLOR_SUBSTRATE_OVERRIDE': {
      const { substrate, data } = payload;
      return { ...state, colors: { ...state.colors,
        substrate_overrides: { ...state.colors.substrate_overrides, [substrate]: { ...(state.colors.substrate_overrides[substrate] || {}), ...data } }
      }};
    }
    case 'REMOVE_COLOR_SUBSTRATE_OVERRIDE': {
      const { substrate } = payload;
      const substrate_overrides = { ...state.colors.substrate_overrides };
      delete substrate_overrides[substrate];
      return { ...state, colors: { ...state.colors, substrate_overrides } };
    }
    case 'SET_COLOR_ROOM_OVERRIDE': {
      const { roomId, substrate, data } = payload;
      const roomOvr = state.colors.room_overrides[roomId] || {};
      return { ...state, colors: { ...state.colors,
        room_overrides: { ...state.colors.room_overrides, [roomId]: { ...roomOvr, [substrate]: { ...(roomOvr[substrate] || {}), ...data } } }
      }};
    }
    case 'REMOVE_COLOR_ROOM_OVERRIDE': {
      const { roomId, substrate } = payload;
      const roomOvr = { ...(state.colors.room_overrides[roomId] || {}) };
      delete roomOvr[substrate];
      const room_overrides = { ...state.colors.room_overrides };
      if (Object.keys(roomOvr).length === 0) delete room_overrides[roomId];
      else room_overrides[roomId] = roomOvr;
      return { ...state, colors: { ...state.colors, room_overrides } };
    }
    case 'SET_COLOR_ELEVATION_OVERRIDE': {
      const { elevId, substrate, data } = payload;
      const elevOvr = state.colors.elevation_overrides[elevId] || {};
      return { ...state, colors: { ...state.colors,
        elevation_overrides: { ...state.colors.elevation_overrides, [elevId]: { ...elevOvr, [substrate]: { ...(elevOvr[substrate] || {}), ...data } } }
      }};
    }
    case 'REMOVE_COLOR_ELEVATION_OVERRIDE': {
      const { elevId, substrate } = payload;
      const elevOvr = { ...(state.colors.elevation_overrides[elevId] || {}) };
      delete elevOvr[substrate];
      const elevation_overrides = { ...state.colors.elevation_overrides };
      if (Object.keys(elevOvr).length === 0) delete elevation_overrides[elevId];
      else elevation_overrides[elevId] = elevOvr;
      return { ...state, colors: { ...state.colors, elevation_overrides } };
    }
    case 'SET_COLOR_ROOM_GROUP_OVERRIDE': {
      const { roomId, group, data } = payload;
      const roomGrp = state.colors.room_group_overrides?.[roomId] || {};
      return { ...state, colors: { ...state.colors,
        room_group_overrides: { ...state.colors.room_group_overrides, [roomId]: { ...roomGrp, [group]: { ...(roomGrp[group] || {}), ...data } } }
      }};
    }
    case 'REMOVE_COLOR_ROOM_GROUP_OVERRIDE': {
      const { roomId, group } = payload;
      const roomGrp = { ...(state.colors.room_group_overrides?.[roomId] || {}) };
      delete roomGrp[group];
      const room_group_overrides = { ...state.colors.room_group_overrides };
      if (Object.keys(roomGrp).length === 0) delete room_group_overrides[roomId];
      else room_group_overrides[roomId] = roomGrp;
      return { ...state, colors: { ...state.colors, room_group_overrides } };
    }
    case 'SET_COLOR_ELEVATION_GROUP_OVERRIDE': {
      const { elevId, group, data } = payload;
      const elevGrp = state.colors.elevation_group_overrides?.[elevId] || {};
      return { ...state, colors: { ...state.colors,
        elevation_group_overrides: { ...state.colors.elevation_group_overrides, [elevId]: { ...elevGrp, [group]: { ...(elevGrp[group] || {}), ...data } } }
      }};
    }
    case 'REMOVE_COLOR_ELEVATION_GROUP_OVERRIDE': {
      const { elevId, group } = payload;
      const elevGrp = { ...(state.colors.elevation_group_overrides?.[elevId] || {}) };
      delete elevGrp[group];
      const elevation_group_overrides = { ...state.colors.elevation_group_overrides };
      if (Object.keys(elevGrp).length === 0) delete elevation_group_overrides[elevId];
      else elevation_group_overrides[elevId] = elevGrp;
      return { ...state, colors: { ...state.colors, elevation_group_overrides } };
    }
    case 'SET_COLOR_PROJECT_NOTES': {
      return { ...state, colors: { ...state.colors, project_notes: payload.notes } };
    }
    case 'SET_COLOR_ROOM_NOTES': {
      const { roomId, notes } = payload;
      return { ...state, colors: { ...state.colors, room_notes: { ...state.colors.room_notes, [roomId]: notes } } };
    }

    default: return state;
  }
}
