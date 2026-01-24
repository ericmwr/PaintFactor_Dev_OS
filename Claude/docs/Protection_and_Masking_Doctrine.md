# Protection and Masking Doctrine

**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2026-01-20

This document defines how painting professionals protect floors, furniture, and adjacent surfaces during interior painting operations. AI agents generating specs MUST follow this doctrine when defining protection tasks and consumables.

---

## Core Principle

**Floor protection is driven by application method, not just surface type.**

Spray application requires complete, sealed floor coverage. Brush/roll applications have flexible options ranging from minimal drop cloths to full masking systems.

---

## Floor Protection by Application Method

### Spray Application — REQUIRED Full Coverage

Spray application creates overspray and demands complete floor protection with no gaps.

#### Hard Flat Floors (Hardwood, Plank, Tile, Concrete, etc.)

| Component | Specification |
|-----------|---------------|
| Primary covering | Rosin paper OR construction paper |
| Seam treatment | Tape all exposed seams |
| Perimeter | Tape line around walls/baseboard |
| Maintenance | Sweep/vacuum between coats; repair rips/tears immediately |

**Why:** Paper provides a durable, walkable surface that catches overspray without allowing bleed-through. Taped seams prevent paint from reaching floor through gaps.

#### Carpet

| Component | Specification |
|-----------|---------------|
| Primary covering | Thick plastic sheeting, 1.5 to 3.0 mil |
| Attachment | Tape down at all edges |
| Installation | Lay tightly and securely — no slack or bubbles |
| Maintenance | Sweep/vacuum between coats; tape or repair any rips |

**Why:** Plastic creates a non-porous barrier over carpet fibers. Thicker mil prevents tears from foot traffic and equipment. Secure attachment prevents paint from wicking under edges.

#### Maintenance During Spray Jobs — MANDATORY

Floor covering is NOT a one-time task. Between coats:
- Sweep and vacuum to remove dust and debris (prevents contamination of fresh coats)
- Inspect for rips, tears, and lifted tape
- Repair immediately — do not paint over compromised protection

---

### Brush & Roll Application — Flexible Options

Brush and roll applications allow contractor discretion in protection approach. Two primary systems are acceptable:

#### Option A: Drop Cloths Only

| Scenario | Drop Cloth Coverage |
|----------|---------------------|
| Ceilings included in scope | Drop entire room |
| Walls only, or wall elements (trim) | Perimeter drop cloths / runners along application area |

**Why:** Less overspray means full room coverage is optional. Perimeter drops catch drips from cut-in and roller work.

**Contractor Discretion:** Canvas vs. plastic drops, coverage extent beyond drip zone.

#### Option B: Tape Edge + Masking Paper + Drops

| Component | Specification |
|-----------|---------------|
| Tape edge | Apply along baseboard |
| Masking paper | 12-18 inches from tape edge outward |
| Drop cloths | Under masking paper, extending further out as needed |

**Why:** Creates a clean, defined edge at the baseboard while protecting floor from any roller splatter or brush drips.

**When to use Option B:** Higher quality tiers, occupied homes with flooring that cannot be easily cleaned, or when client has expressed floor protection concerns.

---

## Masking Adjacent Surfaces

### Masking Machine Usage

A **masking machine** is a handheld device that dispenses tape and paper (or tape and plastic) simultaneously, allowing efficient, aligned application.

**Rule:** When masking windows, cabinets, showers, doorways, or built-in fixtures, assume masking machine usage unless scope is very small.

### Masking Paper Sizes

| Width | Common Use |
|-------|------------|
| 4" | Narrow trim edges, outlet covers |
| 6" | Standard trim masking |
| 9" | Window casings, wider trim |
| 12" | Cabinet edges, door frames |
| 18" | Large elements, floor-to-baseboard transition |
| 24" | Maximum manual masking width |

**Selection rule:** Choose paper width to cover adjacent surface plus 2-3 inches beyond likely overspray zone.

### Masking Film Sizes

Masking film is pre-folded plastic that unfolds from the tape edge. Used for large adjacent areas.

| Width (unfolded) | Common Use |
|------------------|------------|
| 48" | Windows, small cabinets |
| 72" | Standard cabinets, showers, interior doors |
| 99" | Full-height cabinets, large windows, complete doorway coverage |

