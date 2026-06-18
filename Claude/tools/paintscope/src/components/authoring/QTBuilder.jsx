// QT Builder — read-only tier ladder (Phase 2a). Pick Substrate / Method /
// State / Coating; see, per quality tier (QT2-QT5), which tasks fire, are
// added, or are skipped. Editing arrives in a later sub-phase. All derivation
// lives in ./qt-builder/derive-tier-ladder.js; this file is presentation only.

import { Fragment, useMemo, useState } from 'react';
import bundle from '../../data/scenario-bundle.gen.js';
import { PHASE_ORDER } from '../../data/constants.js';
import { listSubstrates, listDimensions, deriveTierLadder } from './qt-builder/derive-tier-ladder.js';

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/^SS_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const CELL = {
  fires: { icon: '✓', color: 'var(--text)' },
  added: { icon: '+', color: 'var(--accent, #82aaff)' },
  skip:  { icon: '·', color: 'var(--text-muted)' },
  na:    { icon: '—', color: 'var(--text-muted)' },
};

export default function QTBuilder() {
  const substrates = useMemo(() => listSubstrates(bundle), []);
  const [substrate, setSubstrate] = useState(substrates[0] || '');
  const dims = useMemo(() => listDimensions(bundle, substrate), [substrate]);
  const [method, setMethod] = useState('');
  const [state, setState] = useState('');
  const [coating, setCoating] = useState('');

  // Keep each selection valid as the substrate changes (fall back to first).
  const effMethod = dims.methods.includes(method) ? method : (dims.methods[0] || '');
  const effState = dims.states.includes(state) ? state : (dims.states[0] || '');
  const effCoating = dims.coatings.includes(coating)
    ? coating
    : (dims.coatings.includes('paint') ? 'paint' : (dims.coatings[0] || ''));

  const ladder = useMemo(() => {
    if (!substrate || !effMethod || !effState) return null;
    return deriveTierLadder(bundle, {
      paintable_item: substrate, application_method: effMethod,
      substrate_state: effState, coating_type: effCoating,
    });
  }, [substrate, effMethod, effState, effCoating]);

  const grouped = useMemo(() => {
    if (!ladder) return [];
    const byPhase = new Map();
    for (const r of ladder.rows) {
      if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
      byPhase.get(r.phase).push(r);
    }
    return [...byPhase.entries()].sort((a, b) => {
      const ia = PHASE_ORDER.indexOf(a[0]); const ib = PHASE_ORDER.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [ladder]);

  const tiers = ladder?.tiers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={labelStyle}>Substrate
          <select value={substrate} onChange={e => setSubstrate(e.target.value)} style={{ ...inputStyle, width: 180 }}>
            {substrates.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Method
          <select value={effMethod} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.methods.map(m => <option key={m} value={m}>{humanize(m)}</option>)}
          </select>
        </label>
        <label style={labelStyle}>From state
          <select value={effState} onChange={e => setState(e.target.value)} style={{ ...inputStyle, width: 150 }}>
            {dims.states.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
        </label>
        {dims.coatings.length > 1 && (
          <label style={labelStyle}>Coating
            <select value={effCoating} onChange={e => setCoating(e.target.value)} style={{ ...inputStyle, width: 130 }}>
              {dims.coatings.map(c => <option key={c} value={c}>{humanize(c)}</option>)}
            </select>
          </label>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingBottom: 4 }}>read-only · editing in a later phase</div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span><b style={{ color: 'var(--text)' }}>✓</b> fires</span>
        <span><b style={{ color: 'var(--accent, #82aaff)' }}>+</b> added at tier</span>
        <span><b>·</b> skipped</span>
        <span><b>—</b> tier not served</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 3 }}>
        {!ladder ? (
          <div style={emptyStyle}>Pick a substrate, method, and state.</div>
        ) : ladder.rows.length === 0 ? (
          <div style={emptyStyle}>No scenario matched this combination.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 300 }}>Task</th>
                {tiers.map(t => (
                  <th key={t} style={thStyle}>
                    {t}
                    {t === ladder.baseline && <span style={baselineBadge}>baseline</span>}
                    {!ladder.served.includes(t) && <div style={{ fontSize: 8, fontWeight: 400 }}>n/a</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([phase, rows]) => (
                <Fragment key={phase}>
                  <tr><td colSpan={tiers.length + 1} style={phaseStyle}>{humanize(phase)}</td></tr>
                  {rows.map(r => (
                    <tr key={r.task_id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px', textAlign: 'left' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.task_id}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{r.name}</span>
                      </td>
                      {tiers.map(t => {
                        const c = CELL[r.cells[t]] || CELL.na;
                        return <td key={t} style={{ textAlign: 'center', padding: '6px 8px', color: c.color, fontWeight: r.cells[t] === 'added' ? 600 : 400 }}>{c.icon}</td>;
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ladder?.warnings?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          {ladder.warnings.length} matcher note(s) — first: {ladder.warnings[0]}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' };
const inputStyle = { padding: '4px 6px', fontSize: 11, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3 };
const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' };
const phaseStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)' };
const baselineBadge = { marginLeft: 6, fontSize: 8, fontWeight: 400, padding: '0 5px', borderRadius: 8, background: 'rgba(130,170,255,0.2)', color: 'var(--accent, #82aaff)', textTransform: 'none' };
const emptyStyle = { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 };
