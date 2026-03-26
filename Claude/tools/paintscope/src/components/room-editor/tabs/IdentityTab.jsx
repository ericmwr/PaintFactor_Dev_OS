import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';

export default function IdentityTab({ room, derived, dispatch, project, roomCategories }) {
  const rid = room.id;
  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });
  const setRoomNullable = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v || null } });

  return (
    <div>
      {/* ── Room Identity ── */}
      <div className="panel-section" data-section="identity">
        <div className="section-title">Room Identity</div>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 2fr' }}>
          <div>
            <div className="field-label">Room Label</div>
            <input value={room.label} onChange={e => setRoom('label', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Master Bedroom" />
          </div>
          <div>
            <div className="field-label">Area Group</div>
            <select value={room.area_group || ''} onChange={e => setRoom('area_group', e.target.value)} style={{ width: '100%' }}>
              <option value="">None</option>
              {(roomCategories || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="field-label">Room Notes</div>
          <textarea
            value={room.notes || ''}
            onChange={e => setRoom('notes', e.target.value)}
            placeholder="e.g. Crown moulding, accent wall"
            style={{ width: '100%', minHeight: 48, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* ── Dimensions ── */}
      <div className="panel-section" data-section="dimensions">
        <div className="section-title">Dimensions</div>
        <div className="form-row">
          <div>
            <div className="field-label">Length (ft)</div>
            <input type="number" value={room.length_ft || ''} onChange={e => setRoom('length_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Width (ft)</div>
            <input type="number" value={room.width_ft || ''} onChange={e => setRoom('width_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Height (ft)</div>
            <input type="number" value={room.height_ft || ''} onChange={e => setRoom('height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span>Perimeter: <b style={{ color: 'var(--text-primary)' }}>{derived.perimeter} LF</b></span>
          <span>Floor/Ceiling: <b style={{ color: 'var(--text-primary)' }}>{derived.ceilingSF} SF</b></span>
          <span>Wall Gross: <b style={{ color: 'var(--text-primary)' }}>{derived.wallGross} SF</b></span>
          <span>Opening Deduct: <b style={{ color: 'var(--warning)' }}>{derived.openingDeduction} SF</b></span>
        </div>
      </div>

      {/* ── Room-Level Overrides ── */}
      <div className="panel-section" data-section="overrides">
        <div className="section-title">Room-Level Overrides</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Complexity <span style={{ color: 'var(--text-muted)' }}>({project.default_complexity})</span></div>
            <Select options={ENUMS.complexity} value={room.complexity} onChange={v => setRoomNullable('complexity', v)} placeholder="Project Default" />
          </div>
          <div>
            <div className="field-label">Height Band</div>
            <div style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {derived.heightBand} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>&mdash; auto from {derived.effectiveHeight} ft{derived.effectiveHeight > derived.H ? ' (peak)' : ''}</span>
            </div>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select
              options={ENUMS.qualityTiers}
              value={room.quality_tier}
              onChange={v => setRoomNullable('quality_tier', v)}
              placeholder={`Project Default (${project.default_quality_tier || 'QT3'})`}
            />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select
              options={ENUMS.applicationMethods}
              value={room.application_method}
              onChange={v => setRoomNullable('application_method', v)}
              placeholder="Project Default"
            />
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
          <div>
            <div className="field-label">Texture</div>
            <Select
              options={ENUMS.textures}
              value={room.texture}
              onChange={v => setRoomNullable('texture', v)}
              placeholder="Project Default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
