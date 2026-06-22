# PS Key Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare PS Key text input in the Task editor with a hybrid picker — inline type-ahead plus a categorized, searchable modal — backed by a union catalog of labeled and in-use keys.

**Architecture:** A pure, unit-tested data module (`ps-key-catalog.js`) parses keys into category/unit and builds the union catalog. Two dumb React components consume it: `PsKeyPickerModal` (categorized searchable modal) and `PsKeyField` (input + inline dropdown + modal trigger). `TaskEditor` swaps its bare input for `PsKeyField` and auto-fills UOM on explicit picks. No state, engine, migration, or bundle changes.

**Tech Stack:** React 19 (function components + hooks), Vite 7, Vitest 3, plain JS/JSX (no TypeScript), custom CSS variables (no Tailwind).

## Global Constraints

- **Working directory for all commands:** `C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope`. All `npx` commands run from there.
- **Tests:** Vitest, run via `npx vitest run <path>` (there is no `npm test` script). Test files live beside source in `__tests__/` and use `import { describe, it, expect } from 'vitest'`.
- **Build check:** `npx vite build` (expect "built in …", no errors).
- **No new dependencies.** No TypeScript, no Tailwind, no test-DOM libraries (jsdom/RTL are not installed — components are verified by build + manual smoke, not unit tests).
- **Conventions:** PascalCase `.jsx` component files; CSS custom properties for all colors (`var(--bg-panel)`, `var(--border)`, `var(--text)`, `var(--text-muted)`, `var(--bg-input)`, `var(--font-mono)`); no inline hardcoded hex except the existing accent-amber rgba used for warnings.
- **PS key convention:** `PS_[EXT_]<DOMAIN>_<UOM>.<NAME>`, with documented irregulars: `PS_META.<UOM>.<NAME>` (uom after the first dot), `PS_PROTECT_FIXED.*`, names containing a dot (`PS_PROTECT_EA.ASSET.HARDWARE`), exterior `PS_EXT_DOOR_EA.TOTAL` (domain `DOOR` → Opening), and the sentinel `MANUAL_CAPTURE` (no `PS_` prefix → Special).
- **Do NOT modify** `state/`, `engine/`, `data/scenario-bundle.gen.js`, or any migration. `payload.ps_key` stays a free string.
- **Commit messages** end with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` and use conventional prefixes (`feat`/`test`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/ps-key-catalog.js` (new) | Pure: `parsePsKey`, `humanize`, `buildPsKeyCatalog`, `groupPsKeyCatalog`, `AUTOFILL_UOMS`, `DOMAIN_LABEL` |
| `src/data/__tests__/ps-key-catalog.test.js` (new) | Vitest unit coverage for the module above |
| `src/components/authoring/PsKeyPickerModal.jsx` (new) | Categorized, searchable modal; emits a key string via `onPick` |
| `src/components/authoring/PsKeyField.jsx` (new) | Hybrid field: input + inline dropdown + modal trigger; self-contained catalog |
| `src/components/authoring/TaskEditor.jsx` (modify `:222-225` + imports) | Swap bare input for `PsKeyField`; auto-fill UOM on pick |

---

## Task 1: Key parser (`parsePsKey` + `humanize`)

**Files:**
- Create: `src/data/ps-key-catalog.js`
- Test: `src/data/__tests__/ps-key-catalog.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parsePsKey(key: string) -> { scope: 'interior'|'exterior'|'special', domain: string, uom: string|null, name: string }`
  - `humanize(str: string) -> string` (separators → spaces, sentence-cased)

- [ ] **Step 1: Write the failing test**

