# SW Color Database & PaintScope Catalog Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import 1,700+ Sherwin-Williams colors into SQLite, export to a static JS module, and add autocomplete search + color family browsing to PaintScope's Colors tab.

**Architecture:** Python import script reads two XLSX spreadsheets into a `sw_colors` SQLite table with algorithmically derived color families (HSL-based). A second script exports the SQLite data to a static JS module (`sw-colors.js`) following the same pattern as `product-catalog.js`. PaintScope's `ColorEntryForm.jsx` gains autocomplete on the color name field, and a new `ColorCatalogBrowser.jsx` provides family-based browsing. Both feed selected colors into the existing form state.

**Tech Stack:** Python + openpyxl (import), SQLite (master DB), Vite/React (PaintScope UI), static JS module (client-side data)

**Spec:** `docs/superpowers/specs/2026-03-30-sw-color-database-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `Claude/database/import_sw_colors.py` | Import both XLSX → SQLite `sw_colors` table |
| `Claude/database/export_sw_colors.py` | Export SQLite → static JS module |
| `Claude/database/schema/migrations/002_sw_colors.sql` | CREATE TABLE + indexes for `sw_colors` |
| `Claude/tools/paintscope/src/data/sw-colors.js` | Static JS color catalog (~1,700 records) |
| `Claude/tools/paintscope/src/components/colors/ColorAutocomplete.jsx` | Autocomplete input for color name/code |
| `Claude/tools/paintscope/src/components/colors/ColorCatalogBrowser.jsx` | Color family browse panel with swatch grid |

### Modified Files
| File | Change |
|------|--------|
| `Claude/tools/paintscope/src/components/colors/ColorEntryForm.jsx` | Replace color_code + color_name inputs with `ColorAutocomplete` |
| `Claude/tools/paintscope/src/components/colors/ColorsView.jsx` | Add catalog browser toggle |

---

## Task 1: SQLite Migration Script

**Files:**
- Create: `Claude/database/schema/migrations/002_sw_colors.sql`

- [ ] **Step 1: Write the migration SQL**

Create `Claude/database/schema/migrations/002_sw_colors.sql`:

```sql
-- Migration 002: SW Colors catalog
-- Run: sqlite3 database/paintfactor.db < database/schema/migrations/002_sw_colors.sql

CREATE TABLE IF NOT EXISTS sw_colors (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    sw_code           TEXT    UNIQUE NOT NULL,
    color_name        TEXT    NOT NULL,
    locator_number    TEXT,
    hex               TEXT    NOT NULL,
    r                 INTEGER NOT NULL,
    g                 INTEGER NOT NULL,
    b                 INTEGER NOT NULL,
    hue               REAL,
    saturation        REAL,
    lightness         REAL,
    lrv               REAL,
    color_family      TEXT    NOT NULL,
    emerald_collection TEXT,
    emerald_category  TEXT,
    source            TEXT    NOT NULL CHECK(source IN ('colorsnap','emerald','both'))
);

CREATE INDEX IF NOT EXISTS idx_sw_colors_family ON sw_colors(color_family);
CREATE INDEX IF NOT EXISTS idx_sw_colors_name   ON sw_colors(color_name);
```

- [ ] **Step 2: Apply migration to verify it runs**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni"
sqlite3 Claude/database/paintfactor.db < Claude/database/schema/migrations/002_sw_colors.sql
sqlite3 Claude/database/paintfactor.db ".schema sw_colors"
```

Expected: Table schema printed with all columns and indexes.

- [ ] **Step 3: Commit**

```bash
git add Claude/database/schema/migrations/002_sw_colors.sql
git commit -m "feat(database): add sw_colors table migration"
```

---

## Task 2: Python Import Script

**Files:**
- Create: `Claude/database/import_sw_colors.py`

- [ ] **Step 1: Write the import script**

Create `Claude/database/import_sw_colors.py`:

```python
#!/usr/bin/env python3
"""Import Sherwin-Williams colors from XLSX spreadsheets into SQLite.

Usage:
    python database/import_sw_colors.py

Reads:
    docs/Future_Work/SW-ColorSnap-Color-Swatches-for-SW-Site-locator-031319.xlsx
    docs/Emerald Designer Edition Digital Data.xlsx

Writes:
    database/paintfactor.db → sw_colors table
"""

import os
import sys
import sqlite3
import colorsys
from collections import Counter

try:
    import openpyxl
except ImportError:
    print("Error: openpyxl required. Install with: pip install openpyxl")
    sys.exit(1)

# Resolve paths relative to project root (Claude/ directory)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)  # Claude/
DB_PATH = os.path.join(SCRIPT_DIR, 'paintfactor.db')
COLORSNAP_PATH = os.path.join(PROJECT_ROOT, 'docs', 'Future_Work',
    'SW-ColorSnap-Color-Swatches-for-SW-Site-locator-031319.xlsx')
EMERALD_PATH = os.path.join(PROJECT_ROOT, 'docs',
    'Emerald Designer Edition Digital Data.xlsx')


def rgb_to_hsl(r, g, b):
    """Convert RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100)."""
    r_norm, g_norm, b_norm = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(r_norm, g_norm, b_norm)
    return round(h * 360, 2), round(s * 100, 2), round(l * 100, 2)


def derive_color_family(hue, saturation, lightness):
    """Derive color family from HSL values.

    Low saturation → Neutral or White (split by lightness).
    Chromatic colors assigned by hue angle buckets tuned to SW palette.
    """
    if saturation < 10:
        return 'White' if lightness >= 85 else 'Neutral'

    # Chromatic hue buckets
    if hue < 15 or hue >= 330:
        return 'Red'
    elif hue < 45:
        return 'Orange'
    elif hue < 70:
        return 'Yellow'
    elif hue < 165:
        return 'Green'
    elif hue < 255:
        return 'Blue'
    else:
        return 'Purple'


def parse_colorsnap(path):
    """Parse ColorSnap spreadsheet. Returns dict keyed by SW code."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb['Sheet1']
    colors = {}

    for row in ws.iter_rows(min_row=3, values_only=True):  # Skip blank row 0 + header row 1
        sw_code, name, locator, r, g, b, hex_val, _ = row
        if not sw_code or not name:
            continue

        sw_code = str(sw_code).strip()
        locator = str(locator).strip() if locator and str(locator).strip() != 'N/A' else None
        r, g, b = int(r), int(g), int(b)
        hex_val = str(hex_val).strip() if hex_val else f'{r:02X}{g:02X}{b:02X}'
        hue, sat, light = rgb_to_hsl(r, g, b)

        colors[sw_code] = {
            'sw_code': sw_code,
            'color_name': str(name).strip(),
            'locator_number': locator,
            'hex': hex_val,
            'r': r, 'g': g, 'b': b,
            'hue': hue, 'saturation': sat, 'lightness': light,
            'lrv': None,
            'color_family': derive_color_family(hue, sat, light),
            'emerald_collection': None,
            'emerald_category': None,
            'source': 'colorsnap',
        }

    wb.close()
    return colors


def parse_emerald(path):
    """Parse Emerald Designer Edition spreadsheet. Returns dict keyed by SW code."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb['EmeraldDesigner']
    colors = {}

    for row in ws.iter_rows(min_row=2, values_only=True):  # Header at row 0
        f_name, collection, category, color_name, color_id, _, lrv, _, r, g, b, hex_val = row
        if not color_id or not color_name:
            continue

        sw_code = str(color_id).strip()
        r, g, b = int(r), int(g), int(b)
        hex_val = str(hex_val).strip() if hex_val else f'{r:02X}{g:02X}{b:02X}'
        hue, sat, light = rgb_to_hsl(r, g, b)

        colors[sw_code] = {
            'sw_code': sw_code,
            'color_name': str(color_name).strip(),
            'locator_number': None,
            'hex': hex_val,
            'r': r, 'g': g, 'b': b,
            'hue': hue, 'saturation': sat, 'lightness': light,
            'lrv': float(lrv) if lrv else None,
            'color_family': derive_color_family(hue, sat, light),
            'emerald_collection': str(collection).strip() if collection else None,
            'emerald_category': str(category).strip() if category else None,
            'source': 'emerald',
        }

    wb.close()
    return colors


def merge_colors(colorsnap, emerald):
    """Merge Emerald data onto ColorSnap records, deduplicating by SW code."""
    merged = dict(colorsnap)  # Start with ColorSnap as base
    emerald_only = 0
    deduped = 0

    for sw_code, em in emerald.items():
        if sw_code in merged:
            # Merge Emerald metadata onto existing ColorSnap record
            merged[sw_code]['lrv'] = em['lrv']
            merged[sw_code]['emerald_collection'] = em['emerald_collection']
            merged[sw_code]['emerald_category'] = em['emerald_category']
            merged[sw_code]['source'] = 'both'
            deduped += 1
        else:
            merged[sw_code] = em
            emerald_only += 1

    return merged, deduped, emerald_only


def insert_colors(db_path, colors):
    """Insert color records into sw_colors table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Clear existing data for idempotent re-runs
    cursor.execute('DELETE FROM sw_colors')

    cols = ('sw_code', 'color_name', 'locator_number', 'hex', 'r', 'g', 'b',
            'hue', 'saturation', 'lightness', 'lrv', 'color_family',
            'emerald_collection', 'emerald_category', 'source')
    placeholders = ', '.join(['?'] * len(cols))
    sql = f'INSERT INTO sw_colors ({", ".join(cols)}) VALUES ({placeholders})'

    rows = []
    for c in sorted(colors.values(), key=lambda x: x['sw_code']):
        rows.append(tuple(c[col] for col in cols))

    cursor.executemany(sql, rows)
    conn.commit()

    # Verify
    cursor.execute('SELECT COUNT(*) FROM sw_colors')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def main():
    # Verify files exist
    for path, label in [(COLORSNAP_PATH, 'ColorSnap'), (EMERALD_PATH, 'Emerald')]:
        if not os.path.exists(path):
            print(f"Error: {label} file not found at {path}")
            sys.exit(1)

    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        print("Run the migration first: sqlite3 database/paintfactor.db < database/schema/migrations/002_sw_colors.sql")
        sys.exit(1)

    print("Parsing ColorSnap spreadsheet...")
    colorsnap = parse_colorsnap(COLORSNAP_PATH)
    print(f"  {len(colorsnap)} colors parsed")

    print("Parsing Emerald Designer Edition...")
    emerald = parse_emerald(EMERALD_PATH)
    print(f"  {len(emerald)} colors parsed")

    print("Merging and deduplicating...")
    merged, deduped, emerald_only = merge_colors(colorsnap, emerald)
    print(f"  {deduped} colors in both sources (merged)")
    print(f"  {emerald_only} Emerald-only colors added")
    print(f"  {len(merged)} total unique colors")

    print("Inserting into database...")
    count = insert_colors(DB_PATH, merged)
    print(f"  {count} rows inserted into sw_colors")

    # Distribution summary
    families = Counter(c['color_family'] for c in merged.values())
    print("\nColor family distribution:")
    for family in ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Neutral', 'White']:
        print(f"  {family:8s}: {families.get(family, 0):4d}")

    sources = Counter(c['source'] for c in merged.values())
    print(f"\nSource breakdown:")
    for src, cnt in sorted(sources.items()):
        print(f"  {src:10s}: {cnt}")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the import script**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude"
python database/import_sw_colors.py
```

