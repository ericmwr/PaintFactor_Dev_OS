// Side-by-side comparison panel for the scenario engine vs the legacy
// engine. Renders below the EstimateView header. Toggle persists to
// localStorage so reloads remember the user's preference.
//
// The legacy engine is the source of truth — this panel is read-only
// alongside it and never modifies the project state.

import { useState, useEffect, useMemo } from 'react';
import { useEstimateScenario } from '../../hooks/useEstimateScenario.js';

const STORAGE_KEY = 'paintscope.scenarioEngine.enabled';

function fmtHrs(h) {
  if (!h || h <= 0) return '0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function fmtDelta(scenario, legacy) {
  if (legacy === 0 || legacy == null) return { label: scenario > 0 ? 'NEW' : '—', color: '#888', pct: null };
  const delta = scenario - legacy;
  const pct = (delta / legacy) * 100;
  const color = Math.abs(pct) <= 5 ? '#3a8a3a' : (Math.abs(pct) <= 15 ? '#8a8a3a' : '#8a3a3a');
  const sign = delta >= 0 ? '+' : '';
  return { label: `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(1)}%)`, color, pct };
}

const PHASE_ORDER = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];

export default function ScenarioEnginePanel({ legacyEstimate }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch {}
  }, [enabled]);

  // Always call the hook so its memo cache stays warm. The hook is pure and
  // adds < 50ms even on large projects.
  const scenario = useEstimateScenario();

  const phaseRows = useMemo(() => {
    if (!scenario || !legacyEstimate) return [];
    const allPhases = new Set([
      ...Object.keys(scenario.phaseHours || {}),
      ...PHASE_ORDER.filter(p => (legacyEstimate.phaseHours || {})[p] > 0),
    ]);
    return PHASE_ORDER
      .filter(p => allPhases.has(p))
      .map(p => {
        const lv = (legacyEstimate.phaseHours || {})[p] || 0;
        const sv = (scenario.phaseHours || {})[p] || 0;
        return { phase: p, legacy: lv, scenario: sv, ...fmtDelta(sv, lv) };
      });
  }, [scenario, legacyEstimate]);

  const legacyTotal = legacyEstimate?.totalHours || 0;
  const scenarioTotal = scenario?.totalHours || 0;
  const totalDelta = fmtDelta(scenarioTotal, legacyTotal);

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 6,
      marginBottom: 12,
      background: 'var(--bg-panel, #1a1a1a)',
    }}>
      {/* Header / toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: enabled ? '1px solid var(--border)' : 'none',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => setEnabled(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Scenario Engine (Beta)
          </span>
          {scenario && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {scenario.bundleStats.modules} mods · {scenario.bundleStats.scenarios} scenarios
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {enabled && scenario && (
            <span style={{
              fontSize: 12,
              color: totalDelta.color,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}>
              Δ {totalDelta.label}
            </span>
          )}
          <span style={{
            fontSize: 11,
            color: enabled ? '#3a8a3a' : 'var(--text-muted)',
            fontWeight: 600,
          }}>
            {enabled ? '● ON' : '○ OFF'}
          </span>
        </div>
      </div>

      {/* Body — only when enabled */}
      {enabled && scenario && (
        <div style={{ padding: 12 }}>
          {scenario.error && (
            <div style={{ color: '#f88', fontSize: 12, padding: 8, background: 'rgba(255,0,0,0.1)', borderRadius: 4, marginBottom: 8 }}>
              Engine error: {scenario.error}
            </div>
          )}

          {/* Total comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Legacy Engine</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtHrs(legacyTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{legacyTotal.toFixed(2)} hrs</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Scenario Engine</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtHrs(scenarioTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{scenarioTotal.toFixed(2)} hrs</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delta</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: totalDelta.color }}>{totalDelta.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {scenario.perInputResults.length} matched · {scenario.gaps.length} gaps
              </div>
            </div>
          </div>

          {/* Phase comparison table */}
          {phaseRows.length > 0 && (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px' }}>Phase</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>Legacy</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>Scenario</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {phaseRows.map(r => (
                  <tr key={r.phase} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 6px' }}>{r.phase}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.legacy.toFixed(2)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.scenario.toFixed(2)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: r.color, fontWeight: 600 }}>
                      {r.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Gaps */}
          {scenario.gaps.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: '#c87', fontWeight: 600 }}>
                {scenario.gaps.length} unmatched (room × spec) inputs — click to expand
              </summary>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', maxHeight: 200, overflow: 'auto' }}>
                {scenario.gaps.slice(0, 20).map((g, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px dotted var(--border)' }}>
                    <div><strong>{g.roomLabel}</strong> · {g.specId} · {g.ctx.paintable_item || '(no paintable_item)'}</div>
                    {g.near[0] && (
                      <div style={{ paddingLeft: 12, color: '#888' }}>
                        near-miss: {g.near[0].scenarioId}
                        {g.near[0].mismatches[0] && (
                          <span> — {g.near[0].mismatches[0].key} expected {JSON.stringify(g.near[0].mismatches[0].expected)}, got {JSON.stringify(g.near[0].mismatches[0].got)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {scenario.gaps.length > 20 && (
                  <div style={{ padding: 4, color: '#888' }}>... and {scenario.gaps.length - 20} more</div>
                )}
              </div>
            </details>
          )}

          {/* Per-input results */}
          {scenario.perInputResults.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {scenario.perInputResults.length} matched (room × spec) results — click to expand
              </summary>
              <div style={{ marginTop: 8, fontSize: 11, maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Room</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Spec</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Scenario</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px' }}>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.perInputResults.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '3px 6px' }}>{r.roomLabel}</td>
                        <td style={{ padding: '3px 6px', color: 'var(--text-muted)' }}>{r.specId}</td>
                        <td style={{ padding: '3px 6px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{r.scenarioId}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.totalHours.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {scenario.warnings.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, color: '#aa8', fontWeight: 600 }}>
                {scenario.warnings.length} warnings
              </summary>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', maxHeight: 150, overflow: 'auto' }}>
                {scenario.warnings.slice(0, 30).map((w, i) => (
                  <div key={i} style={{ padding: '2px 0' }}>· {w}</div>
                ))}
                {scenario.warnings.length > 30 && <div>... and {scenario.warnings.length - 30} more</div>}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
