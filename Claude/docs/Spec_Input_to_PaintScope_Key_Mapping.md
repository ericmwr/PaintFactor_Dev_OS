# Spec Input → PaintScope Quantity Key Mapping (Draft v0.1)

## Purpose

This document defines the canonical mapping between **Spec required inputs** and **PaintScope Quantity Keys**.

- Specs MUST declare required inputs using these names (Spec Input Names).
- At runtime, the Estimation Engine must resolve those inputs to PaintScope keys.
- If a required PaintScope key is missing, spec application MUST fail.

Authority:
- `docs/PaintScope_Quantity_Key_Catalog.md`
- `docs/PaintScope_EdgeLF_Mapping.md`
- `docs/PaintFactor_OS.md`

---

## Conventions

### Spec Input Name format
- `IN_<UOM>_<SUBJECT>[_<DETAIL>]`

Examples:
- `IN_SF_WALL_FIELD`
- `IN_LF_EDGE_TO_TRIM`
- `IN_EA_SIDE_DOOR_SLAB_PANEL`

### PaintScope Key format
See `docs/PaintScope_Quantity_Key_Catalog.md`.

### UOM alignment rule
Spec input UOM MUST match the PaintScope key’s UOM:
- SF ↔ SF
- LF ↔ LF
- EA ↔ EA
- EA_SIDE ↔ EA_SIDE

No conversions are allowed in specs.

---

# 1) Universal Inputs (used by many specs)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_META_SPRAY_ENV_POSSIBLE | FLAG | PS_META.FLAG.SPRAY_ENV_POSSIBLE | strategy selection considers spraying | Flag only; not a quantity |
| IN_META_OCCUPIED | FLAG | PS_META.FLAG.OCCUPIED | strategy selection considers masking level | |
| IN_META_NEW_CONSTRUCTION | FLAG | PS_META.FLAG.NEW_CONSTRUCTION | new construction vs repaint logic | |
| IN_EA_ROOMS_TOTAL | EA | PS_META.EA.ROOMS_TOTAL | optional routing | Do not price from this directly |

---

# 2) Interior Walls (Field + Edge)

## 2.1 Wall Field Area

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_SF_WALL_FIELD | SF | PS_SURFACE_SF.WALL_FIELD | any wall painting work | Core wall quantity |
| IN_SF_WALL_REPAIR_AREA | SF | PS_SURFACE_SF.WALL_REPAIR_AREA | repair SF is explicitly captured | Optional; if missing, repairs must be condition-driven not SF-driven |

## 2.2 Wall EdgeLF Targets

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_LF_EDGE_TO_CEILING | LF | PS_EDGE_LF.TO_CEILING | spec includes edge work at ceiling | Required for cut/tape tasks |
| IN_LF_EDGE_TO_TRIM | LF | PS_EDGE_LF.TO_TRIM | spec includes edge work at trim | Required for cut/tape tasks |
| IN_LF_EDGE_TO_ASSET | LF | PS_EDGE_LF.TO_ASSET | spec includes edge work to protectable assets | Use only if strategy references asset adjacency |
| IN_LF_EDGE_INSIDE_CORNER | LF | PS_EDGE_LF.TO_SURFACE | inside corner cut-in | Wall-to-wall edges |
| IN_LF_EDGE_TO_WINDOW | LF | PS_EDGE_LF.TO_ASSET.WINDOW | window cut-in tasks | Window frame edges |

## 2.3 Wall Protection (only if measurable)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_SF_PROTECT_FLOOR_EXPOSED | SF | PS_PROTECT_SF.FLOOR_EXPOSED | protection is included and measurable | If missing, spec must fail OR require manual capture |
| IN_SF_PROTECT_CABINETS_FACE | SF | PS_PROTECT_SF.ASSET.CABINETS_FACE | masking cabinets by area | Prefer SF-based protection rather than “assume X” |
| IN_EA_PROTECT_FIXTURES | EA | PS_PROTECT_EA.ASSET.FIXTURES | fixture masking is counted | If not measured, treat as manual add-on workflow |

---

# 3) Interior Ceilings (Field + Optional Protection)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_SF_CEILING_FIELD | SF | PS_SURFACE_SF.CEILING_FIELD | any ceiling painting work | Core ceiling quantity |
| IN_SF_PROTECT_FLOOR_EXPOSED | SF | PS_PROTECT_SF.FLOOR_EXPOSED | ceiling work includes full-room drops | Especially relevant for spray strategies |

---

# 4) Trim (LF-based paintable items)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_LF_BASEBOARD | LF | PS_SURFACE_LF.TRIM_BASEBOARD | baseboard painting included | |
| IN_LF_CROWN | LF | PS_SURFACE_LF.TRIM_CROWN | crown painting included | |
| IN_LF_DOOR_CASING | LF | PS_SURFACE_LF.TRIM_CASING_DOOR | door casing painting included | |
| IN_LF_WINDOW_CASING | LF | PS_SURFACE_LF.TRIM_CASING_WINDOW | window casing painting included | |
| IN_LF_TRIM_OTHER | LF | PS_SURFACE_LF.TRIM_OTHER | fallback only | Avoid if possible; define more categories instead |
| IN_LF_TRIM_JOINTS | LF | PS_EDGE_LF.TRIM_JOINTS | trim caulk joint tasks | Miter/cope joints |
| IN_EA_CASING_ENDS | EA | PS_META.EA.CASING_END_COUNT | grain fill tasks | End-grain exposures |

---

