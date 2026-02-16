# Room Adjacency & Protection → Estimation Engine Integration

**Status:** Design — awaiting approval
**Priority:** High — protection tasks currently disconnected from room context
**Created:** 2026-02-16

## Problem Statement

The Room Adjacency & Protection UI captures what's physically present in a room (floor type, fixtures, unpainted surfaces), but the estimation engine doesn't consume this data. Two disconnected systems exist:

1. **Room Adjacency UI** — records floor type, protection level, and fixture presence. Emits PS_PROTECT keys with quantities. But nothing in the engine reads these.
2. **Per-spec protection tasks** — every spec has its own floor protection install/teardown tasks with fixed rates. These fire based on the spec being active, not based on what's actually in the room.

**Result:** Floor protection shows under "door frames" even when the user set the floor to hardwood with heavy mask. Cabinet protection with 20 LF at heavy bag generates `PS_PROTECT_LF.FIXTURE_CABINETS = 20` but no spec consumes it.

## Architecture: Two Systems, One Job

### What Room Adjacency Provides (inventory)
- **Floor type** — subfloor, hardwood, tile, carpet, LVP, concrete
- **Floor protection level** — light_mask, medium_mask, heavy_mask
- **Fixtures present** — cabinets (LF), toilet (EA), bathtub (EA), appliances (EA), etc.
- **Fixture protection levels** — per-fixture override

### What Spec Tasks Provide (work instructions)
- **Which protection tasks to run** — install floor protection, remove floor protection, cover fixtures
- **How to sequence them** — setup phase → work → cleanup phase
- **What PS keys to consume** — PS_PROTECT_SF.FLOOR_EXPOSED, PS_PROTECT_LF.FIXTURE_CABINETS, etc.

### The Connection Point: Estimation Context
Room adjacency data must flow into `ctx` alongside existing context fields:

```js
ctx = {
  // Existing
  quality_tier: 'QT3',
  height_band: 'STD',
  application_method: 'brush_roll',
  substrate_state: 'SS_PRIMED_FACTORY',
  // NEW — from Room Adjacency
  floor_type: 'hardwood',
  floor_protection: 'heavy_mask',
  fixtures_present: ['cabinets', 'toilet'],  // array of fixture IDs checked in room
};
```

## Floor Protection Matrix

Floor type + application method + scope determines what protection is needed:

| Floor Type | Application Method | What's Being Painted | Protection Required | Material |
|-----------|-------------------|---------------------|-------------------|----------|
| **Subfloor** | Any | Any | **None** | — |
| **Concrete** | Any | Any | **None** (unless spray) | Plastic sheeting if spray |
| **Hardwood** | Spray | Any | Full cover rosin paper | Rosin paper + tape |
| **Hardwood** | Brush/Roll | Walls only | Drop cloths only | Canvas drop cloths |
| **Hardwood** | Brush/Roll | Trim | Drop cloths + perimeter tape | Canvas + tape |
| **Carpet** | Spray | Any | Heavy plastic sheeting | Plastic sheeting + tape |
| **Carpet** | Brush/Roll | Any | Drop cloths | Canvas drop cloths |
| **Tile/Stone** | Spray | Any | Plastic sheeting | Plastic sheeting |
| **Tile/Stone** | Brush/Roll | Any | Drop cloths | Canvas drop cloths |
| **LVP/Laminate** | Spray | Any | Plastic sheeting | Plastic sheeting + tape |
| **LVP/Laminate** | Brush/Roll | Any | Drop cloths | Canvas drop cloths |