Expected output: ~1,527+ total colors inserted, color family distribution across 8 families, source breakdown showing colorsnap/emerald/both counts.

- [ ] **Step 3: Verify data in SQLite**

Run:
```bash
sqlite3 Claude/database/paintfactor.db "SELECT color_family, COUNT(*) FROM sw_colors GROUP BY color_family ORDER BY color_family"
sqlite3 Claude/database/paintfactor.db "SELECT * FROM sw_colors WHERE sw_code = 'SW0001'"
sqlite3 Claude/database/paintfactor.db "SELECT * FROM sw_colors WHERE source = 'both' LIMIT 3"
```

Expected: Family counts match script output, SW0001 shows "Mulberry Silk" with derived family, "both" records show emerald_collection/category populated.

- [ ] **Step 4: Review color family distribution and adjust thresholds if needed**

Inspect the distribution. If any family is clearly misclassified (e.g., warm browns landing in "Orange" when they should be "Neutral"), adjust the saturation threshold or hue buckets in `derive_color_family()` and re-run.

Common adjustments:
- Raise saturation threshold from 10 to 12-15 if too many muted tones are chromatic
- Adjust Neutral/White lightness boundary if misclassified

- [ ] **Step 5: Commit**

```bash
git add Claude/database/import_sw_colors.py Claude/database/schema/migrations/002_sw_colors.sql
git commit -m "feat(database): import 1700+ SW colors from XLSX to SQLite"
```

