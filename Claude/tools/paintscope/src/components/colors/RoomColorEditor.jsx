import React, { useState, useMemo } from 'react';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog.js';
import { getColorGroup, COLOR_GROUP_LABELS } from '../../state/color-state.js';
import ColorEntryForm from './ColorEntryForm.jsx';

export default function RoomColorEditor({ state, schedule, dispatch }) {
  const { rooms, exterior, colors } = state;
  const elevations = exterior?.elevations || [];

  const [selectedType, setSelectedType] = useState(rooms.length > 0 ? 'room' : 'elevation');
  const [selectedId, setSelectedId] = useState(rooms[0]?.id || elevations[0]?.id || null);
  const [editingSub, setEditingSub] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

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
    const locGroupOvr = isRoom
      ? colors.room_group_overrides?.[selectedId]?.[group]
      : colors.elevation_group_overrides?.[selectedId]?.[group];
    return { ...groupDef, ...subOvr, ...locGroupOvr };
  };

  const getGroupInherited = (group) => {
    return colors.defaults?.[group] || {};
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

  const handleSaveGroupOverride = (group, data) => {
    const actionType = isRoom ? 'SET_COLOR_ROOM_GROUP_OVERRIDE' : 'SET_COLOR_ELEVATION_GROUP_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, group, data } });
    setEditingGroup(null);
  };

  const handleRemoveGroupOverride = (group) => {
    const actionType = isRoom ? 'REMOVE_COLOR_ROOM_GROUP_OVERRIDE' : 'REMOVE_COLOR_ELEVATION_GROUP_OVERRIDE';
    const idKey = isRoom ? 'roomId' : 'elevId';
    dispatch({ type: actionType, payload: { [idKey]: selectedId, group } });
    setEditingGroup(null);
  };

  // Group active substrates by color group for display
  const groupedSubstrates = useMemo(() => {
    const groups = new Map();
    for (const subId of activeSubstrates) {
      const group = getColorGroup(subId) || '_ungrouped';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(subId);
    }
    return groups;
  }, [activeSubstrates]);

  const getGroupOverride = (group) => {
    return isRoom
      ? colors.room_group_overrides?.[selectedId]?.[group]
      : colors.elevation_group_overrides?.[selectedId]?.[group];
  };

  const renderColorInfo = (data, highlight) => {
    if (!data) return null;
    const ct = data.coating_type;
    const textColor = highlight ? 'var(--text-primary)' : 'var(--text-secondary)';
    const mutedColor = 'var(--text-muted)';

    if (ct === 'stain' || ct === 'stain_clear' || ct === 'clear') {
      return (
        <>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#8b6914', border: '1px solid var(--border)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: textColor }}>
            {ct === 'clear' ? (data.clear_product || 'Clear Coat') : (data.stain_color || data.color_code || '—')}
          </span>
          <span style={{ fontSize: 9, color: mutedColor }}>
            {ct === 'stain' && `· ${data.stain_product || '—'} · stain`}
            {ct === 'clear' && `· ${data.clear_sheen || '—'} · clear`}
            {ct === 'stain_clear' && `· ${data.stain_product || '—'} + ${data.clear_product || 'clear'} · ${data.clear_sheen || '—'}`}
          </span>
        </>
      );
    }

    return (
      <>
        <span style={{ display: 'inline-block', width: 12, height: 12, background: '#ccc', border: '1px solid var(--border)', borderRadius: 2 }} />
        <span style={{ fontSize: 11, color: textColor }}>
          {data.color_code} {data.color_name}
        </span>
        <span style={{ fontSize: 9, color: mutedColor }}>
          · {data.product || '—'} · {data.sheen || '—'}
        </span>
      </>
    );
  };

  const getSourceBadge = (resolved) => {
    if (!resolved) return { label: 'none', style: { color: 'var(--text-muted)' } };
    if (resolved.source === 'room' || resolved.source === 'elevation')
      return { label: 'override', style: { background: '#2a5a4a', padding: '1px 5px', borderRadius: 3, color: '#8fc', fontSize: 9 } };
    if (resolved.source === 'room-group' || resolved.source === 'elev-group')
      return { label: 'room group', style: { background: '#2a4a5a', padding: '1px 5px', borderRadius: 3, color: '#8cf', fontSize: 9 } };
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedItem.label || selectedItem.id}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>click any row to override</span>
              </div>
            </div>

            {[...groupedSubstrates.entries()].map(([group, substrates]) => {
              const groupLabel = COLOR_GROUP_LABELS[group] || group;
              const groupOvr = getGroupOverride(group);
              const hasGroupOvr = !!groupOvr?.color_code;
              const showGroupRow = substrates.length > 1;

              return (
                <div key={group} style={{ marginBottom: 8 }}>
                  {showGroupRow && (
                    <>
                      <div onClick={() => { setEditingGroup(editingGroup === group ? null : group); setEditingSub(null); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 4, marginBottom: 2, cursor: 'pointer',
                          background: hasGroupOvr ? 'var(--bg-override)' : 'var(--bg-deep)',
                          border: hasGroupOvr ? '1px solid var(--accent)' : '1px solid var(--border)',
                        }}>
                        <span style={{ width: 70, fontSize: 11, fontWeight: 600, color: hasGroupOvr ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {groupLabel}
                        </span>
                        {hasGroupOvr ? (
                          <>{renderColorInfo(groupOvr, true)}</>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>click to set room {groupLabel.toLowerCase()} color</span>
                        )}
                        <span style={{ flex: 1 }} />
                        {hasGroupOvr && (
                          <span style={{ background: '#2a4a5a', padding: '1px 5px', borderRadius: 3, color: '#8cf', fontSize: 9 }}>room group</span>
                        )}
                      </div>
                      {editingGroup === group && (
                        <div style={{ marginLeft: 16, marginBottom: 8, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
                          <ColorEntryForm
                            initial={groupOvr || {}}
                            inherited={getGroupInherited(group)}
                            onSave={(data) => handleSaveGroupOverride(group, data)}
                            onCancel={() => setEditingGroup(null)} />
                          {hasGroupOvr && (
                            <button onClick={() => handleRemoveGroupOverride(group)}
                              style={{ marginTop: 6, fontSize: 10, background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }}>
                              Remove room {groupLabel.toLowerCase()} override
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {substrates.map(subId => {
                    const resolved = resolvedColors[subId];
                    const badge = getSourceBadge(resolved);
                    const isEditing = editingSub === subId;
                    const isOverride = resolved?.source === 'room' || resolved?.source === 'elevation';

                    return (
                      <div key={subId}>
                        <div onClick={() => { setEditingSub(isEditing ? null : subId); setEditingGroup(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 4, marginBottom: 4, cursor: 'pointer',
                            marginLeft: showGroupRow ? 12 : 0,
                            background: isOverride ? 'var(--bg-override)' : 'var(--bg-panel)',
                            border: isOverride ? '1px solid var(--accent)' : '1px solid transparent',
                          }}>
                          <span style={{ width: 70, fontSize: 11, color: isOverride ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isOverride ? 600 : 400 }}>
                            {getSubstrateLabel(subId)}
                          </span>
                          {resolved ? (
                            <>{renderColorInfo(resolved, isOverride)}</>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No color assigned</span>
                          )}
                          <span style={{ flex: 1 }} />
                          <span style={badge.style}>{badge.label}</span>
                        </div>

                        {isEditing && (
                          <div style={{ marginLeft: showGroupRow ? 28 : 16, marginBottom: 8, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
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
                </div>
              );
            })}

            {activeSubstrates.length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                No active substrates in this {isRoom ? 'room' : 'elevation'}
              </div>
            )}

            {isRoom && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Room Color Notes</div>
                <textarea
                  value={colors.room_notes?.[selectedId] || ''}
                  onChange={e => dispatch({ type: 'SET_COLOR_ROOM_NOTES', payload: { roomId: selectedId, notes: e.target.value } })}
                  placeholder={`Color notes for ${selectedItem.label || selectedItem.id}...`}
                  style={{ width: '100%', minHeight: 36, padding: '5px 8px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, resize: 'vertical', fontFamily: 'inherit' }} />
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
