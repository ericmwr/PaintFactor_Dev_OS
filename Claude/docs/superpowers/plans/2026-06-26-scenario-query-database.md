# Scenario Query Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a local, queryable SQLite mirror of the scenario engine's data (modules, scenarios, tasks, modifiers + rate/material/catalog reference data) from the existing JSON source of truth, as a disposable build artifact.

**Architecture:** A new Node build script (`build-scenario-db.mjs`) reuses the same JSON loaders that feed `scenario-bundle.gen.js` (extracted into a shared lib so the DB can never drift from the runtime bundle), then writes a normalized SQLite file with entity + junction tables plus a `raw_json` column on every entity for lossless fidelity. Nothing about the app, the Vite build, or the Netlify/GitHub deploy changes.

**Tech Stack:** Node v23.5.0, ES modules, `better-sqlite3` (with a documented `node:sqlite` fallback), `node:test` for tests.

**Spec:** `Claude/docs/superpowers/specs/2026-06-26-scenario-query-database-design.md`

## Global Constraints

- **Runtime:** Node v23.5.0, ES modules only (`.mjs`; the scripts package is `"type": "module"`).
- **Driver:** `better-sqlite3`. Use **positional `?` parameters only** (so a swap to `node:sqlite` is a one-line change). **Never bind `undefined`** — coalesce to `null`.
- **Driver fallback:** if `better-sqlite3` fails to install/native-build on Node 23.5, swap `Claude/scripts/lib/db-open.mjs` to the `node:sqlite` version (shown in Task 1) and run the build with `node --experimental-sqlite …`. No other code changes.
- **Tests:** Node's built-in runner — `node:test` + `node:assert/strict`, run with `node --test <path>`. Do **not** add vitest to the scripts package.
- **Source of truth is the JSON.** The `.db` is generated and **gitignored**; nothing writes JSON from the DB.
- **Do not change the runtime bundle output.** After the Task 2 refactor, `Claude/tools/paintscope/src/data/scenario-bundle.gen.js` must be byte-identical except its `// Generated:` timestamp line.
- **Paths are repo-relative to the worktree root**; run all commands from the worktree root unless a step says otherwise.
- **Every commit message ends with the trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (omitted from the command blocks below for brevity — always append it).

---

### Task 1: Build-tool scaffolding + SQLite driver

**Files:**
- Create: `Claude/scripts/package.json`
- Create: `Claude/scripts/lib/db-open.mjs`
- Create: `Claude/scripts/lib/db-open.test.mjs`
- Modify: `Claude/.gitignore`
- Modify: `Claude/scripts/.gitignore` (create)

**Interfaces:**
- Produces: `openDb(filename: string) => Database` — a SQLite handle exposing `.exec(sql)`, `.prepare(sql) => { run(...args), get(...args), all(...args) }`, `.close()`. Used by every later task.

- [ ] **Step 1: Create the scripts package manifest**

Create `Claude/scripts/package.json`:
```json
{
  "name": "paintfactor-scripts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "Build tooling for the PaintFactor scenario engine (bundle + query DB).",
  "scripts": {
    "build:db": "node build-scenario-db.mjs"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.0"
  }
}
```

- [ ] **Step 2: Ignore generated artifacts**

Append to `Claude/.gitignore` (currently contains only `docs/research/`):
```
# Generated SQLite query mirror (regenerate with: node Claude/scripts/build-scenario-db.mjs)
database/scenario.db
database/scenario.db-journal
database/scenario.db-wal
```

Create `Claude/scripts/.gitignore`:
```
node_modules/
```

- [ ] **Step 3: Install the driver**

Run: `npm install --prefix "Claude/scripts"`
Expected: completes without error; `Claude/scripts/node_modules/better-sqlite3` exists.

> **If this fails to build the native module on Node 23.5:** stop and switch to the fallback — delete the `dependencies` block from `Claude/scripts/package.json`, and in Step 5 implement `db-open.mjs` with the `node:sqlite` version (commented in that step). Then every `node` run command in this plan gains the `--experimental-sqlite` flag.

- [ ] **Step 4: Write the failing test**

Create `Claude/scripts/lib/db-open.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';

test('openDb returns a usable in-memory SQLite handle', () => {
  const db = openDb(':memory:');
  db.exec('CREATE TABLE t (id TEXT PRIMARY KEY, n INTEGER)');
  db.prepare('INSERT INTO t (id, n) VALUES (?, ?)').run('a', 1);
  const row = db.prepare('SELECT n FROM t WHERE id = ?').get('a');
  assert.equal(row.n, 1);
  db.close();
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/db-open.test.mjs`
Expected: FAIL — cannot find module `./db-open.mjs`.

- [ ] **Step 6: Implement the driver opener**

Create `Claude/scripts/lib/db-open.mjs`:
```js
// Single swap-point for the SQLite driver. Uses only the .exec/.prepare/.run/.get/.all
// surface that both better-sqlite3 and node:sqlite (DatabaseSync) share, so swapping
// drivers is a one-line change here.
import Database from 'better-sqlite3';

export function openDb(filename) {
  return new Database(filename);
}

// --- node:sqlite fallback (zero install; needs `node --experimental-sqlite`) ---
// import { DatabaseSync } from 'node:sqlite';
// export function openDb(filename) {
//   return new DatabaseSync(filename);
// }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node --test Claude/scripts/lib/db-open.test.mjs`
Expected: PASS — `tests 1`, `pass 1`.

- [ ] **Step 8: Commit**

```bash
git add Claude/scripts/package.json Claude/scripts/.gitignore Claude/.gitignore Claude/scripts/lib/db-open.mjs Claude/scripts/lib/db-open.test.mjs
git commit -m "feat(scenario-db): scripts package + SQLite driver opener"
```

---

### Task 2: Extract shared JSON loaders

**Files:**
- Create: `Claude/scripts/lib/scenario-sources.mjs`
- Create: `Claude/scripts/lib/scenario-sources.test.mjs`
- Modify: `Claude/scripts/build-scenario-bundle.mjs`

**Interfaces:**
- Consumes: the JSON sources under `Claude/modules`, `Claude/scenarios`, `Claude/modifiers`, `Claude/tasks`.
- Produces:
  - `loadModules() => Record<string, Module>` (raw, unresolved)
  - `resolveExtends(rawModules) => Record<string, Module>`
  - `loadScenarios() => Scenario[]`
  - `loadModifiers() => Record<string, Modifier>`
  - `loadTasks() => Record<string, Task>`
  - `computeTaskDerived(modules, scenarios, tasks) => void` (mutates each task, adding `_derived`)
  - `loadAll() => { modules, scenarios, modifiers, tasks }` (resolved + derived)
  - `TEMPLATE_KIND` (string constant)

- [ ] **Step 1: Create the shared loader module**

