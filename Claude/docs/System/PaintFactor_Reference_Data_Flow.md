# PaintFactor — Reference Data Flow (Authoring & Publication)

> Companion to `PaintFactor_System_Data_Flow.md`.
>
> That document traces **one project** — lead to analytics. This one traces the
> **reference data every project consumes**: where spec families, production
> rates, material systems, assemblies, and modifiers come from, who validates
> them, and how they reach the engine.
>
> **Status:** Mixed. Track A (§4) describes what actually happens today and is
> verifiable in the repo. Tracks B and C (§5, §6) describe work not yet started.
> §7 separates the two per data type. Nothing here is a production-app design;
> it states what production would need, not how it would look.
>
> Created: 2026-09-21

---

## 1. Why This Document Exists

The project data-flow document has a hole in it. Stage 3 says "each substrate +
state + condition resolves to a spec family, which expands into modules and
tasks" — and moves on, as though the rate tables arrived from nowhere.

They did not. Every number the estimation engine multiplies was researched,
argued over, confirmed by a human, and published through a pipeline. That
pipeline is the system's most valuable asset and the least documented part of it.

---

## 2. The Central Fact: Two Tracks

Reference data today is authored **in development, by the builder, using
development tooling**. The production app has no authoring path for any of it.

| | Track A — Development (today) | Track B — Production app (not built) |
|---|---|---|
| **Who authors** | Builder + AI agents | Contractor / admin |
| **Where** | PaintScope authoring UI, repo JSON files | In-app, not designed |
| **Validation** | Human confirmation, ad hoc | Undefined |
| **Publication** | Build script → generated bundle | Undefined |
| **Audience** | One person | Every tenant |

This is not a defect. A single contractor's system does not need multi-tenant
authoring on day one, and building it early would have been speculative. But it
is a **hard ceiling**: until Track B exists, no user of PaintFactor other than
its author can add a spec, correct a rate, or define an assembly. The product
ships with whatever the builder authored, frozen.

Everything in §7 is a statement of that gap, type by type.

---

## 3. What Counts as Reference Data

Five kinds, each with a different lifecycle:

| Type | What it decides | Current artifact |
|---|---|---|
| **Spec families** | Which task set applies to a substrate/state/condition | Encoded in scenarios |
| **Production rates** | How fast a task goes (`rate_per_hour`) | `tasks/TSK_*.json` |
| **Material systems** | Which coating system a task requires (`SYS_*`) | Referenced in tasks/modules |
| **Product catalog** | Which real product fulfils a system | `product-catalog.js` |
| **Assemblies & rate overlays** | Reusable SOPs, company rate adjustments | Barely modelled |

Plus two cross-cutting axes: **quality tiers** (QT2–QT5) and **modifiers**
(`FAC_*` — height bands, access, condition).

---

## 4. Track A — The Development Pipeline (As Built)

This is what happens today, verifiable in the repo.

```
  Research            Human               Authoring            Build             Runtime
  ────────            ─────               ─────────            ─────             ───────
  benchmark    →   confirmation    →    PaintScope       →   bundle       →    Scenario
  production       (the gate)           Authoring UI          script            Engine
  rates                                      │                   │
                                             ▼                   ▼
                                    Claude/tasks/*.json    scenario-bundle
                                    Claude/modules/*.json      .gen.js
                                    Claude/scenarios/*.json
                                    Claude/modifiers/*.json
```

### 4.1 Research and benchmarking

Production rates begin as research: benchmark figures for a given task, gathered
across sources rather than invented. This is the step that makes the estimate
defensible — a rate nobody can trace is a guess wearing a number's clothing.

### 4.2 Human confirmation — the gate

Researched rates are **confirmed by a human** before they enter the system. This
is the one non-negotiable step in the whole pipeline, and it is deliberate: a
wrong rate does not fail loudly. It silently misprices every future job that
touches that task, and the error only surfaces months later as margin variance.

No automated path writes a rate without that confirmation.

### 4.3 The authoring surface

Authoring happens in PaintScope's authoring UI
(`tools/paintscope/src/components/authoring/`), which is a **development tool
that ships inside the estimating app** rather than a product feature:

| Component | Authors |
|---|---|
| `ModuleEditor`, `ModuleList`, `ModulePicker` | Modules — grouped task sets |
| `TaskList`, `RenameTaskModal` | Tasks and their rates |
| `BulkRateEditor` | Rates across many tasks at once |
| `QTBuilder`, `QualityTierChips` | Quality tier structure |
| `ModifierList`, `ModifierImpactPreview` | `FAC_*` modifiers, with impact preview |
| `AssemblyBuilder` | Assemblies (early) |
| `DraftsView`, `ArchiveView` | Draft and retirement lifecycle |
| `MatchPreview`, `ModuleUsagePanel`, `DerivedChips` | Where a change lands before saving |