Create `src/data/__tests__/ps-key-catalog.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parsePsKey, humanize } from '../ps-key-catalog.js';

describe('parsePsKey', () => {
  it('parses a standard surface key', () => {
    expect(parsePsKey('PS_SURFACE_LF.BASEBOARD')).toEqual({ scope: 'interior', domain: 'SURFACE', uom: 'LF', name: 'BASEBOARD' });
  });
  it('parses a compound EA_SIDE uom', () => {
    expect(parsePsKey('PS_SURFACE_EA_SIDE.DOOR_SLAB')).toEqual({ scope: 'interior', domain: 'SURFACE', uom: 'EA_SIDE', name: 'DOOR_SLAB' });
  });
  it('parses a meta key whose uom is after the first dot', () => {
    expect(parsePsKey('PS_META.EA.ROOMS_TOTAL')).toEqual({ scope: 'interior', domain: 'META', uom: 'EA', name: 'ROOMS_TOTAL' });
  });
  it('parses a non-geometry meta uom', () => {
    expect(parsePsKey('PS_META.TEXT.HEIGHT_BAND')).toEqual({ scope: 'interior', domain: 'META', uom: 'TEXT', name: 'HEIGHT_BAND' });
  });
  it('parses a fixed-uom protection key', () => {
    expect(parsePsKey('PS_PROTECT_FIXED.CONTAINMENT')).toEqual({ scope: 'interior', domain: 'PROTECT', uom: 'FIXED', name: 'CONTAINMENT' });
  });
  it('keeps a dotted name intact', () => {
    expect(parsePsKey('PS_PROTECT_EA.ASSET.HARDWARE')).toEqual({ scope: 'interior', domain: 'PROTECT', uom: 'EA', name: 'ASSET.HARDWARE' });
  });
  it('flags exterior scope and strips EXT_', () => {
    expect(parsePsKey('PS_EXT_SURFACE_SF.SIDING_FIELD')).toEqual({ scope: 'exterior', domain: 'SURFACE', uom: 'SF', name: 'SIDING_FIELD' });
  });
  it('parses an exterior meta enum', () => {
    expect(parsePsKey('PS_EXT_META.ENUM.ACCESS_TYPE')).toEqual({ scope: 'exterior', domain: 'META', uom: 'ENUM', name: 'ACCESS_TYPE' });
  });
  it('parses the exterior door oddball', () => {
    expect(parsePsKey('PS_EXT_DOOR_EA.TOTAL')).toEqual({ scope: 'exterior', domain: 'DOOR', uom: 'EA', name: 'TOTAL' });
  });
  it('treats a non-PS sentinel as special', () => {
    expect(parsePsKey('MANUAL_CAPTURE')).toEqual({ scope: 'special', domain: 'SPECIAL', uom: null, name: 'MANUAL_CAPTURE' });
  });
  it('handles empty input', () => {
    expect(parsePsKey('')).toEqual({ scope: 'special', domain: 'SPECIAL', uom: null, name: '' });
  });
});

describe('humanize', () => {
  it('turns a key name into a sentence-cased title', () => {
    expect(humanize('CABINET_DOOR')).toBe('Cabinet door');
  });
  it('collapses dots and underscores', () => {
    expect(humanize('ASSET.HARDWARE')).toBe('Asset hardware');
  });
  it('returns empty string for falsy input', () => {
    expect(humanize('')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/ps-key-catalog.test.js`
Expected: FAIL — `Failed to resolve import "../ps-key-catalog.js"` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/data/ps-key-catalog.js`:

```js
// Pure helpers for the PS Key picker. parsePsKey splits a key into its
// category/unit per the PS_[EXT_]<DOMAIN>_<UOM>.<NAME> convention; humanize
// turns a raw NAME segment into a readable title for uncatalogued keys.

export function parsePsKey(key) {
  if (!key || !key.startsWith('PS_')) {
    return { scope: 'special', domain: 'SPECIAL', uom: null, name: key || '' };
  }
  let rest = key.slice(3);                       // drop "PS_"
  const scope = rest.startsWith('EXT_') ? 'exterior' : 'interior';
  if (scope === 'exterior') rest = rest.slice(4);

  const dot = rest.indexOf('.');
  const head = dot === -1 ? rest : rest.slice(0, dot);
  const tail = dot === -1 ? '' : rest.slice(dot + 1);

  const headTokens = head.split('_');
  const domain = headTokens[0];                  // SURFACE | EDGE | OPENING | PROTECT | META | DOOR
  let uom, name;
  if (headTokens.length > 1) {
    uom = headTokens.slice(1).join('_');         // SF | LF | EA | EA_SIDE | FIXED
    name = tail;
  } else {
    const tailParts = tail.split('.');           // META.<UOM>.<NAME>
    uom = tailParts[0] || null;                  // EA | SF | TEXT | ENUM | FLAG
    name = tailParts.slice(1).join('.');
  }
  return { scope, domain, uom, name };
}