**Key rules:**
- Subfloor = no protection (it's getting replaced or is expendable)
- Hardwood + brush/roll walls = drop cloths (no tape needed)
- Hardwood + brush/roll trim = drop cloths + perimeter tape (trim work near floor)
- Spray always escalates to full cover (rosin paper for hardwood, plastic for everything else)

## Fixture Protection

Fixtures use fixed time tasks that **multiply by count** (e.g., 3 toilets = 3x the fixed time). Cabinets scale by **linear foot**, not fixed per room.

| Fixture | Protection Method | UOM | Time Estimate | Height Mod |
|---------|------------------|-----|---------------|------------|
| Cabinets | Tape + paper/plastic along face (see cabinet spec) | LF | Per LF rate | No |
| Countertops | Paper/plastic cover + tape edges | EA | Fixed per EA | No |
| Appliances | Plastic bag/drape | EA | Fixed × count | No |
| Bathtub | Plastic liner + tape rim | EA | Fixed × count | No |
| Shower/Enclosure | Plastic sheeting across opening | EA | Fixed × count | No |
| Toilet | Plastic bag over tank + bowl | EA | Fixed × count | No |
| Vanity | Paper/tape along face + top | EA | Fixed × count | No |
| Fireplace | Cardboard/plastic over surround | EA | Fixed × count | **Yes** |
| Stone Fireplace | Plastic + tape (heavier than painted) | EA | Fixed × count | **Yes** |
| Built-in Shelving | Paper/plastic per shelf run | EA | Fixed × count | No |
| Light Fixtures | Bag + tape | EA | Fixed × count | No |

**Rate note:** Use medium placeholder rates for all fixture protection tasks. These are not production-calibrated.

**Fireplace/stone fireplace height modifier:** These fixtures can extend to ceiling height in vaulted rooms. Height modifier must apply — a floor-to-ceiling stone fireplace at 20ft requires scaffolding to mask the top.

## Implementation Plan

### Phase 1: Context Wiring (Engine)

**Pass room adjacency data into estimation context.**

In `runEstimate()`, after building `ctx`, add:

```js
// Room adjacency context
ctx.floor_type = room.floor_type || 'subfloor';
ctx.floor_protection = room.floor_protection || '';
ctx.fixtures_present = Object.keys(room.fixtures || {});
```

This makes floor_type, floor_protection, and fixture presence available to `evaluateAppliesWhen()` on all tasks.

### Phase 2: Floor Protection Task Refactor (Per-Spec)

**Current problem:** Each spec has its own floor protection tasks that fire unconditionally (or by application_method only). They don't check floor_type.

**Solution:** Add `applies_when` conditions to existing floor protection tasks:

```json
// Example: SF_DOOR_FRAME_NC_FINISH floor protection tasks
{
  "task_id": "TSK_FRAME_FLOOR_PROTECT_BRUSH",
  "applies_when": {
    "application_method": ["brush", "brush_roll"],
    "floor_type": ["hardwood", "tile", "carpet", "lvp", "concrete"]
  }
}
```

Tasks with `floor_type: ["subfloor"]` would NOT exist — subfloor means no floor protection.

For specs that have both full-cover and perimeter-only variants, the floor_type + application_method combination determines which fires:
- `TSK_*_FLOOR_PROTECT_FULL` → `applies_when: { floor_type: ["hardwood","carpet","lvp"], application_method: ["spray","spray_backbrush"] }`
- `TSK_*_FLOOR_PROTECT_PERIM` → `applies_when: { floor_type: ["hardwood","tile","carpet","lvp","concrete"], application_method: ["brush","brush_roll"] }`

### Phase 3: Fixture Protection Tasks (New)

**Current problem:** No spec has tasks consuming fixture PS keys.

**Approach:** Add fixture protection tasks to relevant specs. The question is WHICH spec owns fixture masking.

**Options:**
- **A) First activated spec in the room** — fragile, depends on processing order
- **B) Largest-scope spec** — ceiling/wall specs are room-level, they should own room-level protection
- **C) Dedicated protection module** — a shared "room protection" module that attaches to whichever spec fires first

**Recommended: Option B** — attach fixture protection tasks to wall/ceiling specs since they affect the whole room. If only trim is being painted, attach to the trim spec instead.

Implementation:
- Add `MOD_PROTECT_FIXTURES` module to wall prime/finish, ceiling prime/finish specs
- Tasks: one fixed-time task per fixture type, with `applies_when` checking fixture presence
- Example: `TSK_WALL_PROTECT_CABINETS` with `applies_when: { has_cabinets: [true] }`
- **Cabinets:** Use LF-based rate (from `PS_PROTECT_LF.FIXTURE_CABINETS`), not fixed time. Refer to cabinet spec protection tasks for rate reference.
- **EA fixtures:** Fixed time × count (from `PS_PROTECT_EA.FIXTURE_*` keys). Engine multiplies base time by quantity.
- **Fireplace/Stone Fireplace:** Must apply height modifier — these can extend floor-to-ceiling in vaulted rooms.

**Challenge with `evaluateAppliesWhen`:** Current function checks if `ctx[key]` is in an `allowed` array. Checking fixture presence requires either:
1. Flattening fixtures into boolean context keys: `ctx.has_cabinets = true`, `ctx.has_toilet = true`
2. Extending `evaluateAppliesWhen` to support "contains" checks on arrays

Option 1 (boolean keys) is simpler and consistent with existing pattern:
```js
// In ctx building
Object.keys(room.fixtures || {}).forEach(fId => {
  ctx['has_' + fId] = true;
});
```
Then task applies_when:
```json
{ "has_cabinets": [true] }
```

### Phase 4: Deduplication Guard