Create `Claude/scripts/lib/scenario-sources.mjs` by moving the loader/derive logic out of `build-scenario-bundle.mjs` **verbatim** (no logic change), with paths corrected for the deeper `lib/` location and a new `loadAll()` added:
```js
// Shared JSON loaders for the scenario engine. The single source of "how we read
// + resolve + derive the scenario data" — consumed by both build-scenario-bundle.mjs
// (runtime bundle) and build-scenario-db.mjs (query mirror), so they cannot drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // <root>/Claude/scripts/lib
const repoRoot = path.resolve(__dirname, '..', '..', '..');     // <root>
const modulesDir = path.join(repoRoot, 'Claude', 'modules');
const scenariosDir = path.join(repoRoot, 'Claude', 'scenarios');
const modifiersDir = path.join(repoRoot, 'Claude', 'modifiers');
const tasksDir = path.join(repoRoot, 'Claude', 'tasks');

export const TEMPLATE_KIND = 'template';
const EXTENDS_MAX_DEPTH = 5;

export function loadModules() {
  const modules = {};
  function walk(dir, isRoot) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isRoot && entry.name.startsWith('_')) walk(full, false);
        continue;
      }
      if (entry.isFile() && entry.name.startsWith('MOD_') && entry.name.endsWith('.json')) {
        const mod = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!mod.module_id) throw new Error(`Module ${entry.name} missing module_id`);
        if (modules[mod.module_id]) throw new Error(`Duplicate module_id ${mod.module_id} (${entry.name})`);
        modules[mod.module_id] = mod;
      }
    }
  }
  walk(modulesDir, true);
  return modules;
}

export function resolveExtends(rawModules) {
  const resolved = {};
  function resolveOne(mod, depth, seen) {
    if (depth > EXTENDS_MAX_DEPTH) {
      throw new Error(`extends chain exceeds depth ${EXTENDS_MAX_DEPTH} starting at ${mod.module_id}`);
    }
    if (!mod.extends) return structuredClone(mod);
    if (seen.has(mod.module_id)) {
      const chain = [...seen, mod.module_id].join(' -> ');
      throw new Error(`Cycle detected in extends chain: ${chain}`);
    }
    seen.add(mod.module_id);
    const parent = rawModules[mod.extends];
    if (!parent) throw new Error(`Module ${mod.module_id} extends ${mod.extends} which does not exist`);
    const resolvedParent = resolveOne(parent, depth + 1, seen);
    const merged = structuredClone(resolvedParent);
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'extends' || key === 'kind') continue;
      if (key === 'modifier_eligibility' && resolvedParent.modifier_eligibility) {
        merged[key] = { ...resolvedParent.modifier_eligibility, ...value };
      } else {
        merged[key] = structuredClone(value);
      }
    }
    delete merged.extends;
    delete merged.kind;
    merged._extends = mod.extends;
    return merged;
  }
  for (const mod of Object.values(rawModules)) {
    if (mod.kind === TEMPLATE_KIND) {
      resolved[mod.module_id] = structuredClone(mod);
    } else if (mod.extends) {
      resolved[mod.module_id] = resolveOne(mod, 0, new Set());
    } else {
      resolved[mod.module_id] = structuredClone(mod);
    }
  }
  return resolved;
}

export function loadScenarios() {
  const scenarios = [];
  const files = fs.readdirSync(scenariosDir).filter(f => f.startsWith('SCN_') && f.endsWith('.json'));
  for (const file of files) {
    const scn = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
    if (!scn.scenario_id) throw new Error(`Scenario ${file} missing scenario_id`);
    scenarios.push(scn);
  }
  return scenarios;
}

export function loadModifiers() {
  const modifiers = {};
  if (!fs.existsSync(modifiersDir)) return modifiers;
  const files = fs.readdirSync(modifiersDir).filter(f =>
    (f.startsWith('FAC_') || f.startsWith('TRADE_')) && f.endsWith('.json')
  );
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(modifiersDir, file), 'utf8'));
    if (!mod.modifier_id) throw new Error(`Modifier ${file} missing modifier_id`);
    if (modifiers[mod.modifier_id]) throw new Error(`Duplicate modifier_id ${mod.modifier_id} (${file})`);
    modifiers[mod.modifier_id] = mod;
  }
  return modifiers;
}

export function loadTasks() {
  const tasks = {};
  if (!fs.existsSync(tasksDir)) return tasks;
  const files = fs.readdirSync(tasksDir).filter(f => f.startsWith('TSK_') && f.endsWith('.json'));
  for (const file of files) {
    const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf8'));
    if (!task.task_id) throw new Error(`Task ${file} missing task_id`);
    if (tasks[task.task_id]) throw new Error(`Duplicate task_id ${task.task_id} (${file})`);
    tasks[task.task_id] = task;
  }
  return tasks;
}

function scenarioMethod(scn) {
  const v = scn.matches?.application_method;
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}
function scenarioBuckets(scn) {
  const out = new Set();
  const interior = scn.domain === 'interior' || scn.domain === 'both';
  const exterior = scn.domain === 'exterior' || scn.domain === 'both';
  const nc = scn.context === 'NC' || scn.context === 'mixed';
  const rp = scn.context === 'RP' || scn.context === 'mixed';
  if (interior && nc) out.add('nc_interior');
  if (exterior && nc) out.add('nc_exterior');
  if (interior && rp) out.add('rp_interior');
  if (exterior && rp) out.add('rp_exterior');
  return out;
}
function scenarioQTs(scn) {
  const out = new Set();
  const v = scn.matches?.quality_tier;
  if (!v) return out;
  if (Array.isArray(v)) { for (const x of v) if (x) out.add(x); } else { out.add(v); }
  return out;
}
function scenarioSubstrate(scn) {
  const v = scn.matches?.paintable_item;
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}
function scenarioCoating(scn) {
  const explicit = scn.matches?.coating_type;
  if (explicit) return Array.isArray(explicit) ? explicit[0] : explicit;
  const id = (scn.scenario_id || '').toUpperCase();
  if (/_STAIN(?:_|$)/.test(id)) return 'stain';
  if (/_SEALER(?:_|$)/.test(id)) return 'sealer';
  if (/_CLEAR(?:_|$)/.test(id)) return 'clear';
  if (/_PRIME(?:_|$)/.test(id) || /PRIME_FROM/.test(id)) return 'prime';
  if (/_PAINT(?:_|$)/.test(id) || /_FINISH(?:_|$)/.test(id) || /_NC_/.test(id) || /_RP_/.test(id)) return 'paint';
  return null;
}

export function computeTaskDerived(modules, scenarios, tasks) {
  const moduleMeta = new Map();
  const moduleByTask = new Map();
  for (const mod of Object.values(modules)) {
    if (mod.kind === TEMPLATE_KIND) continue;
    moduleMeta.set(mod.module_id, { phase: mod.phase || null });
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (!entry?.task_ref) continue;
      let cur = moduleByTask.get(entry.task_ref);
      if (!cur) { cur = new Set(); moduleByTask.set(entry.task_ref, cur); }
      cur.add(mod.module_id);
    }
  }
  const moduleClassification = new Map();
  for (const scn of scenarios) {
    const sb = scenarioBuckets(scn);
    const sQT = scenarioQTs(scn);
    const sub = scenarioSubstrate(scn);
    const coat = scenarioCoating(scn);
    const meth = scenarioMethod(scn);
    for (const mid of scn.modules || []) {
      if (typeof mid !== 'string') continue;
      let cls = moduleClassification.get(mid);
      if (!cls) {
        cls = { substrates: new Set(), qts: new Set(), buckets: new Set(), coatings: new Set(), methods: new Set(), scenario_ids: new Set() };
        moduleClassification.set(mid, cls);
      }
      if (sub) cls.substrates.add(sub);
      for (const q of sQT) cls.qts.add(q);
      for (const b of sb) cls.buckets.add(b);
      if (coat) cls.coatings.add(coat);
      if (meth) cls.methods.add(meth);
      cls.scenario_ids.add(scn.scenario_id);
    }
  }
  for (const task of Object.values(tasks)) {
    const usedBy = moduleByTask.get(task.task_id) || new Set();
    const phases = new Set(), methods = new Set(), substrates = new Set();
    const qts = new Set(), buckets = new Set(), coatings = new Set(), scenarioIds = new Set();
    for (const mid of usedBy) {
      const meta = moduleMeta.get(mid);
      if (meta?.phase) phases.add(meta.phase);
      const cls = moduleClassification.get(mid);
      if (cls) {
        for (const s of cls.substrates) substrates.add(s);
        for (const q of cls.qts) qts.add(q);
        for (const b of cls.buckets) buckets.add(b);
        for (const c of cls.coatings) coatings.add(c);
        for (const m of cls.methods) methods.add(m);
        for (const sid of cls.scenario_ids) scenarioIds.add(sid);
      }
    }
    task._derived = {
      phases: [...phases].sort(), methods: [...methods].sort(), substrates: [...substrates].sort(),
      qts: [...qts].sort(), buckets: [...buckets].sort(), coatings: [...coatings].sort(),
      module_count: usedBy.size, scenario_count: scenarioIds.size,
    };
  }
}

export function loadAll() {
  const modules = resolveExtends(loadModules());
  const scenarios = loadScenarios();
  const modifiers = loadModifiers();
  const tasks = loadTasks();
  computeTaskDerived(modules, scenarios, tasks);
  return { modules, scenarios, modifiers, tasks };
}
```

