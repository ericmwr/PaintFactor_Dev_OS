# Interior Protection Doctrine

**Doctrine Level:** 2
**Authority:** PaintFactor_OS.md
**Status:** Review
**Version:** 1.0
**Last Updated:** 2026-01-31

This document defines how painting professionals protect floors, furniture, fixtures, and adjacent surfaces during interior painting operations. AI agents generating specs MUST follow this doctrine when defining protection tasks, consumables, and customer expectations.

**Related:** See `Spec_Completeness_Doctrine.md` for formalized protection zone declarations and validation rules.

---

## Scope Definition

### Projects Covered by This Doctrine

| Project Type | Coverage |
|--------------|----------|
| Interior residential repaint | Full coverage |
| Interior new construction | Full coverage |
| Occupied home repaint | Full coverage |
| Vacant home repaint | Full coverage |
| Rental turnover (interior) | Full coverage |
| Interior touch-up/spot repair | Partial (scaled protection) |

### Projects NOT Covered

| Project Type | Correct Doctrine |
|--------------|------------------|
| Exterior residential | Exterior Protection Doctrine (future) |
| Commercial interior | Commercial Protection Doctrine (future) |
| Cabinet refinishing (shop work) | Shop Protection protocols |

---

## Protection Categories

### Universal Protection

These items require protection whenever they are present, regardless of project type (repaint or new construction):

- **Finished Floors:** Hardwood, tile, LVP, carpet, vinyl, concrete (sealed)
- **Cabinets:** All cabinet faces, interiors when doors removed
- **Countertops:** All countertop surfaces
- **Millwork/Trim:** When not in scope of current work
- **Built-ins:** Bookcases, entertainment centers, benches
- **Fixed Appliances:** Ranges, refrigerators, dishwashers (when present)

### Occupancy-Driven Protection

These items require protection based on `occupancy_state` site condition:

- **Furniture:** Applies when occupancy_state includes occupied values
- **Personal Items:** Applies when occupancy_state includes occupied values
- **Window Treatments:** Applies when present (common in repaint, rare in NC)
- **Wall Decor:** Applies when present (common in repaint, rare in NC)

### New Construction Considerations

New construction projects have unique considerations:

- **Trade Coordination:** Some items may not yet be installed
- **Installation Sequence:** Protection may vary based on construction phase
- **Punch List Items:** Final protection may be minimal if surfaces are new

When estimating new construction, verify which items are installed:
- Flooring installed? → Apply floor protection
- Cabinets installed? → Apply cabinet protection
- Countertops installed? → Apply countertop protection

---

## Core Principles

### 1. Protection is Project-Level, Not Spec-Level

Protection zones are established ONCE per project, regardless of how many specs require them. Multiple specs painting in the same room share the same floor protection, furniture handling, and asset masking.

```
WRONG: Each spec calculates its own protection setup/teardown
RIGHT: Project consolidates protection requirements from all specs
```

### 2. Protection Requirements Derive from Paintable Items

PaintScope captures what is being painted. Protection requirements are derived from the combination of paintable items in each room/zone. This derivation can occur in PaintScope or in the Estimation Engine — the doctrine defines the rules, not the implementation location.

### 3. Occupancy State Drives Furniture Strategy

Vacant vs. occupied fundamentally changes the protection approach. Furniture handling is contractor discretion with time modifiers, but the doctrine defines the strategic options.

### 4. Customer Responsibility is Contractually Defined

Each project scope generates customer-facing protection expectations. The customer agreement defines what the homeowner must do vs. what the painting crew handles.

---

## Protection Zone Schema

### Zone Architecture

Protection zones are logical groupings of protection requirements that can be shared across multiple specs within a project. Each zone has:

- **Zone ID:** Unique identifier following naming convention
- **Zone Type:** Category of protection
- **Scope Trigger:** What paintable items activate this zone
- **Setup Task:** Work required to establish protection
- **Maintenance Task:** Work required between coats/phases (if applicable)
- **Takedown Task:** Work required to remove protection

### Zone ID Naming Convention

```
PZ_{TYPE}_{LOCATION}_{SUBTYPE}
```

| Component | Values | Examples |
|-----------|--------|----------|
| TYPE | FLOOR, FURN, ASSET, OPENING, FIXTURE, CONTAIN | PZ_FLOOR_*, PZ_FURN_* |
| LOCATION | ROOM, AREA, HOUSE | PZ_FLOOR_ROOM_*, PZ_FURN_HOUSE_* |
| SUBTYPE | Specific identifier | PZ_FLOOR_ROOM_KITCHEN, PZ_ASSET_ROOM_KITCHEN_CABINETS |

