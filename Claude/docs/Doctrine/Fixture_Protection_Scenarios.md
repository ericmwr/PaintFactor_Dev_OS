# Fixture Protection Scenarios

> **Status:** ACTIVE | **Version:** 1.0.0 | **Created:** 2026-02-21
> **Purpose:** Context-dependent protection lookup for spec authors and the estimation engine.

---

## 1. Purpose

This document defines what protection each bathroom and kitchen fixture requires based on what is being painted and how. It is a reference for:

- **Spec authors** — selecting protection zones and levels for new spec families
- **Estimation engine** — resolving fixture protection tasks and production modifiers at runtime
- **PaintScope UI** — displaying default protection levels in room configuration

This is NOT a spec. It does not define tasks or production rates. It defines the protection *requirements* that specs consume.

---

## 2. Protection Level Reference

All values come from `controlled_enums.json` → `protection_level`:

| Level | Description | Typical Action |
|-------|-------------|----------------|
| `none` | No protection needed | No materials, no time |
| `edge_only` | Tape or drop cloth at edges/junctions only | Minimal materials, quick setup |
| `partial_cover` | Tape plus paper or film covering part of surface | Moderate materials and time |
| `full_cover` | Complete covering of entire surface or zone | Full materials, significant time |
| `item_mask` | Individual item wrapping (bag, plastic, tape) | Per-item materials and time |
| `light_mask` | Light tape application at junctions/edges | Minimal tape, quick application |
| `full_mask` | Full tape line with draped plastic (e.g., finished walls during ceiling spray) | Maximum materials and time |

---

## 3. Context-Dependent Resolution

The same fixture requires different protection depending on:

1. **What is being painted** (spec context: ceiling, walls, trim/baseboard)
2. **How it is being applied** (application method: spray vs. brush/roll)

Each scenario matrix cell produces **two outputs**:

- **protection_level** — from `controlled_enums.json` (determines materials and protection task scope)
- **mechanism** — how the protection manifests in the estimate:
  - `task` — physical protection work with timed setup, materials, and teardown
  - `modifier` — no cover installed, but fixture presence slows adjacent painting work (production rate penalty on existing tasks)

---

## 4. Scenario Matrices

### 4.1 Toilet

| Spec Context | Spray | Brush/Roll |
|-------------|-------|------------|
| **Ceiling** | `item_mask` / task — loose plastic drape over top, tape at tank | `partial_cover` / modifier — presence below work zone, drape to catch drips |
| **Walls** | `full_cover` / task — plastic wrap entire toilet, tape at base | `none` / modifier — no cover needed, working around it slows production |
| **Trim/Baseboard** | `full_cover` / task — same as walls, spray mist travels at floor level | `none` / modifier — cutting around toilet base is slower |

### 4.2 Shower / Tub

Protection varies by fixture subtype due to different exposure geometry.

#### Walk-in Shower / Glass Door

| Spec Context | Spray | Brush/Roll |
|-------------|-------|------------|
| **Ceiling** | `full_cover` / task — seal opening with plastic + tape, mask glass panels | `partial_cover` / modifier — drape to catch drips |
| **Walls** | `full_cover` / task — seal opening with plastic + tape, mask glass panels | `none` / modifier — cut in around surround edges |
| **Trim** | `partial_cover` / task — protect surround base from floor-level spray | `none` / modifier — baseboard does not typically run through wet area |

#### Tub/Shower Combo

| Spec Context | Spray | Brush/Roll |
|-------------|-------|------------|
| **Ceiling** | `partial_cover` / task — plastic drape over top opening | `edge_only` / modifier — minimal drip risk |
| **Walls** | `full_cover` / task — seal with plastic at tub lip line + tape surround edges | `none` / modifier — cut in around surround |
| **Trim** | `partial_cover` / task — tub base protection from floor-level spray | `none` — baseboard does not run through tub area |

#### Freestanding Tub

