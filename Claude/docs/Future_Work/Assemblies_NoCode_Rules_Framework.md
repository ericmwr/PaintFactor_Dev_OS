# Assemblies as a No-Code Rules Framework

**Date captured:** 2026-04-18
**Status:** Parked until engine qualification is complete
**Owner:** Eric
**Session source:** Cranky-saha / worktree authoring work, 2026-04-18

---

## The vision, in one paragraph

PaintScope's architecture — modules → scenarios → assemblies — is an incremental migration of painter domain knowledge from **hardcoded JavaScript** into **data authored in the UI**. The assembly layer is the final boundary. Once wired, conditional logic like "if hardwood floor under ceiling paint, fire floor cover scenario" becomes a rule authored by the painter in the Authoring tab, not a line of JS written by a developer. This unlocks two things that no competitor offers: (1) painters can encode their own nuance without dev time, and (2) the shipped rule library — accumulated from real quotes — becomes a transferable, tunable baseline for new painters onboarding to the system.

---

## Why this is strategically important

**Competitive landscape:**

- Spreadsheet estimators: infinite flexibility, zero intelligence
- SaaS estimators (Jobber, PaintScout, etc.): opinionated defaults, rigid workflows, painters work around the tool
- **PaintScope's target position:** engine handles heavy lifting, but every painter's domain knowledge (rules, rates, nuance) is authorable

**What this creates:**

- **Architectural moat.** Competitors can ship a no-code rule builder on top of a rigid engine — but the engine being *designed* for data-authored decisions from the ground up is 12+ months to replicate.
- **Data moat.** The curated rule library accumulated from real quotes is irreplaceable — it's 20 years of painting experience encoded as data, transferable across painters without losing nuance.
- **Category definition.** Moves PaintScope from "estimator that imposes ITS process" to "estimator that lets you encode YOUR process."

---

## The sequencing — validate first, generalize second

**Load-bearing discipline:** do not build the no-code framework until the scenario engine is qualified on real projects.

### The gate (must all be true before starting dev on this)

- [ ] Scenario engine produces estimates within 3-5% of manual gut-check on 5+ real projects
- [ ] At least one real client has been quoted with scenario-engine numbers and the job completed profitably
- [ ] Legacy + scenario engines producing matching output shapes end-to-end (Steps 1-6 done as of 2026-04-18 ✓)
- [ ] Coverage Test Kit passing all scenarios without gaps

### Why this sequencing matters

Two failure modes to avoid:

1. **Shipping flexibility before validating the baseline.** New painter signs up, sees 500 modules + 50 assemblies, panics, bounces. Or starts tuning without understanding, gets wrong numbers, blames the tool.
2. **Validating on synthetic data instead of real money.** Coverage kits check architecture, not correctness. The engine is only "qualified" when it produces numbers you'd bet on with real clients.

---

## Current state (2026-04-18)

The module → scenario → assembly stack has **modules and scenarios fully live** (consumed by `useEstimateScenario`) but **assemblies are authoring-only** (preview works, not wired into the estimate pipeline).

### What exists

