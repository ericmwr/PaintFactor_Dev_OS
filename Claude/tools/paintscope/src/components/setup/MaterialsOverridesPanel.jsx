// Project-level material overrides (P3). Two sub-tables (paint + stain).
// Rows = Project default + one row per in-use finish_group. Cell value reads
// from project.material_overrides.{byRole, byFinishGroup}; edits dispatch
// SET_PROJECT to update the corresponding sparse entry. The engine consumes
// these via resolveSystem / resolveCoats (engine/material-overrides.js).

import { useMemo } from 'react';
import Select from '../shared/Select';
import { MATERIAL_SYSTEMS, MATERIAL_SYSTEM_PRODUCTS } from '../../data/scenario-rate-data.js';
import { buildRoleBySystemId, classifySystemRole } from '../../engine/material-system-roles.js';

const PAINT_ROLES = ['primer', 'finish'];
const STAIN_ROLES = ['stain', 'sealer', 'clear'];
const COAT_RANGE = {
  primer_coats: [0, 3], finish_coats: [1, 3],
  stain_coats: [1, 2], sealer_coats: [0, 2], clear_coats: [1, 3],
};

const ROLE_BY_SYSTEM_ID = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
// Canonical-by-role menu: dedupe MATERIAL_SYSTEMS by id, group by role.
// Built once at module load.
const MENU_BY_ROLE = (() => {
  const out = { primer: [], finish: [], stain: [], sealer: [], clear: [] };
  const seen = new Set();
  for (const ms of MATERIAL_SYSTEMS) {
    if (seen.has(ms.id)) continue;
    seen.add(ms.id);
    const role = classifySystemRole(ms.id, ROLE_BY_SYSTEM_ID);
    if (role && out[role]) out[role].push({ id: ms.id, name: ms.name || ms.id });
  }
  return out;
})();

function discoverFinishGroups(rooms) {
  const paint = new Set();
  const stain = new Set();
  for (const room of rooms || []) {
    for (const sub of Object.values(room.substrates || {})) {
      const fg = sub?.finish_group;
      if (!fg) continue;
      const isStainSub = !!(sub.stain_on || sub.sealer_on || sub.clear_on);
      if (isStainSub) stain.add(fg);
      else paint.add(fg);
    }
  }
  return { paint: [...paint].sort(), stain: [...stain].sort() };
}

function getCell(overrides, fg, key) {
  if (fg === '__default__') return overrides?.byRole?.[key] ?? null;
  return overrides?.byFinishGroup?.[fg]?.[key] ?? null;
}

function buildSet(overrides, fg, key, value) {
  // Returns the updated overrides object. value === null clears the entry.
  const next = { ...overrides, byRole: { ...(overrides.byRole || {}) }, byFinishGroup: { ...(overrides.byFinishGroup || {}) } };
  if (fg === '__default__') {
    if (value === null) delete next.byRole[key];
    else next.byRole[key] = value;
  } else {
    const groupEntry = { ...(next.byFinishGroup[fg] || {}) };
    if (value === null) delete groupEntry[key];
    else groupEntry[key] = value;
    if (Object.keys(groupEntry).length === 0) delete next.byFinishGroup[fg];
    else next.byFinishGroup[fg] = groupEntry;
  }
  return next;
}

function Cell({ overrides, fg, role, kind, dispatch, isInherited }) {
  const key = `${role}_${kind}`;
  const value = getCell(overrides, fg, key);
  const isOverride = value !== null && value !== undefined;

  const onChange = (newVal) => {
    const next = buildSet(overrides, fg, key, newVal);
    dispatch({ type: 'SET_PROJECT', payload: { field: 'material_overrides', value: next } });
  };

  if (kind === 'system') {
    const menu = MENU_BY_ROLE[role] || [];
    const options = [{ value: '', label: isInherited ? '— default —' : '— inherit —' }, ...menu.map(s => ({ value: s.id, label: s.name }))];
    return (
      <td style={cellStyle}>
        <Select
          options={options}
          value={value || ''}
          onChange={v => onChange(v || null)}
          style={{ borderColor: isOverride ? 'var(--accent, #82aaff)' : 'var(--border)' }}
        />
        {isOverride && (
          <div style={{ fontSize: 9, color: 'var(--accent, #82aaff)' }}>
            override <span onClick={() => onChange(null)} style={revertLink}>revert</span>
          </div>
        )}
      </td>
    );
  }
  // coats kind
  const [lo, hi] = COAT_RANGE[key] || [0, 9];
  const coatOptions = [{ value: '', label: isInherited ? '— default —' : '— inherit —' }];
  for (let n = lo; n <= hi; n++) coatOptions.push({ value: String(n), label: String(n) });
  return (
    <td style={cellStyle}>
      <Select
        options={coatOptions}
        value={value == null ? '' : String(value)}
        onChange={v => onChange(v === '' ? null : Number(v))}
        style={{ borderColor: isOverride ? 'var(--accent, #82aaff)' : 'var(--border)' }}
      />
      {isOverride && (
        <div style={{ fontSize: 9, color: 'var(--accent, #82aaff)' }}>
          override <span onClick={() => onChange(null)} style={revertLink}>revert</span>
        </div>
      )}
    </td>
  );
}

function SubTable({ title, roles, rows, overrides, dispatch }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
            <th style={thStyle}>Row</th>
            {roles.map(r => <th key={`${r}_system`} style={thStyle}>{r.charAt(0).toUpperCase() + r.slice(1)} System</th>)}
            {roles.map(r => <th key={`${r}_coats`} style={thStyle}>{r.charAt(0).toUpperCase() + r.slice(1)} Coats</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '6px 10px', textAlign: 'left' }}>{row.label}</td>
              {roles.map(r => <Cell key={`${row.id}_${r}_system`} overrides={overrides} fg={row.id} role={r} kind="system" dispatch={dispatch} isInherited={row.id !== '__default__'} />)}
              {roles.map(r => <Cell key={`${row.id}_${r}_coats`} overrides={overrides} fg={row.id} role={r} kind="coats" dispatch={dispatch} isInherited={row.id !== '__default__'} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MaterialsOverridesPanel({ state, dispatch }) {
  const project = state.project;
  const overrides = project.material_overrides || { byRole: {}, byFinishGroup: {} };
  const { paint, stain } = useMemo(() => discoverFinishGroups(state.rooms), [state.rooms]);

  const paintRows = [{ id: '__default__', label: 'Project default' }, ...paint.map(fg => ({ id: fg, label: `Group ${fg}` }))];
  const stainRows = [{ id: '__default__', label: 'Project default' }, ...stain.map(fg => ({ id: fg, label: `Group ${fg}` }))];

  return (
    <div className="panel-section" style={{ background: 'rgba(130, 170, 255, 0.04)', border: '1px solid rgba(130, 170, 255, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>Materials Overrides</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
        Override material products and coats project-wide, or per finish group. Empty = use the tier's authored default.
      </div>
      <SubTable title="Paint Materials" roles={PAINT_ROLES} rows={paintRows} overrides={overrides} dispatch={dispatch} />
      <SubTable title="Stain Materials" roles={STAIN_ROLES} rows={stainRows} overrides={overrides} dispatch={dispatch} />
    </div>
  );
}

const thStyle = { padding: '8px 10px', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const cellStyle = { padding: '4px 6px', textAlign: 'center' };
const revertLink = { cursor: 'pointer', textDecoration: 'underline' };
