import { useState } from 'react';
import TaskPickerModal from './TaskPickerModal';

const CATEGORY_OPTIONS = ['prep', 'prime', 'paint', 'stain', 'specialty', 'protection', 'cleanup', 'custom'];

export default function AssemblyEditor({ assembly, onSave, onCancel }) {
  const [name, setName] = useState(assembly?.name || '');
  const [category, setCategory] = useState(assembly?.category || 'custom');
  const [description, setDescription] = useState(assembly?.description || '');
  const [tasks, setTasks] = useState(assembly?.tasks || []);
  const [flatRateHours, setFlatRateHours] = useState(assembly?.flat_rate_hours ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [context, setContext] = useState(assembly?.context || {
    substrate_type: '',
    substrate_state: '',
    application_method: '',
  });

  const handleAddTasks = (selectedTasks) => {
    const newTasks = selectedTasks.map(t => ({
      task_id: t.task_id,
      task_name: t.task_name || t.task_id,
      phase: t.phase || '',
      uom: t.unit_of_measure || '',
      custom_rate: null,
      source_spec: t.spec_family_id || '',
      is_custom: false,
    }));
    setTasks([...tasks, ...newTasks]);
    setShowPicker(false);
  };

  const handleAddCustomTask = () => {
    setTasks([...tasks, {
      task_id: `CUSTOM_${Date.now()}`,
      task_name: 'Custom Task',
      phase: 'apply',
      uom: 'SF',
      custom_rate: null,
      source_spec: '',
      is_custom: true,
    }]);
  };

  const updateTask = (index, field, value) => {
    setTasks(tasks.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      ...(assembly || {}),
      name,
      category,
      description,
      context,
      tasks,
      flat_rate_hours: flatRateHours ? parseFloat(flatRateHours) : null,
    });
  };

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{assembly ? 'Edit Assembly' : 'New Assembly'}</h2>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="setup-field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Assembly name" />
        </div>
        <div className="setup-field">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="setup-field" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
      </div>

      {/* Context */}
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="setup-field">
          <label style={{ fontSize: 11 }}>Substrate Type</label>
          <input value={context.substrate_type} onChange={e => setContext({ ...context, substrate_type: e.target.value })} placeholder="e.g. drywall" style={{ fontSize: 12 }} />
        </div>
        <div className="setup-field">
          <label style={{ fontSize: 11 }}>Substrate State</label>
          <input value={context.substrate_state} onChange={e => setContext({ ...context, substrate_state: e.target.value })} placeholder="e.g. bare_wood" style={{ fontSize: 12 }} />
        </div>
        <div className="setup-field">
          <label style={{ fontSize: 11 }}>Application Method</label>
          <input value={context.application_method} onChange={e => setContext({ ...context, application_method: e.target.value })} placeholder="e.g. spray" style={{ fontSize: 12 }} />
        </div>
      </div>

      {/* Tasks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: 13, margin: 0 }}>Tasks ({tasks.length})</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" onClick={() => setShowPicker(true)} style={{ fontSize: 11 }}>+ From DB</button>
          <button className="btn btn-sm" onClick={handleAddCustomTask} style={{ fontSize: 11 }}>+ Custom</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '4px 6px', textAlign: 'left' }}>Task</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', width: 70 }}>Phase</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', width: 50 }}>UOM</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', width: 80 }}>Custom Rate</th>
            <th style={{ padding: '4px 6px', width: 30 }}></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => (
            <tr key={t.task_id + i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '4px 6px' }}>
                {t.is_custom ? (
                  <input value={t.task_name} onChange={e => updateTask(i, 'task_name', e.target.value)} style={{ fontSize: 12, width: '100%' }} />
                ) : (
                  <span>{t.task_name}</span>
                )}
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input value={t.phase} onChange={e => updateTask(i, 'phase', e.target.value)} style={{ fontSize: 11, width: '100%' }} />
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input value={t.uom} onChange={e => updateTask(i, 'uom', e.target.value)} style={{ fontSize: 11, width: '100%' }} />
              </td>
              <td style={{ padding: '4px 6px' }}>
                <input
                  type="number" step="0.1"
                  value={t.custom_rate ?? ''}
                  onChange={e => updateTask(i, 'custom_rate', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="—"
                  style={{ fontSize: 11, width: '100%' }}
                />
              </td>
              <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                <button onClick={() => removeTask(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 12 }}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Flat rate */}
      <div className="setup-field" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11 }}>Flat Rate Hours (optional — overrides task-based calculation)</label>
        <input
          type="number" step="0.25"
          value={flatRateHours}
          onChange={e => setFlatRateHours(e.target.value)}
          placeholder="Leave empty for task-based"
          style={{ width: 200, fontSize: 12 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-accent" onClick={handleSave} style={{ fontSize: 13 }}>Save Assembly</button>
        <button className="btn btn-sm" onClick={onCancel} style={{ fontSize: 13 }}>Cancel</button>
      </div>

      {showPicker && (
        <TaskPickerModal
          onSelect={handleAddTasks}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
