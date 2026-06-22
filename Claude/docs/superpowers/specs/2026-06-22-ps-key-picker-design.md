# PS Key Picker — Searchable, Categorized Field for the Task Editor

**Date:** 2026-06-22
**Status:** Design Approved
**Scope:** PaintScope Authoring — Task editor (`TaskEditor.jsx`) PS Key field

---

## Problem

When authoring a canonical task in the Authoring → Tasks builder, the **PS Key** field is a bare text input ([`TaskEditor.jsx:222-225`](../../../tools/paintscope/src/components/authoring/TaskEditor.jsx)):

```jsx
<label style={labelStyle}>
  PS Key
  <input style={inputStyle} value={payload.ps_key || ''} onChange={e => handleField('ps_key', e.target.value)} />
</label>
```

The author has to know and type the exact key (e.g. `PS_SURFACE_LF.BASEBOARD`). There is no discovery, no search, and no guard against typos. A task whose `ps_key` doesn't exactly match what the engine emits silently receives zero quantity, so a single mistyped key is a quiet correctness bug.

There is already a label catalog — [`QUANTITY_KEY_LABELS`](../../../tools/paintscope/src/data/constants.js) maps ~150 keys to friendly names and is even pre-grouped by comment headers — but it is not surfaced anywhere in the authoring UI, and it is **incomplete**: many keys real tasks reference today are absent from it (e.g. `PS_SURFACE_EA.CABINET_DOOR`, `PS_SURFACE_SF.CLOSET_WALL`, `PS_OPENING_EA.DOOR_TOTAL`, `PS_SURFACE_LF.ARCH_ELEMENT`, `PS_PROTECT_SF.FLOOR_FULL_KITCHEN`).

## Goal

Replace the bare input with a **hybrid picker**:

1. Type in the field to filter matching keys inline (fast path for keys you know).
2. A "browse" affordance opens a **searchable modal that groups keys by category** (discovery path).
3. Free-text entry is always preserved — typing a key that matches nothing is accepted verbatim, so brand-new engine keys are never blocked.
4. Selecting a key **auto-fills the adjacent UOM dropdown** when the key's unit maps to a real UOM option.

The choices offered are the **union** of the catalog and the keys actually in use, so nothing currently referenced is hidden. Uncatalogued keys are shown with a humanized title and a "no label yet" flag, turning the catalog gap into a visible to-do rather than a silent omission.

## Out of Scope

- **Backfilling `QUANTITY_KEY_LABELS`** for the flagged keys — that is a separate data change. This feature only makes the gaps *visible*.
- **An "engine-verified" validation layer** — cross-checking a key against what `quantity-lookups.js` / `quantity-lookups-exterior.js` actually emit at runtime. Considered and deferred; the union of catalog + in-use is the agreed source for v1.
- **Wiring the picker into the Module editor** — the per-module `ps_key` override field can adopt the same component later. The component is built to be reusable, but this spec only wires the Task editor.
- **State / migration / engine changes** — none. `payload.ps_key` is a free string today and stays one; we only change how it's edited.

## Design Overview

Three new units plus one edit:

1. **`data/ps-key-catalog.js`** (pure, no React) — `parsePsKey(key)` derives category/scope/UOM from the key string; `buildPsKeyCatalog(bundle, labels)` produces the deduped, grouped, flagged entry list.
2. **`components/authoring/PsKeyPickerModal.jsx`** — the categorized, searchable modal, mirroring the existing [`RetireModuleModal.jsx`](../../../tools/paintscope/src/components/authoring/RetireModuleModal.jsx) overlay idiom.
3. **`components/authoring/PsKeyField.jsx`** — the hybrid field: text input + inline type-ahead dropdown + a button that opens the modal. Self-contained (imports the bundle and labels itself), so consumers drop it in with no data wiring.
4. **`TaskEditor.jsx`** — swap the bare input for `<PsKeyField>` and add the UOM-autofill side effect.

No state shape changes; `handleField('ps_key', …)` and `handleField('uom', …)` are the existing setters.

## Section 1: Key parsing and the catalog (`data/ps-key-catalog.js`)

### Naming convention

Keys follow `PS_[EXT_]<DOMAIN>_<UOM>.<NAME>`, with a few documented irregularities:

