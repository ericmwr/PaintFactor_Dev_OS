#!/usr/bin/env node
// Full task library extraction.
//
// For every inline task across Claude/modules/*.json:
//   - Singleton (appears in exactly one module): promote to canonical
//     Claude/tasks/<task_id>.json, rewrite the module entry as
//     { task_ref, ...module-level overrides }. Assert bit-identity of
//     the resolved shape vs the original inline task.
//   - Drift case (task_id appears in 2+ modules with identity-field
//     differences): reconcile per user guidance. Use NC-side rate,
//     canonical ps_key from DRIFT_FAMILY_PS_KEY. Both modules become
//     { task_ref, ...per-module overrides }.
//
// Fields that stay on module entries (usage-context):
//   - applies_when, chain_behavior
// Everything else moves to the canonical task file.
//
// Output: ./Claude/tasks/TSK_*.json files, rewritten module files,
// plus Claude/scripts/extraction-report.json detailing every action.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(repoRoot, 'Claude', 'modules');
const tasksDir = path.join(repoRoot, 'Claude', 'tasks');
const reportPath = path.join(__dirname, 'extraction-report.json');

// Canonical ps_key remap for drift cases (per user's unified counting model)
const DRIFT_FAMILY_PS_KEY = {
  DRRP: 'PS_OPENING_EA.DOOR_TOTAL',
  WNRP: 'PS_OPENING_EA.WINDOW_TOTAL',
  CBRP: 'PS_SURFACE_EA.CABINET_DOOR',
  TMRP: 'PS_SURFACE_LF.TRIM_TOTAL',
  STRP: 'PS_SURFACE_EA.STAIR_FLIGHT',
  CLRP: 'PS_SURFACE_SF.CLOSET_WALL',
  SPRP: 'PS_SURFACE_EA.SPECIALTY_ITEM',
  // DCRP, DWRP have no ps_key drift — omitted → use NC copy's ps_key as-is
};

// Fields that stay on the MODULE entry (not canonical) because they express
// usage context for that specific module reference.
const MODULE_ENTRY_FIELDS = new Set(['applies_when', 'chain_behavior']);

function loadModules() {
  const files = fs.readdirSync(modulesDir).filter(f => f.startsWith('MOD_') && f.endsWith('.json'));
  const modules = {};
  for (const file of files) {
    const full = path.join(modulesDir, file);
    const mod = JSON.parse(fs.readFileSync(full, 'utf8'));
    modules[mod.module_id] = { path: full, data: mod };
  }
  return modules;
}

function loadLibrary() {
  const ids = new Set();
  if (!fs.existsSync(tasksDir)) return ids;
  for (const file of fs.readdirSync(tasksDir)) {
    if (!file.startsWith('TSK_') || !file.endsWith('.json')) continue;
    const t = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf8'));
    if (t.task_id) ids.add(t.task_id);
  }
  return ids;
}

function deriveFamily(taskId) {
  // task_id like TSK_DRRP_FINISH_BRUSH → family DRRP
  const m = taskId.match(/^TSK_([A-Z]+)_/);
  return m ? m[1] : null;
}

function isNcModule(moduleId) {
  // NC modules do NOT end in _RP and do NOT contain _RP_ in the name.
  // Examples:
  //   NC: MOD_APPLY_DRRP_FINISH, MOD_CLEANUP_DRRP, MOD_APPLY_DRRP_FINISH_COAT2
  //   RP: MOD_APPLY_DRRP_FINISH_RP, MOD_APPLY_EXT_DOOR_FINISH_RP, MOD_CLEANUP_DRRP_RP
  if (moduleId.endsWith('_RP')) return false;
  if (moduleId.includes('_RP_')) return false;
  return true;
}

function splitTaskFields(inlineTask) {
  const canonical = {};
  const moduleOverrides = {};
  for (const [k, v] of Object.entries(inlineTask)) {
    if (MODULE_ENTRY_FIELDS.has(k)) moduleOverrides[k] = v;
    else canonical[k] = v;
  }
  return { canonical, moduleOverrides };
}

function stableStringify(v) {
  if (v == null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

function resolvedShape(canonical, moduleEntryNoRef) {
  // Mirrors engine's resolveTaskFromRef: spread canonical then entry overrides
  return { ...canonical, ...moduleEntryNoRef };
}

function writeTaskFile(task) {
  const file = path.join(tasksDir, `${task.task_id}.json`);
  if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(task, null, 2) + '\n', 'utf8');
}

function writeModuleFile(mod, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(mod, null, 2) + '\n', 'utf8');
}

