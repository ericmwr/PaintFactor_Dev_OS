import { FIXTURE_MAP } from '../../data/fixture-catalog';
import { getFixtureLevels, getFixtureDefault } from '../../data/mask-levels';

// Engine-driven shape per fixture id. Determines which inputs render inline.
const FIXTURE_SHAPE = {
  toilet: 'count_only',
  bathtub: 'count_only',
  appliances: 'count_only',
  light_fixtures: 'count_only',
  backsplash: 'count_only',
  shower: 'count_wh',
  fireplace: 'count_wh',
  stone_fireplace: 'count_wh',
  builtin_shelving: 'count_wh',
  vanity: 'count_w',
  cabinets: 'lf_layout',
  countertops: 'lf',
  feature_wall: 'defer',
};

export default function FixtureInlineRow({ fixtureId, cfg, setFix }) {
  const cat = FIXTURE_MAP[fixtureId];
  if (!cat) return null;
  const shape = FIXTURE_SHAPE[fixtureId] || 'count_only';
  const levels = getFixtureLevels(fixtureId);
  const protectionValue = cfg.protection || cat.defaultProtection || getFixtureDefault(fixtureId);

  const numInput = (field, placeholder, step = 0.5, min = 0, max) => (
    <input
      type="number" min={min} {...(max != null ? { max } : {})} step={step}
      value={cfg[field] ?? ''}
      onChange={e => setFix(fixtureId, field, parseFloat(e.target.value) || 0)}
      placeholder={placeholder}
      style={{ width: '100%', fontSize: 12 }}
    />
  );

  const intInput = (field, placeholder, max = 20) => (
    <input
      type="number" min="1" max={max} step="1"
      value={cfg[field] ?? ''}
      onChange={e => setFix(fixtureId, field, parseInt(e.target.value) || 1)}
      placeholder={placeholder}
      style={{ width: '100%', fontSize: 12 }}
    />
  );

  const protectSelect = (
    <select
      value={protectionValue}
      onChange={e => setFix(fixtureId, 'protection', e.target.value)}
      style={{ width: '100%', fontSize: 12 }}
    >
      {levels.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );

  // Grid columns differ by shape so each input gets enough room.
  let inputs;
  let cols;
  if (shape === 'count_only') {
    cols = '60px 1fr';
    inputs = <>{intInput('count', '1')}{protectSelect}</>;
  } else if (shape === 'count_wh') {
    cols = '50px 70px 70px 1fr';
    inputs = <>{intInput('count', '1')}{numInput('width_ft', 'W')}{numInput('height_ft', 'H')}{protectSelect}</>;
  } else if (shape === 'count_w') {
    cols = '50px 70px 1fr';
    inputs = <>{intInput('count', '1')}{numInput('width_ft', 'W')}{protectSelect}</>;
  } else if (shape === 'lf_layout') {
    cols = '90px 130px 1fr';
    inputs = <>
      {numInput('linear_ft', 'LF')}
      <select value={cfg.layout || 'lower_upper'} onChange={e => setFix(fixtureId, 'layout', e.target.value)} style={{ width: '100%', fontSize: 12 }}>
        <option value="lower_only">Lower Only</option>
        <option value="lower_upper">Lower + Upper</option>
      </select>
      {protectSelect}
    </>;
  } else if (shape === 'lf') {
    cols = '90px 1fr';
    inputs = <>{numInput('linear_ft', 'LF')}{protectSelect}</>;
  } else if (shape === 'defer') {
    cols = '1fr';
    inputs = (
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Multi-wall configuration — set per wall on the Protection tab
      </span>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `140px ${cols}`, gap: 6, alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed var(--border-subtle, var(--border))' }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
      {inputs}
    </div>
  );
}
