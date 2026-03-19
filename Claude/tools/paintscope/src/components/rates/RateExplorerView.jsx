import { useState, useMemo } from 'react';
import { DB_BUNDLE } from '../../data/db-bundle';
import { useRateOverlays } from '../../hooks/useRateOverlays';
import RateRow from './RateRow';
import ModifierOverridePanel from './ModifierOverridePanel';

export default function RateExplorerView() {
  const { overlayMap, setOverride, resetOverride, loading } = useRateOverlays();
  const [selectedSpecId, setSelectedSpecId] = useState(null);
  const [search, setSearch] = useState('');
  const [showModifiers, setShowModifiers] = useState(false);

  const specs = useMemo(() => {
    return DB_BUNDLE.spec_families.map(sf => ({
      id: sf.spec_family_id,
      name: sf.display_name || sf.spec_family_id,
      substrate: sf.substrate_type,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedSpec = specs.find(s => s.id === selectedSpecId);

  const tasks = useMemo(() => {
    if (!selectedSpecId) return [];
    // Get tasks for this spec
    const modules = DB_BUNDLE.sop_modules.filter(m => m.spec_family_id === selectedSpecId);
    const moduleIds = new Set(modules.map(m => m.module_id));
    const specTasks = DB_BUNDLE.sop_tasks.filter(t => moduleIds.has(t.module_id));

    return specTasks.map(task => {
      // Find production rate
      const rate = DB_BUNDLE.task_production_rates.find(r => r.task_id === task.task_id);
      const module = modules.find(m => m.module_id === task.module_id);
      return {
        ...task,
        rate,
        phase: module?.phase || '?',
        moduleName: module?.module_name || module?.module_id,
      };
    }).filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (t.task_name || t.task_id).toLowerCase().includes(q)
        || (t.phase || '').toLowerCase().includes(q);
    });
  }, [selectedSpecId, search]);

  if (loading) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading overlays...</div>;

  return (
    <div style={{ padding: 16, display: 'flex', gap: 16, height: '100%' }}>
      {/* Spec List */}
      <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Spec Families ({specs.length})</h3>
        {specs.map(s => (
          <div
            key={s.id}
            onClick={() => { setSelectedSpecId(s.id); setShowModifiers(false); }}
            style={{
              padding: '6px 8px',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              background: s.id === selectedSpecId ? 'rgba(130, 170, 255, 0.12)' : 'transparent',
              borderLeft: s.id === selectedSpecId ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: 2,
            }}
          >
            <div style={{ fontWeight: s.id === selectedSpecId ? 600 : 400 }}>{s.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.id}</div>
          </div>
        ))}
      </div>

      {/* Task Detail */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedSpecId ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a spec family to view production rates
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>{selectedSpec?.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${showModifiers ? 'btn-accent' : ''}`}
                  onClick={() => setShowModifiers(!showModifiers)}
                  style={{ fontSize: 11 }}
                >Modifiers</button>
              </div>
            </div>

            {showModifiers ? (
              <ModifierOverridePanel specFamilyId={selectedSpecId} />
            ) : (
              <>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  style={{ width: '100%', padding: '6px 10px', fontSize: 12, marginBottom: 12 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {tasks.length} tasks
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Task</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: 70 }}>Phase</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: 50 }}>UOM</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: 100 }}>Base Rate</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: 100 }}>Override</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <RateRow
                        key={task.task_id}
                        task={task}
                        specFamilyId={selectedSpecId}
                        overlayMap={overlayMap}
                        onSetOverride={setOverride}
                        onResetOverride={resetOverride}
                      />
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
