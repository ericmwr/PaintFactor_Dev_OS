# SW Color Database & PaintScope Catalog Search

**Date:** 2026-03-30
**Status:** Approved
**Scope:** SQLite color database + PaintScope autocomplete/browse UI

## Overview

Import 1,700+ Sherwin-Williams colors from two spreadsheets into a SQLite table with algorithmically derived color families. Add autocomplete search and color family browsing to PaintScope's Colors tab. Schema designed for 1:1 migration to Supabase when the broader platform migration happens.

## Data Sources

### ColorSnap Swatches (`docs/Future_Work/SW-ColorSnap-Color-Swatches-for-SW-Site-locator-031319.xlsx`)
- 1,527 colors
- Fields: SW code (SW####), color name, locator number, R, G, B, HEX
- ~1,387 have locator strip numbers, ~140 older ones are N/A

### Emerald Designer Edition (`docs/Emerald Designer Edition Digital Data.xlsx`)
- 205 colors
- Fields: Name (F-prefix), collection, category, color name, SW code, LRV, hue, R, G, B, HEX
- Collections: "Form + Function", etc.
- Categories: "Whites", "Blues", "Greens", etc.

### Deduplication
- Join on SW code
- When both sources have the same code: merge Emerald's LRV, collection, and category onto the ColorSnap record, mark `source = "both"`
- Colors only in ColorSnap: `source = "colorsnap"`
- Colors only in Emerald: `source = "emerald"`

## Database Schema

Table `sw_colors` in `paintscope_db.sqlite`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `sw_code` | TEXT UNIQUE NOT NULL | e.g. "SW0001" |
| `color_name` | TEXT NOT NULL | e.g. "Mulberry Silk" |
| `locator_number` | TEXT | Strip locator e.g. "277-C4", nullable |
| `hex` | TEXT NOT NULL | e.g. "94766C" (no # prefix) |
| `r` | INTEGER NOT NULL | 0-255 |
| `g` | INTEGER NOT NULL | 0-255 |
| `b` | INTEGER NOT NULL | 0-255 |
| `hue` | REAL | HSL hue angle 0-360 (derived from RGB) |
| `saturation` | REAL | HSL saturation 0-100 (derived from RGB) |
| `lightness` | REAL | HSL lightness 0-100 (derived from RGB) |
| `lrv` | REAL | Light reflectance value (Emerald data only, nullable) |
| `color_family` | TEXT NOT NULL | Algorithmically derived |
| `emerald_collection` | TEXT | e.g. "Form + Function", nullable |
| `emerald_category` | TEXT | e.g. "Whites", nullable |
| `source` | TEXT NOT NULL | "colorsnap", "emerald", or "both" |

**Indexes:** `sw_code` (unique), `color_family`, `color_name`

## Color Family Algorithm

Derived from HSL values. Saturation threshold separates chromatic from achromatic colors, then hue angle buckets assign families.

```
If saturation < 10%:
    lightness >= 85% → "White"
    else             → "Neutral"
Else (chromatic):
    hue 0-15°    → "Red"
    hue 15-45°   → "Orange"
    hue 45-70°   → "Yellow"
    hue 70-165°  → "Green"
    hue 165-255° → "Blue"
    hue 255-330° → "Purple"
    hue 330-360° → "Red"
```

Hue buckets are tuned to SW's palette distribution — wider ranges for blue/green (larger families), tighter for orange/yellow. Thresholds may be adjusted after reviewing the distribution.

## Import Script

`Claude/database/import_sw_colors.py`:

1. Read both XLSX files with openpyxl
2. Parse ColorSnap (1,527 rows, skip blank row 0 and header row 1)
3. Parse Emerald Designer (205 rows, header row 0)
4. Convert RGB → HSL for every color
5. Derive `color_family` from HSL
6. Dedupe by SW code, merge Emerald metadata onto matching ColorSnap records
7. Create table and indexes in `paintscope_db.sqlite`
8. Insert all records
9. Print summary: total colors, per-family counts, dedup stats

## PaintScope UI Changes

### Autocomplete on ColorEntryForm.jsx

The existing color name text field becomes an autocomplete input:

- After 2+ characters typed, dropdown appears with matches against `color_name` and `sw_code`
- Each dropdown row: color swatch (small square) + color name + SW code
- Selecting a match auto-populates: color name, SW code, renders swatch preview
- No match selected = freehand text stays (supports custom/non-SW colors)
- Product and sheen fields remain unchanged

### Color Family Browse Panel

Accessible from the Colors tab via a button/toggle near the search field:

- Color family filter chips: Red, Orange, Yellow, Green, Blue, Purple, Neutral, White
- Click a chip to show grid of swatches in that family, sorted by hue then lightness
- Clicking a swatch populates the form fields (same as autocomplete selection)
- Emerald Designer collection available as secondary filter when browsing

### Data Loading

- Load all ~1,700 colors once from SQLite into memory on Colors tab mount
- Filter client-side for autocomplete and browse — dataset is small enough
- Query function added to existing PaintScope database layer

## Ideal Website (Future)

No website code changes in this pass. The schema is designed for 1:1 migration to Supabase:

- `sw_colors` table maps directly to a Supabase Postgres table
- Import script can be adapted to output SQL or call Supabase API
- Portal colors page and public color exploration tool will consume the same table post-migration

## Out of Scope

- Product catalog integration (separate feature, already tracked)
- Color assignments to rooms/substrates (existing system, unchanged)
- Supabase migration (future work)
- Color similarity/neighborhood search
