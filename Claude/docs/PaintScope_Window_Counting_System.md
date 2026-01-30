# PaintScope Window Counting System — Complete Specification

**Spec Family ID:** PAINTSCOPE_WINDOW_COUNTING_SYSTEM
**Status:** REVIEW
**Version:** 1.1.0
**Effective Date:** 2026-01-29
**Source:** Window Systems Painting Doctrine v1.1

## Overview

The Window Counting System is a module within PaintScope designed for fast, accurate capture of window data during project walkthroughs. It generates the quantities needed for labor estimation, material calculation, trim takeoffs, and wall deductions without requiring measurements or structured location tracking.

### Design Philosophy

**Speed over precision.** Estimators should count windows as fast as they can walk, not stop to measure or categorize every detail.

**Structure optional, not imposed.** The system accommodates location tracking and detailed notes when useful, but never requires them for standard windows.

**Perimeter as the universal unit.** Linear footage drives trim calculations directly. Area derives from perimeter (P²÷16), eliminating separate measurement.

**Exceptions get attention, standard windows don't.** 90% of windows are counted in aggregate groups. Only problem windows (deteriorated, oversized, bay/bow, special circumstances) receive individual tracking with location data.

---

## Data Model

### Window Group

A Window Group represents a collection of windows that share the same attributes. Groups are the primary counting unit.

```
WindowGroup {
  id: UUID
  title: String (optional)           // User-defined label, e.g. "Front elevation", "Kitchen"
  type: Enum                         // Double-hung | Casement | Slider | Fixed | Awning
  substrate: Enum                    // Wood | Vinyl/Clad | Aluminum | Steel
  condition: Enum                    // Good | Moderate | Deteriorated
  trimPackage: Enum                  // None | Casing | Full Pkg
  counts: {
    S: Integer                       // Small window count
    M: Integer                       // Medium window count
    L: Integer                       // Large window count
    O: Integer                       // Oversized window count
  }
  heights: {
    S: HeightTier                    // Default height tier for Small
    M: HeightTier                    // Default height tier for Medium
    L: HeightTier                    // Default height tier for Large
    O: HeightTier                    // Default height tier for Oversized
  }
}
```

### Window Exception

A Window Exception represents an individual window that requires special attention, tracking, or non-standard handling.

```
WindowException {
  id: UUID
  type: Enum                         // Deteriorated | Bay/Bow | Oversized | Other
  size: SizeBucket                   // S | M | L | O
  height: HeightTier                 // H1 | H2 | H3 | H4 | H5
  location: String (required)        // Free-text, e.g. "Front left, above garage"
  note: String (optional)            // Free-text, e.g. "Needs carpentry first"
  perimeter: Integer (optional)      // Measured LF, only for Oversized type
}
```

### Size Buckets

Size buckets eliminate the need for window measurement. Estimators visually categorize windows into four groups.

| Bucket | Label | Perimeter (LF) | Derived Area (SF) | Visual Reference |
|--------|-------|----------------|-------------------|------------------|
| S | Small | 8 | 4 | Bathroom, basement, transom |
| M | Medium | 12 | 9 | Standard bedroom, living room |
| L | Large | 17 | 18 | Picture windows, wide double units |
| O | Oversized | Measured | P²÷16 | Requires tape measure |

**Area derivation formula:** Area = Perimeter² ÷ 16

This assumes a roughly square aspect ratio, which produces conservative deductions (slightly underestimates area). For material estimation, this builds in a safety buffer.

### Height Tiers

Height tiers drive labor modifiers based on access difficulty. These align with `PaintFactor_Production_Rate_Reference.md` canonical values.

| Tier | Label | Range | Modifier | Access Method |
|------|-------|-------|----------|---------------|
| H1 | Standard | 0–8 ft | 1.00x | Ground / step stool |
| H2 | Step | 9–12 ft | 1.30x | Step ladder |
| H3 | Extension | 13–17 ft | 1.50x | Extension ladder / scaffold |
| H4 | Scaffold | 18–24 ft | 2.00x | Scaffold |
| H5 | Lift | 25+ ft | 2.50x | Lift equipment |

Height is assigned per size bucket within a group. If all Medium windows in a group are at ladder height, set M's height to H2. If heights vary significantly within a group, consider splitting into multiple groups or flagging individual exceptions.

> **Cross-reference:** Height tier codes and modifiers are defined canonically in `production rates/PaintFactor_Production_Rate_Reference.md` under `MOD_HT — Height`.

