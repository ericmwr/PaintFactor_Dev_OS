# Protection State Model — Design

**Status:** Draft — awaiting review
**Scope:** Room + project state model for the protection/masking system exposed by `protection_matrix.md`. Step 1 of 5 in the protection rollout.
**Related:** `protection_matrix.md` (requirements), `room_protection_engine_integration.md` (legacy design, partially superseded).

## Purpose

Define the state fields and derivation rules needed so the engine can emit per-substrate `MOD_SETUP_*_PROTECT`, `MOD_CLEANUP_*_PROTECT`, and `MOD_FINISH_*_TAPELINE` modules correctly. This doc answers "what does state look like" — NOT "how is the engine wired" (that's Step 2+).

## Design principles

1. **User inputs a goal, engine derives the labor.** User picks a floor type + mask level; engine figures out which tasks fire at what rate.
2. **Room authority beats substrate default.** Spray in any substrate → whole room needs floor protection. One wall being painted → adjacent walls protected. Substrate modules just request what they need; room-level rules decide intensity.
3. **Four mask levels are the output, not the input.** User doesn't pick "partial cover" — user picks a floor type and paint scope; engine computes the effective level.
4. **Tapeline is independent of protection.** Protection prevents damage; tapeline creates a crisp finished edge. Separate tasks, separate toggle.

## The four mask levels (from protection_matrix.md)

Referenced throughout; reproduced for clarity.

| Level | What it is | When |
|---|---|---|
| `none` | No protection | Nothing being painted adjacent |
| `edge` | Tape line only | Brush/roll near unpainted drywall |
| `partial` | Drop cloth/plastic extending out from edge | Overhead brush/roll; perimeter spray |
| `full` | Loose drape covering full surface | Overhead spray-backroll |
| `encapsulate` | Taped + sealed tight | Spray in room, hardwood floor, etc. |

## New room-state fields

Added to each `room` in room state.

```js
room.protection = {
  // Floor
  floor_type: 'subfloor' | 'finished_hardwood' | 'masked_hardwood' | 'tile' | 'carpet' | 'lvp' | 'concrete',
  floor_mask_level: 'auto' | 'none' | 'edge' | 'partial' | 'full' | 'encapsulate',
  // 'auto' means "derive from rules" (default). User override replaces.

  // Walls — per-wall level (respects wall additions/deductions on structure tab)
  wall_mask_levels: {
    north:  'auto' | <level>,
    south:  'auto' | <level>,
    east:   'auto' | <level>,
    west:   'auto' | <level>,
  },

  // Ceiling
  ceiling_mask_level: 'auto' | <level>,

  // Containment override — replaces all floor+wall masking with zip-wall
  // containment (4 poles + visqueen). Engine bills containment setup once
  // instead of per-surface masking.
  containment_mode: false | true,
};
```

All mask levels default to `'auto'`. The user can pin a value via the Room Identity masking panel.

## New project-state fields

```js
project.protection_defaults = {
  // Per-room default for floor mask — rooms inherit if they don't override
  default_floor_mask_level: 'auto',
  default_wall_mask_level:  'auto',
  default_ceiling_mask_level: 'auto',
  default_floor_type: 'subfloor',

  // Tapeline — crisp finished-edge deliverable (separate from masking)
  full_trim_tapeline: false,  // when true, all trim substrates get finish-phase tapeline
};

// Per-substrate tapeline override (room-state, per-substrate)
room.substrates.<sub>.tapeline_edge = true | false | null;  // null = inherit project default
```

## Derived logic — pure functions on state

All live in `Claude/tools/paintscope/src/engine/protection-derivation.js` (new module). Each returns a concrete mask level (`none` / `edge` / `partial` / `full` / `encapsulate`) given resolved room + project.

### Room-level authority rules

```js
effectiveFloorMaskLevel(room, project): 'none' | 'edge' | 'partial' | 'full' | 'encapsulate'
```

Cascade (first match wins):

1. User override: `room.protection.floor_mask_level !== 'auto'` → return it
2. Containment mode: `room.protection.containment_mode` → `'encapsulate'`
3. Floor type escalation:
   - `masked_hardwood` → `'encapsulate'`
   - `finished_hardwood` → `'full'`
   - `tile`, `lvp`, `carpet` → `'full'`
   - `concrete`, `subfloor` → continue to step 4
4. Work-type escalation (based on any active spec in room):
   - Any spray in room → `'partial'` (drop cloth perimeter)
   - Ceiling being painted (any method) → `'partial'`
   - Only brush/roll trim → `'edge'`
5. Fallback: `'none'`

Then: project default fills in if still `'auto'` at the end.

### Per-wall authority

```js
effectiveWallMaskLevel(room, wall_id, project): 'none' | 'edge' | 'partial' | 'full' | 'encapsulate'
```

Cascade:

1. User override per-wall → return
2. If THIS wall has an active paint spec (wall is being painted) → `'none'` (overspray on wall being painted is fine)
3. Adjacent surface escalation:
   - Ceiling being sprayed AND this wall is exposed → `'full'`
   - Trim on this wall being sprayed → `'partial'` (at trim edge)
   - Trim on this wall being brushed + walls have existing finish → `'edge'`
4. Fallback: `'none'`

### Ceiling authority — similar pattern

```js
effectiveCeilingMaskLevel(room, project)
```

1. User override → return
2. Ceiling has active paint spec → `'none'`
3. Spray on walls → `'full'`
4. Spray on trim (crown specifically) → `'partial'`
5. Fallback: `'none'`

## Substrate → protection requirement matrix

Each substrate's protection module declares which surfaces it contributes protection need for. Engine aggregates across all active substrates to pick the room's effective level.

```js
// Claude/tools/paintscope/src/data/substrate-protection.js (new)
export const SUBSTRATE_PROTECTION_NEEDS = {
  baseboard:     { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  shoe_mold:     { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  crown:         { floor: true,  walls: true,  ceiling: true,  adjacent: [] },
  chair_rail:    { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  picture_rail:  { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  wainscot_cap:  { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  door_casing:   { floor: true,  walls: true,  ceiling: false, adjacent: ['door_slab', 'door_frame'] },
  window_casing: { floor: true,  walls: true,  ceiling: false, adjacent: ['window_glass', 'window_jamb'] },
  door_frame:    { floor: true,  walls: true,  ceiling: false, adjacent: ['door_slab', 'door_casing'] },
  window_jamb:   { floor: true,  walls: false, ceiling: false, adjacent: ['window_glass', 'window_casing'] },
  window_stool:  { floor: true,  walls: true,  ceiling: false, adjacent: ['window_glass'] },
  window_apron:  { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  shadow_box:    { floor: true,  walls: true,  ceiling: false, adjacent: [] },
  panel_mold:    { floor: true,  walls: true,  ceiling: false, adjacent: [] },
};
```

`adjacent` lists substrate-specific masking when that neighbor is NOT in the paint/stain scope. Derived at ctx-build time:

```js
adjacent_protection_needed(sub, neighbor, room): boolean
  = SUBSTRATE_PROTECTION_NEEDS[sub].adjacent.includes(neighbor)
    AND neighbor_substrate_is_not_being_painted_or_stained(room, neighbor)
```

## Adjacent-surface quantity keys

New PS keys for adjacent-substrate masking:

| Key | UOM | Derived from |
|---|---|---|
| `PS_PROTECT_EA.DOOR_SLAB_MASK` | EA | doors NOT in paint scope, counted |
| `PS_PROTECT_EA.WINDOW_GLASS_MASK` | EA | windows (glass count) near casing/jamb/stool work |
| `PS_PROTECT_LF.DOOR_FRAME_MASK` | LF | door_frame LF when frame NOT in paint/stain scope |
| `PS_PROTECT_LF.DOOR_CASING_MASK` | LF | door_casing LF when casing NOT in paint/stain scope |
| `PS_PROTECT_LF.WINDOW_CASING_MASK` | LF | window_casing LF when not in scope |
| `PS_PROTECT_LF.WINDOW_JAMB_MASK` | LF | window_jamb LF when not in scope |

Emitted by `quantity-lookups.js` based on which substrates are/aren't active.

## UI implications (not in scope for Step 1, flagged for planning)

1. **Room Identity tab — new Masking panel**
   - Floor type dropdown (with 'Masked Hardwood' entry)
   - Floor mask level dropdown (`auto` / 4 levels / `none`)
   - Per-wall mask level (compact 4-row control respecting wall additions/deductions)
   - Ceiling mask level dropdown
   - Containment mode toggle

2. **Project Setup tab — protection defaults**
   - Default floor type
   - Default mask levels per surface
   - "Full trim tapeline" project toggle

3. **Substrate detail panel — tapeline toggle**
   - Three-state: Inherit / On / Off for tapeline edge

## Open decisions

1. **Floor mask granularity** — should floor mask be one level for the whole floor, or split by "edge zone" (perimeter strip) vs "field" (middle)? Protection_matrix.md implies one level is fine. ✅ Going with one level unless you push back.

2. **Wall mask per-wall vs whole-room** — four-row control adds UI complexity but matches the matrix's "select qty of walls 1-4" language. Alternative: one level + count of walls. I'm proposing per-wall; open to simplifying.

3. **Containment mode cost model** — fixed setup cost (zip-wall poles + visqueen) OR derived from floor+walls SF? Paint industry usually prices it as a fixed add. Proposing: fixed task `TSK_CONTAINMENT_SETUP` + teardown, independent of SF.

4. **"Work-in-progress" vs "finished" wall detection** — current proposal: `wall has active paint spec in this room` = work-in-progress (no mask). What about walls painted earlier this job, cured, now adjacent work is happening? Not a Phase-1 concern (single-visit assumption) but worth noting.

5. **"Hardwood" terminology** — protection_matrix.md uses `finished_hardwood` + `masked_hardwood`. Masked hardwood = user paid for floor masking upfront (more intensive prep). Is that explicit in UI or derived?

## Proposed output shape (preview)

By the end of Step 5 the ctx passed to a stain scenario looks like:

```js
ctx = {
  // Existing fields (unchanged)
  paintable_item: 'int_door_casing',
  substrate_state: 'SS_BARE',
  quality_tier: 'QT3',
  coating_type: 'stain_clear',
  application_method_stain: 'brush',
  application_method_clear: 'brush',
  // ... existing stain fields ...

  // NEW protection fields
  floor_mask_level: 'partial',        // derived from room auth rules
  wall_mask_levels: {                  // derived per-wall
    north: 'edge', south: 'partial', east: 'none', west: 'edge'
  },
  ceiling_mask_level: 'none',
  containment_mode: false,
  tapeline_edge: true,                 // resolved from substrate override → project default
  adjacent_needs_door_slab_mask: true, // computed from scope
  adjacent_needs_door_frame_mask: false,
};
```

Protection modules' tasks will consume these via `applies_when` on the mask level, plus standard quantity lookup on the PS_PROTECT_* keys.

---

## Request for review

Before coding Step 2, please confirm:

- [ ] Mask-level escalation rules match your ops mental model (floor_type cascade, spray-triggers-partial, etc.)
- [ ] Adjacent-surface masking model is right (only applies when neighbor NOT in scope)
- [ ] Project-level vs room-level split feels right (`full_trim_tapeline` at project, mask levels at room)
- [ ] Per-wall masking (4 separate fields) vs simpler "count of walls to mask" — your preference
- [ ] Containment as a fixed-cost alternative mode — agreed?
- [ ] Answers to Open Decisions #1-5 above

Once green, Step 2 = task library (12 core tasks + adjacent-surface masks + tapeline; you provide rates).
