# Spec Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Rates tab with a full spec editor that provides inline editing of all spec data (tasks, rates, modifiers, PS keys) with immediate estimate feedback.

**Architecture:** `SpecDataProvider` context wraps the app, holding a mutable deep clone of DB_BUNDLE. All edits go through a reducer, auto-persist to IndexedDB, and feed directly into the estimate engine. The editor UI is a sidebar + module accordion with inline-editable task rows.

**Tech Stack:** React 19, useReducer + Context, IndexedDB (via `idb` library already installed), plain JSX, custom CSS

**Spec:** `docs/superpowers/specs/2026-03-25-spec-editor-design.md`

---

## DB_BUNDLE Field Reference

**CRITICAL:** The db-bundle uses these actual field names. All code must use these exact names.

| Table | Key Fields | Notes |
|-------|-----------|-------|
| `spec_families` | `.id`, `.name`, `.domain` | NOT `.spec_family_id` or `.display_name` |
| `sop_modules` | `.id`, `.spec_family_id`, `.name`, `.phase`, `.sort_order` | |
| `sop_tasks` | `.id`, `.spec_family_id`, `.module_id`, `.name`, `.task_classification`, `.sort_order` | NO `.task_type` field |
| `task_production_rates` | `.task_id`, `.spec_family_id`, `.rate_per_hour`, `.fixed_minutes`, `.unit_of_measure`, `.paintscope_key` | |
| `factor_modifiers` | `.id`, `.spec_family_id`, `.name`, `.modifier_category`, `.modifier_type`, `.condition` | `.condition` is a JSON object with modifier values keyed by variant. NOT `.modifier_id`, `.modifier_name`, `.time_modifier`, or `.value` |
| `spec_required_inputs` | `.spec_family_id`, `.paintscope_key`, `.uom`, `.is_required` | NO `.id` or `.input_name` field. Use array index for identification. |
| `quality_tier_effects` | `.spec_family_id`, `.quality_tier`, `.time_modifier` | NO `.material_modifier` field |

---

## File Structure

| File | Role |
|------|------|
| `src/state/spec-editor-reducer.js` | **Create** — Reducer with all 12 action types for spec data mutations |
| `src/state/spec-editor-db.js` | **Create** — IndexedDB persistence for spec editor working copy |
| `src/hooks/useSpecData.js` | **Create** — Context provider + hook exposing specData, dispatch, dirty, reset, export |
| `src/components/rates/SpecEditorView.jsx` | **Create** — Top-level view: sidebar + toolbar + content area |
| `src/components/rates/ModuleAccordion.jsx` | **Create** — Expandable module section with task table |
| `src/components/rates/TaskEditRow.jsx` | **Create** — Inline-editable task row (replaces RateRow) |
| `src/components/rates/ModifierPanel.jsx` | **Create** — Editable factor_modifiers + quality_tier_effects (replaces ModifierOverridePanel) |
| `src/components/rates/RequiredInputsBar.jsx` | **Create** — Collapsible bar showing/editing spec_required_inputs |
| `src/hooks/useEstimate.js` | **Modify** — Read from useSpecData context instead of DB_BUNDLE import |
| `src/components/estimate/EstimateView.jsx` | **Modify** — Read spec_families from useSpecData instead of DB_BUNDLE |
| `src/components/assemblies/TaskPickerModal.jsx` | **Modify** — Read from useSpecData instead of DB_BUNDLE |
| `src/data/project-db.js` | **Modify** — Add v6 migration for `spec_editor` IndexedDB store |
| `src/App.jsx` | **Modify** — Wrap with SpecDataProvider, swap RateExplorerView for SpecEditorView |

---

### Task 1: IndexedDB store for spec editor working copy

**Files:**
- Modify: `src/data/project-db.js`
- Create: `src/state/spec-editor-db.js`

- [ ] **Step 1: Add v6 migration to project-db.js**

In `project-db.js`, bump `DB_VERSION` to 6 and add the migration block after the v5 block:

```js
// v6: spec editor working copy
if (oldVersion < 6) {
  db.createObjectStore('spec_editor', { keyPath: 'key' });
}
```

