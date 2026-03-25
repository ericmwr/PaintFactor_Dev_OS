import { useState } from 'react';
import TaskEditRow from './TaskEditRow';
import ModifierPanel from './ModifierPanel';
import AppliesWhenChip from './AppliesWhenChip';
import { useSpecData } from '../../hooks/useSpecData';

export default function ModuleAccordion({ module, specId, tasks, rates, psKeyOptions }) {
  const [expanded, setExpanded] = useState(false);
  const { dispatch } = useSpecData();

  const addTask = () => dispatch({ type: 'ADD_TASK', payload: { specId, moduleId: module.id } });
  const removeModule = () => { if (confirm(`Delete module "${module.name}" and its ${tasks.length} tasks?`)) dispatch({ type: 'REMOVE_MODULE', payload: { moduleId: module.id } }); };

  const swapTasks = (idxA, idxB) => {
    const a = tasks[idxA];
    const b = tasks[idxB];
    if (!a || !b) return;
    dispatch({ type: 'UPDATE_TASK', payload: { specId, taskId: a.id, field: 'sort_order', value: b.sort_order ?? idxB } });
    dispatch({ type: 'UPDATE_TASK', payload: { specId, taskId: b.id, field: 'sort_order', value: a.sort_order ?? idxA } });
  };

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, marginBottom: 4, borderLeft: expanded ? '2px solid var(--accent)' : '2px solid transparent' }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: expanded ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontWeight: 600, color: expanded ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{module.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tasks.length} tasks</span>
          <AppliesWhenChip value={module.applies_when} label="Module"
            onChange={v => dispatch({ type: 'UPDATE_MODULE', payload: { moduleId: module.id, field: 'applies_when', value: v } })} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-badge, #1a2a3a)', borderRadius: 3, color: expanded ? 'var(--accent)' : 'var(--text-muted)' }}>{module.phase}</span>
          {expanded && (
            <span onClick={e => { e.stopPropagation(); removeModule(); }}
              style={{ color: '#e74c3c', cursor: 'pointer', fontSize: 14, padding: '0 4px' }} title="Delete module">×</span>
          )}
          {expanded && (
            <button onClick={e => { e.stopPropagation(); addTask(); }}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer' }}>+ Task</button>
          )}
        </div>
      </div>

      {/* Task table */}
      {expanded && (
        <div style={{ padding: '0 6px 8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle, #1a2a3a)' }}>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '28%' }}>Task Name</th>
                <th style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '10%' }}>Rate/hr</th>
                <th style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '8%' }}>UOM</th>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '24%' }}>PS Key</th>
                <th style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '8%' }}>Class</th>
                <th style={{ textAlign: 'center', padding: '3px 6px', color: 'var(--text-muted)', fontWeight: 500, width: '8%' }}>Fixed</th>
                <th style={{ width: '4%' }}></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => {
                const rate = rates.find(r => r.task_id === task.id);
                return <TaskEditRow key={task.id} task={task} rate={rate} specId={specId} psKeyOptions={psKeyOptions}
                  isFirst={idx === 0} isLast={idx === tasks.length - 1}
                  onMoveUp={() => swapTasks(idx, idx - 1)} onMoveDown={() => swapTasks(idx, idx + 1)} />;
              })}
            </tbody>
          </table>

          {/* Modifiers sub-section */}
          <ModifierPanel specId={specId} />
        </div>
      )}
    </div>
  );
}
