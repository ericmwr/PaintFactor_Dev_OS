import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';
import { EXT_SIDING_TYPES, EXT_SUBSTRATE_MATERIALS, EXT_SUBSTRATE_STATES, EXT_RP_SUBSTRATE_STATES, EXT_CONDITION_SCALE } from '../../../state/exterior-state';

export default function SidingTab({ elevation, derived, dispatch, isRP }) {
  const eid = elevation.id;
  const sections = elevation.siding_sections || [];

  const addSection = () => dispatch({ type: 'ADD_SIDING_SECTION', payload: { elevId: eid } });
  const removeSection = (id) => dispatch({ type: 'REMOVE_SIDING_SECTION', payload: { elevId: eid, sectionId: id } });
  const setSection = (id, f, v) => dispatch({ type: 'SET_SIDING_SECTION', payload: { elevId: eid, sectionId: id, field: f, value: v } });

  return (
    <div>
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title">Siding Sections</div>
          <button className="btn btn-sm btn-accent" onClick={addSection}>+ Add Section</button>
        </div>

        {sections.length === 0 && (
          <div className="no-data-msg" style={{ padding: 20 }}>No siding sections. Click "+ Add Section" to define siding.</div>
        )}

        {sections.map((sec, i) => {
          const detail = derived.sectionDetails?.find(d => d.id === sec.id);
          const derivedSF = detail ? detail.sf : 0;
          return (
            <div key={sec.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Section {i + 1}: {sec.label || EXT_SIDING_TYPES.find(t => t.value === sec.siding_type)?.label || sec.siding_type}
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => removeSection(sec.id)}>Remove</button>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <div className="field-label">Siding Type</div>
                  <Select options={EXT_SIDING_TYPES} value={sec.siding_type} onChange={v => setSection(sec.id, 'siding_type', v)} />
                </div>
                <div>
                  <div className="field-label">Substrate Material</div>
                  <Select options={EXT_SUBSTRATE_MATERIALS} value={sec.substrate_material} onChange={v => setSection(sec.id, 'substrate_material', v)} />
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr' : '1fr 1fr', marginTop: 6 }}>
                <div>
                  <div className="field-label">Substrate State</div>
                  <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={sec.substrate_state} onChange={v => setSection(sec.id, 'substrate_state', v)} />
                </div>
                {isRP && (
                  <div>
                    <div className="field-label">Condition</div>
                    <Select options={EXT_CONDITION_SCALE} value={sec.condition_scale || 'GOOD'} onChange={v => setSection(sec.id, 'condition_scale', v)} />
                  </div>
                )}
                <div>
                  <div className="field-label">Texture Profile</div>
                  <Select options={ENUMS.extTextureProfiles} value={sec.texture_profile} onChange={v => setSection(sec.id, 'texture_profile', v)} />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!sec.sf_override}
                    onChange={e => setSection(sec.id, 'sf_override', e.target.checked)}
                  />
                  SF Override
                </label>
                {sec.sf_override ? (
                  <div>
                    <input type="number" value={sec.sf || ''} onChange={e => setSection(sec.id, 'sf', parseFloat(e.target.value) || 0)} min="0" placeholder="0" />
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--derived)', fontFamily: 'var(--font-mono)' }}>
                    {derivedSF} SF (auto)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
        Net Siding: <b style={{ color: 'var(--accent)' }}>{derived.netSidingSF} SF</b>
        {derived.subSidingSF > 0 && <span> + {derived.subSidingSF} SF sub-elements</span>}
      </div>
    </div>
  );
}
