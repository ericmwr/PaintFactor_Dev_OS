import { useState } from 'react';
import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';
import { EXT_SIDING_TYPES, EXT_SOFFIT_PROFILES } from '../../../state/exterior-state';

export default function SubElementsSection({ elevation, derived, dispatch }) {
  const eid = elevation.id;
  const [open, setOpen] = useState(false);
  const bumpOuts = elevation.bump_outs || [];
  const dormers = elevation.dormers || [];
  const gables = elevation.gables || [];
  const total = bumpOuts.length + dormers.length + gables.length;

  return (
    <div className="sub-element-section">
      <div className="sub-element-header" onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {open ? '▾' : '▸'} Sub-Elements
          {total > 0 && <span className="tab-badge" style={{ marginLeft: 6 }}>{total}</span>}
        </span>
        <div className="btn-group">
          <button className="btn btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_BUMP_OUT', payload: { elevId: eid } }); setOpen(true); }}>+ Bump-Out</button>
          <button className="btn btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_DORMER', payload: { elevId: eid } }); setOpen(true); }}>+ Dormer</button>
          <button className="btn btn-sm" onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_GABLE', payload: { elevId: eid } }); setOpen(true); }}>+ Gable</button>
        </div>
      </div>

      {open && (
        <div style={{ paddingTop: 8 }}>
          {/* Bump-Outs */}
          {bumpOuts.map((b, i) => {
            const d = derived.bumpOuts?.find(x => x.id === b.id);
            return (
              <div key={b.id} className="sub-element-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Bump-Out {i + 1}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_BUMP_OUT', payload: { elevId: eid, bumpId: b.id } })}>Remove</button>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  <div>
                    <div className="field-label">Width (ft)</div>
                    <input type="number" value={b.width_ft || ''} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'width_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                  <div>
                    <div className="field-label">Depth (ft)</div>
                    <input type="number" value={b.depth_ft || ''} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'depth_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                  <div>
                    <div className="field-label">Height (ft)</div>
                    <input type="number" value={b.height_ft || ''} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
                  <label><input type="checkbox" checked={b.has_soffit} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'has_soffit', value: e.target.checked } })} /> Soffit</label>
                  <label><input type="checkbox" checked={b.has_fascia} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'has_fascia', value: e.target.checked } })} /> Fascia</label>
                  <label><input type="checkbox" checked={b.has_corner_trim} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'has_corner_trim', value: e.target.checked } })} /> Corners</label>
                  <label><input type="checkbox" checked={b.has_foundation} onChange={e => dispatch({ type: 'SET_BUMP_OUT', payload: { elevId: eid, bumpId: b.id, field: 'has_foundation', value: e.target.checked } })} /> Foundation</label>
                </div>
                {d && (
                  <div style={{ fontSize: 11, color: 'var(--derived)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    Siding: {d.sidingSF} SF | Fascia: {d.fasciaLF} LF | Corner: {d.cornerLF} LF
                  </div>
                )}
              </div>
            );
          })}

          {/* Dormers */}
          {dormers.map((dm, i) => {
            const d = derived.dormers?.find(x => x.id === dm.id);
            return (
              <div key={dm.id} className="sub-element-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Dormer {i + 1}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_DORMER', payload: { elevId: eid, dormerId: dm.id } })}>Remove</button>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  <div>
                    <div className="field-label">Width (ft)</div>
                    <input type="number" value={dm.width_ft || ''} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'width_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                  <div>
                    <div className="field-label">Height (ft)</div>
                    <input type="number" value={dm.height_ft || ''} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'height_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                  <div>
                    <div className="field-label">Roof Pitch</div>
                    <input type="number" value={dm.roof_pitch || ''} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'roof_pitch', value: parseInt(e.target.value) || 0 } })} min="0" style={{ width: 60 }} />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 6, gap: 8 }}>
                  <label><input type="checkbox" checked={dm.has_window} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'has_window', value: e.target.checked } })} /> Window</label>
                  <label><input type="checkbox" checked={dm.has_soffit} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'has_soffit', value: e.target.checked } })} /> Soffit</label>
                  <label><input type="checkbox" checked={dm.has_fascia} onChange={e => dispatch({ type: 'SET_DORMER', payload: { elevId: eid, dormerId: dm.id, field: 'has_fascia', value: e.target.checked } })} /> Fascia</label>
                </div>
                {d && (
                  <div style={{ fontSize: 11, color: 'var(--derived)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    Siding: {d.sidingSF} SF | Rake: {d.rakeLF} LF | Fascia: {d.fasciaLF} LF
                  </div>
                )}
              </div>
            );
          })}

          {/* Gables */}
          {gables.map((g, i) => {
            const d = derived.gables?.find(x => x.id === g.id);
            return (
              <div key={g.id} className="sub-element-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Gable {i + 1}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_GABLE', payload: { elevId: eid, gableId: g.id } })}>Remove</button>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div className="field-label">Base (ft)</div>
                    <input type="number" value={g.base_ft || ''} onChange={e => dispatch({ type: 'SET_GABLE', payload: { elevId: eid, gableId: g.id, field: 'base_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                  <div>
                    <div className="field-label">Peak Height (ft)</div>
                    <input type="number" value={g.peak_ft || ''} onChange={e => dispatch({ type: 'SET_GABLE', payload: { elevId: eid, gableId: g.id, field: 'peak_ft', value: parseFloat(e.target.value) || 0 } })} min="0" step="0.5" />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 6 }}>
                  <label><input type="checkbox" checked={g.has_rake_trim} onChange={e => dispatch({ type: 'SET_GABLE', payload: { elevId: eid, gableId: g.id, field: 'has_rake_trim', value: e.target.checked } })} /> Rake Trim</label>
                  {g.has_rake_trim && (
                    <span style={{ fontSize: 11, color: 'var(--derived)', fontFamily: 'var(--font-mono)' }}>
                      {d?.rakeLF || 0} LF
                    </span>
                  )}
                </div>
                {d && (
                  <div style={{ fontSize: 11, color: 'var(--derived)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                    Siding: {d.sidingSF} SF
                  </div>
                )}
              </div>
            );
          })}

          {total === 0 && <div className="no-data-msg" style={{ padding: 16 }}>No sub-elements. Use the buttons above to add.</div>}
        </div>
      )}
    </div>
  );
}