### Window Types

| Type | Description |
|------|-------------|
| Double-hung | Two vertically sliding sashes |
| Casement | Side-hinged, crank-operated |
| Slider | Horizontally sliding sashes |
| Fixed | Non-operable, picture window |
| Awning | Top-hinged, opens outward |

Window type affects labor rates for certain tasks (e.g., sash painting varies by type) but does not affect perimeter or area calculations.

### Substrates

| Substrate | Prep Implications |
|-----------|-------------------|
| Wood | Sanding, filling, standard primer |
| Vinyl/Clad | Cleaning, bonding primer |
| Aluminum | Cleaning, etching primer |
| Steel | Rust treatment, metal primer |

Substrate drives prep task selection and primer specification.

### Conditions

| Condition | Description | Prep Multiplier |
|-----------|-------------|-----------------|
| Good | Clean, intact finish | 1.0x |
| Moderate | Minor weathering, spot repairs | 1.5x |
| Deteriorated | Peeling, rot, glazing failure | 2.5–3.0x |

Condition affects prep labor hours. Windows in Deteriorated condition within a group may warrant individual exception flagging for detailed scoping.

### Trim Packages

| Package | Components Included |
|---------|---------------------|
| None | Window not being painted (wall only) |
| Casing | Exterior trim/casing only |
| Full Pkg | Casing, stool, apron (full interior package) |

Trim package determines which trim-related tasks apply to the group.

---

## Calculated Outputs

The Window Counting System produces the following outputs for consumption by the estimation engine.

### Per-Group Calculations

```
Group Total Count = S + M + L + O
Group Perimeter LF = (S × 8) + (M × 12) + (L × 17) + (O × measured)
Group Deduction SF = (S × 4) + (M × 9) + (L × 18) + (O × P²÷16)
```

### Project-Level Aggregations

```
Total Window Count = Σ(all group counts) + Σ(all exception counts)
Total Trim LF = Σ(all group perimeters) + Σ(all exception perimeters)
Total Wall Deduction SF = Σ(all group areas) + Σ(all exception areas)
```

### Output Keys for Spec Engine

The system populates the following PaintScope keys:

```
PS_OPENING_EA.WINDOW_S          // Total Small window count
PS_OPENING_EA.WINDOW_M          // Total Medium window count
PS_OPENING_EA.WINDOW_L          // Total Large window count
PS_OPENING_EA.WINDOW_O          // Total Oversized window count
PS_OPENING_EA.WINDOW_TOTAL      // Total all windows

PS_OPENING_LF.TRIM_WINDOW       // Total trim linear footage
PS_OPENING_SF.WINDOW_DEDUCT     // Total wall deduction square footage

PS_OPENING_EA.WINDOW_H1         // Windows at height tier 1
PS_OPENING_EA.WINDOW_H2         // Windows at height tier 2
PS_OPENING_EA.WINDOW_H3         // Windows at height tier 3
PS_OPENING_EA.WINDOW_H4         // Windows at height tier 4
PS_OPENING_EA.WINDOW_H5         // Windows at height tier 5 (25+ ft, lift required)

PS_OPENING_EA.WINDOW_EXCEPTION  // Count of flagged exceptions
```

Specs consume these keys directly. Specs never perform window geometry calculations—only key lookups.

---

## User Interface Specification

### Layout Structure

The Window Counting screen consists of three vertical sections:

1. **Header** — Project info and running totals
2. **Window Groups** — Scrollable list of group cards
3. **Exceptions** — Flag buttons and exception list

### Header

```
┌─────────────────────────────────────────────────────────────┐
│ Windows                              Count    Trim   Deduct │
│ 1847 Oakwood Drive                     12    141 LF  -86 SF │
└─────────────────────────────────────────────────────────────┘
```

- **Title:** "Windows"
- **Subtitle:** Project address
- **Totals:** Three metrics displayed right-aligned
  - Count: Total window count (integer)
  - Trim: Total perimeter (integer + "LF")
  - Deduct: Total deduction (negative integer + "SF", amber color)

Totals update in real-time as counts change.

### Window Group Card

Each group displays as a card with the following structure:

