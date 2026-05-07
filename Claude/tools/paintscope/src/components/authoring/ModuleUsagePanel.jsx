// Reverse-lookup panel — shows every scenario referencing a given
// module_id via its `modules: [...]` array. Mirrors TaskUsagePanel; sits
// inside ModuleEditor so the user can answer "where does this module
// run?" without crawling scenario JSON.

import { useMemo } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

/**
 * Scan scenarios for module_id occurrences in their modules array.
 * Captures position so the user can spot when a module appears in an
 * unusual phase order across scenarios (rare drift signal).
 */
export function findModuleUsage(moduleId, scenarios) {
  if (!moduleId || !Array.isArray(scenarios)) return [];
  const usages = [];
  for (const sc of scenarios) {
    const list = Array.isArray(sc.modules) ? sc.modules : [];
    const positions = [];
    list.forEach((m, i) => { if (m === moduleId) positions.push(i); });
    if (positions.length === 0) continue;
    usages.push({
      scenario_id: sc.scenario_id || sc.id,
      scenario_name: sc.name || sc.scenario_id,
      spec_family: sc.spec_family_id || null,
      positions,
      moduleCount: list.length,
    });
  }
  return usages.sort((a, b) => (a.scenario_id || '').localeCompare(b.scenario_id || ''));
}

export default function ModuleUsagePanel({ moduleId, onNavigateToScenario }) {
  const usages = useMemo(
    () => findModuleUsage(moduleId, canonicalBundle.scenarios || []),
    [moduleId]
  );

  if (!moduleId) return null;

  return (
    <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--border)', borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        Where used ({usages.length} scenario{usages.length === 1 ? '' : 's'})
      </div>
      {usages.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No scenarios reference this module yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {usages.map(u => (
            <div
              key={u.scenario_id}
              onClick={() => onNavigateToScenario && onNavigateToScenario(u.scenario_id)}
              style={{
                padding: '4px 6px',
                fontSize: 11,
                cursor: onNavigateToScenario ? 'pointer' : 'default',
                borderRadius: 3,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
              onMouseEnter={e => { if (onNavigateToScenario) e.currentTarget.style.background = 'rgba(130, 170, 255, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title={onNavigateToScenario ? 'Click to open this scenario' : u.scenario_name}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, flex: 1 }}>{u.scenario_id}</span>
              {u.spec_family && (
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{u.spec_family}</span>
              )}
              <span
                style={{ fontSize: 9, color: 'var(--text-muted)' }}
                title={`Position${u.positions.length > 1 ? 's' : ''} in scenario.modules array`}
              >
                pos {u.positions.join(',')}/{u.moduleCount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