function main() {
  const modules = loadModules();
  const library = loadLibrary();

  // Gather: task_id -> [{ moduleKey, taskIndex, inlineTask }]
  const occurrences = new Map();
  for (const [moduleId, { data: mod }] of Object.entries(modules)) {
    if (!Array.isArray(mod.tasks)) continue;
    mod.tasks.forEach((entry, idx) => {
      if (!entry || entry.task_ref) return;
      const tid = entry.task_id;
      if (!tid) return;
      if (!occurrences.has(tid)) occurrences.set(tid, []);
      occurrences.get(tid).push({ moduleId, idx, inlineTask: entry });
    });
  }

  const report = {
    generated: new Date().toISOString(),
    singletons: [],
    drift_reconciliations: [],
    skipped_in_library: [],
    verification_failures: [],
    summary: {},
  };

  // --- Singletons ---
  for (const [tid, copies] of occurrences) {
    if (library.has(tid)) {
      report.skipped_in_library.push(tid);
      continue;
    }
    if (copies.length !== 1) continue; // drift handled below

    const { moduleId, idx, inlineTask } = copies[0];
    const { canonical, moduleOverrides } = splitTaskFields(inlineTask);

    // Write canonical task file
    writeTaskFile(canonical);

    // Build module entry: { task_ref: tid, ...moduleOverrides }
    const newEntry = { task_ref: tid, ...moduleOverrides };

    // Bit-identity check: resolved shape must equal original inline task
    const resolvedFields = resolvedShape(canonical, moduleOverrides);
    if (stableStringify(resolvedFields) !== stableStringify(inlineTask)) {
      report.verification_failures.push({
        task_id: tid,
        module_id: moduleId,
        original: inlineTask,
        resolved: resolvedFields,
      });
      continue;
    }

    // Apply to module (in-memory; written below)
    modules[moduleId].data.tasks[idx] = newEntry;
    report.singletons.push({ task_id: tid, module_id: moduleId });
  }

  // --- Drift reconciliations ---
  for (const [tid, copies] of occurrences) {
    if (library.has(tid)) continue;
    if (copies.length < 2) continue;

    // Pick NC side: first module whose name is NOT _RP-suffixed.
    // Edge: if all copies are _RP (e.g., TSK_DRRP_INTERSTAGE_INSPECT), fall back
    // to alphabetically-first module.
    const ncCopies = copies.filter(c => isNcModule(c.moduleId));
    const primary = (ncCopies.length > 0 ? ncCopies : [...copies].sort((a, b) => a.moduleId.localeCompare(b.moduleId)))[0];
    const primaryOrigin = ncCopies.length > 0 ? 'nc-side' : 'alphabetic-first';

    // Build canonical from primary copy's fields, minus module-entry fields
    const { canonical: primaryCanonical } = splitTaskFields(primary.inlineTask);
    const family = deriveFamily(tid);
    const canonical = { ...primaryCanonical };

    // Override ps_key per user's unified counting table
    const familyPsKey = family ? DRIFT_FAMILY_PS_KEY[family] : null;
    let psKeyChangeNote = null;
    if (familyPsKey && canonical.ps_key !== familyPsKey) {
      psKeyChangeNote = { from: canonical.ps_key, to: familyPsKey };
      canonical.ps_key = familyPsKey;
    }

    // Write canonical file
    writeTaskFile(canonical);

    // Rewrite every copy's module entry. For each copy, compute what fields
    // differ from canonical and preserve those as overrides on the entry.
    const perCopyRewrites = [];
    for (const copy of copies) {
      const inlineFields = copy.inlineTask;
      const overrides = {};
      for (const [k, v] of Object.entries(inlineFields)) {
        if (MODULE_ENTRY_FIELDS.has(k)) {
          overrides[k] = v;
          continue;
        }
        // Any identity/content field that differs from canonical becomes a
        // per-module override — preserves the module's existing behavior
        // EXCEPT where the drift-reconciliation rule demanded a change
        // (rate → canonical per NC-rate rule, ps_key → canonical per table).
        const forceCanon = (k === 'rate_per_hour' || k === 'ps_key');
        if (!forceCanon && stableStringify(v) !== stableStringify(canonical[k])) {
          overrides[k] = v;
        }
      }
      const newEntry = { task_ref: tid, ...overrides };
      modules[copy.moduleId].data.tasks[copy.idx] = newEntry;
      perCopyRewrites.push({ module_id: copy.moduleId, overrides });
    }

    report.drift_reconciliations.push({
      task_id: tid,
      family,
      primary_source: primary.moduleId,
      primary_origin: primaryOrigin,
      canonical_rate: canonical.rate_per_hour,
      canonical_ps_key: canonical.ps_key,
      ps_key_change: psKeyChangeNote,
      original_copies: copies.map(c => ({
        module_id: c.moduleId,
        rate_per_hour: c.inlineTask.rate_per_hour,
        ps_key: c.inlineTask.ps_key,
      })),
      per_copy_rewrites: perCopyRewrites,
    });
  }

  // Write all modules
  for (const { path: filePath, data } of Object.values(modules)) {
    writeModuleFile(data, filePath);
  }

  // Summary
  report.summary = {
    singletons_extracted: report.singletons.length,
    drift_cases_reconciled: report.drift_reconciliations.length,
    ps_key_changes: report.drift_reconciliations.filter(d => d.ps_key_change).length,
    already_in_library: report.skipped_in_library.length,
    verification_failures: report.verification_failures.length,
    total_canonical_tasks_after: fs.readdirSync(tasksDir).filter(f => f.startsWith('TSK_') && f.endsWith('.json')).length,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  // Console summary
  console.log('\n=== EXTRACTION SUMMARY ===');
  console.log(`Singletons extracted:       ${report.summary.singletons_extracted}`);
  console.log(`Drift cases reconciled:     ${report.summary.drift_cases_reconciled}`);
  console.log(`  Of which ps_key changed:  ${report.summary.ps_key_changes}`);
  console.log(`Already in library (skip):  ${report.summary.already_in_library}`);
  console.log(`Canonical tasks total:      ${report.summary.total_canonical_tasks_after}`);
  console.log(`Verification failures:      ${report.summary.verification_failures}`);
  console.log(`\nReport written: ${path.relative(repoRoot, reportPath)}`);
  if (report.summary.verification_failures > 0) {
    console.error('\nVERIFICATION FAILURES — inspect report before committing!');
    process.exit(1);
  }
}

main();