```
┌─────────────────────────────────────────────────────────────┐
│ Front elevation                                   4 windows │
│                                                             │
│ [Double-hung ▼] [Wood ▼] [Good ▼] [Casing ▼]               │
│                                                             │
│     Small        Medium        Large       Oversized        │
│      8 LF         12 LF        17 LF         Custom         │
│   [−] 0 [+]    [−] 3 [+]    [−] 1 [+]     [−] 0 [+]        │
│                  [≤8′▼]       [≤8′▼]                        │
└─────────────────────────────────────────────────────────────┘
```

**Title Row:**
- Editable title field (click to edit)
- If empty, displays "Group 1", "Group 2", etc.
- Window count badge right-aligned

**Attribute Row:**
- Four dropdown selects: Type, Substrate, Condition, Trim Package
- Condition dropdown shows rose/red text when "Deteriorated" selected

**Count Row:**
- Four size columns: Small, Medium, Large, Oversized
- Each column shows:
  - Size label (Small/Medium/Large/Oversized)
  - Perimeter value (8 LF / 12 LF / 17 LF / Custom)
  - Increment/decrement stepper control
  - Height tier dropdown (only visible when count > 0)

**Interactions:**
- Tap title to edit (inline text field)
- Tap dropdown to change attribute
- Tap +/− to adjust count
- Height dropdown appears automatically when count > 0
- Delete button (trash icon) visible when multiple groups exist

### Add Group Button

```
┌─────────────────────────────────────────────────────────────┐
│                    + Add Window Group                       │
└─────────────────────────────────────────────────────────────┘
```

- Dashed border, muted text
- Creates new group with default attributes
- Auto-focuses title field on new group

### Exceptions Section

```
┌─────────────────────────────────────────────────────────────┐
│ ⚑ Exceptions                                            (2) │
│                                                             │
│ [Deteriorated] [Bay/Bow] [Oversized] [Other]               │
│                                                             │
│ ● Deteriorated · Medium @ 9-13′                            │
│   Front, above porch — Full sill rot                    [×] │
│                                                             │
│ ● Bay/Bow · Large @ ≤8′                                    │
│   Living room, center                                   [×] │
└─────────────────────────────────────────────────────────────┘
```

**Header:**
- Flag icon + "Exceptions" label
- Count badge (only if exceptions > 0)

**Flag Buttons:**
- Four buttons in a row: Deteriorated (rose), Bay/Bow (amber), Oversized (blue), Other (gray)
- Tapping opens the Flag Exception modal

**Exception List:**
- Each exception shows:
  - Colored dot matching type
  - Type label + Size + Height tier
  - Location text
  - Note text (if present, shown with em-dash separator)
  - Delete button (×)

### Flag Exception Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Flag Window                                             [×] │
│                                                             │
│ [Deteriorated]                                              │
│                                                             │
│ Size                    Height                              │
│ [Medium ▼]              [≤8′ ▼]                            │
│                                                             │
│ Measured Perimeter (LF)        ← Only for Oversized type   │
│ [24                    ]                                    │
│                                                             │
│ Where is it? *                                              │
│ [Front left, above garage     ]                             │
│                                                             │
│ Note (optional)                                             │
│ [Needs carpentry first        ]                             │
│                                                             │
│ [          Save          ]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Fields:**
- Type badge (read-only, shows selected type)
- Size dropdown (S/M/L/O)
- Height dropdown (H1/H2/H3/H4/H5)
- Measured Perimeter field (only visible when type = Oversized)
- Location field (required, free-text)
- Note field (optional, free-text)
- Save button (disabled until location has content)

**Behavior:**
- Modal slides up from bottom on mobile
- Location field auto-focuses on open
- Save closes modal and adds exception to list
- Tapping outside or × closes without saving

---

## Workflow

### Standard Walkthrough Flow

1. **Start** — Open Windows module, one default group exists
2. **Count** — Walk property, tap +/− buttons as windows are encountered
3. **Group when attributes change** — When window type, substrate, or condition changes, add a new group
4. **Set heights if needed** — For windows above ground level, adjust height tier dropdown
5. **Flag exceptions** — When a window needs individual attention, tap flag button and add minimal location info
6. **Done** — Totals calculate automatically, no save button needed

### Group Management Logic

**When to use one group:**
- All windows share type, substrate, condition, and trim package
- Height varies but can be handled with per-size height assignment

**When to add a new group:**
- Different window type (e.g., casements on one side, double-hung on another)
- Different substrate (e.g., wood in front, vinyl in back)
- Different condition (e.g., front is good, back is deteriorated)
- Different trim package (e.g., interior gets full package, exterior gets casing only)