### Standard Protection Zone Types

#### PZ_FLOOR — Floor Protection Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_FLOOR_ROOM_{room_id}` | Floor protection for specific room | Any paint scope in room |
| `PZ_FLOOR_AREA_{area_id}` | Floor protection for open area (great room, etc.) | Any paint scope in area |
| `PZ_FLOOR_PATH_MAIN` | Traffic path protection (entry to work areas) | Any interior paint scope |

**Zone Properties:**
```json
{
  "zone_type": "FLOOR",
  "protection_method": "derived_from_application_method",
  "methods": {
    "spray": "paper_taped_seams",
    "spray_backroll": "paper_taped_seams", 
    "brush_roll": "drop_cloths",
    "brush_roll_qt4_plus": "tape_edge_paper_drops"
  },
  "floor_type_modifier": {
    "hardwood": "standard",
    "tile": "standard",
    "carpet": "plastic_required_for_spray",
    "laminate": "standard",
    "concrete": "standard"
  },
  "maintenance_required": true,
  "maintenance_trigger": "between_coats_and_phases"
}
```

#### PZ_FURN — Furniture Protection Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_FURN_ROOM_{room_id}` | Furniture handling for specific room | Wall or ceiling scope in room |
| `PZ_FURN_HOUSE_STAGING` | Whole-house furniture staging area | Multi-room project in occupied home |

**Zone Properties:**
```json
{
  "zone_type": "FURNITURE",
  "strategy": "contractor_discretion",
  "strategy_options": [
    "move_out_of_room",
    "center_stack_cover",
    "cover_in_place",
    "customer_responsible"
  ],
  "time_modifier_range": {
    "move_out": 1.5,
    "center_stack": 1.25,
    "cover_in_place": 1.1,
    "customer_handled": 1.0
  },
  "notes_field": "required",
  "notes_captures": ["unmovable_items", "fragile_items", "access_restrictions"]
}
```

#### PZ_ASSET — Fixed Asset Protection Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_ASSET_ROOM_{room_id}_CABINETS` | Cabinet masking in room | Wall scope adjacent to cabinets |
| `PZ_ASSET_ROOM_{room_id}_COUNTERTOPS` | Countertop protection | Wall or cabinet scope in kitchen/bath |
| `PZ_ASSET_ROOM_{room_id}_TILE` | Tile/backsplash masking | Wall scope adjacent to tile |
| `PZ_ASSET_ROOM_{room_id}_BUILTIN` | Built-in masking | Wall scope adjacent to built-ins |

**Zone Properties:**
```json
{
  "zone_type": "ASSET",
  "protection_method": "masking_film_or_paper",
  "method_selection": {
    "cabinets": "masking_film_72_99",
    "countertops": "paper_tape_edge",
    "tile_backsplash": "masking_paper_tape",
    "builtins": "masking_film_72_99",
    "stone_features": "paper_tape_edge"
  },
  "adjacency_required": true,
  "adjacency_source": "PS_EDGE_LF.TO_ASSET.*"
}
```

#### PZ_OPENING — Opening Protection Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_OPENING_ROOM_{room_id}_WINDOWS` | Window masking in room | Spray application in room |
| `PZ_OPENING_ROOM_{room_id}_DOORS` | Door masking in room | Spray application in room |

**Zone Properties:**
```json
{
  "zone_type": "OPENING",
  "protection_method": "masking_film",
  "required_when": {
    "application_method": ["spray", "spray_backroll"]
  },
  "optional_when": {
    "application_method": ["brush_roll"],
    "condition": "quality_tier >= QT4"
  }
}
```

#### PZ_FIXTURE — Fixture Protection Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_FIXTURE_ROOM_{room_id}_LIGHTS` | Light fixture protection | Ceiling scope in room |
| `PZ_FIXTURE_ROOM_{room_id}_FANS` | Ceiling fan protection | Ceiling scope in room |
| `PZ_FIXTURE_ROOM_{room_id}_OUTLETS` | Outlet/switch protection | Wall scope (spray) in room |

**Zone Properties:**
```json
{
  "zone_type": "FIXTURE",
  "strategy_options": {
    "lights": ["remove", "bag", "mask"],
    "fans": ["bag_secure_blades", "remove_blades"],
    "outlets": ["remove_covers", "tape_over"]
  },
  "preferred_strategy": {
    "lights": "remove",
    "fans": "bag_secure_blades",
    "outlets": "remove_covers"
  }
}
```

