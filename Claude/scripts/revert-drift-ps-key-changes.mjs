#!/usr/bin/env node
// Revert the ps_key remapping from the full extraction.
//
// The original extraction picked "canonical ps_keys" by interpreting the
// unified-counting guidance as literal string names, but those strings
// don't always match what quantity-lookups.js actually emits. Result: 33
// tasks had dead ps_keys and silently stopped firing (McLeod estimate
// dropped ~430h).
//
// This script restores bit-identity per module by:
//   1. Canonical task ps_key = whatever the NC-side inline task had
//      (primary_source from extraction-report.json)
//   2. For every other copy (typically RP modules), if its original
//      ps_key differs from the new canonical, add a per-module ps_key
//      override on the task_ref entry
//
// Rate reconciliation is NOT reverted — NC-rate-wins rule stays.
// Singletons (2008 tasks) are untouched — they passed bit-identity.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const modulesDir = path.join(repoRoot, 'Claude', 'modules');
const tasksDir = path.join(repoRoot, 'Claude', 'tasks');
const reportPath = path.join(__dirname, 'extraction-report.json');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, v) { fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8'); }

function main() {
  const report = readJson(reportPath);
  const drifts = report.drift_reconciliations.filter(d => d.ps_key_change);
  console.log(`Reverting ps_key remap on ${drifts.length} drift cases.\n`);

  const log = [];

  for (const drift of drifts) {
    const { task_id, primary_source, original_copies } = drift;

    // Find the NC-side original ps_key — that of the primary_source module
    const primaryCopy = original_copies.find(c => c.module_id === primary_source);
    if (!primaryCopy) {
      console.warn(`  SKIP ${task_id} — primary_source not found in original_copies`);
      continue;
    }
    const ncPsKey = primaryCopy.ps_key;

    // Update canonical task file
    const taskPath = path.join(tasksDir, `${task_id}.json`);
    const canonical = readJson(taskPath);
    const oldCanonicalPsKey = canonical.ps_key;
    canonical.ps_key = ncPsKey;
    writeJson(taskPath, canonical);

    // Walk every module that references this task — update overrides
    const overrideActions = [];
    for (const copy of original_copies) {
      const modPath = path.join(modulesDir, `${copy.module_id}.json`);
      if (!fs.existsSync(modPath)) {
        overrideActions.push({ module: copy.module_id, action: 'module-missing' });
        continue;
      }
      const mod = readJson(modPath);
      if (!Array.isArray(mod.tasks)) continue;

      let dirty = false;
      for (const entry of mod.tasks) {
        if (!entry || entry.task_ref !== task_id) continue;

        // If this module's original ps_key matches the new canonical, no override needed
        if (copy.ps_key === ncPsKey) {
          if ('ps_key' in entry) { delete entry.ps_key; dirty = true; }
          continue;
        }

        // Module's original ps_key differs from canonical → add override
        if (entry.ps_key !== copy.ps_key) {
          entry.ps_key = copy.ps_key;
          dirty = true;
        }
      }
      if (dirty) {
        writeJson(modPath, mod);
        overrideActions.push({ module: copy.module_id, ps_key_override: copy.ps_key });
      } else {
        overrideActions.push({ module: copy.module_id, action: 'no-change' });
      }
    }

    log.push({
      task_id,
      canonical_ps_key_reverted: { from: oldCanonicalPsKey, to: ncPsKey },
      module_overrides: overrideActions,
    });
    console.log(`  ${task_id}: canonical ${oldCanonicalPsKey} → ${ncPsKey}`);
    for (const a of overrideActions) {
      if (a.ps_key_override) console.log(`    ${a.module}: override ps_key = ${a.ps_key_override}`);
    }
  }

  // Write revert log
  const logPath = path.join(__dirname, 'revert-ps-key-log.json');
  writeJson(logPath, { generated: new Date().toISOString(), reverts: log });
  console.log(`\nRevert log: ${path.relative(repoRoot, logPath)}`);
  console.log(`\nDone. ${drifts.length} canonical tasks restored to NC-side ps_keys, per-module overrides applied where needed.`);
}

main();
