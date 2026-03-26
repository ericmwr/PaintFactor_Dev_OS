import { useState } from 'react';
import Select from '../shared/Select';
import SubstrateStateSelect from './SubstrateStateSelect';
import { ENUMS } from '../../data/enums';

export default function StairwayComponentRow({ label, uom, derivedValue, component, onUpdate, extraFields }) {
  const [expanded, setExpanded] = useState(false);
  if (!component) return null;

  const isCount = component.count !== undefined;
  const overrideKey = isCount ? 'count_override' : 'lf_override';
  const valueKey = isCount ? 'count' : 'lf';
  const isOverride = !!component[overrideKey];
  const displayValue = isOverride ? component[valueKey] : derivedValue;

  const set = (field, value) => onUpdate({ ...component, [field]: value });

  const isBareWood = component.substrate_state === 'bare_wood';
  const coatingType = component.coating_type || 'paint';
  const painting = component.enabled !== false;

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, marginBottom: 4, borderLeft: expanded && painting ? '2px solid var(--accent)' : '2px solid transparent', opacity: painting ? 1 : 0.5 }}>
      <div onClick={() => painting && setExpanded(!expanded)}
        style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: painting ? 'pointer' : 'default' }}>
        <input type="checkbox" checked={painting} onClick={e => e.stopPropagation()}
          onChange={e => set('enabled', e.target.checked)}
          style={{ marginRight: 2 }} />
        <span style={{ color: expanded && painting ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10 }}>{expanded && painting ? '▼' : '▶'}</span>
        <span style={{ fontWeight: 600, color: painting ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12, flex: 1 }}>{label}</span>
        {painting && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOverride ? (
            <>
              <input type="number" value={component[valueKey] || ''} min="0"
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); set(valueKey, parseFloat(e.target.value) || 0); }}
                style={{ width: 50, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border)', color: 'var(--accent)', borderRadius: 3, padding: '2px' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{uom}</span>
              <span className="badge badge-manual" style={{ fontSize: 9 }}>manual</span>
              <span onClick={e => { e.stopPropagation(); set(overrideKey, false); set(valueKey, null); }}
                style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>reset</span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{Math.round(displayValue * 10) / 10}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{uom}</span>
              <span className="badge badge-auto" style={{ fontSize: 9 }}>auto</span>
              <span onClick={e => { e.stopPropagation(); set(overrideKey, true); set(valueKey, Math.round(displayValue)); }}
                style={{ fontSize: 9, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>override</span>
            </>
          )}
        </div>}
      </div>

      {expanded && painting && (
        <div style={{ padding: '0 10px 8px' }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="field-label">Substrate State</div>
              <SubstrateStateSelect substrateId="stairway" value={component.substrate_state} onChange={v => set('substrate_state', v)} />
            </div>
            <div>
              <div className="field-label">Quality Tier</div>
              <Select options={ENUMS.qualityTiers} value={component.quality_tier || null} onChange={v => set('quality_tier', v || null)} placeholder="Project Default" />
            </div>
            <div>
              <div className="field-label">Application Method</div>
              <Select options={ENUMS.applicationMethods.filter(m => ['brush', 'spray'].includes(m.value))} value={component.application_method} onChange={v => set('application_method', v || null)} placeholder="Default (brush)" />
            </div>
            {isBareWood && (
              <div>
                <div className="field-label">Coating Type</div>
                <Select options={ENUMS.intCoatingTypes} value={coatingType} onChange={v => set('coating_type', v)} />
              </div>
            )}
          </div>
          {isBareWood && coatingType === 'paint' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginTop: 4 }}>
              <input type="checkbox" checked={!!component.grain_fill} onChange={e => set('grain_fill', e.target.checked)} />
              <span style={{ fontSize: 11 }}>Fill open grain before painting</span>
            </div>
          )}
          {extraFields}
        </div>
      )}
    </div>
  );
}
