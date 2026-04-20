#!/usr/bin/env node
// Read-only analysis: scan every inline task across Claude/modules/*.json,
// group by task_id, and report which tasks are clean-consensus (all copies
// identical on rate/ps_key/uom) vs drifted.
//
// Output:
//   - Summary counts: total unique task_ids, in library, clean consensus, drifted
//   - Clean-consensus list: ready for bulk extraction
//   - Drift report: fields that differ + which modules have each value
//
// Usage:  node Claude/scripts/analyze-task-drift.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(repoRoot, 'Claude', 'modules');
const tasksDir = path.join(repoRoot, 'Claude', 'tasks');

// Fields that must match across copies for "clean consensus" (Option X strict)
const IDENTITY_FIELDS = ['rate_per_hour', 'ps_key', 'uom'];
// Fields we allow to differ — they become per-module overrides on the task_ref
const OVERRIDE_FIELDS = ['skill_level', 'name', 'applies_when', 'modifier_eligibility', 'coat_2_rate_multiplier', 'task_classification', 'chain_behavior', 'per_item'];

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

function loadInlineOccurrences() {
  // Map: task_id -> [{ module_id, task }, ...]
  const occurrences = new Map();
  const files = fs.readdirSync(modulesDir).filter(f => f.startsWith('MOD_') && f.endsWith('.json'));
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(modulesDir, file), 'utf8'));
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (!entry || entry.task_ref) continue; // skip library refs
      const tid = entry.task_id;
      if (!tid) continue;
      if (!occurrences.has(tid)) occurrences.set(tid, []);
      occurrences.get(tid).push({ module_id: mod.module_id, task: entry });
    }
  }
  return occurrences;
}

function stableStringify(v) {
  // Order-independent JSON for deep equality check on override fields
  if (v == null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

function valueEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function analyzeGroup(taskId, copies) {
  // Check identity fields for drift
  const drifts = {};
  for (const field of IDENTITY_FIELDS) {
    const values = new Map(); // stringified -> [module_id, ...]
    for (const { module_id, task } of copies) {
      const v = task[field];
      const key = stableStringify(v);
      if (!values.has(key)) values.set(key, { value: v, modules: [] });
      values.get(key).modules.push(module_id);
    }
    if (values.size > 1) {
      drifts[field] = Array.from(values.values());
    }
  }
  const hasIdentityDrift = Object.keys(drifts).length > 0;

  // Collect override-field variance (not drift — expected to differ per module)
  const overrideVariance = {};
  for (const field of OVERRIDE_FIELDS) {
    const values = new Map();
    for (const { module_id, task } of copies) {
      if (!Object.prototype.hasOwnProperty.call(task, field)) continue;
      const key = stableStringify(task[field]);
      if (!values.has(key)) values.set(key, { value: task[field], modules: [] });
      values.get(key).modules.push(module_id);
    }
    if (values.size > 1) {
      overrideVariance[field] = Array.from(values.values());
    }
  }

  return { hasIdentityDrift, drifts, overrideVariance };
}

function main() {
  const library = loadLibrary();
  const occurrences = loadInlineOccurrences();

  const uniqueIds = occurrences.size;
  const duplicated = Array.from(occurrences.entries()).filter(([_, c]) => c.length > 1);

  const clean = [];   // task_ids where every copy agrees on identity fields
  const drifted = []; // task_ids where identity fields differ
  const singletons = [];  // task_ids that only appear once — extraction still viable

  for (const [tid, copies] of occurrences) {
    if (library.has(tid)) continue; // already in library — skip (inline/library collision, reported separately by bundle builder)
    if (copies.length === 1) {
      singletons.push({ task_id: tid, copies });
      continue;
    }
    const analysis = analyzeGroup(tid, copies);
    if (analysis.hasIdentityDrift) {
      drifted.push({ task_id: tid, copies, ...analysis });
    } else {
      clean.push({ task_id: tid, copies, ...analysis });
    }
  }

  // Print report
  console.log('\n=== TASK DRIFT ANALYSIS ===\n');
  console.log(`Unique inline task_ids:   ${uniqueIds}`);
  console.log(`  Already in library:     ${Array.from(library).filter(id => occurrences.has(id)).length}`);
  console.log(`  Duplicated (>=2 copies): ${duplicated.length}`);
  console.log(`  Singletons (1 copy):    ${singletons.length}`);
  console.log('');
  console.log(`Duplicated breakdown:`);
  console.log(`  Clean consensus (safe to extract): ${clean.length}`);
  console.log(`  Drifted (identity-field mismatch): ${drifted.length}`);

  // Clean consensus: ranked by copy count (highest-duplication first)
  console.log('\n--- CLEAN CONSENSUS (ready for bulk extraction) ---');
  clean.sort((a, b) => b.copies.length - a.copies.length);
  for (const { task_id, copies, overrideVariance } of clean.slice(0, 40)) {
    const sample = copies[0].task;
    const overrideFields = Object.keys(overrideVariance).length > 0 ? ` · varies: ${Object.keys(overrideVariance).join(',')}` : '';
    const rate = sample.rate_per_hour != null ? `${sample.rate_per_hour} ${sample.uom}/hr` : (sample.fixed_minutes != null ? `${sample.fixed_minutes}m fixed` : '—');
    console.log(`  ${task_id.padEnd(42)} ×${String(copies.length).padEnd(3)} ${rate}${overrideFields}`);
  }
  if (clean.length > 40) console.log(`  ... and ${clean.length - 40} more`);

  // Drift cases — each one needs review
  console.log('\n--- DRIFTED (manual review needed) ---');
  drifted.sort((a, b) => b.copies.length - a.copies.length);
  for (const { task_id, copies, drifts } of drifted) {
    console.log(`\n  ${task_id} — ${copies.length} copies, drift on: ${Object.keys(drifts).join(', ')}`);
    for (const [field, variants] of Object.entries(drifts)) {
      console.log(`    ${field}:`);
      for (const variant of variants) {
        const modList = variant.modules.length <= 3 ? variant.modules.join(', ') : `${variant.modules.slice(0, 3).join(', ')}, +${variant.modules.length - 3} more`;
        console.log(`      ${JSON.stringify(variant.value)} → ${modList}`);
      }
    }
  }

  // Summary of potential payoff
  const totalCleanCopies = clean.reduce((s, c) => s + c.copies.length, 0);
  const totalDriftedCopies = drifted.reduce((s, c) => s + c.copies.length, 0);
  console.log('\n--- PAYOFF SUMMARY ---');
  console.log(`Clean extraction would:
  + Create ${clean.length} canonical task files
  + Convert ${totalCleanCopies} inline task defs to task_refs
  + Shrink inline task count from ~${uniqueIds + duplicated.reduce((s, [_, c]) => s + c.length, 0) - uniqueIds} to ~${uniqueIds + duplicated.reduce((s, [_, c]) => s + c.length - 1, 0) - duplicated.reduce((s, [_, c]) => s + c.length - 1, 0) + singletons.length}

Drift resolution (deferred):
  + ${drifted.length} tasks need decision on canonical value
  + ${totalDriftedCopies} inline copies pending those decisions
`);
}

main();
