import { useSpecData } from '../../hooks/useSpecData';

const UOM_OPTIONS = ['LF', 'SF', 'EA', 'EA_OPENING', 'EA_CLOSET', 'FIXED'];
const CLASS_OPTIONS = ['binary', 'qt_scaled'];

export default function TaskEditRow({ task, rate, specId, psKeyOptions }) {
  const { dispatch } = useSpecData();

  const updateTask = (field, value) => dispatch({ type: 'UPDATE_TASK', payload: { specId, taskId: task.id, field, value } });
  const updateRate = (field, value) => dispatch({ type: 'UPDATE_RATE', payload: { specId, taskId: task.id, field, value } });
  const removeTask = () => dispatch({ type: 'REMOVE_TASK', payload: { specId, taskId: task.id } });

  const isFixed = rate?.unit_of_measure === 'FIXED';

  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle, #1a2a3a)' }}>
      <td style={{ padding: '3px 6px' }}>
        <input value={task.name || ''} onChange={e => updateTask('name', e.target.value)}
          style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-primary)', padding: '2px 5px', borderRadius: 3, width: '100%', fontSize: 11 }} />
      </td>
      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
        {isFixed ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
        ) : (
          <input type="number" value={rate?.rate_per_hour || ''} step="0.1"
            onChange={e => updateRate('rate_per_hour', parseFloat(e.target.value) || 0)}
            style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--accent)', padding: '2px', borderRadius: 3, width: 52, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
        )}
      </td>
      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
        <select value={rate?.unit_of_measure || 'EA'} onChange={e => updateRate('unit_of_measure', e.target.value)}
          style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-secondary)', padding: '2px', borderRadius: 3, fontSize: 10 }}>
          {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: '3px 4px' }}>
        <select value={rate?.paintscope_key || ''} onChange={e => updateRate('paintscope_key', e.target.value || null)}
          style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-secondary)', padding: '2px', borderRadius: 3, fontSize: 10, width: '100%' }}>
          <option value="">— none —</option>
          {psKeyOptions.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'center' }}>
        <select value={task.task_classification || 'binary'} onChange={e => updateTask('task_classification', e.target.value)}
          style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--text-muted)', padding: '2px', borderRadius: 3, fontSize: 10 }}>
          {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
        {isFixed ? (
          <input type="number" value={rate?.fixed_minutes || ''} step="1"
            onChange={e => updateRate('fixed_minutes', parseFloat(e.target.value) || 0)}
            style={{ background: 'var(--bg-input, #0a1018)', border: '1px solid var(--border, #1a2a3a)', color: 'var(--accent)', padding: '2px', borderRadius: 3, width: 44, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        <span onClick={removeTask} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }} title="Delete task">×</span>
      </td>
    </tr>
  );
}