#### PZ_CONTAIN — Containment Zones

| Zone ID Pattern | Description | Scope Trigger |
|-----------------|-------------|---------------|
| `PZ_CONTAIN_ROOM_{room_id}_DUST` | Dust containment for sanding | Heavy prep, lead paint, occupied sensitive |
| `PZ_CONTAIN_ROOM_{room_id}_SPRAY` | Spray containment | Spray in occupied home with adjacent occupied space |

**Zone Properties:**
```json
{
  "zone_type": "CONTAINMENT",
  "special_scope": true,
  "requires_explicit_selection": true,
  "triggers": ["lead_paint", "heavy_sanding", "spray_occupied_adjacent"]
}
```

---

## Protection Zone Activation Rules

### Derivation from Paintable Items

When PaintScope captures paintable items in a room, protection zones are activated based on this mapping:

| Paintable Item | Activates Zone(s) |
|----------------|-------------------|
| Walls | PZ_FLOOR_ROOM_*, PZ_FURN_ROOM_*, PZ_ASSET_ROOM_*_CABINETS (if adjacent), PZ_FIXTURE_ROOM_*_OUTLETS (if spray) |
| Ceilings | PZ_FLOOR_ROOM_*, PZ_FURN_ROOM_*, PZ_FIXTURE_ROOM_*_LIGHTS, PZ_FIXTURE_ROOM_*_FANS |
| Trim (baseboard) | PZ_FLOOR_ROOM_* (perimeter only if brush) |
| Trim (casing) | PZ_FLOOR_ROOM_* (local drops) |
| Trim (crown) | PZ_FLOOR_ROOM_*, PZ_FURN_ROOM_* (if spray) |
| Doors | PZ_FLOOR_ROOM_* (local drops or paper) |
| Cabinets (painting) | PZ_FLOOR_ROOM_*, PZ_ASSET_ROOM_*_COUNTERTOPS |

### Application Method Escalation

Protection requirements escalate based on application method:

```
brush_only < brush_roll < spray_backroll < spray
```

| Application Method | Floor Protection | Opening Protection | Fixture Protection |
|--------------------|------------------|--------------------|--------------------|
| Brush only | Perimeter drops | None required | None required |
| Brush & roll | Full room drops | None required | Light fixture bags (ceiling scope) |
| Spray backroll | Paper + taped seams | Required | Required |
| Spray | Paper + taped seams | Required | Required |

### Multi-Spec Consolidation

When multiple specs activate the same protection zone, the zone is set up ONCE with the most demanding requirements:

**Example: Kitchen with wall, ceiling, and trim scope**

| Spec | Zones Activated | Method |
|------|-----------------|--------|
| SF_DRYWALL_WALL_REPAINT | PZ_FLOOR_ROOM_KITCHEN, PZ_FURN_ROOM_KITCHEN, PZ_ASSET_ROOM_KITCHEN_CABINETS | Brush/roll |
| SF_DRYWALL_CEILING_REPAINT | PZ_FLOOR_ROOM_KITCHEN, PZ_FURN_ROOM_KITCHEN, PZ_FIXTURE_ROOM_KITCHEN_LIGHTS | Brush/roll |
| SF_TRIM_REPAINT | PZ_FLOOR_ROOM_KITCHEN (perimeter) | Brush |

**Consolidated Result:**
- `PZ_FLOOR_ROOM_KITCHEN`: Full room drops (ceiling scope demands it)
- `PZ_FURN_ROOM_KITCHEN`: Set up once for all three specs
- `PZ_ASSET_ROOM_KITCHEN_CABINETS`: Set up once
- `PZ_FIXTURE_ROOM_KITCHEN_LIGHTS`: Set up once

**Time Calculation:**
- Setup: Calculated once at project level
- Maintenance: Per phase transition (not per spec)
- Takedown: Calculated once at project level

---

## Occupancy-Driven Protection Strategy

### Occupancy States

| State | Definition | Protection Impact |
|-------|------------|-------------------|
| Vacant | No furniture, no occupants | Fastest scenario, minimal furniture handling |
| Vacant with fixtures | Empty but light fixtures, window treatments remain | Remove or protect fixtures |
| Occupied — owner assists | Homeowner moves small items, crew handles rest | Moderate furniture time |
| Occupied — crew handles all | Crew responsible for all furniture movement | Significant time addition |
| Occupied — sensitive contents | High-value, fragile, or irreplaceable items | Premium protection, possible exclusions |

### Furniture Handling Strategies