- [ ] **Step 2: Create spec-editor-db.js**

```js
import { getDB } from '../data/project-db';

const STORE = 'spec_editor';
const KEY = 'working_copy';

export async function loadWorkingCopy() {
  const db = await getDB();
  const record = await db.get(STORE, KEY);
  return record?.data || null;
}

export async function saveWorkingCopy(editableTables) {
  const db = await getDB();
  await db.put(STORE, { key: KEY, data: editableTables, updated_at: new Date().toISOString() });
}

export async function clearWorkingCopy() {
  const db = await getDB();
  await db.delete(STORE, KEY);
}

export async function loadAndClearOverlays() {
  const db = await getDB();
  const overlays = await db.getAll('rate_overlays');
  if (overlays.length > 0) {
    const tx = db.transaction('rate_overlays', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
  return overlays;
}
```

- [ ] **Step 3: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 4: Commit**

```bash
git add src/data/project-db.js src/state/spec-editor-db.js
git commit -m "feat(paintscope): add IndexedDB store and helpers for spec editor working copy"
```

---

### Task 2: Spec editor reducer

**Files:**
- Create: `src/state/spec-editor-reducer.js`

- [ ] **Step 1: Create the reducer**

```js
import { DB_BUNDLE } from '../data/db-bundle';

// Editable table keys — these get persisted to IndexedDB
export const EDITABLE_TABLES = [
  'spec_families', 'sop_modules', 'sop_tasks', 'task_production_rates',
  'factor_modifiers', 'spec_required_inputs', 'quality_tier_effects'
];

export function createInitialSpecData(workingCopy, overlays) {
  // Deep clone the full bundle
  const data = JSON.parse(JSON.stringify(DB_BUNDLE));

  // Merge working copy editable tables if present
  if (workingCopy) {
    for (const table of EDITABLE_TABLES) {
      if (workingCopy[table]) data[table] = workingCopy[table];
    }
  }

  // Fold in legacy rate overlays if present
  if (overlays && overlays.length > 0) {
    for (const o of overlays) {
      const rate = data.task_production_rates.find(
        r => r.spec_family_id === o.spec_family_id && r.task_id === o.task_id
      );
      if (rate && o.field_name && o.override_value != null) {
        rate[o.field_name] = o.override_value;
      }
    }
  }

  return data;
}

export function extractEditableTables(specData) {
  const out = {};
  for (const table of EDITABLE_TABLES) {
    out[table] = specData[table];
  }
  return out;
}

let _nextId = 1;
function genId(prefix) {
  return `${prefix}_${Date.now()}_${_nextId++}`;
}

export function specEditorReducer(state, action) {
  const { type, payload } = action;

  switch (type) {
    case 'UPDATE_TASK': {
      const { specId, taskId, field, value } = payload;
      return {
        ...state,
        sop_tasks: state.sop_tasks.map(t =>
          (t.id === taskId && t.spec_family_id === specId) ? { ...t, [field]: value } : t
        )
      };
    }

    case 'ADD_TASK': {
      const { specId, moduleId } = payload;
      const mod = state.sop_modules.find(m => m.id === moduleId && m.spec_family_id === specId);
      const prefix = specId.replace('SF_', 'TSK_').replace(/_NC$|_PAINT$|_PRIME$|_FINISH$|_STAIN$/, '');
      const newTask = {
        id: genId(prefix),
        spec_family_id: specId,
        module_id: moduleId,
        name: 'New task',
        task_classification: 'binary',
        task_type: mod?.phase || 'apply',
        sort_order: state.sop_tasks.filter(t => t.module_id === moduleId).length,
      };
      const newRate = {
        spec_family_id: specId,
        task_id: newTask.id,
        name: 'New task',
        unit_of_measure: 'LF',
        rate_per_hour: 0,
      };
      return {
        ...state,
        sop_tasks: [...state.sop_tasks, newTask],
        task_production_rates: [...state.task_production_rates, newRate],
      };
    }

    case 'REMOVE_TASK': {
      const { specId, taskId } = payload;
      return {
        ...state,
        sop_tasks: state.sop_tasks.filter(t => !(t.id === taskId && t.spec_family_id === specId)),
        task_production_rates: state.task_production_rates.filter(r => !(r.task_id === taskId && r.spec_family_id === specId)),
      };
    }

    case 'UPDATE_RATE': {
      const { specId, taskId, field, value } = payload;
      return {
        ...state,
        task_production_rates: state.task_production_rates.map(r =>
          (r.task_id === taskId && r.spec_family_id === specId) ? { ...r, [field]: value } : r
        )
      };
    }

    case 'ADD_MODULE': {
      const { specId, phase } = payload;
      const prefix = specId.replace('SF_', 'MOD_').replace(/_NC$|_PAINT$|_PRIME$|_FINISH$|_STAIN$/, '');
      const existing = state.sop_modules.filter(m => m.spec_family_id === specId);
      const newMod = {
        id: genId(prefix),
        spec_family_id: specId,
        name: `New ${phase} module`,
        phase: phase,
        sort_order: existing.length,
      };
      return { ...state, sop_modules: [...state.sop_modules, newMod] };
    }

    case 'REMOVE_MODULE': {
      const { specId, moduleId } = payload;
      return {
        ...state,
        sop_modules: state.sop_modules.filter(m => !(m.id === moduleId && m.spec_family_id === specId)),
        sop_tasks: state.sop_tasks.filter(t => !(t.module_id === moduleId && t.spec_family_id === specId)),
        task_production_rates: state.task_production_rates.filter(r => {
          const task = state.sop_tasks.find(t => t.id === r.task_id && t.spec_family_id === specId);
          return !(task && task.module_id === moduleId);
        }),
      };
    }

    case 'UPDATE_MODIFIER': {
      const { specId, modifierId, field, value } = payload;
      return {
        ...state,
        factor_modifiers: state.factor_modifiers.map(m =>
          (m.modifier_id === modifierId && m.spec_family_id === specId) ? { ...m, [field]: value } : m
        )
      };
    }

    case 'UPDATE_REQUIRED_INPUT': {
      const { specId, inputId, field, value } = payload;
      return {
        ...state,
        spec_required_inputs: state.spec_required_inputs.map((inp, i) =>
          (i === inputId || inp.id === inputId) && inp.spec_family_id === specId ? { ...inp, [field]: value } : inp
        )
      };
    }

    case 'ADD_REQUIRED_INPUT': {
      const { specId } = payload;
      return {
        ...state,
        spec_required_inputs: [...state.spec_required_inputs, {
          spec_family_id: specId,
          input_name: 'New input',
          paintscope_key: '',
          uom: 'EA',
          is_required: 1,
        }]
      };
    }

    case 'REMOVE_REQUIRED_INPUT': {
      const { specId, inputId } = payload;
      return {
        ...state,
        spec_required_inputs: state.spec_required_inputs.filter((inp, i) =>
          !((i === inputId || inp.id === inputId) && inp.spec_family_id === specId)
        )
      };
    }

    case 'RESET_SPEC': {
      const { specId } = payload;
      const base = JSON.parse(JSON.stringify(DB_BUNDLE));
      const result = { ...state };
      for (const table of EDITABLE_TABLES) {
        result[table] = state[table].map(row => {
          if (row.spec_family_id === specId) {
            const baseRow = base[table].find(b =>
              b.id === row.id || (b.task_id === row.task_id && b.spec_family_id === specId)
            );
            return baseRow ? { ...baseRow } : row;
          }
          return row;
        });
      }
      return result;
    }

    case 'RESET_ALL':
      return createInitialSpecData(null, null);

    case '_LOAD':
      return payload;

    default:
      return state;
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/state/spec-editor-reducer.js
git commit -m "feat(paintscope): add spec editor reducer with all 12 action types"
```

