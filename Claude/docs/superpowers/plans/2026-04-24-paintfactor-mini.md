# PaintFactor Mini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, mobile-first static HTML pricing calculator for NC interior trim (baseboard, door casing, door frame, door slabs), seeded from the PaintFactor task/module repository.

**Architecture:** Vanilla ES-module JavaScript, zero-build static site. Four-tab mobile UI (Job / Tasks / Mats / Setup) with sticky live total. Pure-function pricing engine. Seed extracted from `Claude/tasks/*.json`, `Claude/modules/*.json`, `Claude/scenarios/*.json` via a one-time Node script. State persisted in `localStorage`.

**Tech Stack:** HTML5 + CSS3 + vanilla JS (ES modules), `node --test` (built-in, no deps) for unit tests on pricing/state/derivations, Node fs for the one-time seed extraction. No frameworks, no bundlers.

---

## File Structure

**New project folder:** `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\`

**Reference (read-only, in existing worktree):**
- `Claude/tasks/TSK_*.json` — source task definitions (task_id, name, rate_per_hour, coat_2_rate_multiplier, uom)
- `Claude/modules/MOD_*.json` — source modules (phase, method, tasks[])
- `Claude/scenarios/SCN_*.json` — source scenarios (substrate, state, method, modules[], coat_counts)

**Files to create:**
```
PaintFactorMini/
├── .gitignore
├── package.json                         (type: module, scripts)
├── README.md                            (deploy + usage)
├── index.html                           (mobile viewport, tab containers)
├── style.css                            (mobile-first, print CSS)
├── app.js                               (entry: wires modules → DOM)
├── seed.json                            (task + material catalog seed, generated)
├── build-seed.js                        (one-time extractor, Node)
├── build-seed.log                       (output of last extraction)
├── src/
│   ├── state.js                         (load/save, defaults, migration)
│   ├── pricing.js                       (pure: state + seed → totals)
│   ├── derivations.js                   (effective qty, filtered tasks, material qty)
│   ├── formatters.js                    (currency, hours, percent)
│   ├── constants.js                     (category → coats_for_category map)
│   └── ui/
│       ├── router.js                    (tab switching)
│       ├── header.js                    (sticky total bar)
│       ├── tab-job.js                   (substrate cards)
│       ├── tab-tasks.js                 (filtered task list, toggle, rate edit)
│       ├── tab-mats.js                  (picks + catalog editor)
│       ├── tab-setup.js                 (settings, export/import, generate quote)
│       └── quote-overlay.js             (printable quote)
└── tests/
    ├── state.test.js
    ├── pricing.test.js
    └── derivations.test.js
```

**Design principle:** One file, one responsibility. UI modules render into their container element and receive state via imported getters/setters.

---

## Task 1: Scaffold project folder + git init

**Files:**
- Create: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\.gitignore`
- Create: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\package.json`
- Create: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\README.md`

- [ ] **Step 1: Create project folder**

Run:
```bash
mkdir -p "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git init
```

- [ ] **Step 2: Write `.gitignore`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\.gitignore`
```
node_modules/
.DS_Store
*.log
!build-seed.log
.vscode/
.idea/
```

- [ ] **Step 3: Write `package.json`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\package.json`
```json
{
  "name": "paintfactor-mini",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Mobile-first NC interior trim pricing calculator",
  "scripts": {
    "test": "node --test tests/",
    "seed": "node build-seed.js",
    "serve": "python3 -m http.server 5173"
  }
}
```

- [ ] **Step 4: Write `README.md` stub**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\README.md`
```markdown
# PaintFactor Mini

Mobile-first pricing calculator for NC interior trim: baseboard, door casing, door frame, door slabs.

Static HTML + vanilla JS. No build step. Open `index.html` directly or host on any static host.

## Usage

1. `npm run seed` — one-time, regenerates `seed.json` from PaintFactor source files.
2. Open `index.html` in a browser (mobile viewport recommended).
3. Configure settings, enter substrate quantities, review tasks, pick materials, generate quote.

## Development

- `npm test` — run unit tests for pricing/state/derivations.
- `npm run serve` — local static server on http://localhost:5173.

Data persists in browser `localStorage`. Use Setup → Export to back up.
```

- [ ] **Step 5: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add .gitignore package.json README.md
git commit -m "feat: scaffold PaintFactorMini project"
```

---

## Task 2: Write seed extraction script

**Files:**
- Create: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\build-seed.js`

This script walks the PaintFactor repo (sibling path), resolves scenarios → modules → tasks, and writes a flat `seed.json`.

- [ ] **Step 1: Write `build-seed.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\build-seed.js`
```javascript
// One-time extractor. Reads PaintFactor task/module/scenario JSON and writes seed.json.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const PAINTFACTOR_ROOT = 'C:/Eric_AI_Playground/Claude Code Uni/Claude/.claude/worktrees/cranky-saha/Claude';
const TASKS_DIR = join(PAINTFACTOR_ROOT, 'tasks');
const MODULES_DIR = join(PAINTFACTOR_ROOT, 'modules');
const SCENARIOS_DIR = join(PAINTFACTOR_ROOT, 'scenarios');

const SUBSTRATES = ['baseboard', 'door_casing', 'door_frame', 'door_slab'];
const LOG = [];
const log = (msg) => { console.log(msg); LOG.push(msg); };

// Load all JSON files from a directory into a map keyed by id field.
function loadJsonDir(dir, idField) {
  const map = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const full = join(dir, file);
    try {
      const obj = JSON.parse(readFileSync(full, 'utf8'));
      if (obj[idField]) map.set(obj[idField], obj);
    } catch (e) {
      log(`WARN: skip ${file}: ${e.message}`);
    }
  }
  return map;
}

log(`Loading tasks from ${TASKS_DIR}`);
const tasks = loadJsonDir(TASKS_DIR, 'task_id');
log(`  ${tasks.size} tasks loaded`);

log(`Loading modules from ${MODULES_DIR}`);
const modules = loadJsonDir(MODULES_DIR, 'module_id');
log(`  ${modules.size} modules loaded`);

log(`Loading scenarios from ${SCENARIOS_DIR}`);
const scenarios = loadJsonDir(SCENARIOS_DIR, 'scenario_id');
log(`  ${scenarios.size} scenarios loaded`);

// Derive finish system from scenario id.
function finishSystemFromScenarioId(id) {
  if (id.includes('_PAINT_')) return 'paint-family';
  if (id.includes('_PRIME_FROM_BARE_')) return 'prime';
  if (id.includes('_STAIN_')) return 'stain-family';
  return 'unknown';
}

// Extract state code (SS_BARE vs SS_PRIMED*) into our two-state model.
function stateFromScenario(scn) {
  const states = scn.matches?.substrate_state ?? [];
  const hasBare = states.some(s => s === 'SS_BARE' || s === 'SS_BARE_WOOD');
  const hasPrimed = states.some(s => s.startsWith('SS_PRIMED'));
  const out = [];
  if (hasBare) out.push('bare_wood');
  if (hasPrimed) out.push('factory_primer');
  return out;
}

// Resolve a module's tasks to task objects.
function resolveModule(mod) {
  const taskRefs = (mod.tasks ?? []).map(t => t.task_ref).filter(Boolean);
  return taskRefs.map(ref => {
    const task = tasks.get(ref);
    if (!task) { log(`WARN: module ${mod.module_id} references missing task ${ref}`); return null; }
    return { ...task, phase: mod.phase ?? 'unknown', module_id: mod.module_id };
  }).filter(Boolean);
}

// Build per-substrate flat task list. Only scenarios at QT3 (baseline).
const outputTasks = [];
const seenTaskKeys = new Set();

for (const scn of scenarios.values()) {
  const substrate = scn.matches?.paintable_item;
  if (!SUBSTRATES.includes(substrate)) continue;
  if (scn.matches?.quality_tier && scn.matches.quality_tier !== 'QT3') continue;

  const method = scn.matches?.application_method ?? 'any';
  const states = stateFromScenario(scn);
  const finishFamily = finishSystemFromScenarioId(scn.scenario_id);
  const coatCount = scn.coat_counts?.finish_coats ?? 1;

  // Map finish-family to our four finish systems. "paint-family" applies to paint AND prime_and_paint
  // (it is the finish-coat half). "prime" is the prime-pass half of prime_and_paint.
  // "stain-family" — we split later based on module content (clear-coat modules → stain_and_clear).
  const finishSystems = new Set();
  if (finishFamily === 'paint-family') { finishSystems.add('paint'); finishSystems.add('prime_and_paint'); }
  else if (finishFamily === 'prime') { finishSystems.add('prime_and_paint'); }
  else if (finishFamily === 'stain-family') { finishSystems.add('stain'); finishSystems.add('stain_and_clear'); }

  for (const moduleId of scn.modules ?? []) {
    const mod = modules.get(moduleId);
    if (!mod) { log(`WARN: scenario ${scn.scenario_id} references missing module ${moduleId}`); continue; }
    const moduleTasks = resolveModule(mod);
    for (const t of moduleTasks) {
      // Dedupe: same task + same finish system + same method = one entry.
      // Later finish_system_filter union lets us match broad cases.
      const key = `${t.task_id}|${method}|${[...finishSystems].sort().join(',')}`;
      if (seenTaskKeys.has(key)) continue;
      seenTaskKeys.add(key);

      outputTasks.push({
        task_id: t.task_id,
        name: t.name,
        substrate,
        phase: t.phase,
        method,
        finish_system_filter: [...finishSystems],
        state_filter: states.length ? states : null,
        rate_per_hour: t.rate_per_hour ?? 0,
        uom: t.uom ?? null,
        coat_count: t.phase === 'apply' ? coatCount : 1,
        coat_2_rate_multiplier: t.coat_2_rate_multiplier ?? 1.0,
        source_scenario: scn.scenario_id,
        source_module: t.module_id
      });
    }
  }
}

