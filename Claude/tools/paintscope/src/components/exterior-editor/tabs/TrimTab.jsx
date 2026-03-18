import { useState } from 'react';
import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';
import { EXT_TRIM_TYPES, EXT_SUBSTRATE_MATERIALS, EXT_SUBSTRATE_STATES, EXT_RP_SUBSTRATE_STATES, EXT_SOFFIT_PROFILES, EXT_CONDITION_SCALE } from '../../../state/exterior-state';

export default function TrimTab({ elevation, derived, dispatch, isRP }) {
  const eid = elevation.id;
  const trim = elevation.trim || {};
  const [expanded, setExpanded] = useState({});

  const toggleTrim = (type) => dispatch({ type: 'TOGGLE_TRIM_TYPE', payload: { elevId: eid, trimType: type } });
  const setTrim = (type, f, v) => dispatch({ type: 'SET_TRIM_TYPE', payload: { elevId: eid, trimType: type, field: f, value: v } });
  const toggleExpand = (type) => setExpanded(prev => ({ ...prev, [type]: !prev[type] }));

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">Trim Types</div>
        <div className="trim-grid">
          {EXT_TRIM_TYPES.map(t => {
            const config = trim[t.value];
            const enabled = !!config;
            const isExpanded = expanded[t.value];
            const derivedLF = derived.trimLF?.[t.value] || 0;
            const isSoffit = t.value === 'soffit';

            return (
              <div key={t.value} className={`trim-type-row ${enabled ? 'enabled' : ''}`}>
                <div className="trim-type-header" onClick={() => toggleTrim(t.value)}>
                  <input type="checkbox" checked={enabled} onChange={() => toggleTrim(t.value)} onClick={e => e.stopPropagation()} />
                  <span className="trim-type-label">{t.label}</span>
                  {enabled && (
                    <span className="trim-type-lf">
                      {isSoffit ? `${derived.soffitSF || 0} SF` : `${derivedLF} LF`}
                    </span>
                  )}
                </div>

                {enabled && (
                  <div className="trim-type-summary">
                    <button className="btn btn-sm" onClick={() => toggleExpand(t.value)} style={{ fontSize: 10 }}>
                      {isExpanded ? 'Collapse' : 'Detail'}
                    </button>

                    {isExpanded && (
                      <div className="trim-detail-row">
                        <div className="form-grid" style={{ gridTemplateColumns: isRP ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
                          <div>
                            <div className="field-label">Substrate</div>
                            <Select options={EXT_SUBSTRATE_MATERIALS} value={config.substrate_material} onChange={v => setTrim(t.value, 'substrate_material', v)} />
                          </div>
                          <div>
                            <div className="field-label">State</div>
                            <Select options={isRP ? EXT_RP_SUBSTRATE_STATES : EXT_SUBSTRATE_STATES} value={config.substrate_state} onChange={v => setTrim(t.value, 'substrate_state', v)} />
                          </div>
                          {isRP && (
                            <div>
                              <div className="field-label">Condition</div>
                              <Select options={EXT_CONDITION_SCALE} value={config.condition_scale || 'GOOD'} onChange={v => setTrim(t.value, 'condition_scale', v)} />
                            </div>
                          )}
                          <div>
                            <div className="field-label">Profile</div>
                            <Select options={ENUMS.extProfileComplexity} value={config.profile_complexity} onChange={v => setTrim(t.value, 'profile_complexity', v)} />
                          </div>
                          <div>
                            <div className="field-label">Width (in)</div>
                            <input type="number" value={config.width_in || ''} onChange={e => setTrim(t.value, 'width_in', parseFloat(e.target.value) || 0)} min="0" step="0.5" />
                          </div>
                        </div>

                        {isSoffit && (
                          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                            <div>
                              <div className="field-label">Soffit Profile</div>
                              <Select options={EXT_SOFFIT_PROFILES} value={config.soffit_profile} onChange={v => setTrim(t.value, 'soffit_profile', v)} />
                            </div>
                            <div>
                              <div className="field-label">Depth (ft)</div>
                              <input type="number" value={config.depth_ft || ''} onChange={e => setTrim(t.value, 'depth_ft', parseFloat(e.target.value) || 0)} min="0" step="0.25" />
                            </div>
                          </div>
                        )}

                        <div className="form-row" style={{ marginTop: 6 }}>
                          <label>
                            <input type="checkbox" checked={!!config.lf_override} onChange={e => setTrim(t.value, 'lf_override', e.target.checked)} />
                            LF Override
                          </label>
                          {config.lf_override && (
                            <input type="number" value={config.lf || ''} onChange={e => setTrim(t.value, 'lf', parseFloat(e.target.value) || 0)} min="0" placeholder="0" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
        Total Trim: <b style={{ color: 'var(--accent)' }}>{derived.totalTrimLF} LF</b>
        {derived.soffitSF > 0 && <span> | Soffit: <b style={{ color: 'var(--accent)' }}>{derived.soffitSF} SF</b></span>}
      </div>
    </div>
  );
}
