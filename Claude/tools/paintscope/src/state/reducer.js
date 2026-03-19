import { createRoom, createDoor, createWindow, createOpening, createCloset, createSubstrateConfig, genId } from './initial-state';
import { FIXTURE_MAP } from '../data/fixture-catalog';
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
    case 'ADD_ROOM': {
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
      return mapRoom(payload.roomId, r => ({ ...r, [payload.field]: payload.value }));
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

        return {
          ...r,
          substrates: { ...r.substrates, [substrateId]: updated }
        };
      });
    }

    // Doors — now operate on substrates.doors.items
    case 'ADD_DOOR': {
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

    // Closets — sub-rooms with own dimensions, inherited substrates
    case 'ADD_CLOSET': {
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
            fixtures[fixtureId] = { protection: 'full_cover', layout: 'lower_upper', linear_ft: 0, upper_height_ft: 2.5, notes: '' };
          } else {
            fixtures[fixtureId] = { protection: cat ? cat.defaultProtection : 'partial_cover', count: 1, size: '', notes: '' };
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

    default: return state;
  }
}