export function humanize(str) {
  if (!str) return '';
  const spaced = str.replace(/[._]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/ps-key-catalog.test.js`
Expected: PASS — 14 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/data/ps-key-catalog.js src/data/__tests__/ps-key-catalog.test.js
git commit -m "feat(ps-key-picker): add parsePsKey and humanize key parser" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Catalog builder + grouping (`buildPsKeyCatalog` + `groupPsKeyCatalog`)

**Files:**
- Modify: `src/data/ps-key-catalog.js` (append exports)
- Test: `src/data/__tests__/ps-key-catalog.test.js` (append describes)

**Interfaces:**
- Consumes: `parsePsKey`, `humanize` (Task 1).
- Produces:
  - `AUTOFILL_UOMS: Set<string>` — `{ 'SF', 'LF', 'EA', 'EA_SIDE' }`
  - `DOMAIN_LABEL: Record<string,string>`
  - `buildPsKeyCatalog(bundle, labels) -> Entry[]`, where
    `Entry = { key, label: string|null, displayTitle, catalogued: boolean, scope, domain, uom, categoryLabel, categoryOrder }`
  - `groupPsKeyCatalog(entries) -> Group[]`, where
    `Group = { categoryLabel, scope, categoryOrder, entries: Entry[] }`, ordered by `categoryOrder`, entries sorted by `displayTitle`

- [ ] **Step 1: Write the failing test**

Append to `src/data/__tests__/ps-key-catalog.test.js`:

```js
import { buildPsKeyCatalog, groupPsKeyCatalog, AUTOFILL_UOMS } from '../ps-key-catalog.js';
import canonicalBundle from '../scenario-bundle.gen.js';

const LABELS = {
  'PS_SURFACE_LF.BASEBOARD': 'Baseboard LF',
  'PS_SURFACE_SF.WALL_FIELD': 'Wall Field SF',
  'PS_META.EA.ROOMS_TOTAL': 'Total Rooms',
};

describe('buildPsKeyCatalog', () => {
  it('includes catalogued keys with label, flag, and parsed category', () => {
    const cat = buildPsKeyCatalog({ tasks: {} }, LABELS);
    const bb = cat.find(e => e.key === 'PS_SURFACE_LF.BASEBOARD');
    expect(bb).toMatchObject({ label: 'Baseboard LF', displayTitle: 'Baseboard LF', catalogued: true, uom: 'LF', categoryLabel: 'Surface · LF' });
  });
  it('adds in-use keys absent from labels, flagged uncatalogued with a humanized title', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: 'PS_SURFACE_EA.CABINET_DOOR' } } }, LABELS);
    const cab = cat.find(e => e.key === 'PS_SURFACE_EA.CABINET_DOOR');
    expect(cab).toMatchObject({ catalogued: false, label: null, displayTitle: 'Cabinet door', uom: 'EA', categoryLabel: 'Surface · EA' });
  });
  it('dedups a key present in both labels and the bundle, keeping the catalogued entry', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: 'PS_SURFACE_LF.BASEBOARD' } } }, LABELS);
    const hits = cat.filter(e => e.key === 'PS_SURFACE_LF.BASEBOARD');
    expect(hits).toHaveLength(1);
    expect(hits[0].catalogued).toBe(true);
  });
  it('skips empty/missing ps_key on tasks', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: '' }, T2: {} } }, LABELS);
    expect(cat).toHaveLength(Object.keys(LABELS).length);
  });
  it('surfaces a real in-use-but-uncatalogued key from the live bundle', () => {
    const cat = buildPsKeyCatalog(canonicalBundle, {}); // empty labels → every key uncatalogued
    const cab = cat.find(e => e.key === 'PS_SURFACE_EA.CABINET_DOOR');
    expect(cab).toBeDefined();
    expect(cab.catalogued).toBe(false);
  });
});

describe('groupPsKeyCatalog', () => {
  it('orders interior before exterior before special; splits geometry by uom; sorts entries by title', () => {
    const cat = buildPsKeyCatalog({
      tasks: {
        A: { ps_key: 'PS_EXT_SURFACE_SF.SIDING_FIELD' },
        B: { ps_key: 'MANUAL_CAPTURE' },
        C: { ps_key: 'PS_SURFACE_LF.CROWN' },
        D: { ps_key: 'PS_SURFACE_LF.BASEBOARD' },
        E: { ps_key: 'PS_SURFACE_SF.WALL_FIELD' },
      },
    }, {});
    const groups = groupPsKeyCatalog(cat);
    const labels = groups.map(g => g.categoryLabel);
    expect(labels[0]).toBe('Surface · SF');             // interior, SF before LF
    expect(labels[1]).toBe('Surface · LF');
    expect(labels).toContain('Exterior surface · SF');
    expect(labels[labels.length - 1]).toBe('Special');  // special last
    const lf = groups.find(g => g.categoryLabel === 'Surface · LF');
    expect(lf.entries.map(e => e.displayTitle)).toEqual(['Baseboard', 'Crown']); // alpha within category
  });
});