The preview components matter more than they look. `ModifierImpactPreview` and
`MatchPreview` exist because a modifier edit is a blast-radius operation — it
can move hours on hundreds of scenarios — and the author needs to see the radius
before committing, not after.

### 4.4 Source of truth — the JSON tree

The authoring UI writes flat JSON files in the repo. These, not the database and
not the bundle, are the source of truth:

| Path | Count |
|---|---|
| `Claude/tasks/TSK_*.json` | 1,626 |
| `Claude/modules/MOD_*.json` | 719 |
| `Claude/scenarios/SCN_*.json` | 484 |
| `Claude/modifiers/FAC_*.json` | 27 |

Flat files rather than a database, because reference data is versioned
knowledge. A rate change should show up in a diff, be reviewable, and be
revertable — properties a mutable table does not give for free.

**Current state:** all 1,626 tasks carry a populated `rate_per_hour`; there are
no null rates in the authored source. Source files and the generated bundle were
last written 2026-06-23, which is consistent with exterior work being blocked
behind the Spec Factory (§5) rather than stalled.

### 4.5 Publication — the build step

```
Claude/scripts/build-scenario-bundle.mjs
  → tools/paintscope/src/data/scenario-bundle.gen.js   (AUTO-GENERATED, never hand-edited)
```

The bundle is a compiled artifact, and the engine imports it directly. Nothing
queries the JSON tree at runtime. This is what makes estimation deterministic:
a given bundle always produces the same numbers.

The build also derives a `_derived` block per task — phases, methods, substrates,
QTs, buckets, coatings, plus `module_count` and `scenario_count`. That block is a
convenience for authoring and scope-tree grouping, computed at build time so
nothing has to re-derive it at runtime.

### 4.6 The SQLite mirror — an authoring aid, not a runtime

```
Claude/scripts/build-scenario-db.mjs → Claude/database/scenario.db   (gitignored)
```

A queryable mirror for authoring and analysis — "which scenarios use this task,"
"what rates exist for this substrate." It is **not deployed** and the engine
never reads it. Worth stating plainly, because a `.db` file sitting in the repo
reads like production infrastructure and is not.

---

## 5. Track B — The Spec Factory (To Be Built)

Spec families currently live *implicitly*: a scenario encodes which tasks apply
to a substrate/state/condition, and the family is the pattern across scenarios
rather than a thing you can point at.

The new **Spec Factory** changes that. It produces a **distinct spec artifact**
that compiles down into scenarios, modules, and tasks — an authoring layer
sitting above the current model rather than replacing it.

### 5.1 How this relates to the retired Spec System

The old SpecFactory and the `SF_*` spec system were retired 2026-06-17, leaving
the Scenario Engine as the sole estimation path, with a standing rule that new
work must not re-entrench the spec system.

**The new Spec Factory does not violate that rule, and the distinction is worth
stating precisely:** the retirement removed specs as a *runtime estimation path*.
The engine no longer resolves specs to compute an estimate — it runs on
scenarios, and it still will. The new Spec Factory is an *authoring-time*
generator whose output compiles into those same scenarios.

Runtime stays scenario-only. Authoring gains a layer above it. If a future
design ever has the engine resolving spec artifacts directly at runtime, *that*
would re-entrench the retired system and should be refused.

### 5.2 Scope and sequencing

- **Existing spec families remain.** Nothing already in the system is regenerated.
- **Exterior specs come from the new Exterior Spec Factory**, once it exists.
- **Exterior work is blocked until then.** This is a hard dependency, not a
  preference — see §8.

---

## 6. Track C — The Data Factory Pipeline (Next Step)

The Data Factory is the pipeline that turns research into engine-ready data at
scale, rather than one authored task at a time.

**Order of work:**

1. **Exterior Data Factory** — being recreated; the immediate next step
2. **Interior Data Factory** — after exterior proves the pattern
3. **Repaint Data Factory** — last

Exterior goes first because it is the least covered domain and because the
taxonomy reform it needs was already worked through (see
`docs/superpowers/specs/2026-07-19-exterior-data-factory-design.md`).

### 6.1 A stale document to distrust