| Pattern | Example | Notes |
|---|---|---|
| Standard | `PS_SURFACE_LF.BASEBOARD` | domain `SURFACE`, uom `LF`, name `BASEBOARD` |
| Compound UOM | `PS_SURFACE_EA_SIDE.DOOR_SLAB` | uom `EA_SIDE` |
| Meta (dot after domain) | `PS_META.EA.ROOMS_TOTAL` | uom is the segment *after* the first dot |
| Non-geometry uom | `PS_META.TEXT.HEIGHT_BAND`, `PS_PROTECT_FIXED.CONTAINMENT` | uom `TEXT` / `FIXED` — not a UOM-dropdown value |
| Name contains a dot | `PS_PROTECT_EA.ASSET.HARDWARE` | name is `ASSET.HARDWARE` |
| Exterior | `PS_EXT_SURFACE_SF.SIDING_FIELD`, `PS_EXT_META.ENUM.ACCESS_TYPE` | `EXT_` → exterior scope |
| Exterior door oddball | `PS_EXT_DOOR_EA.TOTAL` | domain `DOOR`, folded into the Opening category |
| Sentinel | `MANUAL_CAPTURE` | no `PS_` prefix — Special group |

### `parsePsKey(key)`

Returns `{ scope, domain, uom, name }`.

```js
const AUTOFILL_UOMS = new Set(['SF', 'LF', 'EA', 'EA_SIDE']);

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
```

A `DOMAIN_LABEL` map renders display names and folds `DOOR → Opening`:
`SURFACE → "Surface"`, `EDGE → "Edge"`, `OPENING → "Opening"`, `DOOR → "Opening"`, `PROTECT → "Protection"`, `META → "Meta"`, `SPECIAL → "Special"`.

### `buildPsKeyCatalog(bundle, labels)`

```js
export function buildPsKeyCatalog(bundle, labels) {
  const map = new Map();                          // key -> entry, dedup by key
  for (const [key, label] of Object.entries(labels)) {
    map.set(key, makeEntry(key, label, true));
  }
  for (const task of Object.values(bundle.tasks || {})) {
    const k = task?.ps_key;
    if (!k || map.has(k)) continue;
    map.set(k, makeEntry(k, null, false));        // in-use, uncatalogued
  }
  return [...map.values()];                        // grouping/sorting done in the component
}
```

`makeEntry(key, label, catalogued)` runs `parsePsKey`, computes `displayTitle = label ?? humanize(name)` (e.g. `CABINET_DOOR → "Cabinet door"`), and returns:

```
{ key, label, displayTitle, catalogued, scope, domain, uom, categoryLabel, categoryOrder }
```

`humanize` replaces `_`/`.` with spaces and sentence-cases. Empty/falsy keys are skipped. `MANUAL_CAPTURE` flows through as a `SPECIAL` entry (catalogued = false) with `uom = null`.

### Grouping and ordering

- Category = `(scope, domain)`. Display order: interior `Surface, Edge, Opening, Protection, Meta`, then the exterior counterparts (prefixed "Exterior"), then `Special` last.
- Within a category, sort by `displayTitle` (case-insensitive).
- This is computed once in the component via `useMemo`, since the catalog is static per session.

## Section 2: The modal (`PsKeyPickerModal.jsx`)

Mirrors `RetireModuleModal` exactly for overlay mechanics: fixed full-screen backdrop at `zIndex: 9999`, `rgba(0,0,0,0.6)` scrim, click-scrim-to-close, inner panel `onClick={e => e.stopPropagation()}`, `var(--bg-panel)` background, `maxHeight: 85vh`, `overflowY: auto`.

Props: `{ catalog, initialQuery, value, onPick, onClose }`.

Contents (top to bottom):
- **Header** — "Select PS key" + close icon.
- **Search input** — case-insensitive substring match against `displayTitle`, `key`, and `label`. Autofocused, seeded with `initialQuery` (whatever was already typed in the field).
- **Custom-entry hint** — "Not listed? Type any key and press Enter to use it as a custom entry." When the query is non-empty and matches no catalog entry, an explicit "Use \"<query>\" as-is" row appears that calls `onPick(query)`.
- **Grouped list** — category header (muted, uppercase) per group; each row shows `displayTitle`, the raw key (mono, muted), a UOM badge, and a "no label yet" pill when `!catalogued`. The row matching `value` is highlighted. Clicking a row calls `onPick(entry.key)` and closes.

No nested scroll regions beyond the panel's own `overflowY`.

## Section 3: The hybrid field (`PsKeyField.jsx`)

Props: `{ value, onChange, onSelect }`.

- `value` — current `payload.ps_key`.
- `onChange(rawString)` — fires on every keystroke; parent stores it as `ps_key` verbatim (preserves free entry).
- `onSelect(entry)` — fires only on an explicit pick (inline row click or modal "use key"); carries the parsed entry so the parent can auto-fill UOM.

The inline dropdown and the modal both emit a **key string** (they stay unaware of entries/UOM). `PsKeyField` resolves that string to its catalog entry — or, for a custom key not in the catalog, builds one on the fly via `parsePsKey` — then calls `onSelect(entry)`. This keeps the modal a dumb returner of keys and concentrates the parse-and-autofill logic in one place.

Builds the catalog once:

```js
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { QUANTITY_KEY_LABELS } from '../../data/constants.js';
const catalog = useMemo(() => buildPsKeyCatalog(canonicalBundle, QUANTITY_KEY_LABELS), []);
```

Layout: the existing text `<input>` (unchanged styling) with a small trailing button (`⋯` / "browse") that opens `PsKeyPickerModal`. While the input is focused and non-empty, an **inline dropdown** lists up to ~8 matches (same match logic as the modal); Enter/click on a match fires `onSelect`; Escape or blur closes the dropdown leaving the typed value intact. Clicking the browse button (or focusing an empty field) opens the modal seeded with the current text.

## Section 4: Wiring into `TaskEditor.jsx`

Replace the bare input ([`:222-225`](../../../tools/paintscope/src/components/authoring/TaskEditor.jsx)):

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

`AUTOFILL_UOMS` (`SF`, `LF`, `EA`, `EA_SIDE`) is re-exported from `ps-key-catalog.js`. UOM is only ever auto-filled on an explicit pick whose derived unit is one of the dropdown's geometry options ([`UOM_OPTIONS`](../../../tools/paintscope/src/components/authoring/TaskEditor.jsx) = `['SF','LF','EA','EA_SIDE','MINS','HRS']`); `TEXT`/`ENUM`/`FLAG`/`FIXED` keys and free-typed keys leave the UOM dropdown untouched, so the author's existing choice is never clobbered.

## Testing

### Unit (vitest) — `data/__tests__/ps-key-catalog.test.js`

`parsePsKey`:
- Standard `PS_SURFACE_LF.BASEBOARD` → `{interior, SURFACE, LF, BASEBOARD}`.
- Compound `PS_SURFACE_EA_SIDE.DOOR_SLAB` → uom `EA_SIDE`.
- Meta double-dot `PS_META.EA.ROOMS_TOTAL` → uom `EA`, name `ROOMS_TOTAL`.
- Non-geometry `PS_META.TEXT.HEIGHT_BAND` → uom `TEXT`; `PS_PROTECT_FIXED.CONTAINMENT` → uom `FIXED`.
- Name-with-dot `PS_PROTECT_EA.ASSET.HARDWARE` → name `ASSET.HARDWARE`.
- Exterior `PS_EXT_SURFACE_SF.SIDING_FIELD` → exterior/SURFACE/SF; `PS_EXT_META.ENUM.ACCESS_TYPE` → exterior/META/ENUM.
- Oddball `PS_EXT_DOOR_EA.TOTAL` → domain `DOOR` (Opening category).
- Sentinel `MANUAL_CAPTURE` → special/SPECIAL/null.

`buildPsKeyCatalog`:
- Catalogued keys carry their label and `catalogued: true`.
- An in-use key absent from labels appears with `catalogued: false` and a humanized title (assert against a real bundle key such as `PS_SURFACE_EA.CABINET_DOOR`).
- Dedup: a key in both labels and the bundle appears once, catalogued.
- `MANUAL_CAPTURE` present as a Special entry.
- `AUTOFILL_UOMS` membership matches expectations for a geometry key vs a `TEXT` key.

### Manual — local dev server, McLeod project

1. Authoring → Tasks → New task → focus PS Key field; type "base" → inline dropdown lists baseboard keys; pick one → field fills, UOM flips to `LF`.
2. Click browse → modal opens grouped by category; confirm `CABINET_DOOR` shows under Surface · count with a "no label yet" flag and an `EA` badge.
3. Search "cabinet" → list narrows across categories; pick `PS_SURFACE_SF.CABINET_FRAME` → UOM flips to `SF`.
4. Type a never-seen key `PS_FOO.BAR`, press Enter → accepted verbatim, UOM unchanged.
5. Pick a `META.TEXT` key → ps_key set, UOM dropdown unchanged.
6. Save draft → JSON preview shows the chosen `ps_key`; no regression in existing fields.

## File-level change inventory

- **New** `Claude/tools/paintscope/src/data/ps-key-catalog.js` — `parsePsKey`, `buildPsKeyCatalog`, `humanize`, `AUTOFILL_UOMS`, `DOMAIN_LABEL`, category ordering.
- **New** `Claude/tools/paintscope/src/data/__tests__/ps-key-catalog.test.js` — unit coverage above.
- **New** `Claude/tools/paintscope/src/components/authoring/PsKeyPickerModal.jsx` — categorized searchable modal.
- **New** `Claude/tools/paintscope/src/components/authoring/PsKeyField.jsx` — hybrid input + inline dropdown + modal trigger.
- **Edit** `Claude/tools/paintscope/src/components/authoring/TaskEditor.jsx` — replace the bare PS Key input (`:222-225`) with `<PsKeyField>`; add the `onSelect` UOM-autofill handler.

No other files touched. No state, migration, engine, or bundle changes.