Furniture handling is **contractor discretion** with documented time modifiers. The strategy is NOT auto-selected by the system.

#### Strategy: Move Out of Room

| Attribute | Value |
|-----------|-------|
| Time modifier | 1.5x base protection time |
| Best for | Small rooms, extensive wall/ceiling work |
| Risk level | Lowest paint risk, highest handling risk |
| Requires | Staging area in home or garage |

**Process:**
1. Remove all moveable furniture to staging area
2. Establish floor protection
3. Complete all painting
4. Return furniture after full cure

#### Strategy: Center-Stack and Cover

| Attribute | Value |
|-----------|-------|
| Time modifier | 1.25x base protection time |
| Best for | Medium rooms, standard wall scope |
| Risk level | Moderate (coverage gaps possible) |
| Requires | Room large enough for center stack |

**Process:**
1. Move all furniture to room center
2. Stack carefully (heavy items bottom)
3. Cover completely with plastic sheeting (visqueen)
4. Tape plastic to floor to seal
5. Establish floor protection around perimeter
6. Work around stack

#### Strategy: Cover in Place

| Attribute | Value |
|-----------|-------|
| Time modifier | 1.1x base protection time |
| Best for | Large/heavy items, ceiling-only scope |
| Risk level | Higher (items remain in work zone) |
| Requires | Careful work practices |

**Process:**
1. Cover individual items with plastic
2. Tape to floor where possible
3. Establish floor protection
4. Work carefully around items

#### Strategy: Customer Responsible

| Attribute | Value |
|-----------|-------|
| Time modifier | 1.0x (no additional time) |
| Best for | Cost-conscious customers, minimal contents |
| Risk level | Transferred to customer |
| Requires | Clear contractual language |

**Process:**
1. Customer removes/covers all items before crew arrival
2. Crew establishes floor protection only
3. Crew proceeds with painting
4. Customer returns items after cure

### PaintScope Room Notes

When capturing paintable items in PaintScope, the room record includes a notes field for protection-relevant information:

```json
{
  "room_id": "uuid",
  "room_label": "Living Room",
  "protection_notes": {
    "unmovable_items": ["Grand piano against east wall", "Built-in entertainment center"],
    "fragile_items": ["Antique chandelier - handle with care"],
    "access_restrictions": ["Cannot access behind piano without owner assistance"],
    "customer_instructions": ["Owner will move small items before start date"],
    "special_concerns": ["Hardwood floors recently refinished - no tape directly on floor"]
  }
}
```

These notes inform the estimator's strategy selection and appear on the work order.

---

## Protection Sequencing

### Standard Residential Repaint Sequence (Trim-First)

For projects with walls, ceilings, and trim, protection follows this sequence:

```
1. PROJECT SETUP (once)
   ├── Establish traffic path protection (PZ_FLOOR_PATH_MAIN)
   ├── Set up staging area (if furniture moving out)
   └── Customer walkthrough / verify scope

2. ROOM PROTECTION SETUP (per room, before first spec)
   ├── Furniture handling per selected strategy
   ├── Floor protection per application method
   ├── Asset masking (cabinets, counters, tile)
   ├── Fixture protection (lights, fans, outlets)
   └── Opening protection (if spray)

3. TRIM PHASE
   ├── Protection already in place
   ├── Work trim elements
   └── Minimal daily maintenance

4. PHASE TRANSITION (between trim and walls/ceilings)
   ├── Floor protection maintenance (sweep, repair)
   ├── Adjust masking if needed
   └── No re-setup required

5. WALLS/CEILINGS PHASE
   ├── Same protection continues
   ├── Work walls and ceilings
   └── Daily maintenance on multi-day jobs

6. PROJECT TAKEDOWN (once, after all specs complete)
   ├── Remove masking (all rooms)
   ├── Remove floor protection (all rooms)
   ├── Return furniture (per strategy)
   ├── Fixture reinstallation
   └── Final cleanup / customer walkthrough
```

### Daily Maintenance Tasks

For multi-day projects, protection requires daily maintenance:

| Task | When | Purpose |
|------|------|---------|
| Sweep/vacuum floor covering | End of each day | Remove debris, prevent tracking |
| Inspect for rips/tears | Start of each day | Prevent paint reaching floor |
| Verify tape adhesion | Start of each day | Prevent paint bleed |
| Adjust furniture covers | As needed | Maintain coverage |
| Secure plastic edges | As needed | Prevent trip hazards |

---

## Takedown Consolidation

### Spec-Level vs. Project-Level Takedown

