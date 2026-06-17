# W-24 — Trim-Only Floor Protection: Override + Bidirectional Callout

**Date:** 2026-05-13
**Status:** Design Approved
**Scope:** PaintScope Protection tab — Mask Levels section, Floor row
**Backlog source:** [PaintScope Universal Keeper Migration — Status & Backlog](https://www.notion.so/35e3ab2c2a5b81bd9629c6068de53be0), item `[W-24]`

---

## Problem

In trim-only rooms (no walls or ceiling being painted, only fine-finish substrates), the auto-derived floor mask level lands on one of two values:

- `partial` (perimeter drop) — baseboard-only brush, multi-trim brush, casing/frame-only after override
- `edge_partial` (perimeter drop + tape-line edge) — baseboard-only spray

Estimators often want to swap between these two — for example, adding a tape edge on a brush baseboard job, or dropping the tape on a spray job to save material. Two things block this today:

1. The **Floor row** in the Protection tab Mask Levels section is read-only — it says "Set on Identity tab" with no Override dropdown, unlike Walls and Ceiling which both have a real override. The user can change floor type but cannot directly pick `partial` vs `edge_partial`.
2. Even if a user knows about the matrix difference between the two levels, nothing in the UI surfaces the option or explains the tradeoff.

## Goal

1. Give the Floor row a real per-room Override dropdown, matching the Walls and Ceiling rows.
2. Add a highlighted callout below the Floor row that fires in trim-only scenarios when the effective floor level is `partial` or `edge_partial`. Copy is bidirectional — it points at the alternative level and explains where to make the swap.

## Out of Scope

- **Wall tape-line edge prompt (W-25)** — parallel pattern for `wall_mask_level`. Separate backlog item.
- **Project-level heuristic toggle** — considered (mirrors W-20 / W-21 HVAC and outlet toggles in `ProjectSetup`) but rejected during brainstorming. W-24 is a per-room decision; a global toggle would over-trigger in mixed projects.
- **Auto-derive matrix changes** — the `partial` / `edge_partial` / `spot` defaults in `deriveFloorMaskLevel` stay exactly as they are.
- **Engine / scenario work** — `floor_mask_level` already drives the existing floor mask install/remove tasks and `MOD_INTERSTAGE_FLOOR_PROTECT_CHECK`. Switching levels via the override flows through unchanged.

## Design Overview

Two pieces:

1. **`ProtectionTab.jsx`** — replace the read-only Floor row block with the same `MaskRow` component used for Walls and Ceiling. Then add a conditionally-rendered callout banner below it.
2. **No state, engine, or data changes.** The `room.protection.floor_mask_level` override field already exists in state and the engine already reads it (`buildRoomProtectionCtxs`). Switching `partial → edge_partial` simply activates the tape-edge task variants already in the bundle.

The whole change is contained to one tab component plus a small scope-detection helper.

## Section 1: Floor Row Override

### Current state (`ProtectionTab.jsx:113-131`)

```jsx
{/* Floor — readout (set on Identity tab) */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px', ... }}>
  <div>
    <div style={{ fontWeight: 600, fontSize: 13 }}>Floor</div>
    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
      {derived.ceilingSF || 0} SF · {derived.perimeter || 0} LF perimeter
    </div>
  </div>
  <div><span>IDENTITY</span></div>
  <div style={{ fontStyle: 'italic' }}>Set on Identity tab</div>
  <div>{LEVEL_LABEL_SHORT[protection.floor_mask_level || derivedDefaults.floor_mask_level]}</div>
</div>
```

The middle two columns (`Source` and `Override`) are decoration — the user can't actually override.

### New state

Replace the block with a `MaskRow` invocation matching Walls and Ceiling:

```jsx
<MaskRow
  surface="floor"
  label="Floor"
  qtyLabel={`${derived.ceilingSF || 0} SF · ${derived.perimeter || 0} LF perimeter`}
  autoLevel={derivedDefaults.floor_mask_level}
  currentValue={protection.floor_mask_level}
  options={MASK_LEVELS_FLOOR}
/>
```

`MaskRow` is the existing component in `ProtectionTab.jsx`. It already wires `surface=` to the `SET_PROTECTION` dispatch that targets the right field (`floor_mask_level` / `wall_mask_level` / `ceiling_mask_level`) — no changes needed inside `MaskRow`.

`MASK_LEVELS_FLOOR` is already exported from `data/mask-levels.js` (all 9 levels — floor is the unrestricted surface).

### Why this is safe

- `protection.floor_mask_level` already exists in room state — it was added during the earlier protection rollout but only wired into the engine and the read path, not the write path.
- The engine's `buildRoomProtectionCtxs` already merges `protection.floor_mask_level` over `derivedDefaults.floor_mask_level` exactly the way walls/ceiling do — no engine change needed.
- The state migration in `state/migrations.js` already handles legacy floor mask values via `migrateMaskLevel` if any older overrides exist.

## Section 2: Bidirectional Callout

### Trigger condition

The callout renders when **both** of the following are true:

```js
const inTrimOnlyScope =
  !cats.ceiling && !cats.walls && cats.fineFinishKind !== 'none';

const effectiveLevel = protection.floor_mask_level || derivedDefaults.floor_mask_level;
const inPartialBand = effectiveLevel === 'partial' || effectiveLevel === 'edge_partial';

const showCallout = inTrimOnlyScope && inPartialBand;
```

`cats` is already destructured from `derivedDefaults._categories` at the render scope (see `ProtectionTab.jsx:94-99` where it powers the "Active scope" diagnostic line). The trigger reuses it directly — no new helper needed.

This trigger covers:

| Trim subset | Method | Auto-derived | Fires? |
|---|---|---|---|
| baseboard_only | brush | `partial` | ✓ |
| baseboard_only | spray | `edge_partial` | ✓ |
| casing_or_frame_only | brush | `spot` | only after user override to partial/edge_partial |
| casing_or_frame_only | spray | `spot` | only after user override to partial/edge_partial |
| multi (no crown) | brush | `partial` | ✓ |
| multi (no crown) | spray | `edge_encapsulate` | ✗ |
| multi_crown | brush | `partial` | ✓ |
| multi_crown | spray | `edge_encapsulate` | ✗ |

The override-after-the-fact behavior for casing/frame trim is intentional — once the user explicitly picks `partial` for a casing job, the callout becomes useful again as it explains the alternative.

### Copy

Two variants, keyed off `effectiveLevel`:

**When `effectiveLevel === 'partial'`:**

> Trim-only — partial perimeter drop is the default. For baseboard or trim against finished walls, add a tape-line edge by switching the Override to **Edge+ Partial** on the right.

**When `effectiveLevel === 'edge_partial'`:**

> Trim-only — Edge+ Partial includes a tape-line edge along the wall. To drop the tape and use only the perimeter drop, switch the Override to **Partial (perimeter)** on the right.

### Placement and style

Each `MaskRow` renders its own self-contained 4-column grid, so the callout sits as a normal sibling block between the Floor row and the Wall row — no grid-spanning trick required:

```jsx
<MaskRow surface="floor" ... />
{showCallout && (
  <div style={{
    padding: '8px 10px',
    margin: '4px 0',
    borderLeft: '3px solid var(--accent)',
    background: 'var(--bg-tertiary)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  }}>
    {effectiveLevel === 'partial'
      ? <>Trim-only — partial perimeter drop is the default. For baseboard or trim against finished walls, add a tape-line edge by switching the Override to <strong>Edge+ Partial</strong> on the right.</>
      : <>Trim-only — Edge+ Partial includes a tape-line edge along the wall. To drop the tape and use only the perimeter drop, switch the Override to <strong>Partial (perimeter)</strong> on the right.</>
    }
  </div>
)}
<MaskRow surface="wall" ... />
```

Left-border accent + tertiary background matches PaintScope's existing callout idiom (used elsewhere for advisory text). Visually the callout reads as "attached to the Floor row above it."

## Testing

Manual verification on the local dev server with the McLeod project:

1. **Brush baseboard trim-only room** — open Protection tab, confirm Floor row now has an Override dropdown and the effective level reads `Partial`. Confirm the callout below reads the "add a tape-line edge" copy.
2. **Override to `edge_partial`** — confirm the callout flips to the "drop the tape" copy and the estimate gains the appropriate `TSK_MASK_FLOOR_*` tape-edge variants.
3. **Spray baseboard trim-only room** — confirm effective starts at `Edge+ Partial` and the callout reads the downgrade copy.
4. **Casing-only brush room** — confirm effective starts at `Spot` and the callout is **hidden**. Override to `Partial` via the dropdown; confirm callout appears.
5. **Walls + trim room (not trim-only)** — confirm callout is **hidden** regardless of effective level.
6. **Reset to Auto** — confirm the override dropdown's "Auto" option clears `protection.floor_mask_level` and the row reverts to the derived value.

No new unit tests; existing `derive-protection-defaults` and protection-probe coverage is sufficient.

## File-level change inventory

- `Claude/tools/paintscope/src/components/room-editor/tabs/ProtectionTab.jsx` — three small edits in one file:
  1. Replace the read-only Floor block (`:113-131`) with `<MaskRow surface="floor" ... />`.
  2. Conditionally render the callout immediately below the new Floor `MaskRow`.
  3. Update the intro copy at `:76-78` — drop the "Floor protection ... [is] set on the Identity tab" claim now that Floor has a real override here. The line still notes that floor *type* and per-fixture levels are set on Identity.

No other files touched.
