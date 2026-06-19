# QT Builder Phase 2e — Role-Aware Material Resolution (engine) — Design Spec

- **Date:** 2026-06-19
- **Status:** Approved (design); awaiting spec review
- **Author:** Eric, with Claude
- **Builds on:** `2026-06-18-quality-tier-builder-design.md` (master §8.5/§10.3/§13/§18.1), Phase 2a–2d
- **Related:** `project_qt_builder_rewrite` (memory)
- **Splits with:** **Phase 2f** = the QT-Builder Materials authoring UI (display + per-tier/role override). This spec is **engine only**.

---

## 1. Summary

Rework the interior material estimator to be **role-aware**: resolve a **primer** system and a **finish** system **separately** per paint spec (today it picks a single system, role-unaware), emitting a material line per role. Primer is selected by the spec's substrate **state**; finish by **quality tier**. Add forward-compatible consumption of a per-tier/role **override** (`scenario.material_systems_by_tier`) so a later UI can pin any system per tier/role. Stain resolution is already role-aware and is left intact (plus override consumption).

This is the **engine foundation** for per-quality-tier material upgrades. The authoring UI that writes overrides is **Phase 2f**; here the override is defined and honored, tested with synthetic scenario maps.

## 2. Motivation

The product goal (from review with Eric): **upgrade materials per quality tier, with full freedom per (tier, role), including primers, and driven by substrate state** (bare wood → bare-wood primer; factory-primed → its own primer; either potentially differing by tier). Today's engine can't express this:

- `computeMaterialEstimates` paint path ([material-estimates.js:208-227](../../tools/paintscope/src/engine/material-estimates.js)) selects **one** system per spec by `quality_tier` + `finish_sheen`, ignoring `product_role`, `substrate`, and `substrate_state`, and labels it `finish`.
- Each MATERIAL_SYSTEM is a single-product system: `SYS_PRIMER_*` (role=primer, `applies_when`: substrate + substrate_state) and `SYS_FF_*` (role=finish, `applies_when`: quality_tier) are **separate** entries (confirmed via `MATERIAL_SYSTEM_PRODUCTS`, one product per system carrying `product_role`).
- Because the match is role-unaware and order-dependent, **primers are never emitted as a distinct line**, and for families whose primer systems precede finishes (e.g. `SF_ARCH_ELEMENT_NC`) the "finish" pick is actually a primer.

The catalog is rich enough to support this: 16 paint families carry QT3/QT4/QT5 finish variants plus substrate/state-keyed primers.

## 3. Goals / Non-goals

**Goals**
- Resolve primer and finish as **separate roles**, emitting a material line per role.
- Select **finish by quality tier** (+ sheen), order-independent, from role=finish systems only.
- Select **primer by substrate state** (via the existing `resolveSubstrateStateForSpec`), from role=primer systems only.
- **Consume** a per-tier/role override (`scenario.material_systems_by_tier[tier][role]`) at the active project QT, bypassing default matching when present.
- Keep hours estimates byte-identical (this touches materials only).

**Non-goals (this phase)**
- The QT-Builder Materials authoring UI — **Phase 2f**.
- Per-substrate-tier material divergence: the material path still resolves at the **single project `defaultQT`**. Substrate A at QT3 and B at QT5 both use `defaultQT` for material selection. Pre-existing limitation, out of scope.
- Substrate **sub-type** primer precision (fjp vs hardwood vs softwood) when state alone is ambiguous — default falls back to the first state-matching primer; full precision comes from the Phase 2f override.
- Product catalog / real product resolution — `resolveProduct` stays as-is; systems remain placeholder `SYS_*`.
- Exterior material path (`computeExteriorMaterialEstimates`) — unchanged.

## 4. Data: systems, roles, products

- `MATERIAL_SYSTEMS[]`: `{ id, spec_family_id, name, applies_when, allowed_sheens }`. A system's **role is its product's `product_role`** in `MATERIAL_SYSTEM_PRODUCTS` (one product per system today).
- **Primer systems**: `applies_when` carries `substrate` and/or `substrate_state` (no `quality_tier`). Role = `primer`.
- **Finish systems**: `applies_when` carries `quality_tier` (and sometimes `finish_sheen`). Role = `finish`.
- **Stain families**: role-keyed systems (`stain` / `sealer` / `clear`), already handled.

**Role classification helper:** build `roleBySystemId` from `MATERIAL_SYSTEM_PRODUCTS` (`system_id → product_role`). A system with no product row falls back to id-pattern (`_PRIMER` → primer; `SEALER`/`CLEAR`/`POLY`/`LACQUER` → those; else finish/stain) so classification never returns undefined.

## 5. Override data model (defined here, authored in 2f)

`scenario.material_systems_by_tier` — `{ [tier]: { [role]: systemId } }`. Optional. Absent tier/role → default matching. Consumed at the active `defaultQT`: at role selection the engine uses `overridesBySpec[specId]?.[defaultQT]?.[role]` when it names a valid system in that family.

**Split note:** the override-honoring **logic + tests land in 2e**, fed by a parameter (`scenarioMaterialOverrides`, default `{}`) and exercised with **synthetic** `overridesBySpec` maps. **Assembling** the real map from overlaid scenario drafts is a small **Phase 2f** addition (alongside the UI that produces the data) — nothing writes `material_systems_by_tier` until then, so wiring the caller in 2e would be speculative. In 2e, existing callers pass nothing and rely on the `{}` default.

