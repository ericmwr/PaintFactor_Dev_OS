#!/usr/bin/env node
// Convert `rates_by_coat: { "1": X, "2": Y }` on any task to
// `rate_per_hour: X` + `coat_2_rate_multiplier: Y/X`.
//
// Policy override (per user direction 2026-04-18): coat 2 is always
// faster than or equal to coat 1. If the existing data has coat 2
// slower (multiplier < 1.0), flip to 1.25 to match cut-in trim doctrine
// and report so doctrine text can be reviewed.
//
// Idempotent — safe to re-run. Reports every change.

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'modules');
const FLIP_TARGET = 1.25;   // when coat 2 is currently slower, flip to this

const files = readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));
const summary = [];

for (const file of files) {
  const path = join(MODULES_DIR, file);
  const mod = JSON.parse(readFileSync(path, 'utf-8'));
  if (!Array.isArray(mod.tasks)) continue;

  let modTouched = false;
  const taskChanges = [];

  for (const task of mod.tasks) {
    if (!task.rates_by_coat || typeof task.rates_by_coat !== 'object') continue;
    const rc = task.rates_by_coat;
    const r1 = rc['1'] ?? rc[1];
    const r2 = rc['2'] ?? rc[2];
    if (typeof r1 !== 'number' || r1 <= 0) continue;

    const newRate = r1;
    let multiplier = null;
    let flipped = false;
    if (typeof r2 === 'number' && r2 > 0 && r2 !== r1) {
      const raw = r2 / r1;
      if (raw < 1.0) {
        // coat 2 slower — override per policy
        multiplier = FLIP_TARGET;
        flipped = true;
      } else {
        multiplier = Math.round(raw * 100) / 100;
      }
    }

    delete task.rates_by_coat;
    task.rate_per_hour = newRate;
    if (multiplier != null && multiplier !== 1.0) {
      task.coat_2_rate_multiplier = multiplier;
    }
    taskChanges.push({ task_id: task.task_id, from: { r1, r2 }, to: { rate_per_hour: newRate, coat_2_rate_multiplier: multiplier }, flipped });
    modTouched = true;
  }

  if (modTouched) {
    writeFileSync(path, JSON.stringify(mod, null, 2) + '\n', 'utf-8');
    summary.push({ file, changes: taskChanges });
  }
}

console.log(`Migrated ${summary.length} modules.`);
for (const { file, changes } of summary) {
  console.log(`\n${file}:`);
  for (const c of changes) {
    const multStr = c.to.coat_2_rate_multiplier != null ? ` × ${c.to.coat_2_rate_multiplier}` : '';
    const flag = c.flipped ? ' [FLIPPED — was coat 2 slower, doctrine may need review]' : '';
    console.log(`  ${c.task_id}: {1:${c.from.r1}, 2:${c.from.r2}} → ${c.to.rate_per_hour}${multStr}${flag}`);
  }
}

const flippedModules = summary.filter(s => s.changes.some(c => c.flipped));
if (flippedModules.length) {
  console.log(`\n⚠ ${flippedModules.length} module(s) had coat-2-slower rates flipped to ${FLIP_TARGET}x (faster). Review doctrine text for:`);
  for (const m of flippedModules) console.log(`  - ${m.file}`);
}