| Project Type | Takedown Approach |
|--------------|-------------------|
| Single-spec project (one room, one surface) | Spec includes setup + takedown |
| Multi-spec project (multiple rooms or surfaces) | Project-level consolidated takedown |

### Spec-Level Declaration

Each spec declares its protection zone requirements. The spec does NOT calculate takedown time if the zone is shared.

```json
{
  "spec_id": "SF_DRYWALL_WALL_REPAINT",
  "protection_zones_required": [
    {
      "zone_pattern": "PZ_FLOOR_ROOM_{room_id}",
      "condition": "always"
    },
    {
      "zone_pattern": "PZ_FURN_ROOM_{room_id}",
      "condition": "occupancy != 'vacant'"
    },
    {
      "zone_pattern": "PZ_ASSET_ROOM_{room_id}_CABINETS",
      "condition": "adjacency_exists('wall', 'cabinet')"
    }
  ],
  "protection_zone_ownership": {
    "if_single_spec_project": "this_spec_owns_setup_and_takedown",
    "if_multi_spec_project": "project_consolidates"
  }
}
```

### Project-Level Consolidation Logic

The Estimation Engine consolidates protection zones:

```
FOR each room in project:
  COLLECT all protection zones required by specs in this room
  DEDUPLICATE by zone_id
  CALCULATE setup time (once)
  CALCULATE maintenance time (per phase transition)
  CALCULATE takedown time (once)
  
CREATE project-level protection tasks:
  TSK_PROJECT_PROTECTION_SETUP
  TSK_PROJECT_PROTECTION_MAINTENANCE (× phase count)
  TSK_PROJECT_PROTECTION_TAKEDOWN
  TSK_PROJECT_FINAL_CLEANUP
```

---

## Asset-Specific Protection Reference

### Cabinets (Not in Paint Scope)

When cabinets are NOT being painted but walls adjacent to cabinets ARE:

| Protection Element | Method | Material | Time Driver |
|--------------------|--------|----------|-------------|
| Cabinet faces | Masking film 72-99" | Pre-taped film | EA cabinet bank |
| Cabinet edges | Tape line | 1.5" tape | LF of edge |
| Interior (if doors removed) | Paper stuff or film | Varies | EA cabinet |

**Special case:** If cabinet doors are removed for another trade, interior protection may be required for spray applications.

### Countertops

| Protection Element | Method | Material | Time Driver |
|--------------------|--------|----------|-------------|
| Counter surface | Paper covering | Rosin or kraft paper | SF of counter |
| Counter edge | Tape line | 1.5" tape | LF of edge |
| Backsplash (if tile) | Masking paper | 6-12" paper | SF of backsplash |

### Fixed Appliances

| Appliance | Method | Material | Notes |
|-----------|--------|----------|-------|
| Refrigerator | Plastic drape | Visqueen 0.35 mil | Tape at edges |
| Range/cooktop | Plastic drape + paper on surface | Visqueen + paper | Heat-safe paper |
| Dishwasher | Plastic drape | Visqueen 0.35 mil | Face only |
| Washer/dryer | Plastic drape | Visqueen 0.35 mil | Tape at edges |

### Light Fixtures

| Strategy | When to Use | Time Impact |
|----------|-------------|-------------|
| Remove | Standard recommendation | Highest quality result |
| Bag (plastic) | Cannot remove easily | Acceptable for brush/roll |
| Mask in place | Flush-mount, cannot bag | Spray requires removal |

**Removal notes:**
- Cap wires properly
- Store hardware in labeled bags
- Document fixture location for reinstall
- Reinstall is separate task (may be owner or electrician)

### Ceiling Fans

| Strategy | Method | Time Impact |
|----------|--------|-------------|
| Bag and secure | Plastic bag over motor, blades taped to bag | Standard approach |
| Remove blades | Remove blades, bag motor | Premium approach |
| Full removal | Remove entire fan | Only if fan is being replaced |

**Securing blades:** Blades must be secured to prevent spinning during work — fan could turn on, blades could catch on roller, etc.

### Window Treatments

| Treatment Type | Strategy | Notes |
|----------------|----------|-------|
| Blinds (standard) | Remove | Store safely, reinstall after cure |
| Blinds (motorized) | Cover in place | Do not disconnect wiring |
| Curtains/drapes | Remove | Customer responsibility typical |
| Shutters (interior) | Remove or tape hinges | Depends on paint scope |

---

## Quality Tier Protection Implications

### QT3 — Standard Protection