| Spec Context | Spray | Brush/Roll |
|-------------|-------|------------|
| **Ceiling** | `partial_cover` / task — plastic drape over top | `edge_only` / modifier — minimal drip risk |
| **Walls** | `full_cover` / task — full wrap required, tub exposed from all sides | `none` / modifier — working around freestanding fixture |
| **Trim** | `full_cover` / task — exposed base, spray mist at floor level | `none` / modifier — cutting around exposed base |

### 4.3 Vanity

| Spec Context | Spray | Brush/Roll |
|-------------|-------|------------|
| **Ceiling** | `edge_only` / modifier — counter surface below work zone, minimal risk | `none` / modifier — low drip risk at vanity height |
| **Walls** | `partial_cover` / task — cover countertop surface + mask mirror edges | `none` / modifier — working around faucet/mirror slows production |
| **Trim** | `partial_cover` / task — cover counter from base-level spray | `none` — trim does not typically interface with vanity |

---

## 5. Modifier Guidance

When the mechanism is `modifier`, the fixture does not generate a protection task. Instead, it generates a **production rate modifier** on existing painting tasks for the room. The fixture's physical presence forces the painter to work around it, slowing application.

Suggested modifier ranges (to be calibrated with field data):

| Fixture | Context | Modifier Range |
|---------|---------|----------------|
| Toilet present | Brush/roll walls | +5-8 min/room (maneuvering behind tank, cutting around base) |
| Toilet present | Brush/roll trim/baseboard | +3-5 min/room (cutting around toilet base) |
| Shower/tub present | Brush/roll walls | +3-5 min/room (cutting around surround edges) |
| Vanity present | Brush/roll walls | +2-4 min/room (working around faucet, mirror, medicine cabinet) |

These modifiers apply per room, not per fixture count (a bathroom has at most one of each).

---

## 6. Material Requirements by Protection Level

| Level | Typical Materials | Consumable Category |
|-------|-------------------|---------------------|
| `none` | — | — |
| `edge_only` | Drop cloth runner or tape at junction | protection |
| `partial_cover` | Plastic sheeting + tape at edges | protection |
| `full_cover` | Plastic sheeting, tape all seams, sealed enclosure | protection |
| `item_mask` | Plastic bag or sheeting sized to item + tape | protection |
| `light_mask` | Tape at junctions/edges | protection |
| `full_mask` | Tape line + draped plastic sheet | protection |

---

## 7. Default Protection Level (Fixture Catalog)

The `defaultProtection` value in `fixture-catalog.js` represents the **worst-case** (spray) protection level. Context-dependent downgrade happens at estimation time when the active spec and application method are known.

| Fixture | Default Level | Rationale |
|---------|--------------|-----------|
| Cabinets | `full_cover` | Complete covering of all surfaces |
| Countertops | `full_cover` | Complete covering of counter surface |
| Appliances | `partial_cover` | Tape + film over front/top |
| Backsplash | `partial_cover` | Tape + paper over tile surface |
| Bathtub | `full_cover` | Complete plastic drape |
| Shower/Enclosure | `full_cover` | Full enclosure of opening |
| Toilet | `item_mask` | Individual item wrapping |
| Vanity | `partial_cover` | Cover countertop + mask mirror |
| Fireplace | `full_cover` | Complete covering of opening and surround |
| Stone Fireplace | `full_cover` | Complete covering |
| Built-in Shelving | `partial_cover` | Tape + paper over shelf surfaces |
| Light Fixtures | `item_mask` | Individual item bagging |

---

## 8. Floor Protection Defaults

| Floor Type | Default Level | Rationale |
|------------|--------------|-----------|
| Subfloor | `edge_only` | Perimeter drops only, surface is unfinished |
| Hardwood | `full_cover` | Complete covering required, high damage risk |
| Tile / Stone | `partial_cover` | Tape + paper or film, moderate damage risk |
| Carpet | `full_cover` | Complete covering, absorbs spills permanently |
| LVP / Laminate | `partial_cover` | Tape + film, moderate damage risk |
| Concrete | `edge_only` | Perimeter drops only, durable surface |
