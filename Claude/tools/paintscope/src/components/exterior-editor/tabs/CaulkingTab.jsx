import Select from '../../shared/Select';
import { EXT_CAULK_SCOPES, EXT_TRIM_TYPES } from '../../../state/exterior-state';

export default function CaulkingTab({ elevation, derived, dispatch, exterior }) {
  const eid = elevation.id;
  const caulkScope = elevation.caulk_scope || exterior.defaults.caulk_scope || 'complete';
  const trim = elevation.trim || {};

  const setCaulk = (v) => dispatch({ type: 'SET_ELEVATION', payload: { elevId: eid, field: 'caulk_scope', value: v || null } });

  // Build caulk breakdown from enabled trim types
  const caulkBreakdown = [];
  for (const [trimType, config] of Object.entries(trim)) {
    if (!config || !config.enabled) continue;
    const trimDef = EXT_TRIM_TYPES.find(t => t.value === trimType);
    if (!trimDef || !trimDef.caulk_lf_per_lf) continue;
    const trimLF = derived.trimLF?.[trimType] || 0;
    const caulkLF = Math.round(trimLF * trimDef.caulk_lf_per_lf);
    if (caulkLF > 0) {
      caulkBreakdown.push({ label: trimDef.label, trimLF, ratio: trimDef.caulk_lf_per_lf, caulkLF });
    }
  }

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">Caulking Scope</div>
        <div style={{ maxWidth: 300 }}>
          <Select
            options={EXT_CAULK_SCOPES}
            value={caulkScope}
            onChange={setCaulk}
            placeholder={`Project Default (${exterior.defaults.caulk_scope || 'complete'})`}
          />
        </div>
      </div>

      {caulkScope !== 'none' && (
        <div className="panel-section">
          <div className="section-title">Derived Caulking LF</div>
          {caulkBreakdown.length === 0 ? (
            <div className="no-data-msg" style={{ padding: 16 }}>Enable trim types to see caulking quantities.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trim Type</th>
                  <th>Trim LF</th>
                  <th>Ratio</th>
                  <th>Caulk LF</th>
                </tr>
              </thead>
              <tbody>
                {caulkBreakdown.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.trimLF}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.ratio}x</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{row.caulkLF}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3}>Total Caulk LF</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{derived.caulkLF || 0}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