| Element | Approach |
|---------|----------|
| Floor | Drop cloths, contractor discretion on extent |
| Edges | Freehand cut acceptable, tape optional |
| Assets | Basic masking, visual coverage |
| Cleanup | Standard final cleanup |

### QT4 — Enhanced Protection

| Element | Approach |
|---------|----------|
| Floor | Full room drops, tape edge at baseboard for higher sheens |
| Edges | Tape lines recommended for clean edges |
| Assets | Complete masking, sealed edges |
| Cleanup | Thorough cleanup, protection inspection before removal |

### QT5 — Premium Protection

| Element | Approach |
|---------|----------|
| Floor | Paper or premium drops, tape edge sealed |
| Edges | Tape lines with edge seal required |
| Assets | Premium masking, double-check coverage |
| Walls (non-paint) | May require plastic drape in spray scenarios |
| Cleanup | Detailed cleanup, customer walkthrough before and after |

---

## Customer Responsibility Policy

### Purpose

Each project scope generates a customer-facing protection expectations document. This document:

1. Defines what the painting crew will protect
2. Defines what the customer must do before work begins
3. Establishes liability boundaries
4. Sets expectations for access and scheduling

### Standard Customer Responsibility Clauses

#### Clause: Furniture — Customer Assists

> **Furniture Preparation:** Customer agrees to remove or relocate the following items before painting crew arrival on [start date]:
> - Small furniture and decorative items from all rooms in scope
> - Wall-mounted items (pictures, mirrors, shelves) from walls being painted
> - Items from closets if closet interiors are in scope
> 
> Painting crew will handle:
> - Moving larger furniture to room center and covering
> - Floor protection
> - Returning furniture to approximate original position after paint cure
>
> **Liability:** Contractor is not responsible for damage to items not disclosed prior to work or items that customer agreed to remove but did not.

#### Clause: Furniture — Crew Handles All

> **Furniture Handling:** Painting crew will handle all furniture movement including:
> - Removing wall-mounted items and storing safely
> - Moving furniture to room center or staging area
> - Covering furniture with protective plastic
> - Returning items to approximate original position after paint cure
>
> **Special Items:** Customer must identify any items requiring special handling (antiques, fragile items, items over [weight] lbs) before work begins. Additional charges may apply for specialty moving requirements.
>
> **Liability:** Contractor carries liability insurance for items handled by crew. Customer-identified fragile items will be handled with extra care but customer assumes risk for items of exceptional value not disclosed in writing.

#### Clause: Unmovable Items

> **Items That Cannot Be Moved:** The following items have been identified as unmovable and will be protected in place:
> - [List from PaintScope notes]
>
> Painting crew will:
> - Cover and protect these items
> - Work around them to the extent possible
>
> **Access Limitations:** Areas behind or beneath unmovable items may not be fully accessible for painting. Customer acknowledges these limitations.

#### Clause: Flooring Protection

> **Floor Protection:** Painting crew will protect floors in all work areas using:
> - [Drop cloths / Paper covering / Plastic sheeting] as appropriate for application method
>
> **Customer Responsibility:** Customer should notify contractor of any flooring concerns including:
> - Recently refinished floors (may require special tape)
> - Flooring with known damage or loose sections
> - Heated floors (may affect tape adhesion)
>
> **Post-Work:** Contractor will remove all floor protection. Minor dust or debris may remain; final floor cleaning is customer responsibility unless cleaning service is included in scope.

#### Clause: Pets and Children

> **Safety Requirements:** For the safety of all parties, customer agrees to:
> - Keep pets secured away from work areas during all work hours
> - Keep children away from work areas during all work hours
> - Provide crew with clear access path from entry to work areas
>
> **Ventilation:** Work areas may have paint odors. Customer should plan accordingly for sensitive individuals.

#### Clause: Access and Scheduling

> **Access Requirements:** Customer agrees to provide:
> - Access to work areas by [time] on each scheduled work day
> - Working HVAC (heating/cooling as seasonally appropriate)
> - Working electrical outlets in or near work areas
> - Access to water source for cleanup
>
> **Schedule Changes:** Customer must provide [48/24] hours notice for schedule changes. Same-day cancellations may incur charges.

#### Clause: Fixture Responsibility

> **Light Fixtures and Hardware:**
> - Crew will remove: [list removable items]
> - Crew will protect in place: [list items protected in place]
> - Customer/electrician responsible for: [list if applicable]
>
> **Reinstallation:** Standard reinstallation of crew-removed items is included. Complex electrical or specialty fixtures may require licensed electrician at customer expense.

