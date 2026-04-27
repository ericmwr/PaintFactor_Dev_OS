# Protection UI Mockup — Identity tab + Protection tab

**Status:** Draft v2 (iteration on user feedback 2026-04-27)
**Scope:** Wireframes for the two UI changes that feed `SCN_ROOM_PROTECTION_NC`. Plus a new project-level prep heuristics section. No code yet.

## Architecture recap

```
┌────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│  Identity tab  │  ───►  │  Protection tab  │  ───►  │ room.protection  │
│ "what's here"  │        │ "how to protect" │        │ (state)          │
└────────────────┘        └──────────────────┘        └────────┬─────────┘
                                                               │
┌─────────────────┐                                            ▼
│ Project Setup   │                            ┌──────────────────────────┐
│ "global         │   ───────────────────────► │ SCN_ROOM_PROTECTION_NC + │
│  heuristics"    │                            │ project-level prep tasks │
└─────────────────┘                            └──────────────────────────┘
```

- Identity tab identifies inventory only.
- Protection tab assigns mask levels per item.
- Project Setup holds project-wide prep heuristics (outlets, HVAC vents).

---

## Identity Tab — additions (existing fields unchanged)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Identity                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Room Name      [Master Bath_______________________________]            │
│  Area Group     [Upstairs__________________________________]            │
│                                                                         │
│  Room Type      [▾ Master Bathroom_________________________]            │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ Kitchen │ Bathroom (Half/Full/Master) │ Powder Room      │           │
│  │ Living Room │ Family Room │ Dining Room │ Sunroom        │           │
│  │ Foyer │ Bedroom (Master/Standard) │ Office │ Hallway     │           │
│  │ Laundry │ Mudroom │ Basement │ Garage │ Other            │           │
│  └──────────────────────────────────────────────────────────┘           │
│                                                                         │
│  Painting Scope Preset  [▾ Ceilings + Walls + Trim_________]            │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ Ceilings only │ Walls only │ Ceilings + Walls            │           │
│  │ Trim only │ Ceilings + Walls + Trim │ Full │ Custom      │           │
│  └──────────────────────────────────────────────────────────┘           │
│  • Picking a preset auto-activates the substrates in this room.         │
│  • "Trim only" bulk-toggles all trim substrates ON (baseboard,          │
│    crown, casings, etc.) — engine still uses per-substrate scenarios;   │
│    the preset is purely a UI scope-selection convenience.               │
│  • Outlier indicator shown in project summary when room preset          │
│    differs from project default.                                        │
│                                                                         │
│  Dimensions                                                             │
│  Length [10.0]  Width [12.0]  Height [9.0]    floor: 120 SF             │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Room Contents (identification only — protection levels on next tab)    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Floor Type                                                             │
│    ○ Subfloor (no protection needed)                                    │
│    ● Finished Hardwood                                                  │
│    ○ Tile                                                               │
│    ○ Carpet                                                             │
│    ○ LVP                                                                │
│    ○ Concrete                                                           │
│                                                                         │
│  Wall Orientation Notes (optional — for feature walls or gables)        │
│    Long axis runs:  ● East-West  ○ North-South                          │
│    [+ Add gable wall]                                                   │
│                                                                         │
│  Fixtures Present                                                       │
│  ┌─ Suggested for Master Bathroom ─────────────────────────────┐        │
│  │ ☑ Vanity        ☐ Toilet        ☑ Bathtub        ☐ Shower   │        │
│  │ ☑ Light fixture ☐ Mirror        ☐ Towel bars     ☐ Linen    │        │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  ┌─ Other (click to expand) ─ ▾ ──────────────────────────────┐         │
│  │ Cabinets │ Countertop │ Built-in │ Fireplace │ Ceiling fan │         │
│  │ Mantel   │ Appliances │ ...                                │         │
│  └─────────────────────────────────────────────────────────────┘        │
│                                                                         │
│  Fireplace dimensions (when fireplace checked)                          │
│    Width [_____ ft]   Height [_____ ft]   → derives SF                  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Room-Level Overrides (existing — unchanged)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Quality Tier [▾ Project Default (QT3)]                                 │
│  Application Method [▾ Project Default (Brush/Roll)]                    │
│  Complexity [▾ Project Default (STD)]                                   │
│  System (workflow) [▾ Inherit from substrate]                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Notes on Identity changes:**
- **Outlets/switches and HVAC vents are NOT in the fixture list** — they're handled by project-level heuristics (see Project Setup section).
- **Fireplace** gets W×H dimension fields (computed SF) when checked.
- **Countertop** is in Other but only matters for protection when cabinets are being painted; otherwise covered by cabinet protection automatically.
- Wall orientation captured but not consumed in v1.