## 6. Resolution algorithm (paint specs)

Replaces the single-match block. Per activated paint spec with quantity:

```
roleSystems = { primer: [], finish: [] }  // family systems split by roleBySystemId
specStates  = resolveSubstrateStateForSpec(specId, representativeRoom)  // array of SS_* (may be empty)

for role in [primer, finish] (only roles that have ≥1 system in this family):
    override = overridesBySpec[specId]?.[defaultQT]?.[role]
    if override is a system id present in roleSystems[role]:
        system = that system
    elif role == 'finish':
        system = first finish system with applies_when.quality_tier.includes(defaultQT)
                 (+ finish_sheen match when present); else first finish system
    else: // primer
        system = first primer system whose applies_when.substrate_state is in specStates
                 (when specStates non-empty); else first primer system
    if system: emit one estimate line { productRole: role, system, coats from its product, … }
```

- **Coats** per role from that system's product `coats_required` (primer typically 1, finish typically 2). Gallons math, spray loss, coverage/product resolution unchanged — applied per emitted line.
- A family with no primer systems → finish line only (unchanged shape for those specs).
- `representativeRoom` for state: the first state-compatible contributing room for the spec (the same set `buildSpecScopedQty` already iterates). `resolveSubstrateStateForSpec` returns an **array** of SS_* states; the primer match accepts a system whose `applies_when.substrate_state` is among them. Mixed-state rooms (rare for NC) use the representative room's state; full per-state precision comes from the Phase 2f override.

## 7. Resolution algorithm (stain specs)

Already role-aware (stain/sealer/clear, first per role). **Add** the override check: for each role, if `overridesBySpec[specId]?.[defaultQT]?.[role]` names a valid system, use it instead of the first-per-role default. Otherwise unchanged.

## 8. Engine integration points

- `computeMaterialEstimates(state, roomLookups, specResults, scenarioMaterialOverrides = {})` — new optional 4th arg. Default `{}` preserves all existing callers/tests that omit it (no override → identical to the new role-aware default resolution). **In 2e, [scenario-estimate.js:204](../../tools/paintscope/src/engine/scenario-estimate.js) is unchanged** — it omits the arg and relies on the default.
- **Deferred to Phase 2f:** the caller assembles `scenarioMaterialOverrides` from the overlaid scenarios (each whose `material_systems_by_tier` is present → `specId → material_systems_by_tier`) and passes it. That's where real overrides first exist (authored by the 2f UI), so the assembly lands there, not here.

## 9. Impact, parity, migration

- **Material output changes**: paint specs that have primer systems now emit an additional **primer** line; specs whose prior "finish" pick was actually a primer now emit the correct finish (and a primer). This is a correctness improvement and a coverage gap fill.
- **Hours estimates: unchanged** — this phase touches `material-estimates.js` + the material-override plumbing only.
- **Parity**: the existing material-estimates test is **updated** to the role-aware output (not treated as a regression). Hours/scenario parity suites must stay green.
- **Pre-production**: no migration plumbing; no real product data introduced.

## 10. Testing

- **Unit (`material-estimates.test.js`, expanded):**
  - Paint spec with primer + finish systems → emits **two** lines (roles primer, finish); finish chosen by `defaultQT` from role=finish systems (order-independent — a family with primers listed first still picks the finish).
  - Primer chosen by state: a `SS_BARE` spec picks a bare-state primer; coats from the primer product.
  - Override pins a non-default system for a role at `defaultQT` (synthetic `material_systems_by_tier`); absent override → default; override naming a system outside the family → ignored (falls back to default).
  - Stain spec: roles unchanged without override; override pins a role.
  - Family without primer systems → finish-only (unchanged).
- **Engine/scenario suites**: unchanged and green (hours untouched).
- **Manual**: McLeod at `localhost:5173/5183` — Materials output now lists primer + finish lines for interior paint substrates; gallons reasonable; hours identical to pre-change.

## 11. Files

- **Edit** `tools/paintscope/src/engine/material-estimates.js` — `roleBySystemId` classifier; role-aware paint resolution; stain override hook; new `scenarioMaterialOverrides` param (default `{}`).
- **Edit** `tools/paintscope/src/engine/__tests__/material-estimates.test.js` — role-aware + synthetic-override cases.
- No new modules; no UI; **no `scenario-estimate.js` change** (the caller-side override assembly is Phase 2f).

## 12. Out of scope / future (Phase 2f and beyond)

- **Phase 2f**: QT-Builder Materials section — per-tier × per-role dropdowns (every cell freely assignable, primer included), writing `material_systems_by_tier` scenario drafts; display of the resolved system per tier/role; **and the caller-side assembly** of `scenarioMaterialOverrides` (`specId → material_systems_by_tier` from overlaid scenarios) passed into `computeMaterialEstimates` — completing the path so authored overrides reach the estimate.
- Per-substrate-tier material divergence (resolve materials at each substrate's own tier rather than the single project `defaultQT`).
- Substrate sub-type primer precision without an override.
- Real product catalog resolution.