### Generating Customer Documents

The Estimation Engine generates customer-facing documents by:

1. Collecting all protection zones activated by project specs
2. Selecting appropriate clause templates based on:
   - Occupancy state
   - Furniture handling strategy
   - Quality tier
   - Special items from PaintScope notes
3. Populating specific details (dates, item lists, etc.)
4. Producing formatted agreement for customer signature

---

## Consumable Drivers for Protection

### Floor Protection Consumables

| Consumable | Unit | Yield | Driven By |
|------------|------|-------|-----------|
| Rosin paper (red) | Roll | 300 SF/roll | PS_PROTECT_SF.FLOOR_EXPOSED (spray + hard floor) |
| Construction paper (brown) | Roll | 500 SF/roll | PS_PROTECT_SF.FLOOR_EXPOSED (spray + hard floor) |
| Plastic sheeting 1.5 mil | Roll | 400 SF/roll | PS_PROTECT_SF.FLOOR_EXPOSED (spray + carpet) |
| Plastic sheeting 3.0 mil | Roll | 200 SF/roll | Heavy traffic areas |
| Canvas drop cloth 4×12 | EA | Reusable | Room count (brush/roll) |
| Canvas drop cloth 4×15 | EA | Reusable | Room count (brush/roll) |
| Plastic drop cloth | EA | Single use | Room count (budget option) |

### Masking Consumables

| Consumable | Unit | Yield | Driven By |
|------------|------|-------|-----------|
| Masking tape 1.5" (blue) | Roll | 60 LF/roll | Edge LF requiring tape |
| Masking tape 2" (blue) | Roll | 60 LF/roll | Edge LF requiring tape |
| Masking paper 6" | Roll | 180 LF/roll | Trim edge masking LF |
| Masking paper 12" | Roll | 180 LF/roll | Floor edge, cabinet edge LF |
| Masking paper 18" | Roll | 180 LF/roll | Large transition masking LF |
| Masking film 48" | Roll | 90 LF/roll | Small opening EA |
| Masking film 72" | Roll | 90 LF/roll | Standard cabinet/window EA |
| Masking film 99" | Roll | 90 LF/roll | Large opening/full cabinet EA |

### Furniture/Asset Protection Consumables

| Consumable | Unit | Yield | Driven By |
|------------|------|-------|-----------|
| Visqueen 0.35 mil | Roll | 400 SF/roll | Furniture SF estimate |
| Furniture pads/blankets | EA | Reusable | Large item EA |
| Shrink wrap | Roll | 1000 LF/roll | Optional furniture securing |

---

## Decision Trees for Spec Generation

### Floor Protection Selection

```
INPUT: application_method, floor_type, quality_tier, occupied

IF application_method IN ['spray', 'spray_backroll']:
    IF floor_type = 'carpet':
        → Plastic sheeting 1.5-3.0 mil + taped edges
    ELSE:
        → Rosin/construction paper + taped seams
    maintenance_required = TRUE

ELSE IF application_method IN ['brush_roll', 'brush_only', 'roll_only']:
    IF quality_tier >= 'QT4' OR occupied = TRUE:
        IF ceiling_in_scope:
            → Full room drops + tape edge at baseboard
        ELSE:
            → Perimeter drops + tape edge at baseboard
    ELSE:
        IF ceiling_in_scope:
            → Full room drops
        ELSE:
            → Perimeter drops only
    maintenance_required = FALSE (unless multi-day)
```

### Asset Protection Selection

```
INPUT: adjacent_assets[], application_method

FOR each asset IN adjacent_assets:
    IF asset.type = 'CABINET':
        → Masking film 72-99" on faces
        → Tape line on edges
    
    IF asset.type = 'COUNTERTOP':
        → Paper covering on surface
        → Tape line on edge
    
    IF asset.type = 'TILE_BACKSPLASH':
        IF application_method IN ['spray', 'spray_backroll']:
            → Masking paper full coverage
        ELSE:
            → Tape line at edge only
    
    IF asset.type = 'BUILTIN':
        → Masking film 72-99" on faces
```

### Fixture Protection Selection

```
INPUT: fixtures_in_room[], application_method, quality_tier

FOR each fixture IN fixtures_in_room:
    IF fixture.type = 'CEILING_LIGHT':
        IF quality_tier >= 'QT4' OR application_method = 'spray':
            → Remove (preferred)
        ELSE:
            → Bag with plastic
    
    IF fixture.type = 'CEILING_FAN':
        → Bag motor + secure blades (always)
    
    IF fixture.type = 'OUTLET_SWITCH':
        IF application_method IN ['spray', 'spray_backroll']:
            → Remove covers + tape over
        ELSE:
            → Remove covers only
    
    IF fixture.type = 'WINDOW_TREATMENT':
        → Remove (customer or crew per agreement)
```