---

## Task 3: Export Script (SQLite → Static JS Module)

**Files:**
- Create: `Claude/database/export_sw_colors.py`
- Create: `Claude/tools/paintscope/src/data/sw-colors.js`

- [ ] **Step 1: Write the export script**

Create `Claude/database/export_sw_colors.py`:

```python
#!/usr/bin/env python3
"""Export sw_colors from SQLite to a static JS module for PaintScope.

Usage:
    python database/export_sw_colors.py

Reads:
    database/paintfactor.db → sw_colors table

Writes:
    tools/paintscope/src/data/sw-colors.js
"""

import os
import json
import sqlite3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(SCRIPT_DIR, 'paintfactor.db')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'tools', 'paintscope', 'src', 'data', 'sw-colors.js')

COLUMNS = [
    'sw_code', 'color_name', 'locator_number', 'hex',
    'r', 'g', 'b', 'hue', 'saturation', 'lightness',
    'lrv', 'color_family', 'emerald_collection', 'emerald_category', 'source',
]


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(f'SELECT {", ".join(COLUMNS)} FROM sw_colors ORDER BY sw_code')
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Build family index for fast browsing
    families = {}
    for i, row in enumerate(rows):
        fam = row['color_family']
        if fam not in families:
            families[fam] = []
        families[fam].append(i)

    js = f"""// Auto-generated by database/export_sw_colors.py — do not edit manually
// {len(rows)} Sherwin-Williams colors from ColorSnap + Emerald Designer Edition

export const SW_COLORS = {json.dumps(rows, separators=(',', ':'))};

export const COLOR_FAMILIES = {json.dumps(families, separators=(',', ':'))};

export const FAMILY_NAMES = ['Red','Orange','Yellow','Green','Blue','Purple','Neutral','White'];
"""

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js)

    print(f"Exported {len(rows)} colors to {OUTPUT_PATH}")
    print(f"Families: {', '.join(f'{k}({len(v)})' for k, v in sorted(families.items()))}")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the export script**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude"
python database/export_sw_colors.py
```

Expected: `sw-colors.js` created in `tools/paintscope/src/data/` with ~1,700 color records.

- [ ] **Step 3: Verify the generated JS module loads**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope"
node -e "const m = await import('./src/data/sw-colors.js'); console.log('Colors:', m.SW_COLORS.length); console.log('Families:', Object.keys(m.COLOR_FAMILIES)); console.log('Sample:', m.SW_COLORS[0])"
```

Expected: Colors count matches SQLite, families array has 8 entries, sample shows first color record.

- [ ] **Step 4: Commit**

```bash
git add Claude/database/export_sw_colors.py Claude/tools/paintscope/src/data/sw-colors.js
git commit -m "feat(paintscope): export SW color catalog to static JS module"
```

---

## Task 4: ColorAutocomplete Component

**Files:**
- Create: `Claude/tools/paintscope/src/components/colors/ColorAutocomplete.jsx`

- [ ] **Step 1: Write the ColorAutocomplete component**

Create `Claude/tools/paintscope/src/components/colors/ColorAutocomplete.jsx`:

```jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SW_COLORS } from '../../data/sw-colors.js';

/**
 * Autocomplete input that searches SW colors by name or code.
 * On selection, calls onSelect({ sw_code, color_name, hex, r, g, b }).
 * Falls through to freehand text if no match selected.
 */