**Problem:** Multiple specs fire floor protection tasks in the same room. A room with walls, ceiling, trim, doors, and windows could generate 5+ separate "install floor protection" tasks.

**Current state:** This is already happening — each spec adds its own floor protection independently.

**Solution options:**
- **A) Room-level dedup in engine** — track which protection zones have been claimed per room, skip duplicates
- **B) Single owner spec** — only the "primary" spec (largest scope) emits floor protection; other specs skip it via applies_when
- **C) Accept duplication** — each spec's floor protection is for its own work zone (door frame drops vs wall spray drops are different)

**Recommended: Option C for now** — each spec's protection task covers a different work zone. Door frame drops are localized (edge_only), wall spray drops are full room (full_cover). They're different tasks with different PS keys and rates. The duplication is intentional — you DO set up drops near the door frames separately from covering the whole floor for spray.

**Exception:** If both wall prime (full cover) and ceiling prime (full cover) fire in the same room, that's redundant — you don't lay full floor protection twice. A simple dedup guard for `full_cover` floor protection per room would prevent this.

### Phase 5: Task Name Enhancement

Update floor protection task names to reflect the floor type context:

Instead of: "Floor Protection Setup"
Show: "Floor Protection Setup (Rosin Paper — Hardwood)"

This can be done at display time (like coat count) by reading `ctx.floor_type` from the task result.

## Data Changes Required

### DB_BUNDLE (sop_tasks)
- Add `applies_when.floor_type` to all existing floor protection tasks across all specs
- Remove or skip floor protection tasks when `floor_type === 'subfloor'`

### DB_BUNDLE (task_production_rates)
- Use existing rates as-is (placeholder/medium rates for all)
- Add rates for new fixture protection tasks (fixed time)

### DB_BUNDLE (sop_tasks — new)
- Fixture protection tasks for wall/ceiling specs (one per fixture type)
- Fixed time tasks: ~5-15 min per fixture depending on type

## Estimated Fixture Protection Times (Placeholder)

| Fixture | UOM | Install Time | Teardown Time | Height Mod |
|---------|-----|-------------|---------------|------------|
| Cabinets | LF | See cabinet spec rates | See cabinet spec rates | No |
| Countertops | EA | 10 min × count | 5 min × count | No |
| Appliances | EA | 5 min × count | 3 min × count | No |
| Bathtub | EA | 15 min × count | 8 min × count | No |
| Shower/Enclosure | EA | 12 min × count | 6 min × count | No |
| Toilet | EA | 5 min × count | 3 min × count | No |
| Vanity | EA | 8 min × count | 4 min × count | No |
| Fireplace | EA | 15 min × count | 8 min × count | **Yes** |
| Stone Fireplace | EA | 20 min × count | 10 min × count | **Yes** |
| Built-in Shelving | EA | 10 min × count | 5 min × count | No |
| Light Fixtures | EA | 3 min × count | 2 min × count | No |

## Affected Specs

All 18 specs with floor protection tasks — `applies_when.floor_type` added to existing tasks.

Fixture protection tasks added to room-scope specs:
- SF_DRYWALL_WALL_NC_PRIME
- SF_DRYWALL_WALL_NC_FINISH
- SF_DRYWALL_CEILING_NC_PRIME
- SF_DRYWALL_CEILING_NC_FINISH

## Resolved Decisions

1. **Perimeter tape for trim:** Bundled into the trim spec's floor protection task (not separate). Trim spec already defines adjacency-based perimeter tape when flooring is anything other than subfloor. The floor_type context enables this.

2. **Multiple fixture instances:** Fixed time × count. 3 toilets = 3× the per-toilet fixed time. Fixture data already captures count.

3. **Cabinet protection scaling:** Scales by **linear foot**, not fixed per room. Refer to cabinet spec (SF_CABINET_NC_PAINT) for protection task definitions and rates — it already has detailed protection zones.

4. **Shared fixtures across rooms:** Handled at room level only. Each room independently declares its fixtures. Two bathrooms with vanities = two separate vanity protection tasks, each tagged with room name. No cross-room deduplication needed.

5. **Height modifiers on fixtures:** Fireplace and stone fireplace protection tasks must apply height modifiers — these fixtures can extend floor-to-ceiling in vaulted rooms, requiring scaffolding to mask the top. All other fixture protection tasks are unaffected by height.

## Dependencies

- Room Adjacency & Protection UI already implemented (v0.5)
- Fixture data model already captures protection level, count, and cabinet-specific fields
- PS_PROTECT keys already emitted by quantity builder
- No schema changes needed — all changes are to DB_BUNDLE task data and engine context