**Primary applications:** Cabinets, showers, windows, doorways, ceiling fans, light fixtures, any item too large for paper masking.

---

## Plastic Sheeting Types

### Visqueen (0.35 mil)

| Property | Value |
|----------|-------|
| Thickness | 0.35 mil (very thin) |
| Use cases | Furniture covering, wall drapes, containment walls |
| NOT for | Walking on, high-traffic areas |
| Advantage | Economical, covers large areas quickly |

**Why so thin:** Furniture protection doesn't need durability — just splash protection. Thin plastic is cheaper and easier to handle.

### Light Plastic (1.5 mil)

| Property | Value |
|----------|-------|
| Thickness | 1.5 mil |
| Use cases | Large floor covering (garage floors, basements) |
| Durability | Handles light foot traffic |

### Heavy Plastic (3.0 - 6.0 mil)

| Property | Value |
|----------|-------|
| Thickness | 3.0 to 6.0 mil |
| Use cases | Under manlifts, abrasive blasting areas, epoxy coating protection |
| Durability | Heavy equipment traffic, puncture resistant |

**Why thicker:** Manlift tires and heavy equipment will tear thin plastic. Abrasive media and harsh coatings require robust barriers.

---

## Decision Tree for Spec Generation

```
IF application_method = 'spray'
  IF floor_type IN ['hardwood', 'plank', 'tile', 'concrete', 'laminate']
    → Rosin/construction paper + taped seams + perimeter tape
    → Add maintenance task between coats
  ELSE IF floor_type = 'carpet'
    → 1.5-3.0 mil plastic + taped edges
    → Add maintenance task between coats

ELSE IF application_method IN ['brush_roll', 'brush_only', 'roll_only']
  IF quality_tier >= QT4 OR client_floor_concern = true
    → Option B: Tape edge + masking paper + drops
  ELSE
    → Option A: Drop cloths only
    → Full room drops if ceilings included, perimeter otherwise
```

---

## Consumable Drivers

When generating materials.json consumable usage models:

| Item | Driven By |
|------|-----------|
| Rosin/construction paper | Floor SF (spray hard floors only) |
| Plastic sheeting 1.5-3 mil | Floor SF (spray carpet only) |
| Drop cloths | Room count + floor SF (brush/roll) |
| Masking paper | LF of elements being masked |
| Masking film | Count of large elements (cabinets, windows, showers) |
| Visqueen | Furniture volume estimate |
| Tape (for seams/edges) | Proportional to paper/plastic usage |

---

## Exceptions and Edge Cases

### Spray in Occupied Home with Hard Floors

Even brush/roll jobs may have spray elements (cabinets, doors). If any spray occurs:
- Default to full paper coverage in spray zone
- Transition to drops in brush/roll zones

### Exterior Protected by Interior Spec

This doctrine covers INTERIOR protection only. Exterior protection (ground cover, shrub protection, vehicle masking) is out of scope and belongs to exterior spec families.

### Containment Construction

Full containments (floor-to-ceiling plastic walls for dust/fume isolation) are specialized and NOT covered by standard protection tasks. Flag as separate scope item if required.

### Ceilings-Only Scope

When scope is **ceilings-only repaint** (walls are NOT being painted), the room must be fully protected:

| Component | Requirement |
|-----------|-------------|
| Floors | Full drop coverage (entire room) |
| Walls | Draped with plastic sheeting |
| Wall-to-ceiling edge | Crisp tape line along ceiling perimeter |

**Why:** Ceiling work creates drips, roller splatter, and overspray risk. Without wall protection, damage to existing wall finish is likely. The tape line at the ceiling edge protects the wall finish and provides a clean boundary for ceiling paint application.

---

## Summary Table

| Application Method | Floor Type | Protection System |
|--------------------|------------|-------------------|
| Spray | Hard surface | Rosin paper, taped seams, perimeter tape |
| Spray | Carpet | 1.5-3 mil plastic, taped edges |
| Brush/Roll | Any | Drop cloths (full or perimeter) |
| Brush/Roll (QT4+) | Any | Tape edge + masking paper + drops |

---

## References

- Field notes from professional painting contractor (2026-01-20)
- PaintFactor DevOS architecture