# 5) Doors — Interior Repaint (EA per side contract)

## 5.1 Door slab sides (core)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_EA_SIDE_DOOR_SLAB_TOTAL | EA_SIDE | PS_SURFACE_EA_SIDE.DOOR_SLAB | any door slab painting | Total slab sides in scope |

## 5.2 Door slab sides by type (recommended)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_EA_SIDE_DOOR_SLAB_SLAB | EA_SIDE | PS_META.EA_SIDE.DOOR_SLAB.SLAB | spec has type-specific SOP/prod | Slab workflow |
| IN_EA_SIDE_DOOR_SLAB_PANEL | EA_SIDE | PS_META.EA_SIDE.DOOR_SLAB.PANEL | spec has type-specific SOP/prod | Panel workflow |
| IN_EA_SIDE_DOOR_SLAB_FRENCH | EA_SIDE | PS_META.EA_SIDE.DOOR_SLAB.FRENCH | spec has type-specific SOP/prod | Includes pane protection |
| IN_EA_SIDE_DOOR_SLAB_BIFOLD | EA_SIDE | PS_META.EA_SIDE.DOOR_SLAB.BIFOLD | spec has type-specific SOP/prod | Creases/edges |
| IN_EA_SIDE_DOOR_SLAB_LOUVERED | EA_SIDE | PS_META.EA_SIDE.DOOR_SLAB.LOUVERED | spec has type-specific SOP/prod | Low production baseline |

## 5.3 Frames/Jambs (choose one model and be consistent)

Option A (jamb sides):
| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_EA_SIDE_DOOR_JAMB | EA_SIDE | PS_SURFACE_EA_SIDE.DOOR_JAMB | jambs are painted by “side” model | Define what “side” means |

Option B (frame sets):
| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_EA_DOOR_FRAME_SET | EA | PS_SURFACE_EA.DOOR_FRAME_SET | frames are painted as set | Common estimating pattern |

## 5.4 French door panes (only if measurable)

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_EA_DOOR_PANES_TOTAL | EA | PS_META.EA.DOOR_PANES_TOTAL | pane masking modeled by count | If not measurable, do not require |
| IN_LF_EDGE_TO_GLASS_PANES | LF | PS_EDGE_LF.TO_ASSET.GLASS_PANES | pane masking modeled by edge LF | Advanced; only if PaintScope tracks pane edges |
| IN_SF_PROTECT_GLASS_AREA | SF | PS_PROTECT_SF.ASSET.GLASS_AREA | pane masking modeled by SF | Advanced |

---

# 6) Modifier Inputs

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_HEIGHT_BAND | ENUM | PS_META.HEIGHT_BAND | height modifier applies | Values: STD, STEP, EXT, SCAFFOLD, LIFT |
| IN_SURFACE_CONDITION | ENUM | PS_META.SURFACE_CONDITION | condition modifier applies | Values: NEW, GOOD, FAIR, POOR |
| IN_SURFACE_TEXTURE | ENUM | PS_META.SURFACE_TEXTURE | texture modifier applies | Values: SMOOTH, ORANGE_PEEL, KNOCKDOWN, HEAVY_TEXTURE |
| IN_COMPLEXITY_FACTOR | ENUM | PS_META.COMPLEXITY_FACTOR | complexity modifier applies | Values: OPEN, STD, MOD, COMPLEX, VCOMPLEX, EXTREME |

---

# 7) Cabinets

## 7.1 Cabinet Surfaces

| Spec Input Name | UOM | PaintScope Key | Required When | Notes |
|---|---:|---|---|---|
| IN_SF_CABINET_FACE | SF | PS_SURFACE_SF.CABINET_FACE | cabinet painting work | Core cabinet quantity |
| IN_EA_CABINET_DOORS | EA | PS_META.EA.CABINET_DOORS | door removal tasks | Count of doors |
| IN_EA_CABINET_HARDWARE | EA | PS_META.EA.CABINET_HARDWARE | hardware removal tasks | Count of hardware pieces |

---

# 8) Strategy Selection Mapping (Adjacency-driven)

This section maps common adjacency conditions to which PaintScope keys must exist if the spec enables strategies that depend on them.

| Strategy / Condition | PaintScope evidence required | Required keys | Enforced behavior |
|---|---|---|---|
| Walls adjacent to cabinets and masking strategy is selected | adjacency (surface→asset:cabinets) | IN_SF_PROTECT_CABINETS_FACE OR IN_LF_EDGE_TO_ASSET | If missing: FAIL spec application |
| Walls include tape-line cut to trim | edge classification exists | IN_LF_EDGE_TO_TRIM | If missing: FAIL |
| Walls include cut-in to ceiling | edge classification exists | IN_LF_EDGE_TO_CEILING | If missing: FAIL |
| Spray selected and floor protection required | floor exposed measurable | IN_SF_PROTECT_FLOOR_EXPOSED | If missing: FAIL or require manual capture workflow |

> Important: adjacency drives eligibility, but protection quantities must still be measurable as PaintScope keys.

---

# 9) "Spec Requirements Block" Template (for specs)

Specs should declare required inputs using this structure:

```json
{
  "required_inputs": [
    { "name": "IN_SF_WALL_FIELD", "uom": "SF", "paintscope_key": "PS_SURFACE_SF.WALL_FIELD" },
    { "name": "IN_LF_EDGE_TO_TRIM", "uom": "LF", "paintscope_key": "PS_EDGE_LF.TO_TRIM" }
  ]
}
