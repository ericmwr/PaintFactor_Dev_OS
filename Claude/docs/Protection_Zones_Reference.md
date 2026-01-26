# Protection Zones Reference

**Status:** Canonical
**Version:** 1.0
**Last Updated:** 2025-01-26

Quick reference for protection zone IDs used in task metadata.

---

## Overview

Protection tasks carry zone metadata that enables the estimation engine to optimize setup/teardown across multiple specs in a project. Specs are authored as complete processes; optimization happens at project assembly.

**Related Document:** [Protection_and_Masking_Doctrine.md](Protection_and_Masking_Doctrine.md)

---

## Zone Catalog

| Zone ID | Description | Typical Materials | Common Specs |
|---------|-------------|-------------------|--------------|
| `floor_full` | Complete floor coverage | Rosin paper, plastic, taped seams | Spray ceilings, spray walls |
| `floor_perimeter` | Perimeter drops/runners | Canvas drops, plastic runners | Brush/roll walls, trim, doors |
| `floor_workzone` | Localized protection under work area | Drop cloth, plastic | Door painting, touch-up |
| `wall_adjacent` | Wall surfaces near work | Paper, plastic film | Spray trim, spray cabinets |
| `ceiling_line` | Ceiling-wall junction | Tape, paper backing | Wall painting |
| `trim_edges` | Trim perimeter (for wall work) | Painter's tape | Wall painting |
| `baseboard_top` | Top edge of baseboard | Painter's tape | Wall painting |
| `door_hardware` | Hinges, knobs, locks | Tape, plastic bags | Door painting |
| `window_glass` | Window panes | Paper, masking film | Window/trim painting |
| `cabinet_interior` | Inside cabinet boxes | Paper, plastic | Cabinet painting |
| `cabinet_hardware` | Pulls, hinges, catches | Remove or tape | Cabinet painting |
| `fixture_covers` | Lights, outlets, switches | Tape, plastic bags | Wall/ceiling painting |
| `countertop` | Counter surfaces | Paper, plastic | Cabinet painting |
| `appliances` | Kitchen/bath appliances | Plastic film | Cabinet, wall painting |

---

## Zone Hierarchy

Some zones supersede others:

| If Using | Supersedes | Reason |
|----------|------------|--------|
| `floor_full` | `floor_perimeter` | Full coverage includes perimeter |

---

## Method-Dependent Zones

When `method_dependent: true`, zone selection varies by application method:

| Logical Need | Brush/Roll Resolves To | Spray Resolves To |
|--------------|------------------------|-------------------|
| Floor protection | `floor_perimeter` | `floor_full` |
| Wall protection | minimal/none | `wall_adjacent` |

---

## Task Metadata Structure

Protection tasks include `protection_metadata`:

```json
{
  "task_id": "TASK_SETUP_FLOOR_PROTECTION",
  "task_type": "protect",
  "protection_metadata": {
    "action": "setup",
    "zones": ["floor_perimeter"],
    "method_dependent": true
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | enum | Yes | `setup`, `teardown`, or `maintain` |
| `zones` | array | Yes | Zone IDs from this catalog |
| `method_dependent` | boolean | No | If true, zones vary by spray vs brush/roll |

---

## Engine Behavior (Future)

At project assembly, the estimation engine will:

1. Collect all specs in project scope
2. Determine work sequence
3. Map zone usage across specs
4. Optimize: setup first, teardown last, skip middle

**Example:** If trim and walls both need `floor_perimeter`:
- Trim (first): SETUP floor_perimeter
- Walls (last): TEARDOWN floor_perimeter

---

## Commonly Paired Zones by Spec Type

| Spec Type | Typical Zones |
|-----------|---------------|
| Ceiling spray | floor_full, wall_adjacent, fixture_covers |
| Wall brush/roll | floor_perimeter, ceiling_line, trim_edges, fixture_covers |
| Wall spray | floor_full, ceiling_line, trim_edges, fixture_covers |
| Trim brush/roll | floor_perimeter |
| Trim spray | floor_perimeter, wall_adjacent |
| Door painting | floor_workzone, door_hardware |
| Cabinet painting | floor_perimeter, wall_adjacent, cabinet_interior, countertop |

---

## Adding New Zones

When a new protection scenario is identified:

1. Check if existing zone covers it
2. If not, propose new zone ID (lowercase, underscores)
3. Add to this reference with description and typical materials
4. Update Protection_and_Masking_Doctrine.md if needed
