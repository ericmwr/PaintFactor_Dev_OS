import Select from '../shared/Select';
import NumField from '../shared/NumField';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../../data/substrate-catalog';

export default function SubstrateDetailPanel({ room, derived, dispatch, substrateId, project }) {
  const rid = room.id;
  const config = room.substrates[substrateId];
  if (!config) return null;
  const cat = SUBSTRATE_MAP[substrateId];
  if (!cat) return null;

  const setSub = (f, v) => dispatch({ type: 'SET_SUBSTRATE', payload: { roomId: rid, substrateId, field: f, value: v } });

  // Determine derived value and UOM
  const uom = cat.uom;
  const hasAuto = !!cat.autoDerive;
  let autoDerivedVal = 0;
  if (hasAuto) {
    // Look up the derived value by key convention
    const dKey = Object.keys(derived).find(k => k.startsWith(substrateId.replace(/_/g, '_')));
    if (dKey) autoDerivedVal = derived[dKey] || 0;
    else autoDerivedVal = cat.autoDerive({
      perimeter: derived.perimeter,
      totalDoors: derived.totalDoors,
      totalWindows: derived.totalWindows,
      totalOpenings: derived.totalOpenings,
      openingCasingLF: derived.openingCasingLF,
      wall_field_sf: derived.wall_field_sf,
      ceiling_field_sf: derived.ceiling_field_sf,
    }) || 0;
  }

  // For SF-based surfaces (walls, ceiling)
  const isSF = uom === 'SF' && (config.sf_override !== undefined || config.sf_manual !== undefined);
  // For LF-based substrates
  const isLF = uom === 'LF';
  // For EA-based substrates (specialty)
  const isEA = uom === 'EA' && config.ea_manual !== undefined;
  // For EA-auto (door_frames, window_jamb)
  const isEAAuto = uom === 'EA' && config.ea_manual === undefined;

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">{cat.label} Details</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Substrate State</div>
            <SubstrateStateSelect substrateId={substrateId} value={config.substrate_state} onChange={v => setSub('substrate_state', v)} />
          </div>

          {/* Quality Tier per-substrate override */}
          <div>
            <div className="field-label">Quality Tier</div>
            <Select options={ENUMS.qualityTiers} value={config.quality_tier || null} onChange={v => setSub('quality_tier', v || null)} placeholder={`Project Default (${project?.default_quality_tier || 'QT3'})`} />
          </div>

          {/* Application Method per-substrate */}
          {config.application_method !== undefined && (() => {
            const sam = SUBSTRATE_APPLICATION_METHODS[substrateId];
            if (!sam) return null;
            const methodOptions = ENUMS.applicationMethods.filter(m => sam.methods.includes(m.value));
            return (
              <div>
                <div className="field-label">Application Method</div>
                <Select options={methodOptions} value={config.application_method} onChange={v => setSub('application_method', v || null)} placeholder={`Default (${sam.default})`} />
              </div>
            );
          })()}

          {/* Texture for walls/ceiling */}
          {config.texture !== undefined && (
            <div>
              <div className="field-label">Texture (null = project default)</div>
              <Select options={ENUMS.textures} value={config.texture} onChange={v => setSub('texture', v || null)} placeholder="Project Default" />
            </div>
          )}

          {/* Style for casing types */}
          {config.style !== undefined && (
            <div>
              <div className="field-label">Profile Style</div>
              <input value={config.style || ''} onChange={e => setSub('style', e.target.value || null)} style={{ width: '100%' }} placeholder="e.g. Colonial, Craftsman" />
            </div>
          )}
        </div>
      </div>

      {/* Quantity section */}
      <div className="panel-section">
        <div className="section-title">Quantity ({uom})</div>

        {/* SF with override (walls, ceiling) */}
        {isSF && hasAuto && (
          <div>
            <NumField value={config.sf_manual || ''} derived={Math.round(autoDerivedVal)} isOverride={!!config.sf_override}
              onValueChange={v => setSub('sf_manual', v)} onOverrideToggle={v => setSub('sf_override', v)} uom="SF" />
            {substrateId === 'walls' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Gross {derived.wallGross} - Deduct {derived.openingDeduction} = Net {derived.wallNet}{derived.gableExtra > 0 ? ` + Gable ${derived.gableExtra}` : ''}</div>}
            {substrateId === 'ceiling' && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>L&times;W = {derived.ceilingSF}{derived.vaultedExtra > 0 ? ` + Vault ${derived.vaultedExtra}` : ''}</div>}
          </div>
        )}

        {/* SF manual-only (specialty SF items) */}
        {isSF && !hasAuto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.sf_manual || ''} onChange={e => setSub('sf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SF</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* LF with auto-derive */}
        {isLF && hasAuto && (
          <div>
            <NumField value={config.lf_manual || ''} derived={Math.round(autoDerivedVal)} isOverride={!!config.lf_override}
              onValueChange={v => setSub('lf_manual', v)} onOverrideToggle={v => setSub('lf_override', v)} uom="LF" />
          </div>
        )}

        {/* LF manual-only (chair rail, shoe mold, etc.) */}
        {isLF && !hasAuto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.lf_manual || ''} onChange={e => setSub('lf_manual', parseFloat(e.target.value) || 0)} min="0" style={{ width: 100 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>LF</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* EA manual (specialty) */}
        {isEA && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={config.ea_manual || ''} onChange={e => setSub('ea_manual', parseInt(e.target.value) || 0)} min="0" style={{ width: 80 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>EA</span>
            <span className="badge badge-manual">manual</span>
          </div>
        )}

        {/* EA auto-derived (door_frames, window_jamb) */}
        {isEAAuto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>{Math.round(autoDerivedVal)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>EA (auto-derived)</span>
            <span className="badge badge-auto">auto</span>
          </div>
        )}
      </div>
    </div>
  );
}
