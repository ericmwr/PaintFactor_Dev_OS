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
