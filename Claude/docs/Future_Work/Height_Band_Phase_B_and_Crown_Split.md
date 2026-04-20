# Height Band Phase B + Crown Split

**Date captured:** 2026-04-18
**Status:** Deferred — Phase A shipped 2026-04-18 (height stripped from 28 trim/door/window/wainscot modules)
**Owner:** Eric
**Session source:** Cranky-saha, 2026-04-18

---

## Context — what already shipped (Phase A)

FAC_HEIGHT now has author-editable thresholds (`band_thresholds_ft`) in the Modifier editor. User can tune "STEP starts at 8 ft" etc. in the UI without a code change.

**Phase A cleanup (2026-04-18):** stripped `modifier_eligibility.height: true` from 28 interior modules that live at ground-to-head-height and shouldn't scale with room ceiling band:
- Trim finish/prime/prep/interstage/protect/mask (10)
- Interior door frame finish/prep/interstage (4)
- Interior windows finish/prep/prime/setup/interstage + RP variants (10)
- Wainscot finish/prime/prep/interstage (4)

Height eligibility **kept** on: walls, ceilings, cut-in-to-ceiling, wood walls/ceilings, drywall ceiling RP, arch elements (beams/columns/mantels), stair railings.

Script: [`Claude/scripts/strip-height-from-trim-doors-windows.mjs`](../../scripts/strip-height-from-trim-doors-windows.mjs) — idempotent.

## Phase B — Per-window "second story" flag

**Problem:** Some windows in vaulted/cathedral rooms, gabled walls, or stairway clerestories are physically 10-20 ft up. Currently they inherit no height penalty (we stripped it in Phase A). Painter needs a way to mark specific windows as elevated.

### Proposed model

**1. State change — door items already have a per-item flag pattern (`painting: true/false`). Add a per-window flag:**
```json
{
  "id": "win_123",
  "count": 1,
  "window_type": "double_hung",
  "substrate_state": "bare_wood",
  "second_story": false          ← new
}
```

Default `false` for existing windows. Set `true` explicitly when the window is elevated.

**2. UI change — OpeningsTab Windows table:**

Add a column (similar to the Scope PAINT/PROTECT toggle on doors):

```
Count | Type | Substrate State | Sides | 2nd Story? | Total Sides | (delete)
  1   | DH   | bare_wood        | 2    |   [×]      | 2 EA_SIDE   | ✕
```

Toggle state: checkbox/pill with label "GROUND" / "ELEVATED".

**3. Quantity-lookups change — `quantity-lookups.js`:**

Split window quantity into two PS keys:
- `PS_SURFACE_EA.WINDOW_GROUND` (sum of ground windows)
- `PS_SURFACE_EA.WINDOW_ELEVATED` (sum of elevated windows)
- Same split on opening/casing/jamb keys

**4. Module change — create elevated variants:**

- `MOD_APPLY_WINDOW_ELEVATED_FINISH` — same tasks as `MOD_APPLY_WINDOW_FINISH` but reads elevated PS keys and has `modifier_eligibility.height: true`
- Same pattern for prep/prime/interstage

**5. Scenario change — window scenarios add the elevated module alongside the ground module** (or elevated-only scenarios are selected when all windows are elevated).

### Alternative simpler model

Instead of splitting into two modules, keep one module but gate the height factor on a per-task `applies_when`:
- Ground window task: `applies_when: { window_elevation: "ground" }` — no height modifier
- Elevated window task: `applies_when: { window_elevation: "elevated" }` — height modifier applies

This requires the quantity lookup to emit per-item-elevation PS keys too, but avoids module duplication. Cleaner but needs engine support for per-task modifier eligibility (currently it's per-module).

### Scope estimate

- UI toggle + state field + migration: ~45 min
- quantity-lookups split: ~30 min
- Engine per-task eligibility OR module duplication: ~1-2 hrs
- Scenario updates: ~30 min
- **Total: 3-4 hrs**

---

## Crown molding height split

**Problem:** Crown molding is currently bundled inside `PS_SURFACE_LF.TRIM_TOTAL` along with baseboard, door casing, window casing, chair rail, shoe mold, etc. When Phase A stripped height eligibility from trim modules, crown lost its legitimate height penalty.

Crown molding at 9 ft IS overhead — painter is on a step ladder reaching up. The 1.3x STEP factor is appropriate. But we can't selectively re-apply height to just crown if crown LF is mixed into TRIM_TOTAL.

### Proposed fix

**1. Separate PS key:** `PS_SURFACE_LF.TRIM_CROWN` — crown LF only, emitted from quantity-lookups based on the user's existing crown substrate toggle.

**2. Split apply/prime/interstage modules:**
- Keep `MOD_APPLY_TRIM_FINISH_BRUSH/SPRAY` reading `PS_SURFACE_LF.TRIM_TOTAL` minus crown (new reduced key like `PS_SURFACE_LF.TRIM_BELOW_HEAD` or just subtract at adapter)
- Create `MOD_APPLY_CROWN_FINISH_BRUSH/SPRAY` reading `PS_SURFACE_LF.TRIM_CROWN` with `modifier_eligibility.height: true`
- Parallel prep/prime modules for crown

**3. Scenarios updated:** add the crown module alongside existing trim modules when crown is present.

### Consideration — is this work worth the effort?

**Undercount magnitude:** Crown LF on a typical room = perimeter only (62 LF for 13×18). A 1.3x penalty at QT3 brush prime (90 LF/hr) = extra 10 minutes per room. Across 18-room McLeod, maybe 2-3 hours total undercount. Small absolute impact.

**Alternative:** leave height off all trim (including crown) and accept the small undercount. Revisit if a job comes in with extensive crown in high-ceiling rooms.

### Scope

- New PS key: 15 min
- Split modules: 30 min
- Adjust TRIM_TOTAL consumers to exclude crown: 20 min
- Scenario updates: 30 min
- **Total: ~2 hrs**

---

## Similar split candidates worth discussing

Opportunities to separate tasks where height-eligibility differs within a conceptual group:

| Bundled | Split into | Why |
|---|---|---|
| Stair railings as a single module group | Ground-level baluster/newel vs elevated handrail above stairs | Stair railing balusters are at ~3-4 ft; handrails above upper stairway are 10+ ft |
| Cabinets single module | Lower cabinets (ground level) vs upper cabinets (7 ft+) | Upper cabinet tops reach 7-8 ft, arguably step-ladder in very high kitchens |
| Closet shelving finish | Lower shelves vs high shelves (> 6 ft) | Walk-in closets can have shelves up to 8 ft |

Probably noise-level for most jobs. Flag them if real projects show under/over-estimation.

---

## When coming back

1. Phase B priority trigger: a real project quotes a house with vaulted ceiling / clerestory windows / stairway gable windows
2. Crown priority trigger: a formal-rooms job with heavy crown in 10-12 ft ceilings where the undercount becomes noticeable
3. Before building Phase B, confirm with user whether module-split or per-task-eligibility approach is preferred (see "Alternative simpler model" above)
