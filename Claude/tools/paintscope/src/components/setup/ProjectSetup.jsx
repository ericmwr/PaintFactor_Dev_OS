import { Fragment } from 'react';
import Select from '../shared/Select';
import Toggle from '../shared/Toggle';
import { ENUMS } from '../../data/enums';
import { useProject } from '../../hooks/useProject';

const DEFAULT_SURFACE_OPTIONS = [
  { id: 'ceiling', label: 'Ceiling' },
  { id: 'walls', label: 'Walls' },
  { id: 'baseboard', label: 'Baseboard' },
  { id: 'crown', label: 'Crown' },
  { id: 'chair_rail', label: 'Chair Rail' },
  { id: 'shoe_mold', label: 'Shoe Mold' },
];

export default function ProjectSetup() {
  const { state, dispatch } = useProject();
  const project = state.project;
  const set = (field, value) => dispatch({ type: 'SET_PROJECT', payload: { field, value } });

  return (
    <div className="setup-form">
      <h2 style={{ fontSize: 18, marginBottom: 20, color: 'var(--accent)' }}>Project Setup</h2>

      <div className="setup-field">
        <label>Project Name</label>
        <input
          value={project.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Smith Residence NC"
          style={{ fontSize: 15, padding: '8px 12px' }}
        />
      </div>

      <div className="setup-field">
        <Toggle
          checked={project.new_construction}
          onChange={v => set('new_construction', v)}
          label="New Construction"
        />
        <div className="hint">All 18 current specs are interior new construction</div>
      </div>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="setup-field">
          <label>Default Quality Tier</label>
          <Select
            options={ENUMS.qualityTiers}
            value={project.default_quality_tier}
            onChange={v => set('default_quality_tier', v)}
          />
        </div>
        <div className="setup-field">
          <label>Default Complexity</label>
          <Select
            options={ENUMS.complexity}
            value={project.default_complexity}
            onChange={v => set('default_complexity', v)}
          />
        </div>
        <div className="setup-field">
          <label>Default Application Method</label>
          <Select
            options={ENUMS.applicationMethods}
            value={project.default_application_method}
            onChange={v => set('default_application_method', v)}
          />
        </div>
        <div className="setup-field">
          <label>Default Surface Texture</label>
          <Select
            options={ENUMS.textures}
            value={project.default_texture}
            onChange={v => set('default_texture', v)}
          />
        </div>
      </div>

      <div className="setup-field" style={{ marginTop: 12 }}>
        <label>Default Paintable Surfaces</label>
        <div className="hint">
          New rooms will include these surfaces by default. Doors &amp; windows are configured
          per-room in the Openings section.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto 24px auto auto 24px auto auto',
            alignItems: 'center',
            gap: '6px 0',
            marginTop: 8,
          }}
        >
          {DEFAULT_SURFACE_OPTIONS.map((s, i) => {
            const col = i % 3;
            const colStart = col * 3 + 1; // 1, 4, 7
            return (
              <Fragment key={s.id}>
                <span style={{ gridColumn: colStart, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
                <input
                  type="checkbox"
                  style={{ gridColumn: colStart + 1, justifySelf: 'center' }}
                  checked={(project.default_substrates || []).includes(s.id)}
                  onChange={() => dispatch({ type: 'TOGGLE_PROJECT_SUBSTRATE', payload: s.id })}
                />
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="setup-field" style={{ marginTop: 8 }}>
        <label>Project Notes</label>
        <textarea
          value={project.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional project notes..."
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-accent"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'editor' })}
          style={{ padding: '8px 24px', fontSize: 14 }}
        >
          Continue to Room Editor
        </button>
      </div>
    </div>
  );
}