log(`Extracted ${outputTasks.length} task entries across ${SUBSTRATES.length} substrates`);

// Hand-curated starter material catalog. Real products with real prices.
// Spread rate in SF per unit (gallon unless noted).
const materials = [
  // Primers
  { sku: 'SW-PROBLOCK-GAL',     name: 'SW PrepRite ProBlock Interior/Exterior Latex Primer',      category: 'primer', unit: 'GAL', price_per_unit: 52.99, spread_rate_sf_per_unit: 400 },
  { sku: 'SW-PREMIUM-WALLWOOD-GAL', name: 'SW Premium Wall & Wood Primer',                        category: 'primer', unit: 'GAL', price_per_unit: 47.99, spread_rate_sf_per_unit: 400 },
  { sku: 'ZINSSER-BIN-QT',      name: 'Zinsser B-I-N Shellac-Base Primer (Quart)',                category: 'primer', unit: 'QT',  price_per_unit: 18.99, spread_rate_sf_per_unit: 100 },
  // Paints — trim-grade enamels
  { sku: 'SW-PROCLASSIC-WHITE-GAL',   name: 'SW ProClassic Interior Acrylic Latex Enamel — Semi-Gloss',     category: 'paint', unit: 'GAL', price_per_unit: 89.99,  spread_rate_sf_per_unit: 400 },
  { sku: 'SW-EMERALD-URETHANE-GAL',   name: 'SW Emerald Urethane Trim Enamel — Semi-Gloss',                 category: 'paint', unit: 'GAL', price_per_unit: 109.99, spread_rate_sf_per_unit: 400 },
  { sku: 'SW-CASHMERE-SATIN-GAL',     name: 'SW Cashmere Interior Latex — Satin',                           category: 'paint', unit: 'GAL', price_per_unit: 79.99,  spread_rate_sf_per_unit: 400 },
  // Stains
  { sku: 'SW-WOODCLASSICS-STAIN-QT',  name: 'SW Wood Classics Interior Oil Stain (Quart)',                  category: 'stain', unit: 'QT',  price_per_unit: 29.99,  spread_rate_sf_per_unit: 150 },
  { sku: 'MINWAX-STAIN-QT',           name: 'Minwax Wood Finish Penetrating Oil Stain (Quart)',             category: 'stain', unit: 'QT',  price_per_unit: 14.99,  spread_rate_sf_per_unit: 150 },
  // Clear coats
  { sku: 'SW-WOODCLASSICS-POLY-QT',   name: 'SW Wood Classics Polyurethane Varnish — Satin (Quart)',        category: 'clear', unit: 'QT',  price_per_unit: 34.99,  spread_rate_sf_per_unit: 150 },
  { sku: 'MINWAX-POLY-QT',            name: 'Minwax Fast-Drying Polyurethane — Semi-Gloss (Quart)',         category: 'clear', unit: 'QT',  price_per_unit: 19.99,  spread_rate_sf_per_unit: 150 }
];

const seed = {
  version: 1,
  generated_at: new Date().toISOString(),
  substrates: [
    { id: 'baseboard',   name: 'Baseboard',   uom: 'LF',   sf_per_unit: 0.75,
      valid_state_finish: { bare_wood: ['prime_and_paint','stain','stain_and_clear'], factory_primer: ['prime_and_paint','paint'] } },
    { id: 'door_casing', name: 'Door Casing', uom: 'LF',   sf_per_unit: 0.5,
      valid_state_finish: { bare_wood: ['prime_and_paint','stain','stain_and_clear'], factory_primer: ['prime_and_paint','paint'] } },
    { id: 'door_frame',  name: 'Door Frame',  uom: 'EA',   sf_per_unit: 6.4,
      derives: { jamb_lf_per_ea: 17, casing_lf_per_ea: 34 },
      valid_state_finish: { bare_wood: ['prime_and_paint','stain','stain_and_clear'], factory_primer: ['prime_and_paint','paint'] } },
    { id: 'door_slab',   name: 'Door Slab',   uom: 'SIDE', sf_per_unit: 21,
      valid_state_finish: { bare_wood: ['prime_and_paint','stain','stain_and_clear'], factory_primer: ['prime_and_paint','paint'] } }
  ],
  tasks: outputTasks,
  materials,
  material_mapping: {
    paint:            ['paint'],
    prime_and_paint:  ['primer', 'paint'],
    stain:            ['stain'],
    stain_and_clear:  ['stain', 'clear']
  }
};

writeFileSync('seed.json', JSON.stringify(seed, null, 2));
writeFileSync('build-seed.log', LOG.join('\n') + '\n');
console.log(`\nWrote seed.json (${outputTasks.length} tasks, ${materials.length} materials) and build-seed.log`);
```

- [ ] **Step 2: Run the extractor**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm run seed
```

Expected: prints task/module/scenario counts and final seed summary. Creates `seed.json` and `build-seed.log`.

- [ ] **Step 3: Sanity-check the output**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
node -e "const s = JSON.parse(require('fs').readFileSync('seed.json','utf8')); console.log('tasks:', s.tasks.length); const by = {}; s.tasks.forEach(t => by[t.substrate] = (by[t.substrate]||0)+1); console.log('by substrate:', by); console.log('materials:', s.materials.length);"
```

Expected: each of the 4 substrates shows at least 10 tasks. If a substrate has 0 tasks, review `build-seed.log` for warnings about missing scenarios — the plan assumed SF_BASEBOARD, SF_DOOR_CASING, SF_DOOR_FRAME, SF_DOOR_SLAB scenarios exist. If not, stop and report which substrate is empty before proceeding.

- [ ] **Step 4: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add build-seed.js seed.json build-seed.log
git commit -m "feat: seed extractor + initial seed.json"
```

---

## Task 3: Constants, formatters, state module — with tests

**Files:**
- Create: `src/constants.js`
- Create: `src/formatters.js`
- Create: `src/state.js`
- Create: `tests/state.test.js`

- [ ] **Step 1: Write `src/constants.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\constants.js`
```javascript
export const STORAGE_KEY = 'paintfactor_mini_state_v1';

// How many coats each material category supports (applied to material quantity math).
export const COATS_FOR_CATEGORY = {
  primer: 1,
  paint: 2,
  stain: 1,
  clear: 2
};

export const SUBSTRATE_IDS = ['baseboard', 'door_casing', 'door_frame', 'door_slab'];

export const FINISH_SYSTEMS = ['paint', 'prime_and_paint', 'stain', 'stain_and_clear'];

export const SUBSTRATE_STATES = ['bare_wood', 'factory_primer'];

export const METHODS = ['brush', 'spray'];
```

- [ ] **Step 2: Write `src/formatters.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\formatters.js`
```javascript
export function formatCurrency(n) {
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatHours(h) {
  return h.toFixed(2) + ' hr';
}

export function formatPercent(p) {
  return p.toFixed(1) + '%';
}

export function formatQty(q) {
  return Number.isInteger(q) ? String(q) : q.toFixed(1);
}
```

- [ ] **Step 3: Write the failing test for state**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\tests\state.test.js`
```javascript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { defaultState, migrate } from '../src/state.js';

test('defaultState returns a well-formed state object', () => {
  const s = defaultState();
  assert.equal(s.version, 1);
  assert.equal(typeof s.settings.labor_rate_per_hour, 'number');
  assert.equal(s.settings.door_frame.jamb_lf_per_ea, 17);
  assert.equal(s.settings.door_frame.casing_lf_per_ea, 34);
  for (const sub of ['baseboard', 'door_casing', 'door_frame', 'door_slab']) {
    assert.ok(s.job.substrates[sub], `missing substrate ${sub}`);
    assert.equal(s.job.substrates[sub].qty, 0);
    assert.equal(s.job.substrates[sub].enabled, true);
  }
});

test('migrate preserves valid v1 state', () => {
  const input = defaultState();
  input.settings.labor_rate_per_hour = 75;
  const out = migrate(input);
  assert.equal(out.settings.labor_rate_per_hour, 75);
});

test('migrate from unversioned state returns defaults', () => {
  const out = migrate({});
  assert.equal(out.version, 1);
});
```

- [ ] **Step 4: Run the test to confirm it fails**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: FAIL — `Cannot find module '../src/state.js'`.

- [ ] **Step 5: Write `src/state.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\state.js`
```javascript
import { STORAGE_KEY, SUBSTRATE_IDS } from './constants.js';

