import Select from '../shared/Select';
import StairwayComponentRow from './StairwayComponentRow';
import { ENUMS } from '../../data/enums';
import { deriveStairway } from '../../engine/derive-stairway';

export default function StairwayDetailPanel({ room, dispatch, project }) {
  const rid = room.id;
  const config = room.substrates.stairway;
  if (!config) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId: 'stairway', field: f, value: v } });

  const setComp = (compKey, updated) => {
    setSub('components', { ...config.components, [compKey]: updated });
  };

  const runs = config.runs || 1;
  const hasTwoRuns = runs >= 2;

  // Derived geometry
  const derived = deriveStairway(config);

  return (
    <div>
      {/* Title */}
      <div className="panel-section">
        <div className="field-label">Title</div>
        <input value={config.title || ''} onChange={e => setSub('title', e.target.value || '')}
          placeholder="e.g. Main Staircase"
          style={{ width: '100%', fontSize: 13 }} />
      </div>

      {/* Structure */}
      <div className="panel-section">
        <div className="section-title">Structure</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Runs</div>
            <Select options={ENUMS.stairwayRuns} value={runs} onChange={v => setSub('runs', Number(v))} />
          </div>
          <div>
            <div className="field-label">Stair Width (ft)</div>
            <input type="number" value={config.stair_width || ''} min="1" max="8" step="0.25"
              onChange={e => setSub('stair_width', parseFloat(e.target.value) || 3.5)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          </div>
          <div>
            <div className="field-label">Run 1 Risers</div>
            <input type="number" value={config.run1_risers || ''} min="0" max="20"
              onChange={e => setSub('run1_risers', parseInt(e.target.value) || 0)}
              style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
          </div>
          {hasTwoRuns && (
            <div>
              <div className="field-label">Run 2 Risers</div>
              <input type="number" value={config.run2_risers || ''} min="0" max="20"
                onChange={e => setSub('run2_risers', parseInt(e.target.value) || 0)}
                style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
          )}
          {hasTwoRuns && (
            <div>
              <div className="field-label">Layout</div>
              <Select options={ENUMS.stairwayLayout} value={config.layout || 'l_shape'} onChange={v => setSub('layout', v)} />
            </div>
          )}
          {hasTwoRuns && (
            <div>
              <div className="field-label">Landing Depth (ft)</div>
              <input type="number" value={config.landing_depth || ''} min="2" max="8" step="0.25"
                onChange={e => setSub('landing_depth', parseFloat(e.target.value) || 3.5)}
                style={{ width: '100%', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
            </div>
          )}
        </div>
      </div>

      {/* Derived Summary */}
      {derived && (derived.total_risers > 0) && (
        <div className="panel-section">
          <div className="section-title">Derived Geometry</div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)',
            background: 'var(--bg-card, #111a28)', borderRadius: 6, padding: '8px 10px',
          }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Total Rise</div>
              <span style={{ color: 'var(--accent)' }}>{derived.total_rise}</span> ft
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Total Run</div>
              <span style={{ color: 'var(--accent)' }}>{derived.total_run}</span> ft
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>Rake Length</div>
              <span style={{ color: 'var(--accent)' }}>{derived.total_rake_lf}</span> LF
            </div>
          </div>
        </div>
      )}

      {/* Component List */}
      <div className="panel-section">
        <div className="section-title">Components</div>

        <StairwayComponentRow
          label="Risers" uom="EA"
          derivedValue={derived?.total_risers || 0}
          component={config.components?.risers}
          onUpdate={updated => setComp('risers', updated)}
        />

        {/* Treads — optional with enabled checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <input type="checkbox" checked={!!config.components?.treads?.enabled}
            onChange={e => setComp('treads', { ...config.components?.treads, enabled: e.target.checked })} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Include treads (floor-rated coating required)</span>
        </div>
        {config.components?.treads?.enabled && (
          <StairwayComponentRow
            label="Treads" uom="EA"
            derivedValue={derived?.total_treads || 0}
            component={config.components?.treads}
            onUpdate={updated => setComp('treads', updated)}
          />
        )}

        <StairwayComponentRow
          label="Stringers / Skirtboard" uom="LF"
          derivedValue={derived?.skirtboard_lf || 0}
          component={config.components?.skirtboard}
          onUpdate={updated => setComp('skirtboard', updated)}
        />

        <StairwayComponentRow
          label="Handrail" uom="LF"
          derivedValue={derived?.total_rake_lf || 0}
          component={config.components?.handrail}
          onUpdate={updated => setComp('handrail', updated)}
        />

        <StairwayComponentRow
          label="Balusters" uom="EA"
          derivedValue={derived?.total_balusters || 0}
          component={config.components?.balusters}
          onUpdate={updated => setComp('balusters', updated)}
          extraFields={
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
              <div>
                <div className="field-label">Baluster Type</div>
                <Select options={ENUMS.balusterType}
                  value={config.components?.balusters?.baluster_type || 'square'}
                  onChange={v => setComp('balusters', { ...config.components?.balusters, baluster_type: v })} />
              </div>
              <div>
                <div className="field-label">Material</div>
                <Select options={ENUMS.balusterMaterial}
                  value={config.components?.balusters?.material || 'wood'}
                  onChange={v => setComp('balusters', { ...config.components?.balusters, material: v })} />
              </div>
            </div>
          }
        />

        <StairwayComponentRow
          label="Newel Posts" uom="EA"
          derivedValue={derived?.newel_posts || 0}
          component={config.components?.newel_posts}
          onUpdate={updated => setComp('newel_posts', updated)}
        />

        {/* Wall Rail — no derivation, manual entry only */}
        <StairwayComponentRow
          label="Wall Rail" uom="LF"
          derivedValue={0}
          component={config.components?.wall_rail}
          onUpdate={updated => setComp('wall_rail', updated)}
        />
      </div>
    </div>
  );
}
