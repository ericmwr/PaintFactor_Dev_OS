# PaintScope Adjacency Schema (Conceptual) — Draft v0.1

## Purpose

This document defines the **conceptual adjacency model** for PaintScope.

Adjacency is the system’s representation of **what touches what** (paintable surfaces touching other surfaces and/or protectable assets). It exists to:

- enable deterministic **strategy eligibility** (mask vs cut vs remove, etc.)
- provide auditable **EdgeLF** breakdowns (to ceiling / to trim / to asset)
- prevent specs from re-deriving geometry or adjacency at runtime

**PaintScope records adjacency as facts. Specs consume adjacency as inputs.**

---

## Doctrine Constraints (Non-negotiable)

1) **PaintScope is the only source of geometry and adjacency.**
2) **Specs must never compute adjacency or EdgeLF internally.**
3) **Edges are first-class records.** Aggregation happens from edges → quantity keys.
4) **If a spec needs adjacency-derived quantities and they are missing, the spec must fail.**
5) **Adjacency does not imply decisions.** It does not mean “mask,” “tape,” or “remove.”
   It only describes relationships.

---

## Core Entities

### A) Room / Zone
A container for surfaces and assets. All adjacency is scoped to a room/zone.

**Key concept:** adjacency is not global; it is localized to the room/elevation segment.

---

### B) Surface (Paintable Geometry Unit)
A **Surface** is an atomic paintable unit whose quantity is expressed in one UOM:
- `SF` (e.g., wall field, ceiling field)
- `LF` (e.g., baseboard run)
- `EA` or `EA_SIDE` (e.g., door slab sides)

Surfaces are not instructions. They are measurable paint targets.

Examples:
- `WALL_FIELD`
- `CEILING_FIELD`
- `TRIM_BASEBOARD`
- `DOOR_SLAB_SIDE`

---

### C) Asset (Non-paint / Protectable Object)
An **Asset** is a non-paintable or optionally paintable object that can:
- require protection/masking
- create adjacency constraints
- influence strategy eligibility

Assets may have measurable protect quantities (SF/LF/EA), but only when captured/derived with a method.

Examples:
- `CABINET`
- `FLOOR_HARD`
- `TILE`
- `GLASS_PANE`
- `FIXTURE`

---

## The Adjacency Model

### Adjacency is represented primarily by **Edges**

An **Edge** is a boundary segment belonging to a subject surface.

Edges are the preferred adjacency representation because most painting adjacency concerns occur at boundaries:
- wall ↔ ceiling line
- wall ↔ trim line
- wall ↔ cabinet edge
- door slab ↔ glass pane boundary (if tracked)

Edges make adjacency:
- **measurable (LF)**
- **auditable**
- directly aggregatable into **EdgeLF quantity keys**

---

## Edge Record (Conceptual)

Each edge must have:

### 1) Ownership
- `subject_surface_id`
  - The paintable surface that owns the boundary segment.

### 2) Measure
- `length_lf`
  - The exact LF for this boundary segment.

### 3) Target Category (Edge Target)
A stable classification used to aggregate EdgeLF keys:

- `TO_CEILING`
- `TO_TRIM`
- `TO_ASSET`
- `TO_SURFACE` (paintable surface to paintable surface boundary, uncommon)
- `OTHER`

### 4) Counterparty Reference (Optional but preferred)
Edges can reference what exists on the other side of the boundary:

- `object_kind`: `surface | asset | unknown`
- `object_id`: surface_id or asset_id, depending on kind

This allows:
- asset-specific edge aggregation
- deterministic strategy eligibility checks
- better auditability

### 5) Edge Class (Optional finer bucket)
A more specific classification for targeted aggregation when needed:

Examples:
- `TO_ASSET.CABINETS`
- `TO_ASSET.TILE`
- `TO_ASSET.COUNTERTOP`
- `TO_ASSET.FLOOR_HARD`
- `TO_ASSET.GLASS_PANES`

**Rule:** edge_class may only be populated if PaintScope can assign it reliably.

### 6) Method + Confidence
- `measurement_method`: `manual | derived | inferred | unknown`
- `confidence`: optional numeric 0–1 if inferred

---

## Quantity Key Aggregation Rules (Adjacency → Keys)

PaintScope aggregates edges into Quantity Keys.

### Canonical EdgeLF keys
- `PS_EDGE_LF.TO_CEILING` = sum(length_lf) where edge_target = TO_CEILING
- `PS_EDGE_LF.TO_TRIM`    = sum(length_lf) where edge_target = TO_TRIM
- `PS_EDGE_LF.TO_ASSET`   = sum(length_lf) where edge_target = TO_ASSET

### Optional classified edge keys
- `PS_EDGE_LF.TO_ASSET.CABINETS` = sum(length_lf) where edge_class = TO_ASSET.CABINETS
- `PS_EDGE_LF.TO_ASSET.TILE`     = sum(length_lf) where edge_class = TO_ASSET.TILE
- etc.

**Rule:** Specs must not compute these sums; they must require the keys.

---

## Adjacency vs Protection

Adjacency identifies *where* boundaries exist.
Protection keys identify *how much area/count* must be protected, but only if measurable.

Examples:
- Wall is adjacent to cabinets:
  - adjacency evidence: edges with `edge_target=TO_ASSET` and `edge_class=TO_ASSET.CABINETS`
  - protection evidence (if measurable): `PS_PROTECT_SF.ASSET.CABINETS_FACE`

**Rule:** Adjacency does not imply protection quantities exist.  
If a strategy requires a protection quantity, PaintScope must publish it explicitly or the spec fails.

---

## Strategy Eligibility (Non-decision use)

Downstream systems may use adjacency to determine whether a strategy is eligible:

Examples:
- If there is any `TO_ASSET.CABINETS` edge, then strategies that require cabinet masking are eligible.
- If there is no `TO_TRIM` edge, then “cut to trim” strategies are invalid.

**PaintScope does not pick the strategy.**  
It only supplies the adjacency facts required to choose one deterministically later.

---

## Validation & Integrity Rules

### PaintScope must ensure:
1) EdgeLF is never negative; LF values must be numeric.
2) Edges must reference a valid subject surface.
3) If `object_kind=asset`, then a valid asset reference should exist (if known).
4) If a spec requires `PS_EDGE_LF.*`, those keys must be present and traceable.

### Specs must ensure:
- They require `PS_EDGE_LF.*` keys for any edge tasks (tape/cut/etc.).
- They do not create edge work tasks without EdgeLF inputs.

### Critic must FAIL if:
- Any spec computes adjacency or EdgeLF internally.
- Any spec includes edge work without requiring EdgeLF keys.
- A spec references an edge_class or asset category not defined in the asset catalog.

---

## Minimal Implementation Strategy (v1)

To keep early scope capture simple:

1) Always produce:
   - `PS_EDGE_LF.TO_CEILING`
   - `PS_EDGE_LF.TO_TRIM`
   - `PS_EDGE_LF.TO_ASSET` (only if assets are present)

2) Produce classified edge keys only when:
   - asset category is known AND
   - adjacency can be reliably linked to that asset

3) Allow manual tagging workflows:
   - User can label an edge segment “to cabinets” even if automated inference is not ready.

---

## Future Extensions (Deferred)

- adjacency beyond boundaries (e.g., “within 12 inches” proximity)
- vertical complexity tagging (stairs, vaulted transitions)
- exterior edges and elevation segmentation
- pane-level edge extraction for french doors (advanced)

