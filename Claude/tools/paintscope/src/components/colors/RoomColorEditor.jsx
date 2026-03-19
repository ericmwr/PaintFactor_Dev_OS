import React, { useState } from 'react';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog.js';
import { getColorGroup } from '../../state/color-state.js';
import ColorEntryForm from './ColorEntryForm.jsx';

export default function RoomColorEditor({ state, schedule, dispatch }) {
  const { rooms, exterior, colors } = state;
  const elevations = exterior?.elevations || [];

  const [selectedType, setSelectedType] = useState(rooms.length > 0 ? 'room' : 'elevation');
  const [selectedId, setSelectedId] = useState(rooms[0]?.id || elevations[0]?.id || null);
  const [editingSub, setEditingSub] = useState(null);

  const isRoom = selectedType === 'room';
  const selectedItem = isRoom
    ? rooms.find(r => r.id === selectedId)
    : elevations.find(e => e.id === selectedId);

  const getActiveSubstrates = () => {
    if (!selectedItem) return [];
    if (isRoom) {
      return Object.keys(selectedItem.substrates || {}).filter(subId => {
        const sub = selectedItem.substrates[subId];
        return sub.painting !== false;
      });
    }
    const subs = [];
    if (selectedItem.siding_sections?.length > 0) subs.push('siding');
    if (selectedItem.trim) {
      for (const [type, config] of Object.entries(selectedItem.trim)) {
        if (config.enabled) subs.push(type);
      }
    }
    if (selectedItem.windows?.length > 0) subs.push('ext_windows');
    if (selectedItem.doors?.length > 0) subs.push('ext_doors');
    return subs;
  };

  const activeSubstrates = getActiveSubstrates();
  const resolvedColors = isRoom
    ? schedule.rooms[selectedId] || {}
    : schedule.elevations[selectedId] || {};

  const getSubstrateLabel = (subId) => {
    const cat = SUBSTRATE_MAP[subId];
    return cat ? cat.label : subId.replace(/_/g, ' ');
  };

  const getInherited = (subId) => {
    const group = getColorGroup(subId);
    const subOvr = colors.substrate_overrides?.[subId];
    const groupDef = group ? colors.defaults?.[group] : null;
    return { ...groupDef, ...subOvr };
  };

  const handleSaveOverride = (subId, data) => {
    const actionType = isRoom ? 'SET_COLOR_ROOM_OVERRIDE' : 'SET_COLOR_ELEVATION_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, substrate: subId, data } });
    setEditingSub(null);
  };

  const handleRemoveOverride = (subId) => {
    const actionType = isRoom ? 'REMOVE_COLOR_ROOM_OVERRIDE' : 'REMOVE_COLOR_ELEVATION_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, substrate: subId } });
    setEditingSub(null);
  };

  const getSourceBadge = (resolved) => {
    if (!resolved) return { label: 'none', style: { color: 'var(--text-muted)' } };
    if (resolved.source === 'room' || resolved.source === 'elevation')
      return { label: 'override', style: { background: '#2a5a4a', padding: '1px 5px', borderRadius: 3, color: '#8fc', fontSize: 9 } };
    if (resolved.source === 'substrate')
      return { label: 'project', style: { background: '#4a3a2a', padding: '1px 5px', borderRadius: 3, color: '#dab', fontSize: 9 } };
    return { label: 'inherited', style: { color: 'var(--text-muted)', fontSize: 9, fontStyle: 'italic' } };
  };

  const sidebarItemStyle = (id, type) => ({
    padding: '5px 8px', borderRadius: 4, marginBottom: 3, fontSize: 11, cursor: 'pointer',
    background: selectedId === id && selectedType === type ? 'var(--bg-active)' : 'transparent',
    color: selectedId === id && selectedType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
    border: selectedId === id && selectedType === type ? '1px solid var(--accent)' : '1px solid transparent',
  });

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{ width: 120, borderRight: '1px solid var(--border)', padding: 8, background: 'var(--bg-deep)', overflowY: 'auto' }}>
        {rooms.length > 0 && (
          <>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Interior</div>
            {rooms.map(r => (
              <div key={r.id} style={sidebarItemStyle(r.id, 'room')}
                onClick={() => { setSelectedType('room'); setSelectedId(r.id); setEditingSub(null); }}>
                {r.label || r.id}
              </div>
            ))}
          </>
        )}
        {elevations.length > 0 && (
          <>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '10px 0 6px' }}>Exterior</div>
            {elevations.map(e => (
              <div key={e.id} style={sidebarItemStyle(e.id, 'elevation')}
                onClick={() => { setSelectedType('elevation'); setSelectedId(e.id); setEditingSub(null); }}>
                {e.label || e.id}
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
        {selectedItem ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedItem.label || selectedItem.id}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>click any row to override</span>
              </div>
            </div>

            {activeSubstrates.map(subId => {
              const resolved = resolvedColors[subId];
              const badge = getSourceBadge(resolved);
              const isEditing = editingSub === subId;
              const isOverride = resolved?.source === 'room' || resolved?.source === 'elevation';

              return (
                <div key={subId}>
                  <div onClick={() => setEditingSub(isEditing ? null : subId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 4, marginBottom: 4, cursor: 'pointer',
                      background: isOverride ? 'var(--bg-override)' : 'var(--bg-panel)',
                      border: isOverride ? '1px solid var(--accent)' : '1px solid transparent',
                    }}>
                    <span style={{ width: 70, fontSize: 11, color: isOverride ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isOverride ? 600 : 400 }}>
                      {getSubstrateLabel(subId)}
                    </span>
                    {resolved ? (
                      <>
                        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
                        <span style={{ fontSize: 11, color: isOverride ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {resolved.color_code} {resolved.color_name}
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          · {resolved.product || '—'} · {resolved.sheen || '—'}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No color assigned</span>
                    )}
                    <span style={{ flex: 1 }} />
                    <span style={badge.style}>{badge.label}</span>
                  </div>

                  {isEditing && (
                    <div style={{ marginLeft: 16, marginBottom: 8, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
                      <ColorEntryForm
                        initial={resolved || {}}
                        inherited={getInherited(subId)}
                        onSave={(data) => handleSaveOverride(subId, data)}
                        onCancel={() => setEditingSub(null)} />
                      {isOverride && (
                        <button onClick={() => handleRemoveOverride(subId)}
                          style={{ marginTop: 6, fontSize: 10, background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }}>
                          Remove override (revert to inherited)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {activeSubstrates.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                No active substrates in this {isRoom ? 'room' : 'elevation'}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12 }}>
            Select a room or elevation from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
