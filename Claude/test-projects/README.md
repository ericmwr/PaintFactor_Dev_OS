# Coverage Test Kit v2

An 18-room PaintScope project designed to exercise every major interior
substrate family in one import — paint, stain, AND protect — as
first-class scenario matches in the Dev tab. Use it to find Scenario
Engine gaps systematically.

## What's new in v2

Refreshed 2026-04-16 to exercise work shipped in recent plans:

- **Stairway per-component estimation** — room 15 tests all 8 stair
  components with mixed states/methods/coating types (painted risers,
  stained treads, bare balusters, factory-primed newels, etc.).
- **Cabinet substrate** — rooms 16 + 17 cover both paint mode
  (factory-finish + bonding primer + spray) and protect mode (hits
  `SCN_CABINET_PROTECT_STANDARD`).
- **Unified protect architecture** — cabinet + closet protection now
  flow through the scenario engine (no more resolver files). Protect
  rooms show scenario matches in the Dev tab, not hidden totalHours.
- **Closet shelving refresh** — room 13 expanded from 1 closet to 3
  (bare + primed + melamine), room 14 is new (protect-only, 2 closets
  at different levels).

## Room map

| # | Room | What it tests |
|---|------|---------------|
| 01 | Drywall QT3 Spray Bare | Baseline drywall walls + ceiling |
| 02 | Drywall QT5 Roll Bare | Top-tier + roll method variant |
| 03 | Drywall RP Primed Fair | Interior repaint path (`SF_*_INT_RP`) |
| 04 | Trim Base+Crown QT3 Brush | Baseboard + crown paint |
| 05 | Trim Stain QT3 | Stain/sealer/clear on bare wood trim |
| 06 | Doors + Frames + Casing QT3 Brush | Full door opening, brush |
| 07 | Doors QT5 Spray Factory-Primed | Door spray + high tier |
| 08 | Windows Int + Casing QT3 | Interior window + jamb + casing |
| 09 | Wainscot Panel QT3 | Wainscot panel paint |
| 10 | Wood Feature Wall + Wood Ceiling | Wood walls (paint) + wood ceiling (stain) at STEP height |
| 11 | Beams + Columns + Mantel | Architectural elements at EXT height, COMPLEX room |
| 12 | Builtins QT4 | Built-in bookcase |
| **13** | **Master Closet Paint** | 3 closets: bare/QT3/brush_roll, factory_primed/QT4/spray, melamine/QT5/brush_roll. All 3 closet paint states + 2 methods. |
| **14** | **Hall Closet Protect** | 2 closets with `paint_shelving:false`: wood_shelving/partial_cover, builtin_system/full_cover. Hits `SCN_CLOSET_SHELF_PROTECT_*`. |
| **15** | **Stairway Mixed-State** | Single stairway, 8 components: painted risers, stained treads, bare balusters, factory-primed newels, stained open_rail, painted wall_rail/skirtboard/stringer. Per-component expansion — expect 8 scenario matches. |
| **16** | **Kitchen Paint Cabinets** | Factory-finish cabinets, `paint_cabinets:true`, QT4 spray, full_exterior. Bonding primer + QT modifier path. |
| **17** | **Kitchen Protect Cabinets** | `paint_cabinets:false`, `protection_level:'standard'`. Walls/ceiling painted QT3. Hits `SCN_CABINET_PROTECT_STANDARD`. |
| 18 | Drywall Poor Condition RP | POOR condition + textured repaint (FAC_CONDITION + FAC_TEXTURE) |

## How to load it

1. Start the dev server (`npm run dev` in `Claude/tools/paintscope/`)
2. Open http://localhost:5173/
3. Click the **Projects** tab
4. Click **Import**
5. Select `Claude/test-projects/coverage-kit.json`
6. The kit loads with 18 rooms and becomes the active project

## How to walk the gaps

1. In the browser console: `localStorage.setItem('paintscope.admin', '1')` → reload
2. Click the **Dev** tab (last one in the nav)
3. Walk each room in the left list
4. For each room, review the trace cards:
   - **MATCH** (green): scenario fired, hours non-zero
   - **NO MATCH** (red): scenario gap — expand the card, read the near-miss
     diff. The `expected=X got=Y` line tells you exactly which ctx key is
     the problem
   - **TIE** (yellow): two scenarios match with equal specificity — the
     engine picked one arbitrarily, this needs tighter match criteria on
     at least one of them