---

### Task 3: SpecDataProvider context + useSpecData hook

**Files:**
- Create: `src/hooks/useSpecData.js`

- [ ] **Step 1: Create the provider and hook**

```js
import { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { specEditorReducer, createInitialSpecData, extractEditableTables } from '../state/spec-editor-reducer';
import { loadWorkingCopy, saveWorkingCopy, clearWorkingCopy, loadAndClearOverlays } from '../state/spec-editor-db';
import { DB_BUNDLE } from '../data/db-bundle';

const SpecDataContext = createContext(null);

export function SpecDataProvider({ children }) {
  const [specData, dispatch] = useReducer(specEditorReducer, null, () => JSON.parse(JSON.stringify(DB_BUNDLE)));
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);
  const saveTimer = useRef(null);

  // Load working copy + migrate overlays on mount
  useEffect(() => {
    (async () => {
      try {
        const [workingCopy, overlays] = await Promise.all([
          loadWorkingCopy(),
          loadAndClearOverlays(),
        ]);
        if (workingCopy || (overlays && overlays.length > 0)) {
          const initial = createInitialSpecData(workingCopy, overlays);
          dispatch({ type: '_LOAD', payload: initial });
          setDirty(!!workingCopy);
        }
        initialized.current = true;
      } catch (e) {
        console.error('[SpecEditor] Failed to load working copy:', e);
        initialized.current = true;
      }
    })();
  }, []);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (!initialized.current) return;
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveWorkingCopy(extractEditableTables(specData)).catch(e =>
        console.error('[SpecEditor] Auto-save failed:', e)
      );
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [specData]);

  const resetAll = useCallback(async () => {
    await clearWorkingCopy();
    dispatch({ type: 'RESET_ALL' });
    setDirty(false);
  }, []);

  const resetSpec = useCallback((specId) => {
    dispatch({ type: 'RESET_SPEC', payload: { specId } });
  }, []);

  const exportBundle = useCallback(() => {
    const json = JSON.stringify(specData, null, 2);
    const blob = new Blob([`export const DB_BUNDLE = ${json};`], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'db-bundle.js';
    a.click();
    URL.revokeObjectURL(url);
  }, [specData]);

  return (
    <SpecDataContext.Provider value={{ specData, dispatch, dirty, resetAll, resetSpec, exportBundle }}>
      {children}
    </SpecDataContext.Provider>
  );
}

export function useSpecData() {
  const ctx = useContext(SpecDataContext);
  if (!ctx) throw new Error('useSpecData must be used within SpecDataProvider');
  return ctx;
}
```

