# Scenario Query Database — Design

- **Date:** 2026-06-26
- **Status:** Draft (awaiting review)
- **Topic:** A local, queryable SQLite mirror of the scenario engine's data, generated from the JSON source of truth.

---

## 1. Summary

Add a build-time script that loads the scenario engine's data — `MOD_*`, `SCN_*`,
`TSK_*`, `FAC_*`/`TRADE_*` JSON plus the two JS data modules (`scenario-rate-data.js`,
`product-catalog.js`) — into a relational **SQLite file** the user can query locally
with any SQLite tool (DB Browser, the `sqlite3` CLI, Datasette, a VS Code extension).

The `.db` is a **disposable generated artifact**, a sibling to today's
`scenario-bundle.gen.js`. The JSON files stay the single source of truth. The deployed
app, the Vite build, and the Netlify deploy are **completely untouched**.

---

## 2. Background — why this design

Three facts reframed the original ask ("create a database that runs the same way on
Netlify deploy"):

1. **The old "SQLite version" never ran a database on Netlify.** The old
   `paintfactor.db` / `paintscope_db.sqlite` was an *authoring* source of truth. A build
   step compiled it into `db-bundle.js` (~400 KB of plain JS), and *that* shipped to
   Netlify. There is no `sql.js` / `better-sqlite3` / `sqlite3` in the deployed app —
   Netlify only ever served static files.

2. **The scenario version works the same way at deploy time.** JSON files are the source
   of truth; `Claude/scripts/build-scenario-bundle.mjs` compiles them into
   `scenario-bundle.gen.js` (2.3 MB of JS) which the app imports. Same static-on-Netlify
   model. The only thing that changed vs. the old system is the *authoring source*:
   SQLite tables → JSON files.

3. **The app already has a database** — client-side IndexedDB (`paintfactor`, v11, via
   `idb`), holding projects, estimates, time entries, rate overlays, products, and
   authoring drafts. "No database" was never literally true.

So the real need is **queryability of the scenario content** during authoring — not a
server, and not a change to how the app deploys.

---

## 3. Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| What the DB is for | A **queryable data store** for the scenario content (editing/reporting/SQL) |
| Source-of-truth role | **Query layer built from JSON** — JSON stays authoritative; the `.db` is generated from it and disposable |
| Where queries run | **Locally, while authoring** — external SQLite tools, not in the app |
| Schema shape | **Approach B** — normalized entity + junction tables, each entity also keeping a `raw_json` column for lossless fidelity |
| Driver | **`better-sqlite3`** (with a zero-install `node:sqlite` alternative — see §6.3) |
| Data scope | The scenario bundle **plus** the rate/material data and product catalog |
| `.db` in git | **Gitignored** by default (regenerable binary), with the option to commit it |

---

## 4. Goals / Non-goals

**Goals**
- One command produces a SQLite file that faithfully mirrors what the scenario engine sees.
- The schema supports the realistic authoring questions: coverage gaps, orphan tasks,
  rate/material audits, "what fires for substrate × QT × method", scenario→module→task
  drill-down.
- The DB is regenerable from JSON at any time; it never drifts from the bundle because
  it shares the same loaders.

**Non-goals**
- No runtime/in-app querying (no `sql.js`/WASM in the app). *(Possible later — see §11.)*
- The DB is **not** a source of truth; nothing edits JSON *from* the DB.
- No change to the deployed app, the Vite build, or the Netlify/GitHub deploy.
- No server, no network backend, no Supabase.

---

## 5. Architecture & data flow

```
Claude/modules/MOD_*.json ─┐
Claude/scenarios/SCN_*.json ┤
Claude/tasks/TSK_*.json ─────┤   shared loaders        build-scenario-db.mjs
Claude/modifiers/FAC_*.json ─┼─►  (scenario-sources) ─►  • create schema
Claude/modifiers/TRADE_*.json┘   resolve extends,        • INSERT rows (txn)
                                 compute _derived        • write file
src/data/scenario-rate-data.js ──────────────────────►   │
src/data/product-catalog.js ─────────────────────────►   ▼
                                              Claude/database/scenario.db  (gitignored)
                                                          │
                                                          ▼
                                       DB Browser / sqlite3 CLI / Datasette / VS Code
```

The same loaders already feed `build-scenario-bundle.mjs`, so the DB and the runtime
bundle are guaranteed to see identical, extends-resolved, `_derived`-enriched data.

---

## 6. Components

### 6.1 Shared source loaders (small refactor)

`build-scenario-bundle.mjs` currently keeps its loaders private (`loadModules`,
`resolveExtends`, `loadScenarios`, `loadModifiers`, `loadTasks`, `computeTaskDerived`).
Extract them into a new module:

- **New:** `Claude/scripts/lib/scenario-sources.mjs` — exports those functions plus a
  convenience `loadAll()` returning `{ modules, scenarios, modifiers, tasks }` already
  extends-resolved and `_derived`-enriched.
- **Edit:** `build-scenario-bundle.mjs` imports from the shared lib instead of defining
  them inline. **Pure extraction — no logic change.**

*Rationale:* guarantees the DB is a faithful mirror (same resolution + derivation), and
avoids duplicating ~150 lines that would silently drift. This is the one place the design
touches existing working code; §10 gates it with a byte-identical bundle re-gen check.

*Lower-risk alternative:* duplicate the loaders inside `build-scenario-db.mjs` and skip
touching the bundle script. Rejected because drift would defeat "faithful mirror," but
available if we want to de-risk v1.

### 6.2 New build script — `Claude/scripts/build-scenario-db.mjs`

Run as `node Claude/scripts/build-scenario-db.mjs`. Steps:

1. `loadAll()` from the shared lib (modules, scenarios, modifiers, tasks).
2. `import` the rate/material datasets from `../tools/paintscope/src/data/scenario-rate-data.js`
   and the catalog from `product-catalog.js` (both are ES modules — direct import, no parsing).
3. Create a fresh DB (delete any existing file first — full rebuild, not incremental).
4. Create the schema (§7).
5. Insert everything inside a single transaction (fast; ~tens of thousands of rows).
6. Create indexes and a few convenience SQL **views** (§9).
7. Print a summary (row counts per table) and the output path.

### 6.3 SQLite driver

**Default: `better-sqlite3`** — synchronous, fast, the de-facto standard, with Windows
prebuilds. Added to `Claude/package.json` `devDependencies`; `npm install` in `Claude/`.

**Zero-install alternative: `node:sqlite`** — you're on **Node v23.5.0**, which ships a
built-in SQLite (`import { DatabaseSync } from 'node:sqlite'`). No dependency, no native
build; run with `node --experimental-sqlite Claude/scripts/build-scenario-db.mjs`. The
API is nearly identical to `better-sqlite3`. Trade-off: it's flagged *experimental* (a
warning prints, and the API could shift across Node versions).

