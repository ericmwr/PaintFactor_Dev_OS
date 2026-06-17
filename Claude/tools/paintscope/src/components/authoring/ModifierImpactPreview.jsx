// Shows how the module-in-edit reacts to each modifier at every factor key
// defined on that modifier. Reads merged bundle (canonical + user drafts) so
// newly-authored factors (e.g. adding 'popcorn' to FAC_TEXTURE) flow through
// immediately.
//
// One row per (modifier × factor key). Grayed rows mean the module's
// modifier_eligibility for that modifier is off.

import { useMemo } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { useModifierDrafts } from '../../hooks/useModifierDrafts.js';

// Modifiers we surface impact for. Order matches importance for interior work.
const STATIC_IDS = ['FAC_QT', 'FAC_HEIGHT', 'FAC_TEXTURE', 'FAC_COMPLEXITY', 'FAC_CONDITION'];

// Humanize a factor key for display (e.g. 'orange_peel' → 'orange peel').
// All-caps tokens like 'STD', 'QT3' are preserved.
function humanize(k) {
  return String(k)
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(w => (w.length <= 3 && w === w.toUpperCase()) ? w : w.toLowerCase())
    .join(' ');
}

function pctDelta(factor) {
  if (factor === 1.0) return '—';
  const pct = Math.round((factor - 1) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}%`;
}

function deltaColor(factor) {
  if (factor === 1.0) return 'var(--text-muted)';
  if (factor < 1.0) return '#5aa85a';   // faster = good
  return '#c87';                         // slower = warm
}

export default function ModifierImpactPreview({ modulePayload }) {
  const { drafts } = useModifierDrafts();

  // Build the merged modifier definitions: drafts win over canonical.
  const mergedModifiers = useMemo(() => {
    const canonical = canonicalBundle.modifiers || {};
    const overlay = {};
    for (const d of drafts) overlay[d.id] = d.payload || d;
    return { ...canonical, ...overlay };
  }, [drafts]);

  const rows = useMemo(() => {
    const elig = modulePayload?.modifier_eligibility || {};
    const out = [];

    for (const modId of STATIC_IDS) {
      const def = mergedModifiers[modId];
      if (!def || !def.factors) continue;
      const eligFlag = def.eligibility_key || '';
      const isEligible = elig[eligFlag] === true;

      // Iterate the modifier's own factor keys — new factors authored via the
      // Modifier Editor show up here automatically.
      for (const key of Object.keys(def.factors)) {
        const factor = isEligible ? (def.factors[key] ?? 1) : 1;
        out.push({
          modId,
          sample: humanize(key),
          eligible: isEligible,
          factor,
        });
      }
    }
    return out;
  }, [modulePayload, mergedModifiers]);

  if (!modulePayload) return null;

  return (
    <div>
      <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>MODIFIER IMPACT</h4>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
        How this module's rates scale when each static modifier fires, across every factor key.
        Grayed rows mean eligibility is off — modifier is ignored.
      </div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Modifier</th>
            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Key</th>
            <th style={{ textAlign: 'right', padding: '3px 4px' }}>Factor</th>
            <th style={{ textAlign: 'right', padding: '3px 4px' }}>Effect</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{
                borderTop: '1px dotted var(--border)',
                opacity: r.eligible ? 1 : 0.35,
              }}
            >
              <td style={{ padding: '3px 4px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.modId}</td>
              <td style={{ padding: '3px 4px' }}>{r.sample}</td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                {r.factor.toFixed(2)}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', color: deltaColor(r.factor), fontWeight: 600 }}>
                {pctDelta(r.factor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
