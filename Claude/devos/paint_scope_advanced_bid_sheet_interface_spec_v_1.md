# PaintScope — Advanced BidSheet Interface Specification (v1)

## Purpose
This document defines the structure, layout, and interaction model for the Advanced Mode BidSheet (Project Builder) inside PaintFactor.

This is a continuous scrolling interface designed for power users. The system prioritizes full scope capture and geometric truth first. Basic Mode will later be derived by trimming visibility — not by redesigning architecture.

---

# 1. Page Context

The BidSheet exists inside:

Estimate → BidSheet Tab

The page is a continuous vertical scroller with a sticky header and optional sticky right-side live summary panel.

Layout Zones:

- Sticky Header (top)
- Main Scroll Column (center)
- Sticky Live Summary Panel (right)

---

# 2. Sticky Estimate Header

Always visible at top.

## Fields
- Client Name
- Project Address
- Estimate Status (Draft / Sent / Approved / In Progress)
- Job Type (Repaint / New Construction)
- Quality Tier (QT2–QT5)
- Default Application Method
- Global Modifiers (occupied, heavy furniture, etc.)

## Controls
- Save
- Generate Spec
- View Work Order

Purpose: Maintain global control context while building scope.

---

# 3. Project-Level Scope Blueprint (Global Configuration)

This section defines scope elements that are constant across the project.

## 3.1 Paintable Item Selection
Grouped checklist grid:

### Surfaces
- Walls
- Ceilings

### Trim
- Baseboard
- Crown
- Door Casing
- Window Casing
- Door Frames
- Window Jambs

### Openings
- Doors
- Windows

### Specialty
- Built-ins
- Closet Shelving
- Beams
- Columns
- Stair Risers
- Stair Railing
- Feature Wall
- Wood Ceiling

These selections create inherited defaults for all rooms.

---

## 3.2 Global Defaults Per Selected Item (Collapsed by Default)

Each selected paintable item has an expandable defaults panel.

Fields may include:
- Substrate State
- Primer Required (yes/no/auto)
- Number of Finish Coats
- Application Method
- Edge Strategy (freehand vs tape-line)
- Sheen
- Color Change Flag

These act as accelerators, not requirements. Room-level override is always allowed.

---

# 4. Rooms Section (Continuous Stacked Cards)

Rooms are displayed as stacked cards in scroll order.

## 4.1 Add Room
Inline button that inserts a new room card below.

No modal required in Advanced Mode.

---

# 5. Room Card Structure

Each room card contains:

## 5.1 Room Header (Always Visible)
- Room Name
- Length
- Width
- Ceiling Height
- Completion Indicator
- Quick Chips (Vaulted, X Doors, X Windows)

---

## 5.2 Geometry Panel (Expandable)

### Ceiling Type Selector
Options:
- Flat
- Vaulted
- Gable
- Coffered
- Tray

If Vaulted or Gable:
- Low Height
- Peak Height
- Ridge Orientation:
  - Ridge runs along Length
  - Ridge runs along Width

Orientation is axis-based, not compass-based.

Geometry feeds:
- Gable wall computation
- Ceiling plane calculation
- Height band classification
- Modifier engine

---

## 5.3 Inherited Paintable Items

Display all project-selected items as active in the room.

Each item shows:
- Inherited badge
- Override toggle
- Remove from room (if overridden)

Example:
Walls — Inherited
Ceiling — Inherited
Baseboard — Inherited

Override allows room-specific configuration.

---

## 5.4 Item Detail Panels (Expandable Per Item)

Clicking an item expands its configuration panel.

### Example: Walls
- Substrate State
- Texture
- Auto-Derived Wall SF
- Manual Override Toggle
- Opening Deduction Toggle
- Condition Flags (heavy patching, stains, etc.)

### Example: Doors
Doors are configured as grouped entries:
- Count
- Door Type
- Substrate State
- Sides Per Door

Multiple door groups allowed per room.

### Example: Windows
Window groups include:
- Count
- Window Type
- Size Bucket (S/M/L/Measured)
- Substrate State

---

## 5.5 Specialty Items Drawer

Collapsed section inside each room:

- Built-ins
- Closet Shelving
- Beams
- Columns
- Mantels
- Stair Components
- Feature Wall
- Wood Ceiling

Items here are optional and manually configured.

---

# 6. Live Summary Panel (Sticky Right Column)

Displays real-time calculations.

## Room-Level Summary
- Wall SF
- Ceiling SF
- Total Trim LF
- Door Count / Sides
- Window Count
- Height Band
- Estimated Hours

## Project-Level Summary
- Total Estimated Hours
- Hours by Spec Family
- Warnings / Incomplete Data Flags

Panel updates in real time as inputs change.

---

# 7. UX Rules (Advanced Mode)

1. Nothing hidden — but most sections collapsed.
2. Inherited values clearly labeled.
3. Manual overrides visually distinct.
4. Derived geometry highlighted.
5. Real-time feedback always visible.

Advanced mode prioritizes truth capture over simplicity.

---

# 8. Basic Mode (Future Trim Strategy)

Basic Mode will:
- Hide global item defaults
- Hide advanced condition modifiers
- Hide per-item override complexity
- Reduce room inputs to core geometry + counts

Architecture remains identical.

---

# End of Document

PaintScope Advanced Mode is designed as the estimating engine core of PaintFactor OS.