export default function ColorAutocomplete({ value, onChange, onSelect, placeholder, style }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Sync external value changes
  useEffect(() => { setQuery(value || ''); }, [value]);

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return SW_COLORS.filter(c =>
      c.color_name.toLowerCase().includes(q) || c.sw_code.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(val.length >= 2);
    setActiveIndex(-1);
    if (onChange) onChange(val);
  };

  const handleSelect = (color) => {
    setQuery(color.color_name);
    setOpen(false);
    setActiveIndex(-1);
    if (onSelect) onSelect({
      sw_code: color.sw_code,
      color_name: color.color_name,
      hex: color.hex,
      r: color.r,
      g: color.g,
      b: color.b,
    });
  };

  const handleKeyDown = (e) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(matches[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const swatchStyle = (hex) => ({
    display: 'inline-block',
    width: 16,
    height: 16,
    borderRadius: 3,
    border: '1px solid var(--border)',
    background: `#${hex}`,
    flexShrink: 0,
  });

  const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    overflowY: 'auto',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 4px 4px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  const itemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 11,
    background: isActive ? 'var(--bg-tertiary)' : 'transparent',
  });

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
      <input
        style={{ padding: '4px 6px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, width: '100%', boxSizing: 'border-box' }}
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (query.length >= 2) setOpen(true); }}
        placeholder={placeholder || 'Search color name or SW code...'}
      />
      {open && matches.length > 0 && (
        <div style={dropdownStyle} ref={listRef}>
          {matches.map((color, i) => (
            <div key={color.sw_code} style={itemStyle(i === activeIndex)}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => handleSelect(color)}>
              <span style={swatchStyle(color.hex)} />
              <span style={{ color: 'var(--text-primary)' }}>{color.color_name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{color.sw_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server still builds with new component**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope"
npx vite build 2>&1 | tail -5
```

Expected: Build succeeds (new component is not yet imported anywhere, but the sw-colors.js data module should parse).

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/colors/ColorAutocomplete.jsx
git commit -m "feat(paintscope): add ColorAutocomplete component for SW color search"
```

---

## Task 5: Integrate Autocomplete into ColorEntryForm

**Files:**
- Modify: `Claude/tools/paintscope/src/components/colors/ColorEntryForm.jsx`

The existing paint section (lines 88-121) has separate `color_code` and `color_name` inputs. Replace `color_name` with `ColorAutocomplete` and auto-populate `color_code` + swatch on selection.

- [ ] **Step 1: Modify ColorEntryForm.jsx**

At the top of `ColorEntryForm.jsx`, add the import (after the existing React import on line 1):

```jsx
import ColorAutocomplete from './ColorAutocomplete.jsx';
```

Replace the paint section's color_code and color_name inputs (lines 89-103). The current code is:

```jsx
      {hasPaint && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
          <div>
            <div style={labelStyle}>Color Code</div>
            <input style={{ ...inputStyle, width: 80 }}
              value={draft.color_code}
              onChange={e => set('color_code', e.target.value)}
              placeholder={inherited.color_code || 'SW 7006'} />
          </div>
          <div>
            <div style={labelStyle}>Color Name</div>
            <input style={{ ...inputStyle, width: 110 }}
              value={draft.color_name}
              onChange={e => set('color_name', e.target.value)}
              placeholder={inherited.color_name || 'Extra White'} />
          </div>
```

Replace with:

```jsx
      {hasPaint && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={labelStyle}>Color Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {draft.color_code && /^[0-9A-Fa-f]{6}$/.test(draft._hex || '') && (
                <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 3, border: '1px solid var(--border)', background: `#${draft._hex}` }} />
              )}
              <input style={{ ...inputStyle, width: 80 }}
                value={draft.color_code}
                onChange={e => set('color_code', e.target.value)}
                placeholder={inherited.color_code || 'SW 7006'} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>Color Name</div>
            <ColorAutocomplete
              value={draft.color_name}
              onChange={(val) => set('color_name', val)}
              onSelect={(color) => {
                setDraft(d => ({ ...d, color_name: color.color_name, color_code: color.sw_code, _hex: color.hex }));
              }}
              placeholder={inherited.color_name || 'Search or type color...'}
              style={{ width: 170 }}
            />
          </div>
```

Also update the initial state (line 22-33) to include `_hex`:

```jsx
  const [draft, setDraft] = useState({
    coating_type: initial.coating_type || inherited.coating_type || 'paint',
    color_code: initial.color_code || '',
    color_name: initial.color_name || '',
    product: initial.product || '',
    sheen: initial.sheen || '',
    stain_type: initial.stain_type || '',
    stain_color: initial.stain_color || '',
    stain_product: initial.stain_product || '',
    clear_product: initial.clear_product || '',
    clear_sheen: initial.clear_sheen || '',
    _hex: initial._hex || '',
  });
```

Note: `_hex` is transient UI state (prefixed with `_`) — it's used only for rendering the swatch preview in the form and is not persisted through `handleSave`.

- [ ] **Step 2: Verify in browser**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope"
npm run dev -- --port 5177
```

Open `http://localhost:5177`, navigate to Colors tab, click into any color group default or room color edit. Type "Extra" or "SW70" into the Color Name field. Verify:
- Dropdown appears after 2 characters
- Each row shows swatch + name + code
- Arrow keys navigate, Enter selects
- Selecting a color fills in the Color Code field and shows the swatch
- Typing a non-matching name leaves freehand text (no error)

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/colors/ColorEntryForm.jsx
git commit -m "feat(paintscope): integrate color autocomplete into ColorEntryForm"
```

---

## Task 6: ColorCatalogBrowser Component

**Files:**
- Create: `Claude/tools/paintscope/src/components/colors/ColorCatalogBrowser.jsx`

- [ ] **Step 1: Write the ColorCatalogBrowser component**

Create `Claude/tools/paintscope/src/components/colors/ColorCatalogBrowser.jsx`:

```jsx
import React, { useState, useMemo } from 'react';
import { SW_COLORS, COLOR_FAMILIES, FAMILY_NAMES } from '../../data/sw-colors.js';

const FAMILY_COLORS = {
  Red: '#c0392b', Orange: '#e67e22', Yellow: '#f1c40f', Green: '#27ae60',
  Blue: '#2980b9', Purple: '#8e44ad', Neutral: '#7f8c8d', White: '#ecf0f1',
};

/**
 * Browse SW colors by color family with swatch grid.
 * Calls onSelect({ sw_code, color_name, hex, r, g, b }) when a swatch is clicked.
 */
export default function ColorCatalogBrowser({ onSelect, onClose }) {
  const [activeFamily, setActiveFamily] = useState('Neutral');
  const [search, setSearch] = useState('');

  const familyColors = useMemo(() => {
    const indices = COLOR_FAMILIES[activeFamily] || [];
    let colors = indices.map(i => SW_COLORS[i]);
    // Sort by hue then lightness within family
    colors.sort((a, b) => a.hue - b.hue || a.lightness - b.lightness);
    // Apply text filter if searching within family
    if (search.length >= 2) {
      const q = search.toLowerCase();
      colors = colors.filter(c =>
        c.color_name.toLowerCase().includes(q) || c.sw_code.toLowerCase().includes(q)
      );
    }
    return colors;
  }, [activeFamily, search]);

  const chipStyle = (family, isActive) => ({
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: isActive ? 700 : 400,
    cursor: 'pointer',
    border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
    background: isActive ? 'var(--bg-tertiary)' : 'var(--bg-panel)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  });

  const swatchGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 6,
    padding: '8px 0',
    maxHeight: 300,
    overflowY: 'auto',
  };

  const swatchCardStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
          Browse Colors
        </div>
        <button onClick={onClose}
          style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          Close
        </button>
      </div>

      {/* Family chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {FAMILY_NAMES.map(fam => (
          <div key={fam} style={chipStyle(fam, fam === activeFamily)}
            onClick={() => { setActiveFamily(fam); setSearch(''); }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: FAMILY_COLORS[fam], border: '1px solid var(--border)' }} />
            {fam}
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {(COLOR_FAMILIES[fam] || []).length}
            </span>
          </div>
        ))}
      </div>

      {/* Filter within family */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Filter ${activeFamily} colors...`}
        style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, marginBottom: 6, boxSizing: 'border-box' }}
      />

      {/* Swatch grid */}
      <div style={swatchGridStyle}>
        {familyColors.map(color => (
          <div key={color.sw_code} style={swatchCardStyle}
            onClick={() => onSelect({ sw_code: color.sw_code, color_name: color.color_name, hex: color.hex, r: color.r, g: color.g, b: color.b })}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}>
            <div style={{
              width: '100%',
              height: 40,
              borderRadius: 4,
              background: `#${color.hex}`,
              border: '1px solid var(--border)',
              marginBottom: 4,
            }} />
            <div style={{ fontSize: 9, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
              {color.color_name}
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{color.sw_code}</div>
          </div>
        ))}
        {familyColors.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: 20 }}>
            No colors match "{search}" in {activeFamily}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope"
npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add Claude/tools/paintscope/src/components/colors/ColorCatalogBrowser.jsx
git commit -m "feat(paintscope): add ColorCatalogBrowser with family chips and swatch grid"
```

---

## Task 7: Integrate Browser into ColorsView

**Files:**
- Modify: `Claude/tools/paintscope/src/components/colors/ColorsView.jsx`
- Modify: `Claude/tools/paintscope/src/components/colors/ColorEntryForm.jsx`

Add a toggle button to ColorsView that opens/closes the catalog browser panel. When a user selects a color from the browser, it needs to feed into whichever ColorEntryForm is currently active. The simplest approach: add the browser to ColorsView with a callback that dispatches a "catalog selection" event to a shared ref.

- [ ] **Step 1: Add browser toggle to ColorsView**

Replace the full content of `Claude/tools/paintscope/src/components/colors/ColorsView.jsx`:

```jsx
import React, { useState, useCallback, useRef } from 'react';
import { useColorSchedule } from '../../hooks/useColorSchedule.js';
import ProjectDefaults from './ProjectDefaults.jsx';
import RoomColorEditor from './RoomColorEditor.jsx';
import ColorSchedule from './ColorSchedule.jsx';
import ColorCatalogBrowser from './ColorCatalogBrowser.jsx';

export default function ColorsView({ state, dispatch }) {
  const schedule = useColorSchedule(state);
  const [showBrowser, setShowBrowser] = useState(false);
  const catalogSelectionRef = useRef(null);

  const handleCatalogSelect = useCallback((color) => {
    if (catalogSelectionRef.current) {
      catalogSelectionRef.current(color);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
        <div />
        <button onClick={() => setShowBrowser(b => !b)}
          style={{ fontSize: 10, padding: '3px 10px', background: showBrowser ? 'var(--accent)' : 'var(--bg-panel)', color: showBrowser ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
          {showBrowser ? 'Hide Catalog' : 'Browse Colors'}
        </button>
      </div>
      {showBrowser && (
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--border)' }}>
          <ColorCatalogBrowser onSelect={handleCatalogSelect} onClose={() => setShowBrowser(false)} />
        </div>
      )}
      <ProjectDefaults colors={state.colors} dispatch={dispatch} catalogSelectionRef={catalogSelectionRef} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <RoomColorEditor state={state} schedule={schedule} dispatch={dispatch} catalogSelectionRef={catalogSelectionRef} />
        <ColorSchedule
          rooms={state.rooms || []}
          elevations={state.exterior?.elevations || []}
          schedule={schedule}
          colors={state.colors} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire catalogSelectionRef in ColorEntryForm**

Add an optional `catalogSelectionRef` prop to `ColorEntryForm`. When the form mounts while editing paint colors, it registers a callback on the ref so the browser can push a selection into the form.

At the top of `ColorEntryForm`'s function body (after the `useState` call), add:

```jsx
  // Register with catalog browser for external color selection
  useEffect(() => {
    if (!catalogSelectionRef) return;
    if (hasPaint) {
      catalogSelectionRef.current = (color) => {
        setDraft(d => ({ ...d, color_name: color.color_name, color_code: color.sw_code, _hex: color.hex }));
      };
      return () => { catalogSelectionRef.current = null; };
    }
  }, [catalogSelectionRef, hasPaint]);
```

Add `useEffect` to the import on line 1:

```jsx
import React, { useState, useEffect } from 'react';
```

Update the function signature to accept the new prop:

```jsx
export default function ColorEntryForm({ initial = {}, inherited = {}, onSave, onCancel, compact, catalogSelectionRef }) {
```

- [ ] **Step 3: Thread catalogSelectionRef through ProjectDefaults and RoomColorEditor**

In `ProjectDefaults.jsx`, update the function signature:

```jsx
export default function ProjectDefaults({ colors, dispatch, catalogSelectionRef }) {
```

Pass it to both ColorEntryForm instances (lines 70-73 and 87-89):

```jsx
          <ColorEntryForm
            initial={defaults[editingGroup]}
            onSave={(data) => handleSave(editingGroup, data)}
            onCancel={() => setEditingGroup(null)}
            catalogSelectionRef={catalogSelectionRef} />
```

```jsx
          <ColorEntryForm
            onSave={(data) => handleSave(newGroup || availableGroups[0], data)}
            onCancel={() => setAddingNew(false)}
            catalogSelectionRef={catalogSelectionRef} />
```

In `RoomColorEditor.jsx`, update the function signature to accept `catalogSelectionRef` and pass it to any ColorEntryForm instances rendered within it. Search the file for `<ColorEntryForm` and add `catalogSelectionRef={catalogSelectionRef}` to each instance.

- [ ] **Step 4: Verify in browser**

Run the dev server and test:
1. Open Colors tab → click "Browse Colors"
2. Family chips appear with counts — click between families
3. Swatch grid renders with color names and codes
4. Open a color default edit form → click a swatch in the browser → form fields populate
5. Close browser → "Browse Colors" button returns to normal state

- [ ] **Step 5: Commit**

```bash
git add Claude/tools/paintscope/src/components/colors/ColorsView.jsx Claude/tools/paintscope/src/components/colors/ColorEntryForm.jsx Claude/tools/paintscope/src/components/colors/ProjectDefaults.jsx Claude/tools/paintscope/src/components/colors/RoomColorEditor.jsx
git commit -m "feat(paintscope): integrate catalog browser into Colors tab with form selection"
```

---

## Task 8: Final Verification & Cleanup

- [ ] **Step 1: Full build check**

Run:
```bash
cd "C:/Eric_AI_Playground/Claude Code Uni/Claude/tools/paintscope"
npx vite build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: End-to-end test in browser**

Test these flows:
1. **Autocomplete:** Open any ColorEntryForm in paint mode → type "Accessible" → see "Accessible Beige SW 7036" appear → select it → color code shows "SW7036" with beige swatch
2. **Autocomplete with SW code:** Type "SW6" → see dropdown of SW6xxx colors → arrow down → Enter selects
3. **Freehand:** Type "Custom Mix 42" → no dropdown → color name stays as typed, no error
4. **Browse by family:** Click "Browse Colors" → select "Blue" chip → see blue swatches → click one → if a form is open, it fills in
5. **Filter within family:** In Blue family → type "Navy" → only navy-related blues show
6. **Close browser:** Click "Hide Catalog" or "Close" → panel collapses

- [ ] **Step 3: Verify SQLite data integrity**

Run:
```bash
sqlite3 "C:/Eric_AI_Playground/Claude Code Uni/Claude/database/paintfactor.db" "
SELECT COUNT(*) as total FROM sw_colors;
SELECT color_family, COUNT(*) as cnt FROM sw_colors GROUP BY color_family ORDER BY cnt DESC;
SELECT COUNT(*) FROM sw_colors WHERE source = 'both';
SELECT COUNT(*) FROM sw_colors WHERE lrv IS NOT NULL;
"
```

Expected: Total ~1,527+, all 8 families populated, "both" count matches Emerald overlap, LRV count matches Emerald records.

- [ ] **Step 4: Commit any final cleanup**

```bash
git add -A
git commit -m "feat(paintscope): SW color database and catalog search complete"
```