**Note:** The `_LOAD` action is already included in the reducer (Task 2). Verify it's present before proceeding.

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSpecData.js src/state/spec-editor-reducer.js
git commit -m "feat(paintscope): add SpecDataProvider context with IndexedDB persistence"
```

---

### Task 4: Wire SpecDataProvider into App and migrate DB_BUNDLE consumers

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/hooks/useEstimate.js`
- Modify: `src/components/estimate/EstimateView.jsx`
- Modify: `src/components/assemblies/TaskPickerModal.jsx`

- [ ] **Step 1: Wrap App with SpecDataProvider**

In `App.jsx`, add import:
```js
import { SpecDataProvider } from './hooks/useSpecData';
```

In the `ProjectLoader` return, wrap `ProjectProvider` with `SpecDataProvider`:
```jsx
return (
  <SpecDataProvider>
    <ProjectProvider key={loaded.forId} initialData={loaded.data} projectId={projectDb.activeProjectId}>
      <AppShell projectDb={projectDb} />
    </ProjectProvider>
  </SpecDataProvider>
);
```

Replace the `RateExplorerView` import with `SpecEditorView` (placeholder for now — will be created in Task 6):
```js
// import RateExplorerView from './components/rates/RateExplorerView';
import SpecEditorView from './components/rates/SpecEditorView';
```

And in the render section, replace `<RateExplorerView />` with `<SpecEditorView />`.

- [ ] **Step 2: Migrate useEstimate.js**

Replace entire file:
```js
import { useMemo } from 'react';
import { useProject } from './useProject';
import { useSpecData } from './useSpecData';
import { runEstimate } from '../engine/run-estimate';

export function useEstimate() {
  const { state } = useProject();
  const { specData } = useSpecData();
  return useMemo(() => {
    try {
      return runEstimate(state, specData);
    } catch (e) {
      console.error('[PaintScope] Estimate error:', e);
      return null;
    }
  }, [state, specData]);
}
```

