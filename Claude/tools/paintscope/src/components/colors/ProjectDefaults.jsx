import React, { useState } from 'react';
import { COLOR_GROUP_LABELS } from '../../state/color-state.js';
import ColorEntryForm from './ColorEntryForm.jsx';

const SWATCH_STYLE = { display: 'inline-block', width: 14, height: 14, borderRadius: 3, border: '1px solid var(--border)', verticalAlign: 'middle', marginRight: 5 };

export default function ProjectDefaults({ colors, dispatch }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newGroup, setNewGroup] = useState('');

  const defaults = colors.defaults || {};
  const subOverrides = colors.substrate_overrides || {};
  const groups = Object.keys(defaults);

  const allGroups = Object.keys(COLOR_GROUP_LABELS);
  const availableGroups = allGroups.filter(g => !defaults[g]);

  const handleSave = (group, data) => {
    dispatch({ type: 'SET_COLOR_DEFAULT', payload: { group, data } });
    setEditingGroup(null);
    setAddingNew(false);
  };

  const handleRemove = (group) => {
    dispatch({ type: 'REMOVE_COLOR_DEFAULT', payload: { group } });
  };

  const overrideList = Object.entries(subOverrides).map(([sub, data]) => ({
    substrate: sub,
    ...data,
  }));

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Project Defaults</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {groups.map(group => (
          <div key={group} onClick={() => setEditingGroup(group)}
            style={{ background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 150, cursor: 'pointer' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{COLOR_GROUP_LABELS[group] || group}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <span style={{ ...SWATCH_STYLE, background: '#ccc' }} />
              <span style={{ fontSize: 11 }}>{defaults[group].color_code} {defaults[group].color_name}</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              {defaults[group].product || '—'} · {defaults[group].sheen || '—'}
            </div>
          </div>
        ))}

        {availableGroups.length > 0 && !addingNew && (
          <div onClick={() => setAddingNew(true)}
            style={{ background: 'var(--bg-panel)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>+</span>
          </div>
        )}
      </div>

      {editingGroup && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{COLOR_GROUP_LABELS[editingGroup]}</span>
            <button onClick={() => { handleRemove(editingGroup); setEditingGroup(null); }}
              style={{ fontSize: 10, background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }}>Remove</button>
          </div>
          <ColorEntryForm
            initial={defaults[editingGroup]}
            onSave={(data) => handleSave(editingGroup, data)}
            onCancel={() => setEditingGroup(null)} />
        </div>
      )}

      {addingNew && (
        <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--accent)' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Substrate Group</span>
            <select value={newGroup || availableGroups[0] || ''}
              onChange={e => setNewGroup(e.target.value)}
              style={{ marginLeft: 8, padding: '3px 6px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
              {availableGroups.map(g => <option key={g} value={g}>{COLOR_GROUP_LABELS[g]}</option>)}
            </select>
          </div>
          <ColorEntryForm
            onSave={(data) => handleSave(newGroup || availableGroups[0], data)}
            onCancel={() => setAddingNew(false)} />
        </div>
      )}

      {overrideList.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-warning)' }}>
          {overrideList.map(o => (
            <span key={o.substrate} style={{ marginRight: 12 }}>
              ⚠ {o.substrate.replace(/_/g, ' ')} → {o.color_code} {o.color_name}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Project Color Notes</div>
        <textarea
          value={colors.project_notes || ''}
          onChange={e => dispatch({ type: 'SET_COLOR_PROJECT_NOTES', payload: { notes: e.target.value } })}
          placeholder="General color notes, preferences, or instructions..."
          style={{ width: '100%', minHeight: 48, padding: '6px 8px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
    </div>
  );
}