- [ ] **Step 2: Write the failing test**

Create `Claude/scripts/lib/scenario-sources.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './scenario-sources.mjs';

test('loadAll returns resolved, derived scenario data', () => {
  const { modules, scenarios, modifiers, tasks } = loadAll();
  // Lower-bound sanity (exact counts drift as content is authored).
  assert.ok(Object.keys(modules).length > 700, 'modules > 700');
  assert.ok(scenarios.length > 480, 'scenarios > 480');
  assert.ok(Object.keys(tasks).length > 1600, 'tasks > 1600');
  assert.equal(Object.keys(modifiers).length, 27, 'modifiers == 27 (25 FAC + 2 TRADE)');
  // Every task is enriched with _derived by loadAll().
  const sample = Object.values(tasks)[0];
  assert.ok(sample._derived, 'task has _derived');
  assert.ok(Array.isArray(sample._derived.phases), '_derived.phases is an array');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/scenario-sources.test.mjs`
Expected: FAIL — cannot find module `./scenario-sources.mjs` (only if Step 1 not saved) — otherwise it should pass once Step 1 is in place. If Step 1 is already saved, confirm PASS here and proceed.

- [ ] **Step 4: Capture a pre-refactor baseline bundle**

Run: `node Claude/scripts/build-scenario-bundle.mjs`
Run: `cp Claude/tools/paintscope/src/data/scenario-bundle.gen.js /tmp/bundle-baseline.js`
(This baseline reflects the current JSON through the **original inline loaders** — exactly what the refactor must reproduce. Comparing two regenerations isolates the refactor from any pre-existing staleness in the committed bundle.)

- [ ] **Step 5: Refactor `build-scenario-bundle.mjs` to import the shared loaders**

In `Claude/scripts/build-scenario-bundle.mjs`:
1. Add at the top of the imports:
```js
import { loadModules, resolveExtends, loadScenarios, loadModifiers, loadTasks, computeTaskDerived, TEMPLATE_KIND } from './lib/scenario-sources.mjs';
```
2. **Delete** the now-duplicated definitions from that file: the `modulesDir`/`scenariosDir`/`modifiersDir`/`tasksDir` constants, `const TEMPLATE_KIND = 'template';`, `const EXTENDS_MAX_DEPTH = 5;`, and the functions `loadModules`, `resolveExtends`, `loadScenarios`, `loadModifiers`, `loadTasks`, `computeTaskDerived`, `scenarioMethod`, `scenarioBuckets`, `scenarioQTs`, `scenarioSubstrate`, `scenarioCoating`.
3. **Keep** everything else local: `repoRoot`/`outDir`/`outFile`, and the validators `validate`, `validateTaskRefs`, `validateExtenderInvariants`, `validateNoTemplateScenarioRefs`, `warnInlineVsLibraryCollisions`, and `main()`. (`validateNoTemplateScenarioRefs` and `main()` use the imported `TEMPLATE_KIND`.)

- [ ] **Step 6: Regenerate and confirm the bundle is identical apart from its timestamp**

Run: `node Claude/scripts/build-scenario-bundle.mjs`
Run: `diff <(grep -v '^// Generated:' /tmp/bundle-baseline.js) <(grep -v '^// Generated:' Claude/tools/paintscope/src/data/scenario-bundle.gen.js)`
Expected: **no output** (the two regenerations are identical except the `// Generated:` line). Any diff means the extraction changed behavior — revert Step 5 and re-check.

- [ ] **Step 7: Restore the committed bundle (avoid a timestamp-only churn)**

Run: `git checkout -- Claude/tools/paintscope/src/data/scenario-bundle.gen.js`
Run: `rm -f /tmp/bundle-baseline.js`
(The bundle is regenerated by its own workflow; this task must not commit a timestamp-only change.)

- [ ] **Step 8: Run the loader test to verify it passes**

Run: `node --test Claude/scripts/lib/scenario-sources.test.mjs`
Expected: PASS — `tests 1`, `pass 1`.

- [ ] **Step 9: Commit**

```bash
git add Claude/scripts/lib/scenario-sources.mjs Claude/scripts/lib/scenario-sources.test.mjs Claude/scripts/build-scenario-bundle.mjs
git commit -m "refactor(scenario-db): extract shared JSON loaders into scenario-sources lib"
```

---

### Task 3: Database schema

**Files:**
- Create: `Claude/scripts/lib/scenario-db-schema.mjs`
- Create: `Claude/scripts/lib/scenario-db-schema.test.mjs`

**Interfaces:**
- Consumes: `openDb` from Task 1.
- Produces:
  - `SCHEMA_SQL: string` — all `CREATE TABLE/INDEX/VIEW` statements.
  - `createSchema(db) => void` — runs `SCHEMA_SQL`.

- [ ] **Step 1: Write the failing test**

Create `Claude/scripts/lib/scenario-db-schema.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';
import { createSchema } from './scenario-db-schema.mjs';

const EXPECTED_TABLES = [
  'modules', 'module_tasks', 'scenarios', 'scenario_modules', 'scenario_matches',
  'scenario_protection_zones', 'scenario_material_systems', 'tasks', 'task_dimensions',
  'modifiers', 'material_systems', 'material_coverage_profiles', 'material_system_products',
  'quality_tier_effects', 'spec_protection_zones', 'sop_task_protection',
  'spec_family_info', 'catalog_products', 'system_index',
];
const EXPECTED_VIEWS = ['v_orphan_tasks', 'v_scenario_coverage', 'v_missing_material_systems'];

test('createSchema builds every expected table and view', () => {
  const db = openDb(':memory:');
  createSchema(db);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of EXPECTED_TABLES) assert.ok(tables.includes(t), `missing table ${t}`);
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all().map(r => r.name);
  for (const v of EXPECTED_VIEWS) assert.ok(views.includes(v), `missing view ${v}`);
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/scenario-db-schema.test.mjs`
Expected: FAIL — cannot find module `./scenario-db-schema.mjs`.