describe('AUTOFILL_UOMS', () => {
  it('contains geometry units and excludes non-geometry ones', () => {
    expect(AUTOFILL_UOMS.has('SF')).toBe(true);
    expect(AUTOFILL_UOMS.has('EA_SIDE')).toBe(true);
    expect(AUTOFILL_UOMS.has('TEXT')).toBe(false);
    expect(AUTOFILL_UOMS.has('FIXED')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/ps-key-catalog.test.js`
Expected: FAIL — `buildPsKeyCatalog is not a function` / `does not provide an export named 'buildPsKeyCatalog'`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/data/ps-key-catalog.js`:

```js
// UOMs that map onto the Task editor's UOM dropdown (TaskEditor UOM_OPTIONS).
// Only these auto-fill UOM on an explicit pick; TEXT/ENUM/FLAG/FIXED do not.
export const AUTOFILL_UOMS = new Set(['SF', 'LF', 'EA', 'EA_SIDE']);

export const DOMAIN_LABEL = {
  SURFACE: 'Surface',
  EDGE: 'Edge',
  OPENING: 'Opening',
  DOOR: 'Opening',     // exterior PS_EXT_DOOR_EA.* folds into Opening
  PROTECT: 'Protection',
  META: 'Meta',
  SPECIAL: 'Special',
};

const DOMAIN_ORDER = { SURFACE: 0, EDGE: 1, OPENING: 2, DOOR: 2, PROTECT: 3, META: 4, SPECIAL: 9 };
const UOM_ORDER = { SF: 0, LF: 1, EA: 2, EA_SIDE: 3, FIXED: 4 };
const UOM_SPLIT_DOMAINS = new Set(['SURFACE', 'EDGE', 'OPENING', 'DOOR', 'PROTECT']);

function categoryFor(scope, domain, uom) {
  const base = DOMAIN_LABEL[domain] || humanize(domain);
  let label;
  if (domain === 'SPECIAL') label = 'Special';
  else if (UOM_SPLIT_DOMAINS.has(domain) && uom) label = `${base} · ${uom}`;
  else label = base;
  if (scope === 'exterior') label = `Exterior ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  const scopeOrder = scope === 'interior' ? 0 : scope === 'exterior' ? 1 : 2;
  const order = scopeOrder * 100 + (DOMAIN_ORDER[domain] ?? 8) * 10 + (UOM_ORDER[uom] ?? 8);
  return { label, order };
}

function makeEntry(key, label, catalogued) {
  const { scope, domain, uom, name } = parsePsKey(key);
  const { label: categoryLabel, order: categoryOrder } = categoryFor(scope, domain, uom);
  const displayTitle = label || humanize(name || key);
  return { key, label: label || null, displayTitle, catalogued, scope, domain, uom, categoryLabel, categoryOrder };
}

export function buildPsKeyCatalog(bundle, labels) {
  const map = new Map();
  for (const [key, label] of Object.entries(labels || {})) {
    if (!key) continue;
    map.set(key, makeEntry(key, label, true));
  }
  for (const task of Object.values(bundle?.tasks || {})) {
    const k = task && task.ps_key;
    if (!k || map.has(k)) continue;
    map.set(k, makeEntry(k, null, false));
  }
  return [...map.values()];
}

export function groupPsKeyCatalog(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.categoryLabel)) {
      groups.set(e.categoryLabel, { categoryLabel: e.categoryLabel, scope: e.scope, categoryOrder: e.categoryOrder, entries: [] });
    }
    groups.get(e.categoryLabel).entries.push(e);
  }
  const ordered = [...groups.values()].sort((a, b) => a.categoryOrder - b.categoryOrder);
  for (const g of ordered) g.entries.sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
  return ordered;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/ps-key-catalog.test.js`
Expected: PASS — all Task 1 + Task 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/data/ps-key-catalog.js src/data/__tests__/ps-key-catalog.test.js
git commit -m "feat(ps-key-picker): build union catalog + category grouping" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Picker modal (`PsKeyPickerModal.jsx`)

**Files:**
- Create: `src/components/authoring/PsKeyPickerModal.jsx`

**Interfaces:**
- Consumes: `groupPsKeyCatalog` (Task 2); `Entry[]` shape.
- Produces: `<PsKeyPickerModal catalog={Entry[]} initialQuery={string} value={string} onPick={(key:string)=>void} onClose={()=>void} />`. Emits a **key string** for both catalog rows and the custom "use as-is" row.

This component has no automated test (no DOM harness). Its gate is a clean build; it is exercised manually once wired in Task 5.

- [ ] **Step 1: Write the component**

Create `src/components/authoring/PsKeyPickerModal.jsx`:

```jsx
// Categorized, searchable PS key picker. Overlay mechanics mirror
// RetireModuleModal. Emits a key string via onPick (catalog rows and the
// "use as-is" custom row both call it); the parent decides what to do with it.

import { useMemo, useState } from 'react';
import { groupPsKeyCatalog } from '../../data/ps-key-catalog.js';

export default function PsKeyPickerModal({ catalog, initialQuery = '', value, onPick, onClose }) {
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return catalog;
    return catalog.filter(e =>
      e.displayTitle.toLowerCase().includes(q) ||
      e.key.toLowerCase().includes(q) ||
      (e.label && e.label.toLowerCase().includes(q))
    );
  }, [catalog, q]);

  const groups = useMemo(() => groupPsKeyCatalog(filtered), [filtered]);
  const showCustom = q.length > 0 && !filtered.some(e => e.key.toLowerCase() === q);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 6, padding: 16, width: 560, maxWidth: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Select PS key</h3>
          <button className="btn btn-sm" onClick={onClose} style={{ fontSize: 11 }}>Close</button>
        </div>

        <input
          autoFocus
          placeholder="Search by name or key — e.g. baseboard, cabinet, PS_PROTECT"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', padding: '6px 8px', fontSize: 12, background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, marginBottom: 6, boxSizing: 'border-box' }}
        />
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Not listed? Type any key and use it as a custom entry.
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {showCustom && (
            <div
              onClick={() => onPick(query.trim())}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 3, border: '1px dashed var(--border)', marginBottom: 8 }}
            >
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Use as-is:</span>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>{query.trim()}</code>
            </div>
          )}

          {groups.map(g => (
            <div key={g.categoryLabel} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', padding: '2px 4px' }}>
                {g.categoryLabel}
              </div>
              {g.entries.map(e => {
                const selected = e.key === value;
                return (
                  <div
                    key={e.key}
                    onClick={() => onPick(e.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 3, background: selected ? 'rgba(130,170,255,0.15)' : 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>{e.displayTitle}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.key}</div>
                    </div>
                    {!e.catalogued && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(224,184,74,0.15)', border: '1px solid rgba(224,184,74,0.4)', color: 'var(--text)', whiteSpace: 'nowrap' }}>no label yet</span>
                    )}
                    {e.uom && (
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.25)', color: 'var(--text-muted)' }}>{e.uom}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {groups.length === 0 && !showCustom && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npx vite build`
Expected: builds successfully (no syntax/import errors). The modal isn't reachable yet — this only confirms it compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/authoring/PsKeyPickerModal.jsx
git commit -m "feat(ps-key-picker): categorized searchable picker modal" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Hybrid field (`PsKeyField.jsx`)

**Files:**
- Create: `src/components/authoring/PsKeyField.jsx`

**Interfaces:**
- Consumes: `buildPsKeyCatalog`, `parsePsKey` (Tasks 1-2); `PsKeyPickerModal` (Task 3); `canonicalBundle` default export with `.tasks`; `QUANTITY_KEY_LABELS` from `constants.js`.
- Produces: `<PsKeyField value={string} onChange={(raw:string)=>void} onSelect={(entry)=>void} />`. `onChange` fires on every keystroke (free entry); `onSelect` fires only on an explicit pick and carries the resolved `Entry` (so the parent can auto-fill UOM).

No automated test (no DOM harness). Gate is a clean build; exercised manually in Task 5.

- [ ] **Step 1: Write the component**

Create `src/components/authoring/PsKeyField.jsx`:

```jsx
// Hybrid PS key field: an editable text input (free entry preserved) with an
// inline type-ahead dropdown for quick picks and a "Browse…" button that opens
// the categorized PsKeyPickerModal. Both the inline list and the modal hand
// back a key string; this component resolves it to a catalog Entry (or builds a
// loose one via parsePsKey for a custom key) and forwards it to onSelect.

import { useMemo, useRef, useState } from 'react';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { QUANTITY_KEY_LABELS } from '../../data/constants.js';
import { buildPsKeyCatalog, parsePsKey } from '../../data/ps-key-catalog.js';
import PsKeyPickerModal from './PsKeyPickerModal.jsx';

const MAX_INLINE = 8;

const fieldInput = {
  display: 'block', width: '100%', marginTop: 2, padding: '4px 6px', fontSize: 12,
  background: 'var(--bg-input, #222)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 3, boxSizing: 'border-box',
};

function looseEntry(key) {
  const { uom } = parsePsKey(key);
  return { key, uom, catalogued: false };
}

export default function PsKeyField({ value, onChange, onSelect }) {
  const catalog = useMemo(() => buildPsKeyCatalog(canonicalBundle, QUANTITY_KEY_LABELS), []);
  const byKey = useMemo(() => new Map(catalog.map(e => [e.key, e])), [catalog]);

  const [modalOpen, setModalOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef(null);

  const q = (value || '').trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return catalog
      .filter(e => e.displayTitle.toLowerCase().includes(q) || e.key.toLowerCase().includes(q) || (e.label && e.label.toLowerCase().includes(q)))
      .slice(0, MAX_INLINE);
  }, [catalog, q]);

  const pick = (key) => {
    onSelect?.(byKey.get(key) || looseEntry(key));
    setModalOpen(false);
    setFocused(false);
  };

  const showInline = focused && matches.length > 0 && !(matches.length === 1 && matches[0].key === value);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
        <input
          style={{ ...fieldInput, flex: 1 }}
          placeholder="PS_…"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 120); }}
        />
        <button
          type="button"
          className="btn btn-sm"
          title="Browse PS keys by category"
          style={{ fontSize: 10, padding: '0 8px', whiteSpace: 'nowrap' }}
          onMouseDown={e => e.preventDefault()}
          onClick={() => setModalOpen(true)}
        >Browse…</button>
      </div>

      {showInline && (
        <div
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
          style={{ position: 'absolute', zIndex: 50, left: 0, right: 0, marginTop: 2, background: 'var(--bg-panel, #1a1a1a)', border: '1px solid var(--border)', borderRadius: 3, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
        >
          {matches.map(e => (
            <div
              key={e.key}
              onClick={() => pick(e.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text)' }}>{e.displayTitle}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.key}</div>
              </div>
              {!e.catalogued && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>no label</span>}
              {e.uom && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{e.uom}</span>}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PsKeyPickerModal
          catalog={catalog}
          initialQuery={value || ''}
          value={value}
          onPick={pick}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npx vite build`
Expected: builds successfully. Still not rendered anywhere — confirms compilation only.

- [ ] **Step 3: Commit**

```bash
git add src/components/authoring/PsKeyField.jsx
git commit -m "feat(ps-key-picker): hybrid field with inline type-ahead + modal" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Wire into the Task editor + verify end-to-end

**Files:**
- Modify: `src/components/authoring/TaskEditor.jsx` (imports near top; PS Key field at `:222-225`)

**Interfaces:**
- Consumes: `PsKeyField` (Task 4); `AUTOFILL_UOMS` (Task 2).
- Produces: the wired Task editor (no new exports).

- [ ] **Step 1: Add the imports**

In `src/components/authoring/TaskEditor.jsx`, the existing imports begin:

```jsx
import { useState, useEffect } from 'react';
import TaskUsagePanel from './TaskUsagePanel.jsx';
import RenameTaskModal from './RenameTaskModal.jsx';
```

Add two lines immediately after the `RenameTaskModal` import:

```jsx
import PsKeyField from './PsKeyField.jsx';
import { AUTOFILL_UOMS } from '../../data/ps-key-catalog.js';
```

- [ ] **Step 2: Replace the bare PS Key input**

Find this block (`:222-225`):

```jsx
            <label style={labelStyle}>
              PS Key
              <input style={inputStyle} value={payload.ps_key || ''} onChange={e => handleField('ps_key', e.target.value)} />
            </label>
```

Replace it with:

```jsx
            <label style={labelStyle}>
              PS Key
              <PsKeyField
                value={payload.ps_key || ''}
                onChange={v => handleField('ps_key', v)}
                onSelect={entry => {
                  handleField('ps_key', entry.key);
                  if (AUTOFILL_UOMS.has(entry.uom)) handleField('uom', entry.uom);
                }}
              />
            </label>
```

- [ ] **Step 3: Build to verify it compiles**

Run: `npx vite build`
Expected: builds successfully.

- [ ] **Step 4: Manual verification (dev server + McLeod project)**

Start the dev server from `src/`'s package root: `npx vite` (note the port it prints, e.g. `localhost:5173`). Open the app, load the McLeod project, go to **Authoring → Tasks → New task**, then confirm each:

1. **Inline type-ahead + UOM autofill:** Focus the PS Key field, type `base`. An inline dropdown lists baseboard keys. Click `PS_SURFACE_LF.BASEBOARD` → the field fills with that key and the **UOM dropdown flips to `LF`**. The JSON preview shows `"ps_key": "PS_SURFACE_LF.BASEBOARD"`.
2. **Browse modal + categories + flags:** Click `Browse…`. The modal opens grouped by category. Confirm `Cabinet door` appears under `Surface · EA` with a `no label yet` flag and an `EA` badge.
3. **Search across categories:** In the modal, type `cabinet`. The list narrows. Pick `PS_SURFACE_SF.CABINET_FRAME` → field fills and UOM flips to `SF`.
4. **Free-text custom key:** Type `PS_FOO.BAR` in the field, click away. The value is kept verbatim (JSON preview shows it). Open `Browse…` with that text → the dashed "Use as-is: PS_FOO.BAR" row is offered; clicking it sets the key. UOM is unchanged.
5. **Non-geometry UOM not auto-filled:** Set UOM to `HRS` manually, then pick a `Meta` key like `PS_META.TEXT.HEIGHT_BAND` from the modal → ps_key updates but UOM stays `HRS` (not overwritten).
6. **No regressions:** Other fields (Task ID, Display Name, Phase, Skill, Rate) behave as before; Save Draft works and the JSON preview reflects the chosen `ps_key`.

- [ ] **Step 5: Commit**

```bash
git add src/components/authoring/TaskEditor.jsx
git commit -m "feat(ps-key-picker): wire PsKeyField into the Task editor" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Union source (catalog ∪ in-use), uncatalogued flag → Task 2 (`buildPsKeyCatalog`) + Tasks 3/4 (rendering the flag). ✓
- Key parsing incl. irregular cases → Task 1 (`parsePsKey`) with tests for each. ✓
- Hybrid interaction (inline + modal), free-text preserved → Task 4. ✓
- Categorized, searchable modal → Task 3. ✓
- UOM auto-fill on explicit pick only, geometry units only → Task 5 (`AUTOFILL_UOMS` guard). ✓
- Grouping `(scope, domain, uom)` for geometry, Meta/Special single → Task 2 (`categoryFor` + `groupPsKeyCatalog`), test asserts `Surface · SF`/`Surface · LF`/`Special` order. ✓
- `MANUAL_CAPTURE` → Special → Task 1 test + Task 2 grouping. ✓
- Reusable component, Task editor wired first → Tasks 3-5; Module editor explicitly out of scope. ✓
- No state/engine/migration/bundle changes → enforced by Global Constraints; only `TaskEditor.jsx` is modified. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**Type consistency:** `parsePsKey` returns `{scope, domain, uom, name}` (Task 1) consumed identically in `makeEntry`/`looseEntry` (Tasks 2, 4). `Entry` fields (`key, label, displayTitle, catalogued, scope, domain, uom, categoryLabel, categoryOrder`) defined in Task 2 are exactly those read by `PsKeyPickerModal` (Task 3) and `PsKeyField` (Task 4). `onPick(key:string)` (Task 3) → `pick(key)` resolves to `Entry` → `onSelect(entry)` (Task 4) → `entry.key`/`entry.uom` (Task 5). `AUTOFILL_UOMS` is a `Set` in Task 2 and `.has()`-tested in Tasks 2 and 5. Consistent. ✓
