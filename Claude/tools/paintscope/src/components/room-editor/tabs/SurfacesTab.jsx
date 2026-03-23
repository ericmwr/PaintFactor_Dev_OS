import { useMemo } from 'react';
import SubstrateDetailPanel from '../SubstrateDetailPanel';
import { SUBSTRATE_MAP, SUBSTRATE_GROUPS } from '../../../data/substrate-catalog';

const openingIds = new Set(['doors', 'windows', 'door_casing', 'window_casing', 'door_frames', 'window_jamb']);

export default function SurfacesTab({ room, derived, dispatch, project, focusedSubstrate, setFocusedSubstrate }) {
  const rid = room.id;
  const subs = room.substrates || {};

  const items = useMemo(() => {
    const group = SUBSTRATE_GROUPS.find(g => g.group === 'Surfaces');
    if (!group) return [];
    return group.items.filter(c => !openingIds.has(c.id));
  }, []);

  const handleToggle = (catId) => {
    const isChecked = !!subs[catId];
    dispatch({ type: 'TOGGLE_SUBSTRATE', payload: { roomId: rid, substrateId: catId } });
    if (!isChecked) {
      setFocusedSubstrate(catId);
    } else if (focusedSubstrate === catId) {
      setFocusedSubstrate(null);
    }
  };

  const handleItemClick = (catId) => {
    if (subs[catId]) setFocusedSubstrate(catId);
  };

  return (
    <div className="master-detail-container">
      <div className="master-list">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
          {items.map(cat => {
            const checked = !!subs[cat.id];
            const isFocused = focusedSubstrate === cat.id;
            return (
              <div key={cat.id} className={`substrate-item${isFocused ? ' focused' : ''}`}
                onClick={() => handleItemClick(cat.id)}>
                <input type="checkbox" checked={checked}
                  onChange={(e) => { e.stopPropagation(); handleToggle(cat.id); }}
                  onClick={(e) => e.stopPropagation()} />
                <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{cat.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="detail-panel">
        {focusedSubstrate && subs[focusedSubstrate] && SUBSTRATE_MAP[focusedSubstrate]?.group === 'Surfaces' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{SUBSTRATE_MAP[focusedSubstrate]?.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{SUBSTRATE_MAP[focusedSubstrate]?.group} &middot; {SUBSTRATE_MAP[focusedSubstrate]?.uom}</span>
              </div>
              <button onClick={() => setFocusedSubstrate(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
            </div>
            {/* Conflict warnings */}
            {focusedSubstrate === 'ceiling' && subs.wood_ceiling && (
              <div style={{ padding: '6px 10px', marginBottom: 8, background: '#4a3a1a', borderRadius: 4, fontSize: 11, color: '#f0c040' }}>
                <strong>Note:</strong> Wood Ceiling is also active in the Specialty tab. Both will generate separate ceiling estimates. If this is a wood ceiling, uncheck Ceiling here and configure it in Specialty instead.
              </div>
            )}
            {focusedSubstrate === 'ceiling' && !subs.wood_ceiling && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                For wood plank, beadboard, or coffered ceilings, use Wood Ceiling in the Specialty tab instead.
              </div>
            )}
            <SubstrateDetailPanel room={room} derived={derived} dispatch={dispatch} substrateId={focusedSubstrate} project={project} />
          </div>
        ) : (
          <div className="detail-panel-empty">Select an item to configure</div>
        )}
      </div>
    </div>
  );
}