---

## Exceptions and Special Cases

### Lead Paint Present

When lead paint is identified or suspected:

| Requirement | Method |
|-------------|--------|
| Containment | Full plastic containment required |
| Floor protection | 6 mil plastic, sealed seams |
| HVAC | Seal vents in work area |
| Cleanup | HEPA vacuum, wet wipe |
| Certification | RRP-certified crew required |

**Note:** Lead paint work is a separate scope classification and may require specialized protection doctrine.

### Spray in Occupied Home with Open Floor Plan

Challenge: Overspray can travel beyond immediate work area.

| Mitigation | Method |
|------------|--------|
| Containment walls | Plastic sheeting floor-to-ceiling at area boundaries |
| HVAC management | Turn off forced air during spray |
| Timing | Spray early, allow settle time before occupant return |
| Extended protection | Protect floors in adjacent areas |

### Historic/Sensitive Finishes

When existing finishes are historically significant or sensitive:

| Concern | Mitigation |
|---------|------------|
| Tape damage to wallpaper | Low-tack tape, test adhesion first |
| Tape damage to faux finish | Low-tack tape, test adhesion first |
| Drop cloth damage to fragile floors | Padded drops, no plastic (moisture trap) |
| Dust on detailed millwork | Pre-drape with plastic, tape at transitions |

### High-Value Contents Exclusion

When contents value exceeds standard liability:

| Option | Description |
|--------|-------------|
| Customer removes | Customer removes high-value items before work |
| Professional movers | Contractor arranges professional movers (customer expense) |
| Room exclusion | Room is excluded from scope; customer handles later |
| Insurance rider | Additional insurance coverage (customer expense) |

**Contractual language required:** High-value items must be documented, and exclusion/special handling agreed in writing.

---

## Summary Tables

### Protection Zone Quick Reference

| Zone Type | ID Pattern | Trigger | Setup Once | Shared |
|-----------|------------|---------|------------|--------|
| Floor | PZ_FLOOR_ROOM_* | Any paint scope in room | Yes | Yes |
| Furniture | PZ_FURN_ROOM_* | Wall/ceiling scope, occupied | Yes | Yes |
| Asset | PZ_ASSET_ROOM_*_type | Adjacent paint scope | Yes | Yes |
| Opening | PZ_OPENING_ROOM_*_type | Spray in room | Yes | Yes |
| Fixture | PZ_FIXTURE_ROOM_*_type | Ceiling scope | Yes | Yes |
| Containment | PZ_CONTAIN_ROOM_*_type | Special conditions | Yes | Yes |

### Application Method Quick Reference

| Method | Floor | Assets | Openings | Fixtures | Maintenance |
|--------|-------|--------|----------|----------|-------------|
| Brush only | Perimeter drops | Edge tape | None | None | None |
| Brush/roll | Full drops (ceilings) | Tape/paper | None | Bags (ceiling) | Daily (multi-day) |
| Spray backroll | Paper + tape | Film + tape | Required | Required | Between coats |
| Spray | Paper + tape | Film + tape | Required | Required | Between coats |

### Occupancy Quick Reference

| State | Furniture Strategy | Time Modifier | Customer Doc |
|-------|-------------------|---------------|--------------|
| Vacant | N/A | 1.0x | Minimal clauses |
| Occupied — owner assists | Owner moves smalls | 1.0x - 1.1x | Furniture assist clause |
| Occupied — crew handles | Center/cover or move | 1.25x - 1.5x | Full furniture clause |
| Occupied — sensitive | Premium handling | 1.5x+ | Liability clause + itemization |

---

## References

- Protection_and_Masking_Doctrine.md v1.0 (application method rules)
- PaintScope_Asset_Catalog.md (asset categories and protection keys)
- PaintScope_Quantity_Key_Catalog.md (protection quantity keys)
- Quality_Tiers_and_Surface_Condition.md (tier implications)
- Field notes from professional painting contractor (2026-01)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-01-25 | SpecFactory | Initial draft — protection zones, occupancy strategies, customer policies |
| 1.0 | 2026-01-31 | SpecFactory | Renamed from Residential_Repaint; added Universal/Occupancy-Driven/NC sections; added NC coverage; cross-ref to Spec_Completeness_Doctrine |