`docs/System/DataFactory_Architecture.md` describes DataFactory as consuming
**SpecFactory** artifacts and importing them into SQLite for the estimation
engine to query at runtime. That pipeline no longer exists — SpecFactory was
retired, and the engine reads the generated bundle, not a database.

Read that document as history. The recreated Data Factory should be specified
fresh against the scenario model, and that architecture doc either rewritten or
explicitly marked superseded.

---

## 7. Per-Type: Today vs. What Production Needs

| Type | Track A — how it works today | Track B — what the production app needs |
|---|---|---|
| **Spec families** | Implicit in scenarios; authored by hand | Spec Factory as an in-app generator; existing families frozen |
| **Production rates** | Research → human confirmation → authoring UI → JSON → bundle | An in-app rate authoring system. **The workflow for creating and calibrating rates in production has not been addressed at all.** |
| **Material systems** | Defined through specs in development | A material system management surface |
| **Product catalog** | `product-catalog.js` — 350 products, `SYS_*` mappings, brand-tier map | Catalog management: add products, set prices, maintain tier mappings, refresh vendor data |
| **Assemblies** | `AssemblyBuilder` exists but only lightly exercised | Full Assembly Manager — company-level reusable SOPs |
| **Rate overlays** | Barely modelled | Company-level rate adjustment layer over base rates |
| **Quality tiers** | `QTBuilder`; single QT3 baseline rate + time modifier on `qt_scaled` tasks | Tier definition surface, if tenants may differ |
| **Modifiers** | `ModifierList` with impact preview | Modifier authoring with the same blast-radius preview |

The rate row is the important one. Everything else is a missing UI over a solved
model. Rate authoring in production is a genuinely **unsolved workflow** — not
just unbuilt — because it has to answer questions the development workflow
sidesteps: who is allowed to change a rate, what evidence is required, what
happens to in-flight estimates, and how a tenant's local calibration relates to
the shipped baseline.

---

## 8. The Dependency Chain

```
  Exterior Spec Factory  ──blocks──►  Exterior Data Factory
                                             │
                                             ▼
                                      Exterior spec families
                                             │
                                             ▼
                                   Exterior estimating coverage
                                             │
                                             ▼
                              Interior DF  →  Repaint DF
```

Nothing about exterior estimating moves until the Exterior Spec Factory exists.
That is the single gating item for the largest gap in domain coverage, and it is
a separate endeavor from everything in this document.

---

## 9. The Return Path That Does Not Exist Yet

`PaintFactor_System_Data_Flow.md` §9 describes analytics proposing calibrated
production rates back into the bid stage. That return path terminates *here* —
in reference data — and the connection is unbuilt on both ends.

Two questions it raises, neither answered:

1. **Where does a calibrated rate land?** Overwriting an authored rate destroys
   the researched baseline and its provenance. A calibration layer *over* the
   baseline preserves both, and matches how rate overlays would work for tenants
   anyway.
2. **Whose calibration is it?** A rate learned from one contractor's crews is not
   a universal truth. Development-authored baselines and tenant-specific
   calibration are different data with different trust levels, and collapsing
   them loses that distinction permanently.

Both are Track B questions, and both should be settled before the analytics loop
is wired — not after.

---

## 10. Gaps and Open Questions

1. **Production rate authoring is an unsolved workflow**, not merely unbuilt (§7).
2. **The calibration return path has no destination** (§9).
3. **`DataFactory_Architecture.md` is stale** and describes a retired pipeline (§6.1).
4. **Assemblies and rate overlays are barely modelled** — `AssemblyBuilder` exists
   but the company-level sharing, versioning, and override semantics are not
   settled.
5. **No provenance on rates.** A `rate_per_hour` carries no record of where it
   came from, what confirmed it, or when. That is tolerable while one person
   authors everything and remembers; it stops being tolerable the moment a second
   author or a tenant calibration exists.
6. **The material catalog needs a refresh story** — 350 products with prices that
   drift. Nothing says who updates them or how often.

---

## 11. Relationship to the Other System Documents

| Document | Covers |
|---|---|
| `PaintFactor_OS.md` | Doctrine — what the system is and is not |
| `PaintFactor_System_Data_Flow.md` | One project, lead → analytics |
| **This document** | The reference data every project consumes |
| `docs/superpowers/specs/2026-09-19-schedule-notifications-design.md` | Stage 6 design detail |
| `DataFactory_Architecture.md` | **Superseded** — describes the retired SpecFactory pipeline |

Together the first three are the system on paper: the doctrine, the project
lifecycle, and the knowledge that lifecycle runs on.