### What to expect in the new rooms

- **Room 13 (Master Closet Paint):** 3 roomInputs under `SF_CLOSET_SHELF_NC`
  (one per closet), each matching a different `SCN_CLOSET_SHELF_NC_*` scenario.
- **Room 14 (Hall Closet Protect):** 2 roomInputs under `SF_CLOSET_SHELF_NC`,
  each matching `SCN_CLOSET_SHELF_PROTECT_{PARTIAL_COVER,FULL_COVER}`.
- **Room 15 (Stairway Mixed-State):** up to 8 roomInputs under stair specs
  (`SF_STAIR_RISER_NC`, `SF_STAIR_RAILING_NC`, `SF_STAIR_TREAD_NC_STAIN`, etc.).
  Each scenario card's CTX SNAPSHOT shows the `__component` it represents.
- **Room 16 (Kitchen Paint Cabinets):** one roomInput under `SF_CABINET_NC_PAINT`
  matching a paint scenario.
- **Room 17 (Kitchen Protect Cabinets):** one roomInput under `SF_CABINET_NC_PAINT`
  matching `SCN_CABINET_PROTECT_STANDARD` (plus walls/ceiling paint roomInputs).

## Common gap patterns and what to do

### "paintable_item" mismatch
**Symptom:** near-miss shows `paintable_item: expected "baluster" got "stair_railing"`.
**Cause:** adapter-side name doesn't match scenario-side name.
**Fix:** update `SPEC_TO_PAINTABLE_ITEM` in `src/engine/context-adapter.js`, or
for stair components, check the `STAIR_SPEC_COMPONENTS` map in the same file.

### Missing ctx key
**Symptom:** near-miss shows `substrate_state: expected "SS_BARE" got undefined`.
**Cause:** adapter doesn't derive `substrate_state` for this spec from the room
substrate. For stair/cabinet/closet this happens when `expandStairwaySpecContexts`
or `expandProtectContexts` doesn't recognize the substrate shape.

### Missing scenario combination
**Symptom:** all near-misses mismatch on the same key with a value no
scenario declares (e.g. `application_method: expected "brush"|"spray" got "roll"`).
**Cause:** the (tier × method × state) combo was never authored.
**Fix:** clone the closest near-miss scenario and tweak its `matches`. For
stair components, edit `Claude/scripts/gen-stair-scenarios.mjs` and regenerate.

### Protection task hours = 0 despite scenario match
**Symptom:** scenario matches green but totalHours = 0.
**Cause:** module references a `PS_PROTECT_*` key that `quantity-lookups.js`
doesn't emit for this room.
**Fix:** verify the emission block in `quantity-lookups.js` covers all
protect modules' PS keys. Common miss: heavy-level cabinet PS keys for
rooms with `protection_level='heavy'`.

## Using the Copy Debug Blob button

If you hit a gap you can't figure out locally:
1. Pick the room in the Dev tab
2. Click **Copy Debug Blob** in the header
3. Paste the JSON into a chat or issue
4. The blob contains the room state, built ctx per spec, match results,
   and gaps — enough to replay the exact scenario in Node without your
   local state

## Re-running after fixes

1. Edit `src/engine/context-adapter.js` or author/edit a scenario draft
2. If you changed canonical JSON (modules/scenarios/modifiers on disk),
   run `node Claude/scripts/build-scenario-bundle.mjs` to rebuild the
   bundle
3. Vite HMR picks it up; reload the browser to re-merge overlays
4. Flip back to Dev tab → gap count should drop

## Success criterion

Zero red `NO MATCH` cards across all 18 rooms means the adapter and
scenarios are structurally aligned. Every piece of work — paint, stain,
protect — flows through the scenario engine and is visible in Dev tab
gap reporting.

## Known pre-existing issues

- `SCN_INT_STAIR_RP_*` scenarios have a broken `paintable_item: 'stair'`
  match that never fires. `SCN_INT_STRP_*` variants are what actually
  work for stair RP. The kit does NOT exercise stair RP (no room with
  `SS_SOUND_PAINT` or `SS_FAILING_PAINT` stairways) — if you add one,
  match against STRP, not STAIR_RP.
