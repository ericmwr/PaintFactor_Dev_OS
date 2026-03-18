import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';
import { EXT_ACCESS_TYPES } from '../../../state/exterior-state';

export default function IdentityTab({ elevation, dispatch, exterior }) {
  const eid = elevation.id;
  const set = (f, v) => dispatch({ type: 'SET_ELEVATION', payload: { elevId: eid, field: f, value: v } });
  const setNullable = (f, v) => dispatch({ type: 'SET_ELEVATION', payload: { elevId: eid, field: f, value: v || null } });
  const defaults = exterior.defaults;

  const grossSF = Math.round((parseFloat(elevation.width_ft) || 0) * (parseFloat(elevation.height_to_eave_ft) || 0));

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">Elevation Identity</div>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div>
            <div className="field-label">Label</div>
            <input value={elevation.label} onChange={e => set('label', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Front" />
          </div>
          <div>
            <div className="field-label">Access Type</div>
            <Select options={EXT_ACCESS_TYPES} value={elevation.access_type} onChange={v => set('access_type', v)} />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Dimensions</div>
        <div className="form-row">
          <div>
            <div className="field-label">Width (ft)</div>
            <input type="number" value={elevation.width_ft || ''} onChange={e => set('width_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Height to Eave (ft)</div>
            <input type="number" value={elevation.height_to_eave_ft || ''} onChange={e => set('height_to_eave_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span>Gross SF: <b style={{ color: 'var(--text-primary)' }}>{grossSF}</b></span>
          <span>Access: <b style={{ color: 'var(--accent)' }}>{elevation.access_type}</b></span>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Elevation Overrides</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select
              options={ENUMS.extQualityTiers}
              value={elevation.quality_tier}
              onChange={v => setNullable('quality_tier', v)}
              placeholder={`Project Default (${defaults.quality_tier || 'QT3'})`}
            />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select
              options={ENUMS.extApplicationMethods}
              value={elevation.application_method}
              onChange={v => setNullable('application_method', v)}
              placeholder={`Project Default (${defaults.application_method || 'spray_backbrush'})`}
            />
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Notes</div>
        <textarea
          value={elevation.notes || ''}
          onChange={e => set('notes', e.target.value)}
          placeholder="Elevation-specific notes..."
          style={{ width: '100%', minHeight: 48, resize: 'vertical' }}
        />
      </div>
    </div>
  );
}
