# PaintScope Asset Catalog (Interior) — Draft v0.1

## Purpose

This document defines the canonical **Asset Catalog** for PaintScope.

Assets are **non-paintable or optionally paintable objects** that:
- influence strategy selection
- require protection or masking
- introduce edge conditions
- may impose access or complexity modifiers

PaintScope records **what assets exist and their measurable properties**.  
Specs and Estimation determine **how they are handled**.

---

## Core Principles

1) **Assets are facts, not instructions**
   - PaintScope does not decide masking method or labor strategy
   - It records presence, category, and measurable quantities only

2) **Protection quantities must be measurable**
   - If PaintScope cannot measure or approximate an asset’s protectable area/edge/count, it must not invent one
   - Specs must fail or route to manual capture if required keys are missing

3) **Adjacency drives relevance**
   - Assets only matter when adjacent to paintable surfaces
   - Adjacency is recorded separately but references asset IDs

---

## Asset Object Model (Conceptual)

Each asset record should include:

- `asset_id`
- `asset_category`
- `asset_subtype` (optional)
- `room_id` / `zone_id`
- `protect_uom` (SF | LF | EA)
- `protect_qty` (only if measurable)
- `measurement_method` (manual | derived | inferred | unknown)
- `notes` (non-binding context)

PaintScope must NOT:
- assume protection method
- infer labor steps
- compute geometry from adjacency alone

---

## Asset Categories (Interior)

### 1) Floors (Protectable Surfaces)

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| FLOOR | HARDWOOD, TILE, LVP, VINYL | SF | PS_PROTECT_SF.FLOOR_HARD_EXPOSED |
| FLOOR | CARPET | SF | PS_PROTECT_SF.FLOOR_CARPET_EXPOSED |
| FLOOR | CONCRETE | SF | PS_PROTECT_SF.FLOOR_EXPOSED |

Notes:
- Floor exposure SF should be derived per room/zone
- PaintScope must not assume full-room coverage unless captured

---

### 2) Cabinetry & Built-ins

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| CABINET | BASE, WALL, TALL | SF | PS_PROTECT_SF.ASSET.CABINETS_FACE |
| BUILTIN | BOOKCASE, MEDIA, SHELVING | SF | PS_PROTECT_SF.ASSET.BUILTINS_FACE |

Notes:
- Face area only (not volume)
- Edge LF may also be produced if adjacency edges are tracked

---

### 3) Countertops & Horizontal Surfaces

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| COUNTERTOP | STONE, QUARTZ, LAMINATE, WOOD | SF | PS_PROTECT_SF.ASSET.COUNTERTOPS |
| VANITY_TOP | STONE, SOLID_SURFACE | SF | PS_PROTECT_SF.ASSET.VANITY_TOPS |

---

### 4) Tile & Hard Wall Finishes (Non-Paint)

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| TILE | BACKSPLASH | SF | PS_PROTECT_SF.ASSET.TILE_BACKSPLASH |
| TILE | SHOWER_WALL | SF | PS_PROTECT_SF.ASSET.SHOWER_TILE |
| STONE | FEATURE_WALL | SF | PS_PROTECT_SF.ASSET.STONE_WALL |

---

### 5) Openings & Glazing (Protection Context)

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| GLASS | WINDOW_PANE | SF | PS_PROTECT_SF.ASSET.GLASS_AREA |
| GLASS | DOOR_PANE | SF | PS_PROTECT_SF.ASSET.GLASS_AREA |
| GLASS | MIRROR | SF | PS_PROTECT_SF.ASSET.MIRROR_AREA |

Optional edge-based keys (advanced):
- PS_EDGE_LF.TO_ASSET.GLASS_PANES

---

### 6) Fixtures & Hardware

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| FIXTURE | CEILING_FAN | EA | PS_PROTECT_EA.ASSET.FIXTURES |
| FIXTURE | LIGHT | EA | PS_PROTECT_EA.ASSET.FIXTURES |
| FIXTURE | PLUMBING | EA | PS_PROTECT_EA.ASSET.FIXTURES |
| HARDWARE | HINGES, HANDLES | EA | PS_PROTECT_EA.ASSET.HARDWARE_GROUPS |

Notes:
- EA counts only
- Removal vs masking is a strategy decision, not PaintScope’s

---

### 7) Appliances

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| APPLIANCE | RANGE, FRIDGE, DISHWASHER | EA | PS_PROTECT_EA.ASSET.APPLIANCES |
| APPLIANCE | WASHER, DRYER | EA | PS_PROTECT_EA.ASSET.APPLIANCES |

Optional:
- PS_PROTECT_SF.ASSET.APPLIANCE_FACE (only if measurable)

---

### 8) Stairs & Railings (Interior)

| Asset Category | Subtypes | Protect UOM | Typical Keys |
|---|---|---|---|
| STAIR | TREADS | SF | PS_PROTECT_SF.ASSET.STAIR_TREADS |
| RAILING | WOOD, METAL | LF | PS_PROTECT_LF.ASSET.RAILINGS |

---

## Adjacency Interaction (Non-Decision)

PaintScope should record adjacency links such as:
- wall ↔ cabinet
- wall ↔ tile
- wall ↔ glass
- ceiling ↔ fan

Adjacency alone does NOT imply:
- masking method
- labor intensity
- protection quantity

It only enables strategies downstream.

---

## Validation Rules

PaintScope must NOT:
- create asset records without clear category
- invent protect quantities without a measurement method
- collapse different asset categories into a generic “protect SF”

Specs must:
- declare which asset categories they respond to
- require matching PaintScope keys when strategies reference them

Critic must FAIL specs that:
- include asset protection work without declaring required asset keys
- reference asset types not present in this catalog

---

## Planned Extensions (Deferred)

- Exterior assets (landscaping, roofing, siding interfaces)
- Temporary protections (poly walls, containments)
- Environmental assets (HVAC returns, smoke detectors)