- `Claude/tools/paintscope/src/engine/assembly-resolver.js` — pure function `resolveAssembly(assembly, quantities, ctx)` that walks `scenario_rules[]`, evaluates `if` expressions, emits match criteria
- `Claude/tools/paintscope/src/components/authoring/AssemblyBuilder.jsx` — full CRUD UI with rule editor, sample-quantity preview, scenario match resolution display
- IndexedDB draft persistence (same pattern as modules/scenarios)
- Publish endpoint writes to `Claude/assemblies/*.json` (dir doesn't exist yet but endpoint does)

### What does NOT exist

- **Any call to `resolveAssembly` from the estimate pipeline.** Verified via grep 2026-04-18.
- **Rule primitive beyond `scenario_match`.** Current action types: emit a scenario. Future need: `suppress_task`, `rate_modifier`, `quantity_adjust`, `emit_ad_hoc_task`.
- **Trigger mechanism.** How does a project/room activate an assembly? Project-level `job_type`? Per-room toggle? Needs design.
- **Opinionated rule builder UI.** Today's `if` field is free-text JS. Future: guided composer with pickers.
- **Conflict resolution.** What if two rules emit contradictory scenarios? Order? Priority? Most restrictive? Needs design.

---

## Technical path (once gate is passed)

### Phase 1 — Wire assemblies into the estimate pipeline (~1-2 days)

1. Add assembly loader to `useEstimateScenario.js` — pull published + drafted assemblies from IDB + disk
2. Call `resolveAssembly(assembly, roomQty, ctx)` at room-resolve time, for each project-active assembly
3. Merge output match criteria into the list passed to `findBestMatch` — assembly-emitted scenarios fire alongside spec-emitted scenarios
4. Build a trigger mechanism: probably a `project.assemblies[]` array seeded from `project.job_type` or per-room config

### Phase 2 — Extend rule primitives (~1-2 days)

Today a rule produces only a `scenario_match`. For parity with current hardcoded behavior, add:

- `suppress_task` — "drop TSK_X from the results of any scenario that fires"
- `rate_modifier` — "multiply specified scenario's rate by N"
- `quantity_adjust` — "add/subtract M units from PS_KEY quantity"
- `emit_ad_hoc_task` — "add this task directly to the estimate, no scenario needed"

Each needs design for ordering + idempotency.

### Phase 3 — Port ONE hardcoded path (~1 week, first one is the hardest)

Suggested starting point: **floor protection** (~200 lines in `floor-protection.js`).

1. Build the rule equivalents in a draft assembly `ASM_FLOOR_PROTECTION_BASELINE`
2. Run both paths in parallel — legacy engine calls the hardcoded function, new path evaluates the assembly
3. A/B test against Coverage Kit + McLeod + 2-3 real projects
4. Once parity within acceptable tolerance is achieved, delete the hardcoded function
5. Canonical assembly ships in the bundle

### Phase 4+ — Iterate through remaining hardcoded paths

| Hardcoded file | What it does | Rule count estimate |
|---|---|---|
| `floor-protection.js` | Floor type → protection level → tasks | 10-15 |
| `fixture-protection.js` | Bathroom fixtures by painting context | 15-20 |
| `derive-protection.js` | Surface-level protection triggers | 10 |
| Auto door/window masking | Spray + unpainted opening → mask | 2-3 |
| Grain fill redistribution | Stain grade + open grain → extra tasks | 1-2 |
| Height modifier application | Height band → rate multiplier | 3-4 |
| Coat count for QT5 | QT5 → extra finish coat | 1-2 |
| Color change gates (not yet coded) | Dark→light primer, light→dark tint primer | 2-3 |

**Rough total: ~900 lines of conditional JS → ~50-70 assembly rules.** That's the leverage.

---

## Rule library brainstorm (from 2026-04-18 session)

Organized by use case. These are the templates the no-code builder would expose as picker options.

### 1. Floor & surface protection

- Ceiling paint + hardwood/tile/LVP → full floor cover
- Ceiling paint + carpet → drop cloth only (no rosin)
- Ceiling paint + subfloor (NC) → skip floor protection
- Spray method + any floor → rosin + plastic combo
- Brush/roll + hardwood + QT5 → extra care (drop cloth + taped edges)
- Room is bath/kitchen → fire fixture-covers scenario regardless of method

### 2. Fixture & obstacle protection

- Bathtub present + sprayed walls/ceiling → tub masking
- Toilet present + any paint in bath → toilet masking
- Vanity present + wall paint → vanity masking
- Fireplace present + adjacent wall paint → fireplace masking
- Cabinets present + walls painted, cabinets NOT → cabinet masking
- Shower present + spray → glass/tile masking
- Windows + spray + not painting windows → window masking
- Doors + spray + not painting doors → door masking

### 3. Height & access

- Ceiling ≥ 14 ft + painting ceiling → scaffold setup
- Ceiling 9-13 ft → extension-pole setup, no ladder premium
- Stairway + wall paint → ladder-over-stair safety setup
- Vaulted/cathedral ceiling flag → scaffold + harness

### 4. Prep work gates

- Substrate state = peeling → scrape + feather-sand
- Substrate state = failing → heavy scrape + skim
- Wall texture = heavy orange peel + QT5 → skim-coat (smooth for premium)
- Substrate = bare MDF → edge seal (reinstate here, not globally)
- Substrate = bare solid wood trim → knot spot-prime
- Water stains flagged → stain-blocking primer
- Color change: dark → light → extra primer coat
- Color change: light → dark → tinted primer

### 5. Multi-coat / finish quality

- QT5 + walls → third finish coat
- QT5 + trim spray → extra sanding between coats
- Stain finish + open grain wood → grain fill
- Clear finish + QT5 → additional clear coat
- Sheen = flat + heavy traffic → upgrade sheen note

### 6. Specialty rooms

- Room = kitchen + painting cabinets → cabinet doors off-site (+ reinstall visit)
- Room = kitchen + not painting cabinets → cabinet full mask
- Room = bathroom + humid climate flag → mildewcide primer
- Room = basement + concrete + bare → concrete primer
- Room = closet + QT3 → simplified wall spec
- Garage + bare drywall → single-coat prime + paint, no crown

### 7. Job-level / operational

- New construction flag → suppress repaint prep tasks everywhere
- Occupied home flag → site-protect + daily cleanup
- Has pets flag → fume-management + ventilation
- Has children + lead-era home → lead-safe practices
- Rush job (≤ 3 business days) → rush premium modifier
- Distance > 30 miles → travel surcharge
- Multi-day (crew days > 3) → daily setup/teardown

### 8. Quality tier cascade

- QT3 → standard workflow
- QT4 → sand-between-coats
- QT5 → skim-sand + inspection
- QT5 + walls → white-glove inspection

### 9. Exterior-specific

- Weathered wood → power wash + deep sand
- Peeling paint > 25% → heavy scrape + primer
- Stucco + rain forecast → rescheduling buffer
- Cedar shingles → oil-based primer
- Gutters metal → rust inhibitor

### 10. Color / material-specific

- Two-tone scheme → extra cut-in time
- Accent wall + contrasting sheen → extra masking
- Stain-grade + oak → grain fill
- Cabinet refinish + melamine → bonding primer + adhesion promoter

---

## No-code builder UI sketch

Replaces the current free-text `if` field with a guided composer:

```
┌─ Rule 3 ──────────────────────────────────────── [×] ─┐
│  Label: [Cover hardwood when painting ceiling   ]     │
│                                                       │
│  WHEN                                                  │
│  [Surface quantity ▾] [ceiling_sf ▾] [>] [0      ]   │
│                                                       │
│  AND                                                   │
│  [Floor type       ▾] [is        ] [hardwood ▾]      │
│                                                       │
│  AND  [+ condition]                                    │
│                                                       │
│  THEN activate scenario                                │
│  [Protection scenario ▾] [Full floor cover ▾]         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Key UX patterns

1. **Left dropdown** = input category (Surface quantity, Floor type, Substrate state, etc.)
2. **Middle dropdown** = comparison (>, ≥, =, ≠, is, is not, one of). Different inputs get different comparisons.
3. **Right input** = value — number field, enum dropdown, or text
4. **"+ condition"** stacks AND/OR lines to build compound rules
5. **Scenario picker** uses the same tag/chip filter system we built for Modules/Scenarios — pick via Substrate + Method + QT + etc.
6. **Plain-English preview** — "When there's any ceiling paint AND the floor is hardwood, activate 'Full floor cover protection.'"
7. **Test-with-project button** — run this rule against an existing project and see if it would fire

Under the hood, the builder **still produces the same `if` expression string** — it just writes the JS for you. That keeps the resolver unchanged.

---

## Honest trade-offs & risks

### What this unlocks

- Net-new edge cases become JSON edits, not dev tickets
- Domain experts own domain knowledge — no translator needed
- Rules become versionable + auditable (git diffs read like spec changes)
- A/B testing conditional logic (clone an assembly, modify one rule, compare estimates)

### What it costs

- **Wiring:** 1-2 days plumbing `resolveAssembly` into the pipeline
- **Primitive richness:** new rule action types beyond `scenario_match`
- **Migration:** each hardcoded path needs parallel-run validation before deletion
- **Debugging fuzzier:** rule defs, scenarios, match criteria, resolver — more places to look when wrong
- **Conflict resolution:** order? priority field? most restrictive? needs design

### Honest risks

- **Framework expressiveness ceiling.** Some painter decisions don't decompose cleanly into "if-then-scenario" — e.g. scheduling constraints. Needs new primitives when hit.
- **Rule-count explosion.** 50-70 today could become 300+ as edge cases accumulate. Mitigation: same tag/chip filter pattern we built for modules/scenarios (categorized, searchable, count-aware).
- **Validation gap.** A wrong rule can silently under/over-quote. Needs regression tests against known-good past projects.

---

## Decision log

**Decided 2026-04-18:**

- Assembly framework is the right direction but sequenced AFTER engine qualification
- Floor protection is the best first port — isolated, well-bounded, ~200 lines of clear logic
- Rule library grows organically from real quotes, not pre-built comprehensively
- Shipped "baseline assemblies" are the product moat, not the framework itself
- No code changes today — captured as future work pending validation gate

**Open questions for when work resumes:**

- How does a project "activate" an assembly? Project-level `job_type`? Room-level toggle? Auto-match?
- Order/priority of rules when multiple fire conflicting scenarios — design call
- How does the baseline library ship? With the canonical bundle? As a separate `assemblies/` git directory?
- Do assemblies get their own filter/tag UI like modules/scenarios did?
- Multi-painter: one painter's assemblies vs shared team assemblies — data scoping

---

## Related artifacts from this session

- Module architecture next-session doc: `C:\Users\mowre\.claude\projects\C--Eric-AI-Playground-Claude-Code-Uni\memory\project_module_architecture_next_session.md`
- Tag filter + Drafts view added to Authoring UX (commits pending)
- Steps 5-6 scenario engine wiring completed (materials + pricing)
- 7 cherry-picks from main + MDF edge seal + fixture protection dedup all shipped

---

## When coming back to this doc

Read the **Sequencing** section first. If the gate criteria aren't all met, close the doc and keep qualifying the engine. Don't start on assembly wiring before the baseline is solid — premature optimization will compound any engine errors into amplified rule errors.

When the gate is passed, the first step is **Phase 1 wiring** — and the success criterion is "I can build an assembly, activate it on the McLeod project, and see its rules contribute to the estimate output alongside normal scenarios." That's the proof-of-wiring. After that, Phase 3 (floor protection port) is the proof-of-value.
