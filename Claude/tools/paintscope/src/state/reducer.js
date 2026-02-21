import { createRoom, createDoor, createWindow, createOpening, createCloset, createSubstrateConfig, genId } from './initial-state';
import { FIXTURE_MAP } from '../data/fixture-catalog';

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
    case 'SET_ACTIVE_ROOM': return { ...state, ui: { ...state.ui, activeRoomId: payload } };
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
      return { ...state, rooms:[...state.rooms, room], ui:{...state.ui, activeRoomId:room.id, activeTab:'scope', view:'editor'} };
    }
    case 'REMOVE_ROOM': {
      const rooms = state.rooms.filter(r => r.id !== payload);
      const activeId = state.ui.activeRoomId === payload ? (rooms[0]?.id || null) : state.ui.activeRoomId;
      return { ...state, rooms, ui:{...state.ui, activeRoomId:activeId} };
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
        return {
          ...r,
          substrates: {
            ...r.substrates,
            [substrateId]: { ...r.substrates[substrateId], [field]: value }
          }
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
            fixtures[fixtureId] = { protection: 'heavy_mask', layout: 'lower_upper', linear_ft: 0, upper_height_ft: 2.5, notes: '' };
          } else {
            fixtures[fixtureId] = { protection: cat ? cat.defaultProtection : 'medium_mask', count: 1, size: '', notes: '' };
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

    // Photo analysis — apply accepted detections to an existing room
    case 'APPLY_PHOTO_ANALYSIS': {
      const { roomId, patch } = payload;
      return mapRoom(roomId, r => {
        const updated = { ...r };
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

      return { ...state, rooms: [...state.rooms, room], ui: { ...state.ui, activeRoomId: room.id, view: 'editor' } };
    }

    case 'IMPORT_PROJECT': {
      return payload;
    }
    default: return state;
  }
}
