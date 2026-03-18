import Select from '../shared/Select';
import { ENUMS } from '../../data/enums';
import { EXT_SUBSTRATE_STATES, EXT_RP_SUBSTRATE_STATES, EXT_CONDITION_SCALE } from '../../state/exterior-state';

export default function StandalonePanel({ exterior, dispatch, isRP }) {
  const sa = exterior.standalone;
  const setSA = (itemType, field, value) => dispatch({ type: 'SET_STANDALONE', payload: { itemType, field, value } });
  const setPorch = (section, field, value) => dispatch({ type: 'SET_PORCH', payload: { section, field, value } });

  return (
    <div>
      {/* Foundation */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <label>
            <input type="checkbox" checked={sa.foundation.enabled} onChange={e => setSA('foundation', 'enabled', e.target.checked)} />
            <span className="standalone-card-title">Foundation</span>
          </label>
        </div>
        {sa.foundation.enabled && (
          <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
            <div>
              <div className="field-label">Perimeter (LF)</div>
              <input type="number" value={sa.foundation.perimeter_lf || ''} onChange={e => setSA('foundation', 'perimeter_lf', parseFloat(e.target.value) || 0)} min="0" />
            </div>
            <div>
              <div className="field-label">Height (ft)</div>
              <input type="number" value={sa.foundation.height_ft || ''} onChange={e => setSA('foundation', 'height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" />
            </div>
            <div>
              <div className="field-label">Substrate</div>
              <Select options={ENUMS.extFoundationSubstrates} value={sa.foundation.substrate} onChange={v => setSA('foundation', 'substrate', v)} />
            </div>
            <div>
              <div className="field-label">State</div>
              <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sa.foundation.substrate_state} onChange={v => setSA('foundation', 'substrate_state', v)} />
            </div>
            {isRP && (
              <div>
                <div className="field-label">Condition</div>
                <Select options={EXT_CONDITION_SCALE} value={sa.foundation.condition_scale || 'GOOD'} onChange={v => setSA('foundation', 'condition_scale', v)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deck */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <label>
            <input type="checkbox" checked={sa.deck.enabled} onChange={e => setSA('deck', 'enabled', e.target.checked)} />
            <span className="standalone-card-title">Deck</span>
          </label>
        </div>
        {sa.deck.enabled && (
          <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
            <div>
              <div className="field-label">Area (SF)</div>
              <input type="number" value={sa.deck.sf || ''} onChange={e => setSA('deck', 'sf', parseFloat(e.target.value) || 0)} min="0" />
            </div>
            <div>
              <div className="field-label">Railing (LF)</div>
              <input type="number" value={sa.deck.railing_lf || ''} onChange={e => setSA('deck', 'railing_lf', parseFloat(e.target.value) || 0)} min="0" />
            </div>
            <div>
              <div className="field-label">Coating</div>
              <Select options={ENUMS.extCoatingTypes} value={sa.deck.coating_type} onChange={v => setSA('deck', 'coating_type', v)} />
            </div>
            <div>
              <div className="field-label">State</div>
              <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sa.deck.substrate_state} onChange={v => setSA('deck', 'substrate_state', v)} />
            </div>
            {isRP && (
              <div>
                <div className="field-label">Condition</div>
                <Select options={EXT_CONDITION_SCALE} value={sa.deck.condition_scale || 'GOOD'} onChange={v => setSA('deck', 'condition_scale', v)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fence */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <label>
            <input type="checkbox" checked={sa.fence.enabled} onChange={e => setSA('fence', 'enabled', e.target.checked)} />
            <span className="standalone-card-title">Fence</span>
          </label>
        </div>
        {sa.fence.enabled && (
          <div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
              <div>
                <div className="field-label">Total (LF)</div>
                <input type="number" value={sa.fence.total_lf || ''} onChange={e => setSA('fence', 'total_lf', parseFloat(e.target.value) || 0)} min="0" />
              </div>
              <div>
                <div className="field-label">Height (ft)</div>
                <input type="number" value={sa.fence.height_ft || ''} onChange={e => setSA('fence', 'height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" />
              </div>
              <div>
                <div className="field-label">Sides</div>
                <Select options={[{ value: '1', label: '1 Side' }, { value: '2', label: '2 Sides' }]} value={String(sa.fence.sides)} onChange={v => setSA('fence', 'sides', parseInt(v))} />
              </div>
              <div>
                <div className="field-label">Style</div>
                <Select options={ENUMS.extFenceStyles} value={sa.fence.style} onChange={v => setSA('fence', 'style', v)} />
              </div>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6, marginTop: 6 }}>
              <div>
                <div className="field-label">Coating</div>
                <Select options={ENUMS.extCoatingTypes} value={sa.fence.coating_type} onChange={v => setSA('fence', 'coating_type', v)} />
              </div>
              <div>
                <div className="field-label">State</div>
                <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sa.fence.substrate_state} onChange={v => setSA('fence', 'substrate_state', v)} />
              </div>
              {isRP && (
                <div>
                  <div className="field-label">Condition</div>
                  <Select options={EXT_CONDITION_SCALE} value={sa.fence.condition_scale || 'GOOD'} onChange={v => setSA('fence', 'condition_scale', v)} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Porch */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <span className="standalone-card-title">Porch</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          {/* Ceiling */}
          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sa.porch.ceiling.enabled} onChange={e => setPorch('ceiling', 'enabled', e.target.checked)} />
              Ceiling
            </label>
            {sa.porch.ceiling.enabled && (
              <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6, marginTop: 4 }}>
                <div>
                  <div className="field-label">SF</div>
                  <input type="number" value={sa.porch.ceiling.sf || ''} onChange={e => setPorch('ceiling', 'sf', parseFloat(e.target.value) || 0)} min="0" />
                </div>
                <div>
                  <div className="field-label">State</div>
                  <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sa.porch.ceiling.substrate_state} onChange={v => setPorch('ceiling', 'substrate_state', v)} />
                </div>
                {isRP && (
                  <div>
                    <div className="field-label">Condition</div>
                    <Select options={EXT_CONDITION_SCALE} value={sa.porch.ceiling.condition_scale || 'GOOD'} onChange={v => setPorch('ceiling', 'condition_scale', v)} />
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Floor */}
          <div style={{ flex: 1 }}>
            <label style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sa.porch.floor.enabled} onChange={e => setPorch('floor', 'enabled', e.target.checked)} />
              Floor
            </label>
            {sa.porch.floor.enabled && (
              <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6, marginTop: 4 }}>
                <div>
                  <div className="field-label">SF</div>
                  <input type="number" value={sa.porch.floor.sf || ''} onChange={e => setPorch('floor', 'sf', parseFloat(e.target.value) || 0)} min="0" />
                </div>
                <div>
                  <div className="field-label">State</div>
                  <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sa.porch.floor.substrate_state} onChange={v => setPorch('floor', 'substrate_state', v)} />
                </div>
                {isRP && (
                  <div>
                    <div className="field-label">Condition</div>
                    <Select options={EXT_CONDITION_SCALE} value={sa.porch.floor.condition_scale || 'GOOD'} onChange={v => setPorch('floor', 'condition_scale', v)} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Garage Doors */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <span className="standalone-card-title">Garage Doors</span>
          <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_GARAGE_DOOR' })}>+ Add</button>
        </div>
        {(sa.garage_doors || []).map((gd, i) => (
          <div key={gd.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginTop: 6 }}>
            <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr 1fr auto auto' : '1fr 1fr 1fr auto auto', gap: 6, alignItems: 'flex-end' }}>
              <div>
                <div className="field-label">Size</div>
                <Select options={ENUMS.extGarageSizes} value={gd.size} onChange={v => dispatch({ type: 'SET_GARAGE_DOOR', payload: { itemId: gd.id, field: 'size', value: v } })} />
              </div>
              <div>
                <div className="field-label">Panel</div>
                <Select options={ENUMS.extGaragePanelTypes} value={gd.panel_type} onChange={v => dispatch({ type: 'SET_GARAGE_DOOR', payload: { itemId: gd.id, field: 'panel_type', value: v } })} />
              </div>
              <div>
                <div className="field-label">State</div>
                <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={gd.substrate_state} onChange={v => dispatch({ type: 'SET_GARAGE_DOOR', payload: { itemId: gd.id, field: 'substrate_state', value: v } })} />
              </div>
              {isRP && (
                <div>
                  <div className="field-label">Condition</div>
                  <Select options={EXT_CONDITION_SCALE} value={gd.condition_scale || 'GOOD'} onChange={v => dispatch({ type: 'SET_GARAGE_DOOR', payload: { itemId: gd.id, field: 'condition_scale', value: v } })} />
                </div>
              )}
              <div>
                <label style={{ marginTop: 14 }}><input type="checkbox" checked={gd.has_windows} onChange={e => dispatch({ type: 'SET_GARAGE_DOOR', payload: { itemId: gd.id, field: 'has_windows', value: e.target.checked } })} /> Win</label>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_GARAGE_DOOR', payload: gd.id })}>Remove</button>
            </div>
          </div>
        ))}
        {(sa.garage_doors || []).length === 0 && <div className="no-data-msg" style={{ padding: 12 }}>No garage doors.</div>}
      </div>

      {/* Metal Surfaces */}
      <div className="standalone-card">
        <div className="standalone-card-header">
          <span className="standalone-card-title">Metal Surfaces</span>
          <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_METAL_SURFACE' })}>+ Add</button>
        </div>
        {(sa.metal_surfaces || []).map((m, i) => (
          <div key={m.id} className="form-row" style={{ alignItems: 'flex-end', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6, marginTop: 6 }}>
            <div style={{ flex: 1 }}>
              <div className="field-label">Type</div>
              <Select options={ENUMS.extMetalTypes} value={m.type} onChange={v => dispatch({ type: 'SET_METAL_SURFACE', payload: { itemId: m.id, field: 'type', value: v } })} />
            </div>
            <div>
              <div className="field-label">LF</div>
              <input type="number" value={m.lf || ''} onChange={e => dispatch({ type: 'SET_METAL_SURFACE', payload: { itemId: m.id, field: 'lf', value: parseFloat(e.target.value) || 0 } })} min="0" />
            </div>
            <div>
              <div className="field-label">State</div>
              <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={m.substrate_state} onChange={v => dispatch({ type: 'SET_METAL_SURFACE', payload: { itemId: m.id, field: 'substrate_state', value: v } })} />
            </div>
            {isRP && (
              <div>
                <div className="field-label">Condition</div>
                <Select options={EXT_CONDITION_SCALE} value={m.condition_scale || 'GOOD'} onChange={v => dispatch({ type: 'SET_METAL_SURFACE', payload: { itemId: m.id, field: 'condition_scale', value: v } })} />
              </div>
            )}
            <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_METAL_SURFACE', payload: m.id })}>Remove</button>
          </div>
        ))}
        {(sa.metal_surfaces || []).length === 0 && <div className="no-data-msg" style={{ padding: 12 }}>No metal surfaces.</div>}
      </div>
    </div>
  );
}
