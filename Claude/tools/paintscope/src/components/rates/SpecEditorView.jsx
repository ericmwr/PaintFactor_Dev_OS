import { useState, useMemo } from 'react';
import { useSpecData } from '../../hooks/useSpecData';
import ModuleAccordion from './ModuleAccordion';
import RequiredInputsBar from './RequiredInputsBar';

const PHASE_OPTIONS = ['setup', 'prep', 'prime', 'interstage', 'apply', 'finish', 'cleanup'];

export default function SpecEditorView() {
  const { specData, dispatch, dirty, resetAll, resetSpec, exportBundle } = useSpecData();
  const [selectedSpecId, setSelectedSpecId] = useState(null);
  const [filter, setFilter] = useState('');

  // Group specs by domain
  const specGroups = useMemo(() => {
    const interior = [];
    const exterior = [];
    for (const sf of specData.spec_families) {
      const entry = { id: sf.id, name: sf.name || sf.id, domain: sf.domain };
      if (sf.domain === 'exterior') exterior.push(entry);
      else interior.push(entry);
    }
    interior.sort((a, b) => a.name.localeCompare(b.name));
    exterior.sort((a, b) => a.name.localeCompare(b.name));
    return { interior, exterior };
  }, [specData.spec_families]);

  // Filter
  const filterLower = filter.toLowerCase();
  const filterSpec = (s) => !filter || s.name.toLowerCase().includes(filterLower) || s.id.toLowerCase().includes(filterLower);

  // Selected spec data
  const modules = useMemo(() => {
    if (!selectedSpecId) return [];
    return specData.sop_modules
      .filter(m => m.spec_family_id === selectedSpecId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [selectedSpecId, specData.sop_modules]);

  const tasks = useMemo(() => {
    if (!selectedSpecId) return [];
    return specData.sop_tasks.filter(t => t.spec_family_id === selectedSpecId);
  }, [selectedSpecId, specData.sop_tasks]);

  const rates = useMemo(() => {
    if (!selectedSpecId) return [];
    return specData.task_production_rates.filter(r => r.spec_family_id === selectedSpecId);
  }, [selectedSpecId, specData.task_production_rates]);

  // PS key options for dropdowns
  const psKeyOptions = useMemo(() => {
    if (!selectedSpecId) return [];
    const fromInputs = specData.spec_required_inputs
      .filter(i => i.spec_family_id === selectedSpecId && i.paintscope_key)
      .map(i => i.paintscope_key);
    const fromRates = rates.filter(r => r.paintscope_key).map(r => r.paintscope_key);
    return [...new Set([...fromInputs, ...fromRates])].sort();
  }, [selectedSpecId, specData.spec_required_inputs, rates]);

  const selectedSpec = specData.spec_families.find(sf => sf.id === selectedSpecId);
  const addModule = (phase) => dispatch({ type: 'ADD_MODULE', payload: { specId: selectedSpecId, phase } });

  const renderSpecList = (specs) => specs.filter(filterSpec).map(s => (
    <div key={s.id} onClick={() => setSelectedSpecId(s.id)}
      style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer', borderRadius: '0 4px 4px 0', marginBottom: 1,
        color: s.id === selectedSpecId ? 'var(--text-primary)' : 'var(--text-muted)',
        fontWeight: s.id === selectedSpecId ? 600 : 400,
        background: s.id === selectedSpecId ? 'rgba(130,170,255,0.08)' : 'transparent',
        borderLeft: s.id === selectedSpecId ? '2px solid var(--accent)' : '2px solid transparent' }}>
      {s.name}
    </div>
  ));

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 8 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', marginBottom: 4 }}>
          Spec Families ({specGroups.interior.length + specGroups.exterior.length})
        </div>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter specs..."
          style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 4, fontSize: 11, marginBottom: 6 }} />

        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', marginTop: 4 }}>Interior ({specGroups.interior.length})</div>
        {renderSpecList(specGroups.interior)}

        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', marginTop: 8 }}>Exterior ({specGroups.exterior.length})</div>
        {renderSpecList(specGroups.exterior)}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedSpecId ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Select a spec family to view and edit</div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ background: 'var(--bg-card)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedSpecId}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>{selectedSpec?.name}</span>
                  <span style={{ margin: '0 6px' }}>·</span>
                  <span>{modules.length} modules</span>
                  <span style={{ margin: '0 6px' }}>·</span>
                  <span>{tasks.length} tasks</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {dirty && <span style={{ fontSize: 10, color: '#e6a020' }}>● unsaved changes</span>}
                <button onClick={() => resetSpec(selectedSpecId)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Discard</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              <RequiredInputsBar specId={selectedSpecId} />

              {modules.map(mod => {
                const modTasks = tasks.filter(t => t.module_id === mod.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                return <ModuleAccordion key={mod.id} module={mod} specId={selectedSpecId} tasks={modTasks} rates={rates} psKeyOptions={psKeyOptions} />;
              })}

              {/* Add Module */}
              <div style={{ padding: '8px 0', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Add module:</span>
                {PHASE_OPTIONS.map(phase => (
                  <button key={phase} onClick={() => addModule(phase)}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>{phase}</button>
                ))}
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ background: 'var(--bg-card)', padding: '6px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Working copy auto-saved to IndexedDB</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={exportBundle}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Export Bundle</button>
                <button onClick={resetAll}
                  style={{ background: 'none', border: '1px solid var(--border)', color: '#e74c3c', padding: '3px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Reset All to Base</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