---

## Protection Tab — repurposed (no containment in v1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Protection                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Trim Tape Line  [☐] Crisp finished edge between trim & wall            │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Surface Protection                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┬───────┬──────────────────┬───────────────┬────────┐       │
│  │ Surface  │  Qty  │ Auto-suggested   │ Final         │ Hours  │       │
│  ├──────────┼───────┼──────────────────┼───────────────┼────────┤       │
│  │ Floor    │ 120SF │ Encapsulate      │ ▾ Encapsulate │  0.60  │       │
│  │          │       │ (full scope +    │               │        │       │
│  │          │       │  finished floor) │               │        │       │
│  │ Walls    │ 432SF │ none (in scope)  │ ▾ none        │  0.00  │       │
│  │ Ceiling  │ 120SF │ none (in scope)  │ ▾ none        │  0.00  │       │
│  └──────────┴───────┴──────────────────┴───────────────┴────────┘       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Adjacent-Surface Masks (items present but not painted)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────┬───────┬──────────────────┬─────────────┬──────┐ │
│  │ Item               │ Qty   │ Auto             │ Final       │ Hrs  │ │
│  ├────────────────────┼───────┼──────────────────┼─────────────┼──────┤ │
│  │ Door slabs         │ 2 EA  │ ☑ Mask           │ [☑]         │ 0.20 │ │
│  │ Door frames        │ 8 LF  │ ☑ Mask (not in   │ [☑]         │ 0.05 │ │
│  │                    │       │   stain scope)   │             │      │ │
│  │ Window glass       │ 6 LT  │ ☑ Mask (lites;   │ [☑]         │ 0.25 │ │
│  │                    │       │   window painted)│             │      │ │
│  │ Vanity             │ 1 EA  │ Full Cover       │ ▾ Full      │ 0.30 │ │
│  │ Bathtub            │ 1 EA  │ Full Cover       │ ▾ Full      │ 0.40 │ │
│  │ Light fixture      │ 1 EA  │ Item Mask        │ ▾ Item Mask │ 0.08 │ │
│  │ Ceiling fan        │ 1 EA  │ Item Mask        │ ▾ Item Mask │ 0.17 │ │
│  │ Fireplace          │ 16SF  │ Full Cover       │ ▾ Full      │ 0.11 │ │
│  └────────────────────┴───────┴──────────────────┴─────────────┴──────┘ │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Total Protection Labor (this room): 1.56 hr                            │
│                                                                         │
│  Note: Outlet/switch + HVAC vent protection handled at project          │
│  level — see Project Setup → Project Prep Heuristics.                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Project Setup — NEW: Project Prep Heuristics

Lives in Project Setup tab. Project-wide tasks that don't make sense to count per-room.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Project Prep Heuristics                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Outlets / Switches                                                     │
│    Strategy:                                                            │
│      ● Tape & mask (cover with tape strips)                             │
│      ○ Remove & replace covers                                          │
│      ○ Skip (no work for outlets/switches)                              │
│    Heuristic: ~1 hr per 2,500 SF of project                             │
│    Total project SF: 2,400 → Estimated: 0.96 hr                         │
│                                                                         │
│  HVAC Vents                                                             │
│    Strategy:                                                            │
│      ○ Tape & mask                                                      │
│      ● Remove & reinstall                                               │
│      ○ Skip                                                             │
│    Heuristic: 0.7 hr per room (closets excluded)                        │
│    Active rooms: 8 → Estimated: 5.6 hr                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation note:**
- These produce project-level tasks (not per-room scenario tasks).
- Probably emitted by a new `SF_PROJECT_PREP` scenario or appended to the project pricing layer at the very end.
- Tasks live in the same task library — flagged as `project_level: true` so the engine knows they fire once per project.
- Removal+reinstall variants are PREP-phase tasks, not protection-phase. Architecturally distinct from `MOD_PROTECT_*` modules.

---

## Auto-rule logic (corrected)

### Floor mask level

```
IF ceiling in paint/stain scope                                          → full
ELSE IF any spray method active in room                                  → full
ELSE IF painting_scope_preset = "Full" / "Ceilings + Walls + Trim"
        AND floor_type ≠ subfloor / concrete                              → encapsulate
ELSE IF walls in scope (brush)                                           → partial
ELSE IF only trim in scope (brush)                                       → edge
ELSE                                                                     → none
```

No floor-type escalation rule — each floor type will get its own scenario/modules later (different materials and methods for hardwood vs carpet vs tile).