- [ ] **Step 3: Implement the schema**

Create `Claude/scripts/lib/scenario-db-schema.mjs`:
```js
// Relational schema for the scenario query mirror (spec approach B):
// normalized entity + junction tables, each entity also keeping raw_json
// for lossless fidelity. Generated artifact — not enforced with foreign keys
// (referential gaps are queryable features, e.g. v_missing_material_systems).
export const SCHEMA_SQL = `
CREATE TABLE modules (
  module_id TEXT PRIMARY KEY,
  name TEXT, phase TEXT, intent TEXT, doctrine TEXT,
  application_method TEXT, kind TEXT, extends_from TEXT,
  elig_qt INTEGER, elig_height INTEGER, elig_texture INTEGER,
  elig_complexity INTEGER, elig_condition INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE module_tasks (
  module_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  task_ref TEXT,
  is_inline INTEGER NOT NULL,
  entry_json TEXT NOT NULL,
  PRIMARY KEY (module_id, ordinal)
);
CREATE TABLE scenarios (
  scenario_id TEXT PRIMARY KEY,
  name TEXT, domain TEXT, context TEXT, output_state TEXT,
  finish_coats INTEGER, interstage_cycles INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE scenario_modules (
  scenario_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  module_id TEXT NOT NULL,
  PRIMARY KEY (scenario_id, ordinal)
);
CREATE TABLE scenario_matches (
  scenario_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE scenario_protection_zones (
  scenario_id TEXT NOT NULL,
  zone_id TEXT,
  level TEXT
);
CREATE TABLE scenario_material_systems (
  scenario_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  sys_id TEXT NOT NULL,
  PRIMARY KEY (scenario_id, ordinal)
);
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  name TEXT, ps_key TEXT, uom TEXT, skill_level TEXT,
  rate_per_hour REAL,
  module_count INTEGER, scenario_count INTEGER,
  raw_json TEXT NOT NULL
);
CREATE TABLE task_dimensions (
  task_id TEXT NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE modifiers (
  modifier_id TEXT PRIMARY KEY,
  family TEXT, name TEXT, kind TEXT,
  raw_json TEXT NOT NULL
);
CREATE TABLE material_systems (
  id TEXT PRIMARY KEY, spec_family_id TEXT, name TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE material_coverage_profiles (
  id TEXT PRIMARY KEY, spec_family_id TEXT, material_system TEXT,
  product_role TEXT, coverage_sf_per_gallon REAL, raw_json TEXT NOT NULL
);
CREATE TABLE material_system_products (
  spec_family_id TEXT, system_id TEXT, product_role TEXT,
  product_type TEXT, coats_required INTEGER, raw_json TEXT NOT NULL
);
CREATE TABLE quality_tier_effects (
  spec_family_id TEXT, quality_tier TEXT, time_modifier REAL, raw_json TEXT NOT NULL
);
CREATE TABLE spec_protection_zones (
  spec_family_id TEXT, zone_id TEXT, protection_level TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE sop_task_protection (
  id TEXT PRIMARY KEY, spec_family_id TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE spec_family_info (
  id TEXT PRIMARY KEY, name TEXT, domain TEXT, raw_json TEXT NOT NULL
);
CREATE TABLE catalog_products (
  product_id TEXT PRIMARY KEY, brand TEXT, product_name TEXT,
  product_type TEXT, price_per_gallon REAL, coverage_sf_per_gallon REAL,
  raw_json TEXT NOT NULL
);
CREATE TABLE system_index (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL
);
CREATE INDEX idx_module_tasks_task_ref ON module_tasks(task_ref);
CREATE INDEX idx_scenario_modules_module ON scenario_modules(module_id);
CREATE INDEX idx_scenario_matches_dim_val ON scenario_matches(dimension, value);
CREATE INDEX idx_task_dimensions_dim_val ON task_dimensions(dimension, value);
CREATE INDEX idx_scn_matsys_sysid ON scenario_material_systems(sys_id);
CREATE INDEX idx_msp_system ON material_system_products(system_id);
CREATE VIEW v_orphan_tasks AS
  SELECT t.task_id, t.name
  FROM tasks t
  LEFT JOIN module_tasks mt ON mt.task_ref = t.task_id
  WHERE mt.task_ref IS NULL;
CREATE VIEW v_scenario_coverage AS
  SELECT pi.value AS paintable_item, am.value AS application_method,
         COUNT(DISTINCT pi.scenario_id) AS scenario_count
  FROM scenario_matches pi
  JOIN scenario_matches am ON am.scenario_id = pi.scenario_id AND am.dimension = 'application_method'
  WHERE pi.dimension = 'paintable_item'
  GROUP BY pi.value, am.value;
CREATE VIEW v_missing_material_systems AS
  SELECT DISTINCT s.sys_id
  FROM scenario_material_systems s
  LEFT JOIN material_systems m ON m.id = s.sys_id
  WHERE m.id IS NULL;
`;

export function createSchema(db) {
  db.exec(SCHEMA_SQL);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test Claude/scripts/lib/scenario-db-schema.test.mjs`
Expected: PASS — `tests 1`, `pass 1`.

- [ ] **Step 5: Commit**

```bash
git add Claude/scripts/lib/scenario-db-schema.mjs Claude/scripts/lib/scenario-db-schema.test.mjs
git commit -m "feat(scenario-db): relational schema (entities, junctions, views)"
```

---

### Task 4: Core entity inserts — modules, tasks, modifiers

**Files:**
- Create: `Claude/scripts/lib/scenario-db-insert.mjs`
- Create: `Claude/scripts/lib/scenario-db-insert.test.mjs`

**Interfaces:**
- Consumes: a DB handle with the Task 3 schema applied; data shapes from `loadAll()`.
- Produces (in `scenario-db-insert.mjs`):
  - `insertModules(db, modules)` — `modules` is `Record<id, Module>`; fills `modules` + `module_tasks`.
  - `insertTasks(db, tasks)` — `tasks` is `Record<id, Task>`; fills `tasks` + `task_dimensions`.
  - `insertModifiers(db, modifiers)` — `modifiers` is `Record<id, Modifier>`; fills `modifiers`.
  - Internal helpers `b(v)` (boolean→0/1/null) and `nv(v)` (undefined→null).

- [ ] **Step 1: Write the failing test**

Create `Claude/scripts/lib/scenario-db-insert.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from './db-open.mjs';
import { createSchema } from './scenario-db-schema.mjs';
import { insertModules, insertTasks, insertModifiers } from './scenario-db-insert.mjs';

function freshDb() { const db = openDb(':memory:'); createSchema(db); return db; }

test('insertModules fills modules + ordered module_tasks (inline + ref)', () => {
  const db = freshDb();
  insertModules(db, {
    MOD_X: {
      module_id: 'MOD_X', name: 'X', phase: 'prep', application_method: 'brush',
      modifier_eligibility: { qt: true, height: false },
      tasks: [{ task_ref: 'TSK_A' }, { task_id: 'TSK_INLINE', applies_when: { x: 1 } }],
    },
  });
  const mod = db.prepare('SELECT * FROM modules WHERE module_id = ?').get('MOD_X');
  assert.equal(mod.phase, 'prep');
  assert.equal(mod.elig_qt, 1);
  assert.equal(mod.elig_height, 0);
  const rows = db.prepare('SELECT ordinal, task_ref, is_inline FROM module_tasks WHERE module_id = ? ORDER BY ordinal').all('MOD_X');
  assert.deepEqual(rows, [
    { ordinal: 0, task_ref: 'TSK_A', is_inline: 0 },
    { ordinal: 1, task_ref: null, is_inline: 1 },
  ]);
  db.close();
});

test('insertTasks fills tasks + task_dimensions from _derived', () => {
  const db = freshDb();
  insertTasks(db, {
    TSK_A: {
      task_id: 'TSK_A', name: 'A', ps_key: 'PS_X', uom: 'LF', skill_level: 'experienced',
      rate_per_hour: 8,
      _derived: { phases: ['prep'], methods: ['brush'], substrates: ['arch_element'],
                  qts: ['QT3'], buckets: ['nc_interior'], coatings: ['paint'],
                  module_count: 2, scenario_count: 5 },
    },
  });
  const t = db.prepare('SELECT rate_per_hour, module_count FROM tasks WHERE task_id = ?').get('TSK_A');
  assert.equal(t.rate_per_hour, 8);
  assert.equal(t.module_count, 2);
  const subs = db.prepare("SELECT value FROM task_dimensions WHERE task_id=? AND dimension='substrate'").all('TSK_A');
  assert.deepEqual(subs.map(r => r.value), ['arch_element']);
  db.close();
});

test('insertModifiers derives family from id prefix', () => {
  const db = freshDb();
  insertModifiers(db, {
    FAC_ONE: { modifier_id: 'FAC_ONE', name: 'One', kind: 'dynamic' },
    TRADE_TWO: { modifier_id: 'TRADE_TWO', name: 'Two', kind: 'material' },
  });
  const fams = db.prepare('SELECT modifier_id, family FROM modifiers ORDER BY modifier_id').all();
  assert.deepEqual(fams, [
    { modifier_id: 'FAC_ONE', family: 'FAC' },
    { modifier_id: 'TRADE_TWO', family: 'TRADE' },
  ]);
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: FAIL — cannot find module `./scenario-db-insert.mjs`.

- [ ] **Step 3: Implement the core inserts**

Create `Claude/scripts/lib/scenario-db-insert.mjs`:
```js
// Insert helpers for the scenario query mirror. Positional ? params only (node:sqlite
// swap-compatible); undefined is coalesced to null (better-sqlite3 rejects undefined).
const nv = (v) => (v === undefined ? null : v);
const b = (v) => (v === undefined || v === null ? null : (v ? 1 : 0));
const j = (v) => JSON.stringify(v);

export function insertModules(db, modules) {
  const mod = db.prepare(`INSERT INTO modules
    (module_id, name, phase, intent, doctrine, application_method, kind, extends_from,
     elig_qt, elig_height, elig_texture, elig_complexity, elig_condition, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const mt = db.prepare(`INSERT INTO module_tasks
    (module_id, ordinal, task_ref, is_inline, entry_json) VALUES (?,?,?,?,?)`);
  for (const m of Object.values(modules)) {
    const e = m.modifier_eligibility || {};
    mod.run(m.module_id, nv(m.name), nv(m.phase), nv(m.intent), nv(m.doctrine),
      nv(m.application_method), nv(m.kind), nv(m._extends),
      b(e.qt), b(e.height), b(e.texture), b(e.complexity), b(e.condition), j(m));
    const tasks = Array.isArray(m.tasks) ? m.tasks : [];
    tasks.forEach((entry, i) =>
      mt.run(m.module_id, i, nv(entry.task_ref), entry.task_ref ? 0 : 1, j(entry)));
  }
}

export function insertTasks(db, tasks) {
  const t = db.prepare(`INSERT INTO tasks
    (task_id, name, ps_key, uom, skill_level, rate_per_hour, module_count, scenario_count, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const td = db.prepare(`INSERT INTO task_dimensions (task_id, dimension, value) VALUES (?,?,?)`);
  for (const task of Object.values(tasks)) {
    const d = task._derived || {};
    t.run(task.task_id, nv(task.name), nv(task.ps_key), nv(task.uom), nv(task.skill_level),
      nv(task.rate_per_hour), nv(d.module_count), nv(d.scenario_count), j(task));
    const dims = { phase: d.phases, method: d.methods, substrate: d.substrates,
                   qt: d.qts, bucket: d.buckets, coating: d.coatings };
    for (const [dim, arr] of Object.entries(dims))
      for (const v of (arr || [])) td.run(task.task_id, dim, v);
  }
}

export function insertModifiers(db, modifiers) {
  const m = db.prepare(`INSERT INTO modifiers (modifier_id, family, name, kind, raw_json)
    VALUES (?,?,?,?,?)`);
  for (const mo of Object.values(modifiers)) {
    const family = mo.modifier_id.startsWith('TRADE_') ? 'TRADE' : 'FAC';
    m.run(mo.modifier_id, family, nv(mo.name), nv(mo.kind), j(mo));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: PASS — `tests 3`, `pass 3`.

- [ ] **Step 5: Commit**

```bash
git add Claude/scripts/lib/scenario-db-insert.mjs Claude/scripts/lib/scenario-db-insert.test.mjs
git commit -m "feat(scenario-db): insert modules, tasks, modifiers"
```

---

### Task 5: Scenario inserts + junctions

**Files:**
- Modify: `Claude/scripts/lib/scenario-db-insert.mjs`
- Modify: `Claude/scripts/lib/scenario-db-insert.test.mjs`

**Interfaces:**
- Produces: `insertScenarios(db, scenarios)` — `scenarios` is `Scenario[]`; fills `scenarios`, `scenario_modules` (ordered, duplicates allowed), `scenario_matches` (multi-value expanded), `scenario_protection_zones`, `scenario_material_systems`.

- [ ] **Step 1: Add the failing test**

Append to `Claude/scripts/lib/scenario-db-insert.test.mjs`:
```js
import { insertScenarios } from './scenario-db-insert.mjs';

test('insertScenarios fills scenario + all four junctions, preserving order/duplication', () => {
  const db = freshDb();
  insertScenarios(db, [{
    scenario_id: 'SCN_X', name: 'X', domain: 'interior', context: 'NC', output_state: 'SS_PAINTED_SATIN',
    matches: { substrate_state: ['SS_BARE'], application_method: 'brush',
               paintable_item: 'arch_element', quality_tier: ['QT3', 'QT4'] },
    modules: ['MOD_A', 'MOD_FINISH', 'MOD_FINISH'],
    coat_counts: { finish_coats: 2, interstage_cycles: 0 },
    protection_zones: [{ zone_id: 'floor_workzone', level: 'full_cover' }],
    material_systems: ['SYS_P', 'SYS_F'],
  }]);
  const s = db.prepare('SELECT domain, finish_coats FROM scenarios WHERE scenario_id=?').get('SCN_X');
  assert.equal(s.domain, 'interior');
  assert.equal(s.finish_coats, 2);
  const mods = db.prepare('SELECT module_id FROM scenario_modules WHERE scenario_id=? ORDER BY ordinal').all('SCN_X');
  assert.deepEqual(mods.map(r => r.module_id), ['MOD_A', 'MOD_FINISH', 'MOD_FINISH']); // duplicate preserved
  const qts = db.prepare("SELECT value FROM scenario_matches WHERE scenario_id=? AND dimension='quality_tier' ORDER BY value").all('SCN_X');
  assert.deepEqual(qts.map(r => r.value), ['QT3', 'QT4']); // multi-value expanded
  const method = db.prepare("SELECT value FROM scenario_matches WHERE scenario_id=? AND dimension='application_method'").all('SCN_X');
  assert.deepEqual(method.map(r => r.value), ['brush']); // scalar match also stored
  const pz = db.prepare('SELECT zone_id, level FROM scenario_protection_zones WHERE scenario_id=?').get('SCN_X');
  assert.deepEqual(pz, { zone_id: 'floor_workzone', level: 'full_cover' });
  const ms = db.prepare('SELECT sys_id FROM scenario_material_systems WHERE scenario_id=? ORDER BY ordinal').all('SCN_X');
  assert.deepEqual(ms.map(r => r.sys_id), ['SYS_P', 'SYS_F']);
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: FAIL — `insertScenarios` is not exported.

- [ ] **Step 3: Implement `insertScenarios`**

Append to `Claude/scripts/lib/scenario-db-insert.mjs`:
```js
export function insertScenarios(db, scenarios) {
  const s = db.prepare(`INSERT INTO scenarios
    (scenario_id, name, domain, context, output_state, finish_coats, interstage_cycles, raw_json)
    VALUES (?,?,?,?,?,?,?,?)`);
  const sm = db.prepare(`INSERT INTO scenario_modules (scenario_id, ordinal, module_id) VALUES (?,?,?)`);
  const smatch = db.prepare(`INSERT INTO scenario_matches (scenario_id, dimension, value) VALUES (?,?,?)`);
  const spz = db.prepare(`INSERT INTO scenario_protection_zones (scenario_id, zone_id, level) VALUES (?,?,?)`);
  const sms = db.prepare(`INSERT INTO scenario_material_systems (scenario_id, ordinal, sys_id) VALUES (?,?,?)`);
  for (const scn of scenarios) {
    const cc = scn.coat_counts || {};
    s.run(scn.scenario_id, nv(scn.name), nv(scn.domain), nv(scn.context), nv(scn.output_state),
      nv(cc.finish_coats), nv(cc.interstage_cycles), j(scn));
    (scn.modules || []).forEach((mid, i) => sm.run(scn.scenario_id, i, mid));
    for (const [dim, val] of Object.entries(scn.matches || {})) {
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) if (v != null) smatch.run(scn.scenario_id, dim, String(v));
    }
    (scn.protection_zones || []).forEach((z) => spz.run(scn.scenario_id, nv(z.zone_id), nv(z.level)));
    (scn.material_systems || []).forEach((sys, i) => sms.run(scn.scenario_id, i, sys));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: PASS — `tests 4`, `pass 4`.

- [ ] **Step 5: Commit**

```bash
git add Claude/scripts/lib/scenario-db-insert.mjs Claude/scripts/lib/scenario-db-insert.test.mjs
git commit -m "feat(scenario-db): insert scenarios + module/match/protection/material junctions"
```

---

### Task 6: Reference-data inserts (rates, materials, catalog)

**Files:**
- Modify: `Claude/scripts/lib/scenario-db-insert.mjs`
- Modify: `Claude/scripts/lib/scenario-db-insert.test.mjs`

**Interfaces:**
- Produces: `insertReference(db, data)` where `data` has these arrays/objects (each may be missing → treated as empty): `MATERIAL_SYSTEMS`, `MATERIAL_COVERAGE_PROFILES`, `MATERIAL_SYSTEM_PRODUCTS`, `QUALITY_TIER_EFFECTS`, `SPEC_PROTECTION_ZONES`, `SOP_TASK_PROTECTION`, `SPEC_FAMILY_INFO`, `CATALOG_PRODUCTS`, `SYSTEM_INDEX`. Uses `INSERT OR REPLACE` for keyed tables (robust against any duplicate natural keys in reference data).

- [ ] **Step 1: Add the failing test**

Append to `Claude/scripts/lib/scenario-db-insert.test.mjs`:
```js
import { insertReference } from './scenario-db-insert.mjs';

test('insertReference fills rate/material/catalog tables', () => {
  const db = freshDb();
  insertReference(db, {
    MATERIAL_SYSTEMS: [{ id: 'SYS_P', spec_family_id: 'SF_ARCH', name: 'Primer', applies_when: {}, allowed_sheens: [] }],
    MATERIAL_COVERAGE_PROFILES: [{ id: 'CP1', spec_family_id: 'SF_ARCH', material_system: 'SYS_P', product_role: 'primer', surface_texture: 'smooth', coverage_sf_per_gallon: 350 }],
    MATERIAL_SYSTEM_PRODUCTS: [{ spec_family_id: 'SF_ARCH', system_id: 'SYS_P', product_role: 'primer', product_type: 'oil', coats_required: 1 }],
    QUALITY_TIER_EFFECTS: [{ spec_family_id: 'SF_ARCH', quality_tier: 'QT3', time_modifier: 1.0 }],
    SPEC_PROTECTION_ZONES: [{ spec_family_id: 'SF_ARCH', zone_id: 'floor', protection_level: 'full_cover' }],
    SOP_TASK_PROTECTION: [{ id: 'SOP1', spec_family_id: 'SF_ARCH', protection_metadata: { a: 1 } }],
    SPEC_FAMILY_INFO: [{ id: 'SF_ARCH', name: 'Arch', domain: 'interior' }],
    CATALOG_PRODUCTS: [{ product_id: 'P1', brand: 'SW', product_name: 'ProClassic', product_type: 'finish', price_per_gallon: 60, coverage_sf_per_gallon: 400 }],
    SYSTEM_INDEX: { SYS_P: ['P1'] },
  });
  assert.equal(db.prepare('SELECT name FROM material_systems WHERE id=?').get('SYS_P').name, 'Primer');
  assert.equal(db.prepare('SELECT coverage_sf_per_gallon FROM material_coverage_profiles WHERE id=?').get('CP1').coverage_sf_per_gallon, 350);
  assert.equal(db.prepare('SELECT system_id FROM material_system_products').get().system_id, 'SYS_P');
  assert.equal(db.prepare('SELECT time_modifier FROM quality_tier_effects').get().time_modifier, 1.0);
  assert.equal(db.prepare('SELECT protection_level FROM spec_protection_zones').get().protection_level, 'full_cover');
  assert.equal(db.prepare('SELECT spec_family_id FROM sop_task_protection WHERE id=?').get('SOP1').spec_family_id, 'SF_ARCH');
  assert.equal(db.prepare('SELECT domain FROM spec_family_info WHERE id=?').get('SF_ARCH').domain, 'interior');
  assert.equal(db.prepare('SELECT brand FROM catalog_products WHERE product_id=?').get('P1').brand, 'SW');
  assert.equal(db.prepare('SELECT value_json FROM system_index WHERE key=?').get('SYS_P').value_json, JSON.stringify(['P1']));
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: FAIL — `insertReference` is not exported.

- [ ] **Step 3: Implement `insertReference`**

Append to `Claude/scripts/lib/scenario-db-insert.mjs`:
```js
export function insertReference(db, data) {
  const arr = (x) => (Array.isArray(x) ? x : []);

  const matSys = db.prepare(`INSERT OR REPLACE INTO material_systems (id, spec_family_id, name, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.MATERIAL_SYSTEMS)) matSys.run(r.id, nv(r.spec_family_id), nv(r.name), j(r));

  const cov = db.prepare(`INSERT OR REPLACE INTO material_coverage_profiles
    (id, spec_family_id, material_system, product_role, coverage_sf_per_gallon, raw_json) VALUES (?,?,?,?,?,?)`);
  for (const r of arr(data.MATERIAL_COVERAGE_PROFILES))
    cov.run(r.id, nv(r.spec_family_id), nv(r.material_system), nv(r.product_role), nv(r.coverage_sf_per_gallon), j(r));

  const msp = db.prepare(`INSERT INTO material_system_products
    (spec_family_id, system_id, product_role, product_type, coats_required, raw_json) VALUES (?,?,?,?,?,?)`);
  for (const r of arr(data.MATERIAL_SYSTEM_PRODUCTS))
    msp.run(nv(r.spec_family_id), nv(r.system_id), nv(r.product_role), nv(r.product_type), nv(r.coats_required), j(r));

  const qte = db.prepare(`INSERT INTO quality_tier_effects (spec_family_id, quality_tier, time_modifier, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.QUALITY_TIER_EFFECTS)) qte.run(nv(r.spec_family_id), nv(r.quality_tier), nv(r.time_modifier), j(r));

  const spz = db.prepare(`INSERT INTO spec_protection_zones (spec_family_id, zone_id, protection_level, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.SPEC_PROTECTION_ZONES)) spz.run(nv(r.spec_family_id), nv(r.zone_id), nv(r.protection_level), j(r));

  const sop = db.prepare(`INSERT OR REPLACE INTO sop_task_protection (id, spec_family_id, raw_json) VALUES (?,?,?)`);
  for (const r of arr(data.SOP_TASK_PROTECTION)) sop.run(r.id, nv(r.spec_family_id), j(r));

  const sfi = db.prepare(`INSERT OR REPLACE INTO spec_family_info (id, name, domain, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.SPEC_FAMILY_INFO)) sfi.run(r.id, nv(r.name), nv(r.domain), j(r));

  const cp = db.prepare(`INSERT OR REPLACE INTO catalog_products
    (product_id, brand, product_name, product_type, price_per_gallon, coverage_sf_per_gallon, raw_json) VALUES (?,?,?,?,?,?,?)`);
  for (const r of arr(data.CATALOG_PRODUCTS))
    cp.run(r.product_id, nv(r.brand), nv(r.product_name), nv(r.product_type), nv(r.price_per_gallon), nv(r.coverage_sf_per_gallon), j(r));

  const si = db.prepare(`INSERT OR REPLACE INTO system_index (key, value_json) VALUES (?,?)`);
  const sidx = data.SYSTEM_INDEX && typeof data.SYSTEM_INDEX === 'object' ? data.SYSTEM_INDEX : {};
  for (const [key, value] of Object.entries(sidx)) si.run(key, j(value));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test Claude/scripts/lib/scenario-db-insert.test.mjs`
Expected: PASS — `tests 5`, `pass 5`.

- [ ] **Step 5: Commit**

```bash
git add Claude/scripts/lib/scenario-db-insert.mjs Claude/scripts/lib/scenario-db-insert.test.mjs
git commit -m "feat(scenario-db): insert rate/material/catalog reference tables"
```

---

### Task 7: Orchestrator + end-to-end smoke + docs

**Files:**
- Create: `Claude/scripts/build-scenario-db.mjs`
- Create: `Claude/scripts/scenario-db-smoke.test.mjs`
- Create: `Claude/scripts/README-scenario-db.md`

**Interfaces:**
- Consumes: `loadAll` (Task 2), `openDb` (Task 1), `createSchema` (Task 3), `insertModules/insertTasks/insertModifiers/insertScenarios/insertReference` (Tasks 4–6), and the two app data modules `scenario-rate-data.js` + `product-catalog.js`.
- Produces: `Claude/database/scenario.db` (gitignored) + console row-count summary. Default export `buildDb({ outFile?, quiet? }) => { db, counts }` for the smoke test.

- [ ] **Step 1: Write the failing end-to-end smoke**

Create `Claude/scripts/scenario-db-smoke.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDb } from './build-scenario-db.mjs';

test('buildDb produces a populated in-memory mirror with working views', () => {
  const { db, counts } = buildDb({ outFile: ':memory:', quiet: true });
  // Real-data lower bounds (counts grow as content is authored).
  assert.ok(counts.modules > 700, `modules ${counts.modules}`);
  assert.ok(counts.scenarios > 480, `scenarios ${counts.scenarios}`);
  assert.ok(counts.tasks > 1600, `tasks ${counts.tasks}`);
  assert.equal(counts.modifiers, 27);
  assert.ok(counts.material_systems > 200, `material_systems ${counts.material_systems}`);
  assert.ok(counts.catalog_products > 300, `catalog_products ${counts.catalog_products}`);
  // Junctions populated.
  assert.ok(db.prepare('SELECT COUNT(*) c FROM scenario_modules').get().c > 1000);
  assert.ok(db.prepare('SELECT COUNT(*) c FROM task_dimensions').get().c > 1000);
  // Views are queryable.
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_orphan_tasks LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_scenario_coverage LIMIT 1').all());
  assert.doesNotThrow(() => db.prepare('SELECT * FROM v_missing_material_systems LIMIT 1').all());
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test Claude/scripts/scenario-db-smoke.test.mjs`
Expected: FAIL — cannot find module `./build-scenario-db.mjs`.

- [ ] **Step 3: Implement the orchestrator**

Create `Claude/scripts/build-scenario-db.mjs`:
```js
#!/usr/bin/env node
// Build the local SQLite query mirror of the scenario engine from the JSON
// source of truth. Disposable artifact — regenerate anytime. See README-scenario-db.md.
//
//   node Claude/scripts/build-scenario-db.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll } from './lib/scenario-sources.mjs';
import { openDb } from './lib/db-open.mjs';
import { createSchema } from './lib/scenario-db-schema.mjs';
import {
  insertModules, insertTasks, insertModifiers, insertScenarios, insertReference,
} from './lib/scenario-db-insert.mjs';
import * as rate from '../tools/paintscope/src/data/scenario-rate-data.js';
import { CATALOG_PRODUCTS, SYSTEM_INDEX } from '../tools/paintscope/src/data/product-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));   // <root>/Claude/scripts
const repoRoot = path.resolve(__dirname, '..', '..');            // <root>
const DEFAULT_OUT = path.join(repoRoot, 'Claude', 'database', 'scenario.db');

const COUNT_TABLES = [
  'modules', 'module_tasks', 'scenarios', 'scenario_modules', 'scenario_matches',
  'scenario_protection_zones', 'scenario_material_systems', 'tasks', 'task_dimensions',
  'modifiers', 'material_systems', 'material_coverage_profiles', 'material_system_products',
  'quality_tier_effects', 'spec_protection_zones', 'sop_task_protection',
  'spec_family_info', 'catalog_products', 'system_index',
];

export function buildDb({ outFile = DEFAULT_OUT, quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);

  const { modules, scenarios, modifiers, tasks } = loadAll();
  log(`Loaded ${Object.keys(modules).length} modules, ${scenarios.length} scenarios, ` +
      `${Object.keys(tasks).length} tasks, ${Object.keys(modifiers).length} modifiers.`);

  if (outFile !== ':memory:') {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.rmSync(outFile, { force: true });
  }
  const db = openDb(outFile);
  createSchema(db);
  db.exec('BEGIN');
  insertModules(db, modules);
  insertTasks(db, tasks);
  insertModifiers(db, modifiers);
  insertScenarios(db, scenarios);
  insertReference(db, {
    MATERIAL_SYSTEMS: rate.MATERIAL_SYSTEMS,
    MATERIAL_COVERAGE_PROFILES: rate.MATERIAL_COVERAGE_PROFILES,
    MATERIAL_SYSTEM_PRODUCTS: rate.MATERIAL_SYSTEM_PRODUCTS,
    QUALITY_TIER_EFFECTS: rate.QUALITY_TIER_EFFECTS,
    SPEC_PROTECTION_ZONES: rate.SPEC_PROTECTION_ZONES,
    SOP_TASK_PROTECTION: rate.SOP_TASK_PROTECTION,
    SPEC_FAMILY_INFO: rate.SPEC_FAMILY_INFO,
    CATALOG_PRODUCTS,
    SYSTEM_INDEX,
  });
  db.exec('COMMIT');

  const counts = {};
  for (const t of COUNT_TABLES) counts[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
  log('Row counts:');
  for (const t of COUNT_TABLES) log(`  ${t.padEnd(28)} ${counts[t]}`);
  if (outFile !== ':memory:') log(`\nWrote ${outFile}`);
  return { db, counts };
}

// Run as a script (not when imported by the smoke test).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-scenario-db.mjs')) {
  const { db } = buildDb();
  db.close();
}
```

- [ ] **Step 4: Run the smoke to verify it passes**

Run: `node --test Claude/scripts/scenario-db-smoke.test.mjs`
Expected: PASS — `tests 1`, `pass 1`.

- [ ] **Step 5: Generate the real database and eyeball it**

Run: `node Claude/scripts/build-scenario-db.mjs`
Expected: prints the load line, a row-count table (modules ~719, scenarios ~484, tasks ~1626, modifiers 27, material_systems ~214, catalog_products ~353), and `Wrote …/Claude/database/scenario.db`.

Then verify it opens and the views work (requires the `sqlite3` CLI; skip if unavailable):
Run: `sqlite3 "Claude/database/scenario.db" "SELECT COUNT(*) FROM v_orphan_tasks; SELECT * FROM v_scenario_coverage LIMIT 5;"`
Expected: a number, then up to 5 `paintable_item|application_method|scenario_count` rows.

- [ ] **Step 6: Confirm the .db is gitignored**

Run: `git status --porcelain "Claude/database/scenario.db"`
Expected: **no output** (the file is ignored, per Task 1). If it shows up, fix the `Claude/.gitignore` entry before committing.

- [ ] **Step 7: Write the usage README**

Create `Claude/scripts/README-scenario-db.md`:
```markdown
# Scenario Query Database

A local, queryable SQLite mirror of the scenario engine's data, generated from the
JSON source of truth (`Claude/modules`, `Claude/scenarios`, `Claude/tasks`,
`Claude/modifiers`) plus the rate/material data and product catalog.

It is a **disposable, gitignored build artifact** — the JSON stays the source of truth.
It does **not** ship to Netlify and does not affect the app or its deploy.

## Build / rebuild

```bash
npm install --prefix Claude/scripts        # one-time (installs better-sqlite3)
node Claude/scripts/build-scenario-db.mjs  # writes Claude/database/scenario.db
```

> Driver fallback: if `better-sqlite3` won't install on your Node, switch
> `Claude/scripts/lib/db-open.mjs` to the `node:sqlite` version (commented in that file)
> and run `node --experimental-sqlite Claude/scripts/build-scenario-db.mjs`.

## Query

Open `Claude/database/scenario.db` in DB Browser for SQLite, the `sqlite3` CLI, Datasette,
or a VS Code SQLite extension. Built-in views: `v_orphan_tasks`, `v_scenario_coverage`,
`v_missing_material_systems`. Every entity table also has a `raw_json` column with the
full source object (query nested fields via SQLite `json_extract`).

## Tests

```bash
node --test Claude/scripts/lib/        # unit tests (schema + inserts + loaders)
node --test Claude/scripts/scenario-db-smoke.test.mjs   # end-to-end against real data
```
```

- [ ] **Step 8: Run the full script test suite once**

Run: `node --test Claude/scripts/lib/ Claude/scripts/scenario-db-smoke.test.mjs`
Expected: all suites PASS (db-open, scenario-sources, scenario-db-schema, scenario-db-insert ×5, smoke).

- [ ] **Step 9: Commit**

```bash
git add Claude/scripts/build-scenario-db.mjs Claude/scripts/scenario-db-smoke.test.mjs Claude/scripts/README-scenario-db.md
git commit -m "feat(scenario-db): build orchestrator, end-to-end smoke, usage docs"
```

---

## Self-Review

**1. Spec coverage**

| Spec element | Task |
|---|---|
| Query layer built from JSON (JSON stays truth) | 2 (shared loaders), 7 (orchestrator reads JSON) |
| Disposable `.db`, regenerable | 7 (deletes + rewrites each run) |
| Local querying only; deploy untouched | No app/Vite/Netlify files touched; only `Claude/scripts/**` + ignores |
| Shared loaders → faithful mirror | 2 (extraction + byte-identical bundle gate) |
| Approach B schema (entities + junctions + raw_json) | 3 |
| Core data: modules/scenarios/tasks/modifiers | 4, 5 |
| Reference data: 7 rate datasets + catalog + system index | 6 |
| Driver better-sqlite3 + node:sqlite fallback | 1 |
| Gitignore the `.db` | 1 |
| Example queries / views | 3 (views), 7 (README + smoke exercises them) |
| Verification: byte-identical bundle, row counts, open-in-tool | 2, 5, 7 |
| Phasing: core graph then reference tables | Tasks 4–5 then 6 |

No gaps.

**2. Placeholder scan:** No "TBD"/"TODO"/"handle edge cases"/"similar to Task N". Every code step shows complete code; every run step shows the command + expected result.

**3. Type consistency:** `openDb`, `createSchema`, `SCHEMA_SQL`, `insertModules/insertTasks/insertModifiers/insertScenarios/insertReference`, `loadAll`, `buildDb({outFile,quiet})→{db,counts}` are defined once and consumed with matching names/signatures. Column names in `SCHEMA_SQL` (Task 3) match every `INSERT` column list (Tasks 4–6) and every test assertion. Junction ordinal/duplicate semantics in the schema match the insert loops and the Task 5 test.