- [ ] **Step 3: Migrate EstimateView.jsx**

Replace the `DB_BUNDLE` import:
```js
// Remove: import { DB_BUNDLE } from '../../data/db-bundle';
import { useSpecData } from '../../hooks/useSpecData';
```

Inside the component, add:
```js
const { specData } = useSpecData();
```

Replace `DB_BUNDLE.spec_families.length` with `specData.spec_families.length`.

- [ ] **Step 4: Migrate TaskPickerModal.jsx**

Replace the `DB_BUNDLE` import:
```js
// Remove: import { DB_BUNDLE } from '../../data/db-bundle';
import { useSpecData } from '../../hooks/useSpecData';
```

Inside the component, add:
```js
const { specData } = useSpecData();
```

Replace all `DB_BUNDLE.` references with `specData.` (3 occurrences: `spec_families`, `sop_modules`, `sop_tasks`).

- [ ] **Step 5: Create placeholder SpecEditorView.jsx**

```jsx
export default function SpecEditorView() {
  return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Spec Editor — loading...</div>;
}
```

- [ ] **Step 6: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 7: Verify estimates still work**

Run dev server and confirm the Estimate tab renders the same numbers as before.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/hooks/useEstimate.js src/components/estimate/EstimateView.jsx src/components/assemblies/TaskPickerModal.jsx src/components/rates/SpecEditorView.jsx
git commit -m "feat(paintscope): wire SpecDataProvider into App, migrate all DB_BUNDLE consumers"
```

---

### Task 5: TaskEditRow component

**Files:**
- Create: `src/components/rates/TaskEditRow.jsx`

- [ ] **Step 1: Create the component**

```jsx
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
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/rates/TaskEditRow.jsx
git commit -m "feat(paintscope): add TaskEditRow with inline editing for all task/rate fields"
```

---

### Task 6: ModuleAccordion component

**Files:**
- Create: `src/components/rates/ModuleAccordion.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react';
import TaskEditRow from './TaskEditRow';
import ModifierPanel from './ModifierPanel';
import { useSpecData } from '../../hooks/useSpecData';

