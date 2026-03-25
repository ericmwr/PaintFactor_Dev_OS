import { useState, useMemo } from 'react';
import { useSpecData } from '../../hooks/useSpecData';

export default function TaskPickerModal({ onSelect, onClose }) {
  const { specData } = useSpecData();
  const [search, setSearch] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [checked, setChecked] = useState(new Set());

  const specs = useMemo(() => {
    return specData.spec_families.map(sf => ({
      id: sf.spec_family_id,
      name: sf.display_name || sf.spec_family_id,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const tasks = useMemo(() => {
    let allTasks = [];
    const specFilter = selectedSpecId || null;

    const modules = specFilter
      ? specData.sop_modules.filter(m => m.spec_family_id === specFilter)
      : specData.sop_modules;

    const moduleMap = {};
    for (const m of modules) {
      moduleMap[m.module_id] = m;
    }

    const moduleIds = new Set(Object.keys(moduleMap));
    const filteredTasks = specData.sop_tasks.filter(t => moduleIds.has(t.module_id));

    for (const task of filteredTasks) {
      const mod = moduleMap[task.module_id];
      allTasks.push({
        ...task,
        phase: mod?.phase || '',
        spec_family_id: mod?.spec_family_id || '',
      });
    }

    if (search) {
      const q = search.toLowerCase();
      allTasks = allTasks.filter(t => (t.task_name || t.task_id).toLowerCase().includes(q));
    }

    return allTasks.slice(0, 100); // Limit for performance
  }, [selectedSpecId, search]);

  const toggle = (taskId) => {
    const next = new Set(checked);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setChecked(next);
  };

  const handleConfirm = () => {
    const selected = tasks.filter(t => checked.has(t.task_id));
    onSelect(selected);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 20, width: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Pick Tasks from Database</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={selectedSpecId} onChange={e => setSelectedSpecId(e.target.value)} style={{ fontSize: 12, flex: 1 }}>
            <option value="">All specs</option>
            {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{ fontSize: 12, flex: 1 }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                <th style={{ padding: '4px 6px', width: 30 }}></th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>Task</th>
                <th style={{ padding: '4px 6px', textAlign: 'left', width: 70 }}>Phase</th>
                <th style={{ padding: '4px 6px', textAlign: 'left', width: 50 }}>UOM</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.task_id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => toggle(t.task_id)}>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <input type="checkbox" checked={checked.has(t.task_id)} onChange={() => {}} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <div>{t.task_name || t.task_id}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.spec_family_id}</div>
                  </td>
                  <td style={{ padding: '4px 6px', fontSize: 11 }}>{t.phase}</td>
                  <td style={{ padding: '4px 6px', fontSize: 11 }}>{t.unit_of_measure || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 100 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8, textAlign: 'center' }}>
              Showing first 100 results. Narrow your search to see more.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{checked.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={onClose} style={{ fontSize: 12 }}>Cancel</button>
            <button className="btn btn-accent" onClick={handleConfirm} disabled={checked.size === 0} style={{ fontSize: 12 }}>
              Add Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