export function defaultState() {
  const substrates = {};
  for (const id of SUBSTRATE_IDS) {
    substrates[id] = {
      qty: 0,
      state: id === 'door_slab' ? 'factory_primer' : 'bare_wood',
      finish: id === 'door_slab' ? 'paint' : 'prime_and_paint',
      method: id === 'door_slab' ? 'spray' : 'brush',
      enabled: true
    };
  }
  return {
    version: 1,
    settings: {
      labor_rate_per_hour: 65,
      overhead_pct: 15,
      profit_pct: 20,
      door_frame: { jamb_lf_per_ea: 17, casing_lf_per_ea: 34 }
    },
    job: {
      name: '',
      customer: { name: '', address: '', notes: '' },
      substrates,
      task_overrides: {},
      material_picks: {}
    },
    catalog: {
      custom_materials: [],
      overrides: {},
      disabled_skus: []
    }
  };
}

export function migrate(raw) {
  if (!raw || raw.version !== 1) return defaultState();
  // Fill missing fields by merging with defaults.
  const d = defaultState();
  return {
    version: 1,
    settings: { ...d.settings, ...raw.settings, door_frame: { ...d.settings.door_frame, ...(raw.settings?.door_frame ?? {}) } },
    job: {
      name: raw.job?.name ?? '',
      customer: { ...d.job.customer, ...(raw.job?.customer ?? {}) },
      substrates: { ...d.job.substrates, ...(raw.job?.substrates ?? {}) },
      task_overrides: raw.job?.task_overrides ?? {},
      material_picks: raw.job?.material_picks ?? {}
    },
    catalog: { ...d.catalog, ...(raw.catalog ?? {}) }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return migrate(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.warn('loadState failed, using defaults:', e);
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateJson(state) {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(text) {
  return migrate(JSON.parse(text));
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: 3 tests pass in `tests/state.test.js`.

- [ ] **Step 7: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/constants.js src/formatters.js src/state.js tests/state.test.js
git commit -m "feat: state, constants, formatters with migration tests"
```

---

## Task 4: Derivations module (effective qty, task filter, material qty)

**Files:**
- Create: `src/derivations.js`
- Create: `tests/derivations.test.js`

- [ ] **Step 1: Write failing tests**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\tests\derivations.test.js`
```javascript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { defaultState } from '../src/state.js';
import { effectiveQty, filterTasks, materialQuantity } from '../src/derivations.js';

const SEED = {
  substrates: [
    { id: 'baseboard', uom: 'LF', sf_per_unit: 0.75 },
    { id: 'door_casing', uom: 'LF', sf_per_unit: 0.5 },
    { id: 'door_frame', uom: 'EA', sf_per_unit: 6.4, derives: { jamb_lf_per_ea: 17, casing_lf_per_ea: 34 } },
    { id: 'door_slab', uom: 'SIDE', sf_per_unit: 21 }
  ],
  tasks: [
    { task_id: 'T1', substrate: 'baseboard', phase: 'apply', method: 'brush', finish_system_filter: ['paint','prime_and_paint'], state_filter: ['factory_primer'], rate_per_hour: 80, coat_count: 2 },
    { task_id: 'T2', substrate: 'baseboard', phase: 'prep', method: 'any', finish_system_filter: ['prime_and_paint'], state_filter: ['bare_wood'], rate_per_hour: 120, coat_count: 1 },
    { task_id: 'T3', substrate: 'door_slab', phase: 'apply', method: 'spray', finish_system_filter: ['paint'], state_filter: null, rate_per_hour: 40, coat_count: 2 }
  ]
};

test('effectiveQty: baseboard uses its own qty', () => {
  const s = defaultState();
  s.job.substrates.baseboard.qty = 450;
  assert.equal(effectiveQty(s, SEED, 'baseboard'), 450);
});

test('effectiveQty: door_frame multiplies by jamb_lf_per_ea', () => {
  const s = defaultState();
  s.job.substrates.door_frame.qty = 5;
  assert.equal(effectiveQty(s, SEED, 'door_frame'), 5 * 17);
});

test('effectiveQty: door_casing includes frames casing contribution', () => {
  const s = defaultState();
  s.job.substrates.door_casing.qty = 100;
  s.job.substrates.door_frame.qty = 5;
  assert.equal(effectiveQty(s, SEED, 'door_casing'), 100 + 5 * 34);
});

test('filterTasks: matches substrate + method + finish + state', () => {
  const s = defaultState();
  s.job.substrates.baseboard.state = 'factory_primer';
  s.job.substrates.baseboard.finish = 'paint';
  s.job.substrates.baseboard.method = 'brush';
  const tasks = filterTasks(s, SEED, 'baseboard');
  assert.deepEqual(tasks.map(t => t.task_id), ['T1']);
});

test('filterTasks: method "any" matches any method', () => {
  const s = defaultState();
  s.job.substrates.baseboard.state = 'bare_wood';
  s.job.substrates.baseboard.finish = 'prime_and_paint';
  s.job.substrates.baseboard.method = 'brush';
  const tasks = filterTasks(s, SEED, 'baseboard');
  assert.ok(tasks.some(t => t.task_id === 'T2'));
});

test('filterTasks: state_filter null matches any state', () => {
  const s = defaultState();
  s.job.substrates.door_slab.state = 'bare_wood';
  s.job.substrates.door_slab.finish = 'paint';
  s.job.substrates.door_slab.method = 'spray';
  const tasks = filterTasks(s, SEED, 'door_slab');
  assert.ok(tasks.some(t => t.task_id === 'T3'));
});

test('materialQuantity: primer for 450 LF baseboard at 400 SF/gal spread, 1 coat', () => {
  // 450 LF × 0.75 SF/LF × 1 coat / 400 SF/gal = 0.84 → ceil 1
  const qty = materialQuantity({ effective_qty: 450, sf_per_unit: 0.75, category: 'primer', spread_rate_sf_per_unit: 400 });
  assert.equal(qty, 1);
});

test('materialQuantity: paint for 1000 LF baseboard, 2 coats, 400 SF/gal', () => {
  // 1000 × 0.75 × 2 / 400 = 3.75 → ceil 4
  const qty = materialQuantity({ effective_qty: 1000, sf_per_unit: 0.75, category: 'paint', spread_rate_sf_per_unit: 400 });
  assert.equal(qty, 4);
});

test('materialQuantity: respects qty_override', () => {
  const qty = materialQuantity({ effective_qty: 1000, sf_per_unit: 0.75, category: 'paint', spread_rate_sf_per_unit: 400, qty_override: 2 });
  assert.equal(qty, 2);
});

test('materialQuantity: minimum 1', () => {
  const qty = materialQuantity({ effective_qty: 0, sf_per_unit: 0.75, category: 'paint', spread_rate_sf_per_unit: 400 });
  assert.equal(qty, 1);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: FAIL — derivations.js not found.

- [ ] **Step 3: Write `src/derivations.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\derivations.js`
```javascript
import { COATS_FOR_CATEGORY } from './constants.js';

export function substrateDef(seed, id) {
  return seed.substrates.find(s => s.id === id);
}

export function effectiveQty(state, seed, substrateId) {
  const sub = state.job.substrates[substrateId];
  if (!sub) return 0;
  const df = state.settings.door_frame;
  if (substrateId === 'door_frame') {
    return sub.qty * df.jamb_lf_per_ea;
  }
  if (substrateId === 'door_casing') {
    return sub.qty + (state.job.substrates.door_frame.qty * df.casing_lf_per_ea);
  }
  return sub.qty;
}

export function filterTasks(state, seed, substrateId) {
  const sub = state.job.substrates[substrateId];
  if (!sub || !sub.enabled) return [];
  return seed.tasks.filter(t => {
    if (t.substrate !== substrateId) return false;
    if (t.method !== 'any' && t.method !== sub.method) return false;
    if (!t.finish_system_filter.includes(sub.finish)) return false;
    if (t.state_filter !== null && !t.state_filter.includes(sub.state)) return false;
    return true;
  });
}

export function taskRate(state, task) {
  const override = state.job.task_overrides[task.task_id];
  if (override && typeof override.rate_per_hour === 'number') return override.rate_per_hour;
  return task.rate_per_hour;
}

export function taskEnabled(state, task) {
  const override = state.job.task_overrides[task.task_id];
  if (override && typeof override.enabled === 'boolean') return override.enabled;
  return true;
}

export function taskHours(state, seed, task) {
  const qty = effectiveQty(state, seed, task.substrate);
  const rate = taskRate(state, task);
  if (rate <= 0 || qty <= 0) return 0;
  return (qty / rate) * (task.coat_count ?? 1);
}

export function materialQuantity({ effective_qty, sf_per_unit, category, spread_rate_sf_per_unit, qty_override }) {
  if (typeof qty_override === 'number' && qty_override > 0) return qty_override;
  const coats = COATS_FOR_CATEGORY[category] ?? 1;
  if (!spread_rate_sf_per_unit || spread_rate_sf_per_unit <= 0) return 1;
  const raw = (effective_qty * sf_per_unit * coats) / spread_rate_sf_per_unit;
  return Math.max(1, Math.ceil(raw));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: All state + derivations tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/derivations.js tests/derivations.test.js
git commit -m "feat: derivations module with effective qty, task filter, material qty"
```

---

## Task 5: Pricing engine

**Files:**
- Create: `src/pricing.js`
- Create: `tests/pricing.test.js`

- [ ] **Step 1: Write failing tests**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\tests\pricing.test.js`
```javascript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { defaultState } from '../src/state.js';
import { computeQuote } from '../src/pricing.js';

const SEED = {
  substrates: [
    { id: 'baseboard', uom: 'LF', sf_per_unit: 0.75,
      valid_state_finish: { bare_wood: ['prime_and_paint'], factory_primer: ['paint'] } },
    { id: 'door_casing', uom: 'LF', sf_per_unit: 0.5,
      valid_state_finish: { bare_wood: ['prime_and_paint'], factory_primer: ['paint'] } },
    { id: 'door_frame', uom: 'EA', sf_per_unit: 6.4,
      derives: { jamb_lf_per_ea: 17, casing_lf_per_ea: 34 },
      valid_state_finish: { bare_wood: ['prime_and_paint'], factory_primer: ['paint'] } },
    { id: 'door_slab', uom: 'SIDE', sf_per_unit: 21,
      valid_state_finish: { bare_wood: ['prime_and_paint'], factory_primer: ['paint'] } }
  ],
  tasks: [
    { task_id: 'T_APPLY', substrate: 'baseboard', phase: 'apply', method: 'brush',
      finish_system_filter: ['paint','prime_and_paint'], state_filter: null, rate_per_hour: 80, coat_count: 2 }
  ],
  materials: [
    { sku: 'PAINT-X', name: 'Test Paint', category: 'paint', unit: 'GAL', price_per_unit: 100, spread_rate_sf_per_unit: 400 }
  ],
  material_mapping: { paint: ['paint'], prime_and_paint: ['primer', 'paint'] }
};

test('computeQuote: empty job returns zero total', () => {
  const s = defaultState();
  const q = computeQuote(s, SEED);
  assert.equal(q.total, 0);
  assert.equal(q.labor_hours, 0);
});

test('computeQuote: baseboard 1000 LF paint with single task', () => {
  const s = defaultState();
  s.settings.labor_rate_per_hour = 50;
  s.settings.overhead_pct = 0;
  s.settings.profit_pct = 0;
  s.job.substrates.baseboard.qty = 1000;
  s.job.substrates.baseboard.state = 'factory_primer';
  s.job.substrates.baseboard.finish = 'paint';
  s.job.substrates.baseboard.method = 'brush';
  s.job.material_picks['baseboard.paint'] = { sku: 'PAINT-X', qty_override: null };

  const q = computeQuote(s, SEED);
  // hours = 1000/80 × 2 = 25; labor = 25×50 = 1250
  assert.equal(q.labor_hours, 25);
  assert.equal(q.labor_cost, 1250);
  // paint qty = ceil(1000×0.75×2/400) = ceil(3.75) = 4; materials = 4×100 = 400
  assert.equal(q.materials_cost, 400);
  assert.equal(q.subtotal, 1650);
  assert.equal(q.total, 1650);
});

test('computeQuote: overhead and profit stack correctly', () => {
  const s = defaultState();
  s.settings.labor_rate_per_hour = 100;
  s.settings.overhead_pct = 10;
  s.settings.profit_pct = 20;
  s.job.substrates.baseboard.qty = 80; // hours = 80/80×2 = 2; labor = 200
  s.job.substrates.baseboard.state = 'factory_primer';
  s.job.substrates.baseboard.finish = 'paint';
  s.job.substrates.baseboard.method = 'brush';
  s.job.material_picks['baseboard.paint'] = { sku: 'PAINT-X', qty_override: 0 }; // skip materials

  const q = computeQuote(s, SEED);
  // labor=200, materials=100 (min 1 × $100), subtotal=300, overhead=30, profit=(330)×0.2=66, total=396
  assert.equal(q.labor_cost, 200);
  assert.equal(q.materials_cost, 100);
  assert.equal(q.subtotal, 300);
  assert.equal(q.overhead, 30);
  assert.equal(q.profit, 66);
  assert.equal(q.total, 396);
});

test('computeQuote: disabled substrate contributes nothing', () => {
  const s = defaultState();
  s.settings.labor_rate_per_hour = 50;
  s.job.substrates.baseboard.qty = 1000;
  s.job.substrates.baseboard.enabled = false;
  const q = computeQuote(s, SEED);
  assert.equal(q.total, 0);
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: FAIL — pricing.js not found.

- [ ] **Step 3: Write `src/pricing.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\pricing.js`
```javascript
import { SUBSTRATE_IDS } from './constants.js';
import { effectiveQty, filterTasks, taskEnabled, taskRate, materialQuantity, substrateDef } from './derivations.js';

export function computeQuote(state, seed) {
  const breakdown = {
    labor_hours: 0,
    labor_cost: 0,
    materials_cost: 0,
    by_substrate: {},
    materials_lines: []
  };

  for (const sid of SUBSTRATE_IDS) {
    const sub = state.job.substrates[sid];
    if (!sub || !sub.enabled) continue;
    const tasks = filterTasks(state, seed, sid);
    let subHours = 0;
    const taskLines = [];
    const eq = effectiveQty(state, seed, sid);
    for (const t of tasks) {
      if (!taskEnabled(state, t)) continue;
      const rate = taskRate(state, t);
      if (rate <= 0) continue;
      const hours = (eq / rate) * (t.coat_count ?? 1);
      subHours += hours;
      taskLines.push({ task_id: t.task_id, name: t.name, phase: t.phase, qty: eq, rate, coats: t.coat_count, hours });
    }
    breakdown.by_substrate[sid] = { effective_qty: eq, tasks: taskLines, hours: subHours };
    breakdown.labor_hours += subHours;

    // Materials for this substrate
    const def = substrateDef(seed, sid);
    const categories = seed.material_mapping[sub.finish] ?? [];
    for (const cat of categories) {
      const pickKey = `${sid}.${cat}`;
      const pick = state.job.material_picks[pickKey];
      if (!pick || !pick.sku) continue;
      const mat = seed.materials.find(m => m.sku === pick.sku);
      if (!mat) continue;
      const qty = materialQuantity({
        effective_qty: eq,
        sf_per_unit: def.sf_per_unit,
        category: cat,
        spread_rate_sf_per_unit: mat.spread_rate_sf_per_unit,
        qty_override: pick.qty_override
      });
      const line_cost = qty * mat.price_per_unit;
      breakdown.materials_cost += line_cost;
      breakdown.materials_lines.push({ substrate: sid, category: cat, sku: mat.sku, name: mat.name, qty, unit: mat.unit, price_per_unit: mat.price_per_unit, line_cost });
    }
  }

  breakdown.labor_cost = breakdown.labor_hours * state.settings.labor_rate_per_hour;
  breakdown.subtotal = breakdown.labor_cost + breakdown.materials_cost;
  breakdown.overhead = breakdown.subtotal * (state.settings.overhead_pct / 100);
  breakdown.profit = (breakdown.subtotal + breakdown.overhead) * (state.settings.profit_pct / 100);
  breakdown.total = breakdown.subtotal + breakdown.overhead + breakdown.profit;

  // Round to cents to avoid floating-point drift in assertions/displays.
  breakdown.labor_cost = round2(breakdown.labor_cost);
  breakdown.materials_cost = round2(breakdown.materials_cost);
  breakdown.subtotal = round2(breakdown.subtotal);
  breakdown.overhead = round2(breakdown.overhead);
  breakdown.profit = round2(breakdown.profit);
  breakdown.total = round2(breakdown.total);
  breakdown.labor_hours = round2(breakdown.labor_hours);

  return breakdown;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: All pricing tests pass (plus state + derivations from earlier).

- [ ] **Step 5: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/pricing.js tests/pricing.test.js
git commit -m "feat: pricing engine with labor+materials+overhead+profit"
```

---

## Task 6: HTML shell + mobile CSS

**Files:**
- Create: `index.html`
- Create: `style.css`

- [ ] **Step 1: Write `index.html`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>PaintFactor Mini</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header class="app-header">
    <div class="header-row">
      <span class="header-label">Total</span>
      <span id="header-total" class="header-total">$0.00</span>
    </div>
    <div class="header-sub">
      <span id="header-hours">0.00 hr</span>
      <span id="header-jobname" class="header-jobname"></span>
    </div>
  </header>

  <main id="tab-content" class="tab-content"></main>

  <nav class="tab-bar">
    <button class="tab-btn" data-tab="job"   aria-label="Job">📋<span>Job</span></button>
    <button class="tab-btn" data-tab="tasks" aria-label="Tasks">🧱<span>Tasks</span></button>
    <button class="tab-btn" data-tab="mats"  aria-label="Materials">💰<span>Mats</span></button>
    <button class="tab-btn" data-tab="setup" aria-label="Setup">⚙️<span>Setup</span></button>
  </nav>

  <div id="quote-overlay" class="quote-overlay hidden"></div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `style.css`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\style.css`
```css
:root {
  --bg: #0f1419;
  --surface: #1a2128;
  --surface-2: #252d36;
  --border: #2f3842;
  --text: #e8eaed;
  --muted: #9aa0a6;
  --accent: #4f9cf9;
  --accent-soft: #1e3a5f;
  --ok: #2fb86f;
  --warn: #f2a63a;
  --danger: #e0524b;
  --radius: 10px;
  --pad: 12px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; font-size: 15px; }
body { min-height: 100vh; padding-bottom: 70px; padding-top: 70px; }

.app-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 10;
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 10px 14px;
}
.header-row { display: flex; justify-content: space-between; align-items: baseline; }
.header-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.header-total { font-size: 24px; font-weight: 700; color: var(--ok); }
.header-sub { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 2px; }
.header-jobname { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tab-content { padding: var(--pad); min-height: calc(100vh - 140px); }
.tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 10;
  background: var(--surface); border-top: 1px solid var(--border);
  display: flex; justify-content: space-around; align-items: center;
}
.tab-btn {
  flex: 1; background: none; border: 0; color: var(--muted);
  padding: 10px 4px; font-size: 18px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.tab-btn span { font-size: 11px; }
.tab-btn.active { color: var(--accent); }

.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  margin-bottom: var(--pad); overflow: hidden;
}
.card-header {
  padding: 12px; display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; user-select: none;
}
.card-title { font-weight: 600; }
.card-meta { color: var(--muted); font-size: 12px; }
.card-body { padding: 0 12px 12px; border-top: 1px solid var(--border); }
.card-body.collapsed { display: none; }

.field { display: flex; flex-direction: column; gap: 4px; margin: 10px 0; }
.field label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.field input, .field select, .field textarea {
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px; font-size: 16px;
}
.field input:focus, .field select:focus { outline: 2px solid var(--accent); outline-offset: -1px; }

.row { display: flex; gap: 8px; }
.row .field { flex: 1; }

.btn {
  background: var(--accent); color: white; border: 0; border-radius: 8px;
  padding: 10px 14px; font-size: 15px; cursor: pointer;
}
.btn-secondary { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); }
.btn-danger { background: var(--danger); }
.btn-block { width: 100%; }

.toggle { display: flex; align-items: center; gap: 8px; }
.toggle input[type="checkbox"] { width: 20px; height: 20px; }

.task-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.task-row:last-child { border-bottom: 0; }
.task-row .name { flex: 1; }
.task-row .phase-badge {
  background: var(--accent-soft); color: var(--accent); font-size: 10px;
  padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;
}
.task-row .rate-input { width: 70px; font-size: 14px; }
.task-row .hours { font-size: 12px; color: var(--muted); min-width: 54px; text-align: right; }

.warning { background: #3a2a12; color: var(--warn); padding: 8px 12px; border-radius: 6px; font-size: 13px; margin: 8px 0; }
.hint { color: var(--muted); font-size: 12px; }

.quote-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: white; color: black;
  overflow: auto; padding: 20px;
}
.quote-overlay.hidden { display: none; }
.quote-overlay h1 { margin: 0 0 10px; }
.quote-overlay table { width: 100%; border-collapse: collapse; margin: 12px 0; }
.quote-overlay th, .quote-overlay td { border-bottom: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 13px; }
.quote-overlay .total-row td { font-weight: 700; border-top: 2px solid black; }
.quote-overlay .actions { position: sticky; bottom: 0; background: white; padding: 10px 0; border-top: 1px solid #ccc; display: flex; gap: 10px; }

@media print {
  .app-header, .tab-bar, .tab-content, .quote-overlay .actions { display: none !important; }
  body { padding: 0; background: white; color: black; }
  .quote-overlay { position: static; padding: 0; }
}
```

- [ ] **Step 3: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add index.html style.css
git commit -m "feat: mobile HTML shell + CSS"
```

---

## Task 7: App entry + router + header

**Files:**
- Create: `app.js`
- Create: `src/ui/router.js`
- Create: `src/ui/header.js`

- [ ] **Step 1: Write `src/ui/router.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\router.js`
```javascript
const TAB_ORDER = ['job', 'tasks', 'mats', 'setup'];
const registry = {};

export function registerTab(name, renderFn) {
  registry[name] = renderFn;
}

export function initRouter(defaultTab = 'job') {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
  showTab(defaultTab);
}

export function showTab(name) {
  if (!TAB_ORDER.includes(name)) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  const container = document.getElementById('tab-content');
  container.innerHTML = '';
  const render = registry[name];
  if (render) render(container);
}

export function refreshActiveTab() {
  const active = document.querySelector('.tab-btn.active');
  if (active) showTab(active.dataset.tab);
}
```

- [ ] **Step 2: Write `src/ui/header.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\header.js`
```javascript
import { formatCurrency, formatHours } from '../formatters.js';

export function renderHeader({ total, hours, jobName }) {
  document.getElementById('header-total').textContent = formatCurrency(total);
  document.getElementById('header-hours').textContent = formatHours(hours);
  document.getElementById('header-jobname').textContent = jobName ?? '';
}
```

- [ ] **Step 3: Write `app.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\app.js`
```javascript
import { loadState, saveState } from './src/state.js';
import { computeQuote } from './src/pricing.js';
import { initRouter, registerTab, refreshActiveTab } from './src/ui/router.js';
import { renderHeader } from './src/ui/header.js';
import { renderJobTab } from './src/ui/tab-job.js';
import { renderTasksTab } from './src/ui/tab-tasks.js';
import { renderMatsTab } from './src/ui/tab-mats.js';
import { renderSetupTab } from './src/ui/tab-setup.js';

const SEED_URL = 'seed.json';

let seed = null;
let state = loadState();

export function getState() { return state; }
export function getSeed() { return seed; }

export function updateState(patchFn) {
  patchFn(state);
  saveState(state);
  recompute();
}

export function recompute() {
  if (!seed) return;
  const quote = computeQuote(state, seed);
  renderHeader({ total: quote.total, hours: quote.labor_hours, jobName: state.job.name });
  refreshActiveTab();
}

async function main() {
  const res = await fetch(SEED_URL);
  seed = await res.json();

  registerTab('job',   (el) => renderJobTab(el, state, seed, updateState));
  registerTab('tasks', (el) => renderTasksTab(el, state, seed, updateState));
  registerTab('mats',  (el) => renderMatsTab(el, state, seed, updateState));
  registerTab('setup', (el) => renderSetupTab(el, state, seed, updateState));

  initRouter('job');
  recompute();
}

main().catch(err => {
  console.error('App init failed:', err);
  document.body.innerHTML = '<p style="padding:20px">App failed to load. Check console.</p>';
});
```

- [ ] **Step 4: Stub out the tab modules so the app loads**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\tab-job.js`
```javascript
export function renderJobTab(el, state, seed, updateState) {
  el.innerHTML = '<div class="hint">Job tab (stub — implemented in Task 8)</div>';
}
```

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\tab-tasks.js`
```javascript
export function renderTasksTab(el, state, seed, updateState) {
  el.innerHTML = '<div class="hint">Tasks tab (stub — implemented in Task 9)</div>';
}
```

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\tab-mats.js`
```javascript
export function renderMatsTab(el, state, seed, updateState) {
  el.innerHTML = '<div class="hint">Materials tab (stub — implemented in Task 10)</div>';
}
```

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\tab-setup.js`
```javascript
export function renderSetupTab(el, state, seed, updateState) {
  el.innerHTML = '<div class="hint">Setup tab (stub — implemented in Task 11)</div>';
}
```

- [ ] **Step 5: Start server and verify app loads**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
python3 -m http.server 5173
```

Open `http://localhost:5173` in a mobile viewport (Chrome DevTools → Toggle device toolbar → iPhone SE 375×667). Expected: header shows "$0.00 / 0.00 hr", bottom tab bar with 4 tabs, tapping each tab shows the stub message.

Kill server with Ctrl+C before continuing.

- [ ] **Step 6: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add app.js src/ui/
git commit -m "feat: app entry, router, header, tab stubs"
```

---

## Task 8: Job tab — substrate cards

**Files:**
- Modify: `src/ui/tab-job.js`

- [ ] **Step 1: Write the full Job tab**

Replace `src/ui/tab-job.js` with:
```javascript
import { substrateDef } from '../derivations.js';
import { effectiveQty } from '../derivations.js';

export function renderJobTab(el, state, seed, updateState) {
  el.innerHTML = '';

  // Job name field
  const nameField = makeField('Job Name', 'text', state.job.name, (v) => {
    updateState(s => { s.job.name = v; });
  });
  el.appendChild(nameField);

  // One card per substrate
  for (const def of seed.substrates) {
    el.appendChild(renderSubstrateCard(def, state, seed, updateState));
  }
}

function renderSubstrateCard(def, state, seed, updateState) {
  const sub = state.job.substrates[def.id];
  const card = document.createElement('div');
  card.className = 'card';

  const derivedCasing = def.id === 'door_casing'
    ? (state.job.substrates.door_frame.qty * state.settings.door_frame.casing_lf_per_ea)
    : 0;
  const displayQty = def.id === 'door_casing' ? `${sub.qty + derivedCasing} ${def.uom}` : `${sub.qty} ${def.uom}`;

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${def.name}</div>
        <div class="card-meta">${displayQty} · ${labelFinish(sub.finish)} · ${sub.method}${sub.enabled ? '' : ' · <em>disabled</em>'}</div>
      </div>
      <span class="card-toggle">▾</span>
    </div>
    <div class="card-body collapsed"></div>
  `;
  const header = card.querySelector('.card-header');
  const body = card.querySelector('.card-body');
  header.addEventListener('click', () => body.classList.toggle('collapsed'));

  // Enable toggle
  body.appendChild(makeToggle('Include in quote', sub.enabled, (v) => {
    updateState(s => { s.job.substrates[def.id].enabled = v; });
  }));

  // Quantity
  const qtyLabel = def.id === 'door_frame' ? `Quantity (${def.uom}) — each frame = ${state.settings.door_frame.jamb_lf_per_ea} LF jamb + ${state.settings.door_frame.casing_lf_per_ea} LF casing`
                  : def.id === 'door_slab' ? 'Sides Count (each face = 1 side)'
                  : `Quantity (${def.uom})`;
  body.appendChild(makeField(qtyLabel, 'number', sub.qty, (v) => {
    updateState(s => { s.job.substrates[def.id].qty = Number(v) || 0; });
  }));

  // Effective qty readout
  const eq = effectiveQty(state, seed, def.id);
  const eqBox = document.createElement('div');
  eqBox.className = 'hint';
  if (def.id === 'door_frame') eqBox.textContent = `→ ${eq} LF of frame jamb, +${state.job.substrates.door_frame.qty * state.settings.door_frame.casing_lf_per_ea} LF of casing added to Door Casing`;
  else if (def.id === 'door_casing') eqBox.textContent = `→ Effective ${eq} LF (direct ${sub.qty} + ${derivedCasing} from frames)`;
  else eqBox.textContent = `→ Effective ${eq} ${def.uom}`;
  body.appendChild(eqBox);

  // Substrate state
  body.appendChild(makeSelect('Substrate State', sub.state, [
    { value: 'bare_wood', label: 'Bare wood' },
    { value: 'factory_primer', label: 'Factory primer' }
  ], (v) => {
    updateState(s => {
      s.job.substrates[def.id].state = v;
      const valid = seed.substrates.find(x => x.id === def.id).valid_state_finish[v];
      if (!valid.includes(s.job.substrates[def.id].finish)) {
        s.job.substrates[def.id].finish = valid[0];
      }
    });
  }));

  // Finish system
  const validFinishes = def.valid_state_finish[sub.state];
  const finishOptions = [
    { value: 'paint',            label: 'Paint only' },
    { value: 'prime_and_paint',  label: 'Prime & Paint' },
    { value: 'stain',            label: 'Stain' },
    { value: 'stain_and_clear',  label: 'Stain & Clear' }
  ].filter(o => validFinishes.includes(o.value));
  body.appendChild(makeSelect('Finish System', sub.finish, finishOptions, (v) => {
    updateState(s => { s.job.substrates[def.id].finish = v; });
  }));

  // Method
  body.appendChild(makeSelect('Application Method', sub.method, [
    { value: 'brush', label: 'Brush' },
    { value: 'spray', label: 'Spray' }
  ], (v) => {
    updateState(s => { s.job.substrates[def.id].method = v; });
  }));

  return card;
}

function labelFinish(v) {
  return { paint: 'Paint', prime_and_paint: 'Prime & Paint', stain: 'Stain', stain_and_clear: 'Stain & Clear' }[v] ?? v;
}

function makeField(label, type, value, onInput) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `<label>${label}</label>`;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  if (type === 'number') { input.inputMode = 'decimal'; input.min = '0'; }
  input.addEventListener('change', e => onInput(e.target.value));
  wrap.appendChild(input);
  return wrap;
}

function makeSelect(label, value, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `<label>${label}</label>`;
  const select = document.createElement('select');
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === value) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', e => onChange(e.target.value));
  wrap.appendChild(select);
  return wrap;
}

function makeToggle(label, checked, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'field toggle';
  const id = 'tog-' + Math.random().toString(36).slice(2, 9);
  wrap.innerHTML = `<input type="checkbox" id="${id}" ${checked ? 'checked' : ''} /><label for="${id}">${label}</label>`;
  wrap.querySelector('input').addEventListener('change', e => onChange(e.target.checked));
  return wrap;
}
```

- [ ] **Step 2: Verify in browser**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
python3 -m http.server 5173
```

Open in mobile viewport. Job tab shows 4 accordion cards. Expand each, enter test values (e.g., baseboard 450 LF, 5 door frames). Verify the header total updates as you type (after blur), door_casing card shows "+170 LF from frames". Kill server.

- [ ] **Step 3: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/ui/tab-job.js
git commit -m "feat: job tab with 4 substrate cards"
```

---

## Task 9: Tasks tab — filtered list, toggle, rate edit

**Files:**
- Modify: `src/ui/tab-tasks.js`

- [ ] **Step 1: Write the Tasks tab**

Replace `src/ui/tab-tasks.js` with:
```javascript
import { filterTasks, effectiveQty, taskRate, taskEnabled } from '../derivations.js';
import { formatHours } from '../formatters.js';

export function renderTasksTab(el, state, seed, updateState) {
  el.innerHTML = '';
  for (const def of seed.substrates) {
    el.appendChild(renderSubstrateTasks(def, state, seed, updateState));
  }
}

function renderSubstrateTasks(def, state, seed, updateState) {
  const card = document.createElement('div');
  card.className = 'card';
  const sub = state.job.substrates[def.id];
  const tasks = sub.enabled ? filterTasks(state, seed, def.id) : [];
  const eq = effectiveQty(state, seed, def.id);

  card.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">${def.name}</div>
        <div class="card-meta">${tasks.length} tasks · ${eq} ${def.uom}${sub.enabled ? '' : ' · <em>disabled</em>'}</div>
      </div>
      <span class="card-toggle">▾</span>
    </div>
    <div class="card-body ${tasks.length ? '' : 'collapsed'}"></div>
  `;
  const header = card.querySelector('.card-header');
  const body = card.querySelector('.card-body');
  header.addEventListener('click', () => body.classList.toggle('collapsed'));

  if (!tasks.length) {
    body.innerHTML = '<div class="hint">No tasks match the current substrate/state/finish/method combination.</div>';
    return card;
  }

  for (const t of tasks) body.appendChild(renderTaskRow(t, state, seed, updateState));
  return card;
}

function renderTaskRow(task, state, seed, updateState) {
  const row = document.createElement('div');
  row.className = 'task-row';
  const enabled = taskEnabled(state, task);
  const rate = taskRate(state, task);
  const eq = effectiveQty(state, seed, task.substrate);
  const hours = (rate > 0 && eq > 0) ? (eq / rate) * (task.coat_count ?? 1) : 0;

  row.innerHTML = `
    <input type="checkbox" class="t-enable" ${enabled ? 'checked' : ''} />
    <div class="name">
      <div>${task.name}</div>
      <div class="hint">${task.task_id} · ${task.uom ?? ''} · ${task.coat_count ?? 1}×</div>
    </div>
    <span class="phase-badge">${task.phase}</span>
    <input type="number" step="1" min="0" class="rate-input t-rate" value="${rate}" />
    <span class="hours">${formatHours(hours)}</span>
  `;
  row.querySelector('.t-enable').addEventListener('change', e => {
    updateState(s => {
      s.job.task_overrides[task.task_id] = { ...(s.job.task_overrides[task.task_id] ?? {}), enabled: e.target.checked };
    });
  });
  row.querySelector('.t-rate').addEventListener('change', e => {
    updateState(s => {
      s.job.task_overrides[task.task_id] = { ...(s.job.task_overrides[task.task_id] ?? {}), rate_per_hour: Number(e.target.value) || 0 };
    });
  });
  return row;
}
```

- [ ] **Step 2: Verify in browser**

Start server, enter a substrate qty on Job tab, switch to Tasks tab. Verify: tasks for that substrate appear, phase badges render, checking off a task removes its hours from the header total, editing a rate updates header total. Kill server.

- [ ] **Step 3: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/ui/tab-tasks.js
git commit -m "feat: tasks tab with toggle + editable rate"
```

---

## Task 10: Materials tab — picks + catalog editor

**Files:**
- Modify: `src/ui/tab-mats.js`

- [ ] **Step 1: Write the Mats tab**

Replace `src/ui/tab-mats.js` with:
```javascript
import { effectiveQty, materialQuantity, substrateDef } from '../derivations.js';
import { formatCurrency } from '../formatters.js';

export function renderMatsTab(el, state, seed, updateState) {
  el.innerHTML = '';
  el.appendChild(renderPicksSection(state, seed, updateState));
  el.appendChild(renderCatalogSection(state, seed, updateState));
}

function renderPicksSection(state, seed, updateState) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<div class="card-header"><div class="card-title">Material Picks</div></div><div class="card-body"></div>`;
  const body = card.querySelector('.card-body');

  let any = false;
  for (const def of seed.substrates) {
    const sub = state.job.substrates[def.id];
    if (!sub.enabled) continue;
    const categories = seed.material_mapping[sub.finish] ?? [];
    if (!categories.length) continue;
    const subHeader = document.createElement('div');
    subHeader.className = 'card-title';
    subHeader.style.marginTop = '14px';
    subHeader.textContent = `${def.name} (${sub.finish})`;
    body.appendChild(subHeader);
    for (const cat of categories) {
      body.appendChild(renderPickRow(def, sub, cat, state, seed, updateState));
      any = true;
    }
  }
  if (!any) body.innerHTML = '<div class="hint">Enable substrates in the Job tab to see material picks.</div>';
  return card;
}

function renderPickRow(def, sub, cat, state, seed, updateState) {
  const pickKey = `${def.id}.${cat}`;
  const pick = state.job.material_picks[pickKey] ?? { sku: null, qty_override: null };
  const eligible = availableMaterials(seed, state).filter(m => m.category === cat);
  const mat = eligible.find(m => m.sku === pick.sku) ?? eligible[0] ?? null;

  const eq = effectiveQty(state, seed, def.id);
  const qty = mat ? materialQuantity({
    effective_qty: eq, sf_per_unit: def.sf_per_unit, category: cat,
    spread_rate_sf_per_unit: mat.spread_rate_sf_per_unit, qty_override: pick.qty_override
  }) : 0;
  const cost = mat ? qty * mat.price_per_unit : 0;

  const wrap = document.createElement('div');
  wrap.style.marginBottom = '10px';
  wrap.innerHTML = `
    <div class="field">
      <label>${capitalize(cat)}</label>
      <select class="pick-sku"></select>
    </div>
    <div class="row">
      <div class="field">
        <label>Qty (${mat?.unit ?? '—'})</label>
        <input type="number" step="1" min="0" class="pick-qty" value="${qty}" />
      </div>
      <div class="field">
        <label>Line cost</label>
        <input disabled value="${formatCurrency(cost)}" />
      </div>
    </div>
  `;
  const select = wrap.querySelector('.pick-sku');
  for (const m of eligible) {
    const opt = document.createElement('option');
    opt.value = m.sku;
    opt.textContent = `${m.name} — ${formatCurrency(m.price_per_unit)}/${m.unit}`;
    if (m.sku === mat?.sku) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', e => {
    updateState(s => {
      s.job.material_picks[pickKey] = { sku: e.target.value, qty_override: null };
    });
  });
  wrap.querySelector('.pick-qty').addEventListener('change', e => {
    updateState(s => {
      const existing = s.job.material_picks[pickKey] ?? { sku: mat?.sku, qty_override: null };
      s.job.material_picks[pickKey] = { ...existing, qty_override: Number(e.target.value) || null };
    });
  });
  // Ensure the pick is persisted if it wasn't yet
  if (!pick.sku && mat) {
    state.job.material_picks[pickKey] = { sku: mat.sku, qty_override: null };
  }
  return wrap;
}

function renderCatalogSection(state, seed, updateState) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<div class="card-header"><div class="card-title">Material Catalog</div></div><div class="card-body"></div>`;
  const body = card.querySelector('.card-body');

  const materials = availableMaterials(seed, state);
  for (const m of materials) {
    const row = document.createElement('div');
    row.className = 'task-row';
    const disabled = state.catalog.disabled_skus.includes(m.sku);
    row.innerHTML = `
      <input type="checkbox" class="m-enable" ${disabled ? '' : 'checked'} />
      <div class="name">
        <div>${m.name}${m._custom ? ' <span class="phase-badge">custom</span>' : ''}</div>
        <div class="hint">${m.sku} · ${m.category} · ${formatCurrency(m.price_per_unit)}/${m.unit} · ${m.spread_rate_sf_per_unit} SF/${m.unit}</div>
      </div>
    `;
    row.querySelector('.m-enable').addEventListener('change', e => {
      updateState(s => {
        if (e.target.checked) s.catalog.disabled_skus = s.catalog.disabled_skus.filter(x => x !== m.sku);
        else s.catalog.disabled_skus = [...s.catalog.disabled_skus, m.sku];
      });
    });
    body.appendChild(row);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-secondary btn-block';
  addBtn.style.marginTop = '12px';
  addBtn.textContent = '+ Add custom material';
  addBtn.addEventListener('click', () => {
    const name = prompt('Name:'); if (!name) return;
    const sku = prompt('SKU (unique ID):'); if (!sku) return;
    const category = prompt('Category (primer/paint/stain/clear):');
    const unit = prompt('Unit (GAL/QT):') ?? 'GAL';
    const price = Number(prompt('Price per unit ($):')) || 0;
    const spread = Number(prompt('Spread rate (SF per unit):')) || 400;
    updateState(s => {
      s.catalog.custom_materials.push({ sku, name, category, unit, price_per_unit: price, spread_rate_sf_per_unit: spread });
    });
  });
  body.appendChild(addBtn);
  return card;
}

function availableMaterials(seed, state) {
  return [...seed.materials, ...(state.catalog.custom_materials.map(m => ({ ...m, _custom: true })))]
    .filter(m => !state.catalog.disabled_skus.includes(m.sku));
}

function capitalize(s) { return s[0].toUpperCase() + s.slice(1); }
```

- [ ] **Step 2: Verify in browser**

Start server, go to Mats tab after setting a qty on Job. Verify: picks section shows one row per substrate+category, changing dropdown updates header cost, catalog section lists all seeded Sherwin products. Kill server.

- [ ] **Step 3: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/ui/tab-mats.js
git commit -m "feat: materials tab with picks + catalog editor"
```

---

## Task 11: Setup tab — settings, export/import, generate-quote button

**Files:**
- Modify: `src/ui/tab-setup.js`
- Create: `src/ui/quote-overlay.js`

- [ ] **Step 1: Write `src/ui/quote-overlay.js`**

File: `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\src\ui\quote-overlay.js`
```javascript
import { computeQuote } from '../pricing.js';
import { formatCurrency, formatHours } from '../formatters.js';

export function openQuoteOverlay(state, seed) {
  const overlay = document.getElementById('quote-overlay');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');
  overlay.appendChild(renderQuote(state, seed));
}

function closeQuoteOverlay() {
  document.getElementById('quote-overlay').classList.add('hidden');
}

function renderQuote(state, seed) {
  const q = computeQuote(state, seed);
  const root = document.createElement('div');
  const date = new Date().toLocaleDateString();

  const scopeRows = Object.entries(q.by_substrate).map(([sid, data]) => {
    const sub = state.job.substrates[sid];
    const def = seed.substrates.find(s => s.id === sid);
    if (!data.tasks.length) return '';
    const taskList = data.tasks.map(t => `<li>${t.name} (${t.phase}, ${formatHours(t.hours)})</li>`).join('');
    return `
      <h3>${def.name} — ${data.effective_qty} ${def.uom}</h3>
      <p class="hint">State: ${sub.state} · Finish: ${sub.finish} · Method: ${sub.method}</p>
      <ul>${taskList}</ul>
    `;
  }).join('');

  const matsRows = q.materials_lines.map(m => `
    <tr><td>${m.name}</td><td>${m.qty} ${m.unit}</td><td>${formatCurrency(m.price_per_unit)}</td><td>${formatCurrency(m.line_cost)}</td></tr>
  `).join('');

  root.innerHTML = `
    <h1>${state.job.name || 'Painting Quote'}</h1>
    <p>Date: ${date}</p>
    ${state.job.customer.name ? `<p>Customer: ${state.job.customer.name}</p>` : ''}
    ${state.job.customer.address ? `<p>Address: ${state.job.customer.address}</p>` : ''}

    <h2>Scope</h2>
    ${scopeRows || '<p class="hint">No scope lines.</p>'}

    <h2>Materials</h2>
    <table>
      <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Cost</th></tr></thead>
      <tbody>${matsRows || '<tr><td colspan="4" class="hint">No materials.</td></tr>'}</tbody>
    </table>

    <h2>Breakdown</h2>
    <table>
      <tbody>
        <tr><td>Labor (${formatHours(q.labor_hours)} @ ${formatCurrency(state.settings.labor_rate_per_hour)}/hr)</td><td>${formatCurrency(q.labor_cost)}</td></tr>
        <tr><td>Materials</td><td>${formatCurrency(q.materials_cost)}</td></tr>
        <tr><td>Subtotal</td><td>${formatCurrency(q.subtotal)}</td></tr>
        <tr><td>Overhead (${state.settings.overhead_pct}%)</td><td>${formatCurrency(q.overhead)}</td></tr>
        <tr><td>Profit (${state.settings.profit_pct}%)</td><td>${formatCurrency(q.profit)}</td></tr>
        <tr class="total-row"><td>Total</td><td>${formatCurrency(q.total)}</td></tr>
      </tbody>
    </table>

    ${state.job.customer.notes ? `<h2>Notes</h2><p>${escapeHtml(state.job.customer.notes)}</p>` : ''}

    <div class="actions">
      <button class="btn" id="quote-print">Print / Save PDF</button>
      <button class="btn btn-secondary" id="quote-close">Close</button>
    </div>
  `;
  root.querySelector('#quote-print').addEventListener('click', () => window.print());
  root.querySelector('#quote-close').addEventListener('click', closeQuoteOverlay);
  return root;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Write the Setup tab**

Replace `src/ui/tab-setup.js` with:
```javascript
import { defaultState, exportStateJson, importStateJson, saveState } from '../state.js';
import { openQuoteOverlay } from './quote-overlay.js';

export function renderSetupTab(el, state, seed, updateState) {
  el.innerHTML = '';

  el.appendChild(section('Pricing', [
    numField('Labor rate ($/hr)', state.settings.labor_rate_per_hour, v => updateState(s => { s.settings.labor_rate_per_hour = v; })),
    numField('Overhead (%)',      state.settings.overhead_pct,         v => updateState(s => { s.settings.overhead_pct = v; })),
    numField('Profit (%)',        state.settings.profit_pct,           v => updateState(s => { s.settings.profit_pct = v; }))
  ]));

  el.appendChild(section('Door Frame Geometry', [
    numField('Jamb LF per frame EA',   state.settings.door_frame.jamb_lf_per_ea,   v => updateState(s => { s.settings.door_frame.jamb_lf_per_ea = v; })),
    numField('Casing LF per frame EA', state.settings.door_frame.casing_lf_per_ea, v => updateState(s => { s.settings.door_frame.casing_lf_per_ea = v; }))
  ]));

  el.appendChild(section('Customer', [
    textField('Customer name',    state.job.customer.name,    v => updateState(s => { s.job.customer.name = v; })),
    textField('Customer address', state.job.customer.address, v => updateState(s => { s.job.customer.address = v; })),
    textField('Notes',            state.job.customer.notes,   v => updateState(s => { s.job.customer.notes = v; }), 'textarea')
  ]));

  const generateBtn = document.createElement('button');
  generateBtn.className = 'btn btn-block';
  generateBtn.textContent = 'Generate Quote';
  generateBtn.addEventListener('click', () => openQuoteOverlay(state, seed));
  el.appendChild(generateBtn);

  el.appendChild(section('Data', [
    makeExportImport(state),
    resetButton(updateState)
  ]));
}

function section(title, children) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<div class="card-header"><div class="card-title">${title}</div></div>`;
  const body = document.createElement('div');
  body.className = 'card-body';
  body.style.paddingTop = '12px';
  card.appendChild(body);
  for (const c of children) body.appendChild(c);
  return card;
}

function numField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `<label>${label}</label>`;
  const input = document.createElement('input');
  input.type = 'number'; input.step = '0.01'; input.value = value;
  input.addEventListener('change', e => onChange(Number(e.target.value) || 0));
  wrap.appendChild(input);
  return wrap;
}

function textField(label, value, onChange, kind = 'input') {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `<label>${label}</label>`;
  const el = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
  if (kind !== 'textarea') el.type = 'text';
  el.value = value;
  el.addEventListener('change', e => onChange(e.target.value));
  wrap.appendChild(el);
  return wrap;
}

function makeExportImport(state) {
  const wrap = document.createElement('div');
  wrap.className = 'row';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary';
  exportBtn.style.flex = '1';
  exportBtn.textContent = 'Export JSON';
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([exportStateJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paintfactor-mini-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary';
  importBtn.style.flex = '1';
  importBtn.textContent = 'Import JSON';
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = importStateJson(text);
        saveState(imported);
        location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    });
    input.click();
  });

  wrap.appendChild(exportBtn);
  wrap.appendChild(importBtn);
  return wrap;
}

function resetButton(updateState) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-danger btn-block';
  btn.style.marginTop = '12px';
  btn.textContent = 'Reset to defaults';
  btn.addEventListener('click', () => {
    if (!confirm('Reset all data to defaults? This cannot be undone.')) return;
    if (!confirm('Really reset? All job data and catalog overrides will be lost.')) return;
    updateState(s => {
      const d = defaultState();
      for (const k of Object.keys(s)) delete s[k];
      Object.assign(s, d);
    });
    location.reload();
  });
  return btn;
}
```

- [ ] **Step 3: Verify in browser**

Start server. Setup tab shows 4 cards (Pricing, Door Frame Geometry, Customer, Data). Change labor rate, verify header total updates. Click Generate Quote — full-screen quote view shows scope + breakdown. Click Print opens browser print dialog. Close returns to Setup. Kill server.

- [ ] **Step 4: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add src/ui/tab-setup.js src/ui/quote-overlay.js
git commit -m "feat: setup tab + quote overlay with print"
```

---

## Task 12: Manual QA + README finalize

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full test suite**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
npm test
```

Expected: all tests across state, derivations, pricing pass.

- [ ] **Step 2: Manual smoke test (mobile viewport, Chrome DevTools)**

Start server:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
python3 -m http.server 5173
```

Open http://localhost:5173 in Chrome with DevTools device mode (iPhone SE 375×667).

Walk through this scenario and verify each expectation:

1. **Job tab** — set:
   - Baseboard: 450 LF, factory primer, paint, brush
   - Door Casing: 0 LF direct (leave 0)
   - Door Frame: 5 EA, bare wood, prime_and_paint, brush
   - Door Slab: 10 sides, factory primer, paint, spray
2. Verify Door Casing card auto-shows "+170 LF from frames" derived qty.
3. Switch to **Tasks tab**: each substrate card shows its filtered tasks. Toggle one off — header total drops.
4. Switch to **Mats tab**: picks show one row per substrate+category. Auto-computed qty is sensible. Change a paint product — header total updates.
5. Switch to **Setup tab**: change labor rate to $75 — header total updates. Click Generate Quote — verify scope + breakdown display correctly. Click Print — OS dialog appears. Close.
6. Click Export JSON — file downloads. Open in editor to confirm it is valid JSON containing your inputs.
7. Click Reset to defaults — confirm twice — page reloads with all zeros.

Kill server. If any step fails, fix inline and re-verify before committing.

- [ ] **Step 3: Finalize README**

Replace `C:\Eric_AI_Playground\Claude Code Uni\PaintFactorMini\README.md` with:
```markdown
# PaintFactor Mini

Mobile-first pricing calculator for NC interior trim — baseboard, door casing, door frame, door slabs.

Static HTML + vanilla JS. No build step. Data persists in browser `localStorage`.

## Deploy

Drag the `PaintFactorMini/` folder onto Netlify (or any static host), or open `index.html` directly.

Use a mobile device (or Chrome DevTools device mode) — UI is phone-first.

## Daily Use

1. **Job** — enter quantities per substrate, pick state / finish / method.
2. **Tasks** — review & toggle recommended tasks, override rates if needed.
3. **Mats** — pick products, review auto-computed quantities (overridable).
4. **Setup** — labor rate, overhead/profit %, door-frame geometry, customer info, Generate Quote.

Click **Generate Quote** → full-screen printable quote with scope + charge breakdown.

## Backup

Setup → **Export JSON** saves all data to a file. Import to restore on another device.

## Regenerate seed from PaintFactor

When task rates / material prices change in the parent PaintFactor repo:

```bash
npm run seed
```

This reads from `C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\cranky-saha\Claude` and regenerates `seed.json` + `build-seed.log`. Your user data in `localStorage` is unaffected (rate overrides remain).

## Development

- `npm test` — pricing/state/derivations tests (Node built-in runner).
- `npm run serve` — local static server at http://localhost:5173.
```

- [ ] **Step 4: Commit**

Run:
```bash
cd "/c/Eric_AI_Playground/Claude Code Uni/PaintFactorMini"
git add README.md
git commit -m "docs: finalize README after QA pass"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task(s) covered |
|---|---|
| Folder + stack + git | Task 1 |
| Seed extraction | Task 2 |
| Storage (localStorage) + defaults + migration | Task 3 |
| Pricing formula | Task 4, 5 |
| Derived values (effective qty, task filter, material qty) | Task 4 |
| Mobile-first UI shell + tab bar | Task 6, 7 |
| Job tab (4 substrate cards, door frame derivation display) | Task 8 |
| Tasks tab (filtered, toggle, rate edit) | Task 9 |
| Mats tab (picks auto-compute + catalog editor) | Task 10 |
| Setup tab (labor, overhead, profit, door-frame constants, customer) | Task 11 |
| Export / import / reset | Task 11 |
| Quote overlay (scope + breakdown, print) | Task 11 |
| README + manual QA | Task 12 |

**Placeholder scan:** No TBD/TODO. All code blocks contain complete implementations with no "fill in the rest" gaps. Warnings/validations are handled inline in the UI (e.g., "0 matching tasks" hint in Task 9); not a separate task.

**Type consistency check:** All files consistently use `state.job.substrates[id]` shape, `state.settings.door_frame.*`, and the `task_overrides` map keyed by `task_id`. `computeQuote` returns the same field names (`labor_hours`, `labor_cost`, `materials_cost`, `subtotal`, `overhead`, `profit`, `total`, `by_substrate`, `materials_lines`) used by the header + quote overlay.

---

Plan complete and saved to `Claude/docs/superpowers/plans/2026-04-24-paintfactor-mini.md`.