export default function ModuleAccordion({ module, specId, tasks, rates, psKeyOptions }) {
  const [expanded, setExpanded] = useState(false);
  const { dispatch } = useSpecData();

  const addTask = () => dispatch({ type: 'ADD_TASK', payload: { specId, moduleId: module.id } });

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, marginBottom: 4, borderLeft: expanded ? '2px solid var(--accent)' : '2px solid transparent' }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: expanded ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontWeight: 600, color: expanded ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{module.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tasks.length} tasks</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-badge, #1a2a3a)', borderRadius: 3, color: expanded ? 'var(--accent)' : 'var(--text-muted)' }}>{module.phase}</span>
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
              {tasks.map(task => {
                const rate = rates.find(r => r.task_id === task.id);
                return <TaskEditRow key={task.id} task={task} rate={rate} specId={specId} psKeyOptions={psKeyOptions} />;
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
```

- [ ] **Step 2: Verify build** (will fail until ModifierPanel exists — create placeholder)

Create `src/components/rates/ModifierPanel.jsx`:
```jsx
export default function ModifierPanel({ specId }) {
  return null; // Placeholder — implemented in Task 8
}
```

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/rates/ModuleAccordion.jsx src/components/rates/ModifierPanel.jsx
git commit -m "feat(paintscope): add ModuleAccordion with expandable task table"
```

---

### Task 7: RequiredInputsBar component

**Files:**
- Create: `src/components/rates/RequiredInputsBar.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState } from 'react';
import { useSpecData } from '../../hooks/useSpecData';

export default function RequiredInputsBar({ specId }) {
  const { specData, dispatch } = useSpecData();
  const [expanded, setExpanded] = useState(false);

  const inputs = specData.spec_required_inputs.filter(i => i.spec_family_id === specId);

  const addInput = () => dispatch({ type: 'ADD_REQUIRED_INPUT', payload: { specId } });
  const removeInput = (idx) => dispatch({ type: 'REMOVE_REQUIRED_INPUT', payload: { specId, inputId: idx } });
  const updateInput = (idx, field, value) => dispatch({ type: 'UPDATE_REQUIRED_INPUT', payload: { specId, inputId: idx, field, value } });

  return (
    <div style={{ background: 'var(--bg-card, #111a28)', borderRadius: 6, padding: '6px 12px', marginBottom: 6 }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required Inputs:</span>
        {!expanded && inputs.slice(0, 2).map((inp, i) => (
          <span key={i} style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'monospace' }}>{inp.paintscope_key}</span>
        ))}
        {!expanded && inputs.length > 2 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{inputs.length - 2} more</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {inputs.map((inp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <input value={inp.paintscope_key || ''} onChange={e => updateInput(i, 'paintscope_key', e.target.value)}
                placeholder="PS_SURFACE_LF.EXAMPLE"
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 }} />
              <input value={inp.uom || ''} onChange={e => updateInput(i, 'uom', e.target.value)}
                style={{ width: 50, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '2px 4px', borderRadius: 3, fontSize: 10, textAlign: 'center' }} />
              <span onClick={() => removeInput(i)} style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>×</span>
            </div>
          ))}
          <button onClick={addInput}
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 3, fontSize: 10, cursor: 'pointer', marginTop: 2 }}>+ Add Input</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/rates/RequiredInputsBar.jsx
git commit -m "feat(paintscope): add RequiredInputsBar with editable PS key inputs"
```

---

### Task 8: ModifierPanel component (full implementation)

**Files:**
- Modify: `src/components/rates/ModifierPanel.jsx`

- [ ] **Step 1: Implement the full component**

Replace the placeholder with:

```jsx
import { useState } from 'react';
import { useSpecData } from '../../hooks/useSpecData';

export default function ModifierPanel({ specId }) {
  const { specData, dispatch } = useSpecData();
  const [expanded, setExpanded] = useState(false);

  const modifiers = specData.factor_modifiers.filter(m => m.spec_family_id === specId);
  const qtEffects = specData.quality_tier_effects.filter(q => q.spec_family_id === specId);

  if (modifiers.length === 0 && qtEffects.length === 0) return null;

  const updateMod = (modId, field, value) => dispatch({ type: 'UPDATE_MODIFIER', payload: { specId, modifierId: modId, field, value } });

  // Summary for collapsed state
  const summary = modifiers.slice(0, 3).map(m => `${m.modifier_name || m.modifier_id}: ${m.time_modifier ?? m.value ?? '?'}x`).join(' · ');

  return (
    <div style={{ padding: '4px 8px', marginTop: 4 }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Modifiers ({modifiers.length + qtEffects.length})</span>
        {!expanded && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>— {summary}</span>}
      </div>

      {expanded && (
        <div style={{ marginTop: 6 }}>
          {/* Quality Tier Effects */}
          {qtEffects.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Quality Tier Effects</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '2px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Tier</th>
                    <th style={{ padding: '2px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Time Mod</th>
                    <th style={{ padding: '2px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Material Mod</th>
                  </tr>
                </thead>
                <tbody>
                  {qtEffects.map((qt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '2px 6px', fontWeight: 600, fontSize: 11 }}>{qt.quality_tier}</td>
                      <td style={{ padding: '2px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{qt.time_modifier ?? '—'}</td>
                      <td style={{ padding: '2px 6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{qt.material_modifier ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Factor Modifiers */}
          {modifiers.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Factor Modifiers</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '2px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Modifier</th>
                    <th style={{ padding: '2px 6px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Category</th>
                    <th style={{ padding: '2px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {modifiers.map((mod, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '2px 6px' }}>
                        <div style={{ fontWeight: 500 }}>{mod.modifier_name || mod.modifier_id}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{mod.modifier_id}</div>
                      </td>
                      <td style={{ padding: '2px 6px', fontSize: 10 }}>{mod.modifier_category || '—'}</td>
                      <td style={{ padding: '2px 6px', textAlign: 'center' }}>
                        <input type="number" step="0.01"
                          value={mod.time_modifier ?? mod.value ?? ''}
                          onChange={e => updateMod(mod.modifier_id, 'time_modifier', parseFloat(e.target.value) || 0)}
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--accent)', padding: '2px', borderRadius: 3, width: 52, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git add src/components/rates/ModifierPanel.jsx
git commit -m "feat(paintscope): implement ModifierPanel with factor_modifiers and QT effects"
```

---

### Task 9: SpecEditorView — full implementation

**Files:**
- Modify: `src/components/rates/SpecEditorView.jsx`

- [ ] **Step 1: Implement the full view**

Replace the placeholder with the complete spec editor view:

```jsx
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
      const entry = { id: sf.spec_family_id, name: sf.display_name || sf.spec_family_id, domain: sf.domain };
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

  const selectedSpec = specData.spec_families.find(sf => sf.spec_family_id === selectedSpecId);
  const addModule = (phase) => dispatch({ type: 'ADD_MODULE', payload: { specId: selectedSpecId, phase } });

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
        {specGroups.interior.filter(filterSpec).map(s => (
          <div key={s.id} onClick={() => setSelectedSpecId(s.id)}
            style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer', borderRadius: '0 4px 4px 0', marginBottom: 1,
              color: s.id === selectedSpecId ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: s.id === selectedSpecId ? 600 : 400,
              background: s.id === selectedSpecId ? 'rgba(130,170,255,0.08)' : 'transparent',
              borderLeft: s.id === selectedSpecId ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {s.name}
          </div>
        ))}

        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', marginTop: 8 }}>Exterior ({specGroups.exterior.length})</div>
        {specGroups.exterior.filter(filterSpec).map(s => (
          <div key={s.id} onClick={() => setSelectedSpecId(s.id)}
            style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer', borderRadius: '0 4px 4px 0', marginBottom: 1,
              color: s.id === selectedSpecId ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: s.id === selectedSpecId ? 600 : 400,
              background: s.id === selectedSpecId ? 'rgba(130,170,255,0.08)' : 'transparent',
              borderLeft: s.id === selectedSpecId ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {s.name}
          </div>
        ))}
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
                  <span>{selectedSpec?.display_name}</span>
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
              <div style={{ padding: '8px 0', display: 'flex', gap: 4, alignItems: 'center' }}>
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
```

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Verify in browser**

Run: `cd tools/paintscope && npm run dev -- --port 5177`

1. Open `http://localhost:5177`, navigate to Rates tab
2. Spec list should show in left sidebar grouped by Interior/Exterior
3. Click SF_BUILTIN_NC — verify modules appear as accordion sections
4. Expand Prep module — verify tasks show with editable fields
5. Change a rate value — verify dirty indicator appears
6. Navigate to Estimate tab — verify estimate reflects the changed rate
7. Navigate back to Rates — verify the edit persisted
8. Refresh the page — verify the edit survives (IndexedDB persistence)
9. Click "Reset All to Base" — verify data reverts to original

- [ ] **Step 4: Commit**

```bash
git add src/components/rates/SpecEditorView.jsx
git commit -m "feat(paintscope): implement full SpecEditorView with sidebar, accordion, and toolbar"
```

---

### Task 10: Cleanup — remove old rate editor files

**Files:**
- Delete: `src/components/rates/RateExplorerView.jsx`
- Delete: `src/components/rates/RateRow.jsx`
- Delete: `src/components/rates/ModifierOverridePanel.jsx`
- Delete: `src/hooks/useRateOverlays.js`

- [ ] **Step 1: Remove old files**

Delete the 4 files listed above. Verify no other files import them (they shouldn't after Task 4 migrated all consumers).

- [ ] **Step 2: Verify build**

Run: `cd tools/paintscope && npx vite build`

- [ ] **Step 3: Commit**

```bash
git rm src/components/rates/RateExplorerView.jsx src/components/rates/RateRow.jsx src/components/rates/ModifierOverridePanel.jsx src/hooks/useRateOverlays.js
git commit -m "chore(paintscope): remove old rate explorer files replaced by spec editor"
```