**When to flag an exception:**
- Individual window needs location tracking for scoping
- Deteriorated window within an otherwise good-condition group
- Bay or bow window requiring special labor treatment
- Oversized window requiring measured perimeter
- Any window needing a note for crew reference

### Title Usage Patterns

The group title is optional but useful for:
- Location context: "Front elevation", "Back of house", "2nd floor"
- Room grouping: "Kitchen + dining", "Upstairs bedrooms"
- Scope separation: "Interior scope", "Exterior only"
- Mixed use: "Front – 1st floor" (combines location attributes)

If left blank, groups display as "Group 1", "Group 2", etc. This is acceptable for simple projects.

---

## Integration Points

### PaintScope Geometry Layer

The Window Counting System feeds into PaintScope as the authoritative source for window geometry. Specs consume output keys, never raw window data.

```
PaintScope
├── Rooms/Zones
│   └── Wall SF (gross)
├── Windows (this system)
│   ├── PS_OPENING_SF.WINDOW_DEDUCT → subtracted from wall SF
│   └── PS_OPENING_LF.TRIM_WINDOW → consumed by trim specs
└── Doors
    └── PS_OPENING_SF.DOOR_DEDUCT → subtracted from wall SF
```

### Spec Consumption Example

A window trim painting spec would reference:

```
Task: Paint Window Trim
Quantity Key: PS_OPENING_LF.TRIM_WINDOW
Production Rate: 25 LF/hour (base)
Modifiers: Height tier multipliers applied from PS_OPENING_EA.WINDOW_H2, etc.
```

A wall painting spec would reference:

```
Task: Paint Walls
Quantity Key: PS_WALL_SF.PAINTABLE - PS_OPENING_SF.WINDOW_DEDUCT - PS_OPENING_SF.DOOR_DEDUCT
```

### Exception Handling in Specs

Flagged exceptions can trigger:
- Additional prep tasks (deteriorated windows)
- Labor multipliers (bay/bow complexity)
- Measured quantity overrides (oversized perimeter)
- Crew notes in work orders (location + note fields)

---

## Validation Rules

### Required Data

- At least one Window Group must exist
- Groups with count > 0 must have all attributes set (type, substrate, condition, trimPackage)
- Exceptions must have location field populated

### Warnings (Non-Blocking)

- Group with condition = "Deteriorated" and count > 2 → suggest flagging individuals
- Group with height tier H3 or H4 → confirm access equipment available
- Oversized exception without measured perimeter → prompt for measurement

### Data Constraints

- Counts: Integer ≥ 0
- Perimeter (measured): Integer > 0, ≤ 100 LF
- Title: String, max 50 characters
- Location: String, max 100 characters
- Note: String, max 200 characters

---

## Future Considerations

The following features are not included in the initial implementation but may be added:

- **Photo attachment** — Attach photo to individual exceptions
- **Voice entry** — Speak counts and attributes instead of tapping
- **Room integration** — Embed window counting within room entry workflow
- **Copy group** — Duplicate existing group with same attributes
- **Group reordering** — Drag to reorder groups
- **Bulk height assignment** — Set height tier for entire group at once
- **Exception templates** — Pre-defined exception types with default notes
- **Historical import** — Import window data from previous estimates at same property

---

---

## Cross-References

### Related Doctrine Documents
- `DOCTRINE_Window_Systems_Painting.md` v1.1 — Window painting doctrine, substrate treatment, quality tiers
- `PaintFactor_Production_Rate_Reference.md` v1.0 — Canonical height tier modifiers (MOD_HT)
- `paintscope_quantity_key_catalog.md` — PaintScope quantity key definitions

### Related PaintScope Documents
- `Spec_Input_to_PaintScope_Key_Mapping.md` — How specs consume window keys
- `PaintScope_EdgeLF_Mapping.md` — Edge work rules (window cut-in edges)

### Extracted Reference Files
- `Surface_Vocabulary_Reference.md` — Window surface IDs for adjacency metadata

---

## Summary

The Window Counting System achieves its design goals through:

1. **Flat group structure** — No forced hierarchy or location taxonomy
2. **Size buckets** — Eliminate measurement for 95% of windows  
3. **Perimeter-first math** — Single unit drives trim, area, and deductions
4. **Optional titles** — Location context when useful, invisible when not
5. **Exception flagging** — Individual attention only where warranted
6. **Real-time outputs** — Running totals visible throughout walkthrough

The system produces reliable quantity data for estimation while respecting the natural flow of a property walkthrough.
