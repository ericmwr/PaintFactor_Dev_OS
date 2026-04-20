// Reverse-lookup panel — shows every module referencing a given task_id
// via task_ref. Used inline in TaskEditor (always expanded) and optionally
// from ModuleEditor rows when the user wants to check blast radius before
// changing a canonical task.

import { useMemo } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

/**
 * Scan modules for task_ref === taskId, summarize which override fields
 * each module sets so the user sees drift at a glance.
 */
export function findTaskUsage(taskId, modules) {
  if (!taskId || !modules) return [];
  const usages = [];
  for (const mod of Object.values(modules)) {
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (entry && entry.task_ref === taskId) {
        // Override fields = any key on the entry other than task_ref itself
        const overrides = Object.keys(entry).filter(k => k !== 'task_ref');
        usages.push({
          module_id: mod.module_id,
          module_name: mod.name,
          phase: mod.phase,
          overrides,
          overrideValues: overrides.reduce((m, k) => ({ ...m, [k]: entry[k] }), {}),
        });
      }
    }
  }
  return usages.sort((a, b) => a.module_id.localeCompare(b.module_id));
}

export default function TaskUsagePanel({ taskId, onNavigateToModule }) {
  const usages = useMemo(
    () => findTaskUsage(taskId, canonicalBundle.modules || {}),
    [taskId]
  );

  if (!taskId) return null;

  const overrideCount = usages.filter(u => u.overrides.length > 0).length;

  return (
    <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--border)', borderRadius: 4, background: 'rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        Where used ({usages.length} modules{overrideCount > 0 ? `, ${overrideCount} with overrides` : ''})
      </div>
      {usages.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No modules reference this task yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {usages.map(u => (
            <div
              key={u.module_id}
              onClick={() => onNavigateToModule && onNavigateToModule(u.module_id)}
              style={{
                padding: '4px 6px',
                fontSize: 11,
                cursor: onNavigateToModule ? 'pointer' : 'default',
                borderRadius: 3,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
              onMouseEnter={e => { if (onNavigateToModule) e.currentTarget.style.background = 'rgba(130, 170, 255, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title={onNavigateToModule ? 'Click to open this module' : u.module_name}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, flex: 1 }}>{u.module_id}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{u.phase}</span>
              {u.overrides.length > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    background: 'var(--accent, #82aaff)',
                    color: '#000',
                    borderRadius: 2,
                  }}
                  title={Object.entries(u.overrideValues).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}
                >
                  overrides: {u.overrides.join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