> **Open for spec review:** stick with `better-sqlite3` (stable, what you approved) or
> switch to `node:sqlite` (zero install, given your Node version)? The script is written
> the same way either way; only the import + the open call differ.

### 6.4 Output location & git

- Output: **`Claude/database/scenario.db`** (reuses the existing `database/` dir).
- Add `Claude/database/scenario.db` to `.gitignore`. *(Note: the legacy `paintfactor.db`
  there is currently committed — precedent exists for committing a `.db` if you'd rather
  it travel with the repo. Default here is ignore, since it's regenerated from JSON.)*

### 6.5 npm wiring

Add to `Claude/package.json` scripts:
```json
"build:db": "node scripts/build-scenario-db.mjs"
```
(Mirrors how `build-scenario-bundle.mjs` is invoked today.)

---

## 7. Schema (Approach B)

Every entity table carries a `raw_json` column holding the complete source object, so the
schema never blocks a query even for fields not broken out into columns. Relationships
that matter for querying get real junction tables.

### 7.1 Core entity tables

**`modules`**
| column | notes |
|---|---|
| `module_id` TEXT PK | |
| `name`, `phase`, `intent`, `doctrine`, `application_method` | scalars (nullable) |
| `kind` | e.g. `template`; null for normal modules |
| `extends_from` | the `_extends` provenance (null if not an extender) |
| `elig_qt`, `elig_height`, `elig_texture`, `elig_complexity`, `elig_condition` | from `modifier_eligibility` (0/1) |
| `raw_json` | full object |

**`module_tasks`** (junction; ordered; allows inline entries)
`module_id` FK, `ordinal` INT, `task_ref` TEXT (nullable for inline tasks),
`is_inline` INT, `entry_json` (the full task entry incl. `applies_when`). PK `(module_id, ordinal)`.

**`scenarios`**
| column | notes |
|---|---|
| `scenario_id` TEXT PK | |
| `name`, `domain`, `context`, `output_state` | top-level scalars |
| `finish_coats`, `interstage_cycles` | from `coat_counts` |
| `raw_json` | full object |

**`scenario_modules`** (junction; ordered; **duplicates allowed** — captures repeated coats)
`scenario_id` FK, `ordinal` INT, `module_id` TEXT. PK `(scenario_id, ordinal)`.

**`scenario_matches`** (junction; the multi-value match dimensions)
`scenario_id` FK, `dimension` TEXT (`paintable_item` | `application_method` |
`substrate_state` | `quality_tier` | `coating_type` | …), `value` TEXT. One row per value.

**`scenario_protection_zones`** (junction)
`scenario_id` FK, `zone_id` TEXT, `level` TEXT.

**`scenario_material_systems`** (junction; ordered)
`scenario_id` FK, `ordinal` INT, `sys_id` TEXT (→ `material_systems.id`).

**`tasks`**
| column | notes |
|---|---|
| `task_id` TEXT PK | |
| `name`, `ps_key`, `uom`, `skill_level` | scalars |
| `rate_per_hour` REAL | |
| `module_count`, `scenario_count` INT | from `_derived` |
| `raw_json` | full object (incl. any task-specific fields) |

**`task_dimensions`** (junction; the `_derived` classifications)
`task_id` FK, `dimension` TEXT (`phase` | `method` | `substrate` | `qt` | `bucket` |
`coating`), `value` TEXT. One row per value.

**`modifiers`**
`modifier_id` TEXT PK, `family` TEXT (`FAC` | `TRADE` from prefix), `name`, `raw_json`.
*(Kept light — modifiers are queried less; `raw_json` carries the detail.)*

### 7.2 Reference tables (rate/material/catalog)

One table per exported dataset, uniform shape — a natural key, a couple of obvious scalar
columns, and `raw_json`. Exact columns finalized at implementation by inspecting each
export's shape.

| table | source export | natural key (likely) |
|---|---|---|
| `material_systems` | `MATERIAL_SYSTEMS` | `id` (+ `spec_family_id`, `name`) |
| `material_coverage_profiles` | `MATERIAL_COVERAGE_PROFILES` | per-row id |
| `material_system_products` | `MATERIAL_SYSTEM_PRODUCTS` | `(system_id, product_id)` — join table |
| `quality_tier_effects` | `QUALITY_TIER_EFFECTS` | per-row id |
| `spec_protection_zones` | `SPEC_PROTECTION_ZONES` | per-row id |
| `sop_task_protection` | `SOP_TASK_PROTECTION` | per-row id |
| `spec_family_info` | `SPEC_FAMILY_INFO` | `spec_family_id` |
| `catalog_products` | `CATALOG_PRODUCTS` | product id (+ `brand`, `product_type`) |
| `system_index` | `SYSTEM_INDEX` | key |

### 7.3 Indexes

On all FK columns used in joins: `module_tasks.task_ref`, `scenario_modules.module_id`,
`scenario_matches(dimension, value)`, `task_dimensions(dimension, value)`,
`scenario_material_systems.sys_id`, `material_system_products.system_id`.

---

## 8. Implementation phasing (for the plan)

- **Phase 1 — core scenario graph:** shared-loaders refactor + the script + the entity/
  junction tables for modules, scenarios, tasks, modifiers. Delivers coverage/orphan/
  drill-down queries (the most-wanted ones).
- **Phase 2 — reference tables:** add the 9 rate/material/catalog tables. Delivers rate
  and material audits.

(Both ship in this work; phasing just orders the implementation and lets Phase 1 be
verified before Phase 2 is added.)

---

## 9. Example queries (the payoff)

Ship these as comments in the script and/or as SQL `VIEW`s:

```sql
-- Orphan tasks: in the canonical library but referenced by no module
SELECT t.task_id, t.name
FROM tasks t
LEFT JOIN module_tasks mt ON mt.task_ref = t.task_id
WHERE mt.task_ref IS NULL;

-- Coverage: paintable_item × application_method combos that have at least one scenario
SELECT pi.value AS paintable_item, am.value AS method, COUNT(DISTINCT pi.scenario_id) AS n
FROM scenario_matches pi
JOIN scenario_matches am ON am.scenario_id = pi.scenario_id AND am.dimension = 'application_method'
WHERE pi.dimension = 'paintable_item'
GROUP BY pi.value, am.value
ORDER BY pi.value, am.value;

-- Rate audit: tasks ordered by rate, with the substrates they reach
SELECT t.task_id, t.name, t.uom, t.rate_per_hour,
       GROUP_CONCAT(DISTINCT d.value) AS substrates
FROM tasks t
LEFT JOIN task_dimensions d ON d.task_id = t.task_id AND d.dimension = 'substrate'
GROUP BY t.task_id
ORDER BY t.rate_per_hour DESC;

-- Drill-down: every task a given scenario fires, in module order
SELECT sm.ordinal, sm.module_id, mt.ordinal AS task_ordinal,
       COALESCE(mt.task_ref, '(inline)') AS task
FROM scenario_modules sm
JOIN module_tasks mt ON mt.module_id = sm.module_id
WHERE sm.scenario_id = 'SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE'
ORDER BY sm.ordinal, mt.ordinal;

-- Material systems referenced by scenarios but missing from the rate data (stubs/orphans)
SELECT DISTINCT s.sys_id
FROM scenario_material_systems s
LEFT JOIN material_systems m ON m.id = s.sys_id
WHERE m.id IS NULL;
```

---

## 10. Testing & verification

- **Bundle parity gate (protects the refactor):** after the shared-loaders extraction,
  re-run `build-scenario-bundle.mjs` and confirm `scenario-bundle.gen.js` is unchanged
  except its `Generated:` timestamp line. (Proves the extraction changed nothing.)
- **Row-count assertions:** script asserts non-zero counts and logs them; spot-check
  against source counts (719 modules / 484 scenarios / 1626 tasks / 27 modifiers).
- **Referential sanity queries:** the orphan-task and missing-material-system queries
  above should return *known* results, not errors.
- **Open in a tool:** confirm `scenario.db` opens in DB Browser / `sqlite3` and the views
  resolve.
- **App untouched:** `npx vite build` in `tools/paintscope` still succeeds (the refactor
  must not affect the runtime bundle the app imports).

---

## 11. Future extension (out of scope now)

If in-app querying is ever wanted, the **same schema and build script** are reused: ship
`scenario.db` as a static asset and load it in-browser with `sql.js` (WASM) behind a
query/report screen. Designing the schema now with that in mind costs nothing and keeps
the door open. Explicitly **not** built here.

---

## 12. File changes summary

| File | Change |
|---|---|
| `Claude/scripts/lib/scenario-sources.mjs` | **New** — shared JSON loaders + `loadAll()` |
| `Claude/scripts/build-scenario-bundle.mjs` | **Edit** — import loaders from shared lib (no logic change) |
| `Claude/scripts/build-scenario-db.mjs` | **New** — the DB build script |
| `Claude/package.json` | **Edit** — add `better-sqlite3` devDep (unless `node:sqlite`) + `build:db` script |
| `.gitignore` | **Edit** — ignore `Claude/database/scenario.db` |

---

## 13. Open questions for review

1. **Driver:** `better-sqlite3` (approved, stable) vs `node:sqlite` (zero-install on your
   Node 23.5, but experimental)?
2. **Commit the `.db`?** Default is gitignore; the legacy `paintfactor.db` is committed if
   you'd prefer parity with that.
3. **Reference tables now or later?** Plan ships both phases; confirm you want the rate/
   material/catalog tables in this work (vs. core scenario graph only for v1).
