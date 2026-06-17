// Live "will-match" preview for a scenario draft. Injects the draft into
// a cloned bundle, runs findBestMatch against a set of sample contexts,
// and shows which scenario wins each. Useful for catching collisions.

import { useMemo } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { findBestMatch } from '../../engine/scenario-matcher.js';

// Minimal sample contexts spanning the common match axes. Admin can
// extend by editing here; good enough to spot collisions.
const SAMPLE_CONTEXTS = [
  { label: 'QT3 drywall wall, spray, bare',        ctx: { paintable_item: 'drywall', surface: 'wall', quality_tier: 'QT3', application_method: 'spray', substrate_state: 'SS_BARE' } },
  { label: 'QT4 drywall wall, spray, primed',      ctx: { paintable_item: 'drywall', surface: 'wall', quality_tier: 'QT4', application_method: 'spray', substrate_state: 'SS_PRIMED' } },
  { label: 'QT3 drywall ceiling, brush, bare',     ctx: { paintable_item: 'drywall', surface: 'ceiling', quality_tier: 'QT3', application_method: 'brush', substrate_state: 'SS_BARE' } },
  { label: 'QT3 trim, brush, bare',                ctx: { paintable_item: 'int_trim', quality_tier: 'QT3', application_method: 'brush', substrate_state: 'SS_BARE' } },
  { label: 'QT3 cabinet, spray, factory-primed',   ctx: { paintable_item: 'int_cabinet', quality_tier: 'QT3', application_method: 'spray', substrate_state: 'SS_FACTORY_PRIMED' } },
  { label: 'Ext siding RP, brush, sound',          ctx: { paintable_item: 'ext_siding', context: 'RP', application_method: 'brush_roll', substrate_state: 'SS_EXT_SOUND_PAINT' } },
];

export default function MatchPreview({ draftScenario }) {
  const rows = useMemo(() => {
    if (!draftScenario || !draftScenario.scenario_id) return [];
    // Build an overlay bundle that includes the draft.
    const scenarios = [
      ...canonicalBundle.scenarios.filter(s => s.scenario_id !== draftScenario.scenario_id),
      draftScenario,
    ];
    const overlayBundle = { modules: canonicalBundle.modules, scenarios };

    return SAMPLE_CONTEXTS.map(sc => {
      const info = findBestMatch(overlayBundle, sc.ctx);
      const wonByDraft = info.scenario?.scenario_id === draftScenario.scenario_id;
      return { ...sc, info, wonByDraft };
    });
  }, [draftScenario]);

  if (!rows.length) return <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enter scenario_id + matches to preview.</div>;

  return (
    <div style={{ fontSize: 11 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--text-muted)' }}>MATCH PREVIEW</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Context</th>
            <th style={{ textAlign: 'left', padding: '3px 4px' }}>Winner</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px dotted var(--border)' }}>
              <td style={{ padding: '3px 4px' }}>{r.label}</td>
              <td style={{ padding: '3px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, color: r.wonByDraft ? '#5aa85a' : 'var(--text-muted)' }}>
                {r.wonByDraft && '★ '}
                {r.info.scenario ? r.info.scenario.scenario_id : '(no match)'}
                {r.info.tied && <span style={{ color: '#e0b84a' }}> — TIE</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