### Wall mask level (single value for now)

```
IF walls in paint scope                                                  → none
ELSE IF ceiling sprayed AND walls not painted                            → full
ELSE IF trim sprayed AND walls not painted                               → partial
ELSE IF trim brushed AND walls not painted                               → edge
ELSE                                                                     → none
```

### Ceiling mask level — note: ceiling has no "full" option (gravity)

Levels for ceiling: `none / edge / partial / encapsulate`.

```
IF ceiling in paint scope                                                → none
ELSE IF walls sprayed (any context)                                      → partial
ELSE IF trim/crown sprayed near ceiling                                  → partial
ELSE                                                                     → none
```

`partial` for ceilings = perimeter cover only. The center of the ceiling doesn't need protection from spray that's hitting walls below it.

### Adjacent-surface masks (auto-suggested)

| Item | Qty source | When auto-suggested |
|---|---|---|
| Door slabs | doors NOT in paint scope (count) | always when count > 0 |
| Window glass (LITES) | lites count × windows IN scope | when window in paint scope (mask glass before painting muntins/sash) |
| Window full | windows NOT in paint scope (by size: S/STD/LG/XL) | when window not in scope |
| Door frame | LF when door_frames not in scope | always when LF > 0 |
| Door casing | LF when door_casing.painting = false | always when LF > 0 |
| Window casing | LF when window_casing.painting = false | always when LF > 0 |
| Window jamb | LF when window_jamb not in scope | always when LF > 0 |
| Cabinets | LF from fixtures.cabinets (paint_cabinets=false) | existing protect-mode flow |
| Built-in | SF from fixtures.builtin_shelving | when fixture present |
| Countertop | LF — only emitted when cabinets in PAINT scope | otherwise auto-included with cabinets |
| Fireplace | SF derived from W × H | when fixture present |
| Ceiling fan | EA from fixtures | when fixture present |
| Light fixture | EA from fixtures | when fixture present |

**Outlet/switch and HVAC vent are NOT in this list** — they're project-level heuristics in Project Setup.

### Tape line (manual toggle)

User toggle on Protection tab. Defaults to project setting (if any). When ON, fires `MOD_TAPELINE_INSTALL` + `MOD_TAPELINE_REMOVE` for the room's painted-trim LF.

### Containment

Deferred. No UI in v1.

---

## Outlier indicator (project summary)

When a room's `painting_scope_preset` differs from `project.default_painting_scope_preset`, show a chip in the project summary view:

```
┌─ Master Bathroom ─────────────────────────────────────┐
│  Ceilings + Walls   [⚠ Outlier — project default:    │
│                       Ceilings + Walls + Trim]       │
└────────────────────────────────────────────────────────┘
```

Same logic could extend to floor type or any other room-level config that diverges from a project-set default.

---

## Open items for review (round 2)

1. **Project-level prep heuristics architecture** — Two questions:
   - **(a) Where do these tasks fire?** Idea: new `SF_PROJECT_PREP` scenario keyed on project-level ctx, runs once per project. Or just append fixed-time entries to the pricing layer. Which feels right?
   - **(b) Strategy choice** — for outlets and HVAC vents, the user picks Tape/Remove/Skip. Should that selection emit DIFFERENT tasks (one task per strategy, with the chosen one's quantity = 1 and others = 0)? Or one task with rate variants by strategy via `applies_when`?

2. **Trim-only preset behavior** — When user picks "Trim only" on a room:
   - Activates: baseboard, crown, door_casing, window_casing, chair_rail, shoe_mold, picture_rail, wainscot_cap, window_stool, window_apron, shadow_box, panel_mold (all 12)?
   - Or a smaller "common trim" subset (just baseboard, crown, casings)?
   - And does it auto-deactivate walls + ceilings if previously selected?

3. **Fireplace** — when checked but W×H not yet entered, what's the default? Skip (qty 0)? Or warn? I'd default to skip with a "Set dimensions" hint.

4. **Project-level "default painting scope preset"** — should this live at Project Setup (so all new rooms inherit), or is the preset always per-room with no project default?

5. **Window full sizes (S/STD/LG/XL)** — auto-suggested when window NOT in paint scope. The size variant comes from `window.size_bucket` (already in window data). Confirmed?

6. **Outlier indicator scope** — just painting scope preset, or also other deviating fields (room overrides on QT, app method, etc.)?

7. **Project SF for outlet heuristic** — sum of all room floor SF, or some other measure (paintable SF, total wall SF, etc.)? "1 hr per 2,500 SF of project" — what's the "of project"?

Reply with picks / corrections and I'll do round 3 or move to build.
