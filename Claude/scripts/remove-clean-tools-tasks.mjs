#!/usr/bin/env node
// Remove clean-tools / clean-equipment / tool-cleanup tasks from all modules.
// Mirror of the legacy SUPPRESSED_TASKS filter (commit 96ad56f on main) so the
// scenario engine doesn't still emit them. 47 fixed-time cleanup tasks were
// inflating estimates by ~40 hours on a real NC project. Real cleanup
// overhead is absorbed into production rates.
//
// Pattern match (case-sensitive, deliberately broad):
//   CLEAN_TOOLS | CLEAN_EQUIPMENT | TOOL_CLEANUP | TOOL_CLEAN | EQUIPMENT_CLEAN | FINAL_CLEANUP
//
// Usage: node Claude/scripts/remove-clean-tools-tasks.mjs
// Idempotent — safe to re-run.

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'modules');

const PATTERNS = [
  /CLEAN_TOOLS/,
  /CLEAN_EQUIPMENT/,
  /TOOL_CLEANUP/,
  /TOOL_CLEAN(?!UP)/,   // TOOL_CLEAN but not already caught by TOOL_CLEANUP
  /EQUIPMENT_CLEAN/,
  /FINAL_CLEANUP/,
];

function matchesCleanPattern(taskId) {
  return PATTERNS.some(p => p.test(taskId));
}

const files = readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'));
let totalRemoved = 0;
let modulesTouched = 0;
const removedByFile = [];

for (const file of files) {
  const path = join(MODULES_DIR, file);
  const mod = JSON.parse(readFileSync(path, 'utf-8'));
  if (!Array.isArray(mod.tasks)) continue;

  const before = mod.tasks.length;
  const kept = mod.tasks.filter(t => {
    if (matchesCleanPattern(t.task_id || '')) {
      return false;
    }
    return true;
  });
  const removed = before - kept.length;

  if (removed > 0) {
    const removedIds = mod.tasks.filter(t => matchesCleanPattern(t.task_id || '')).map(t => t.task_id);
    mod.tasks = kept;
    writeFileSync(path, JSON.stringify(mod, null, 2) + '\n', 'utf-8');
    totalRemoved += removed;
    modulesTouched++;
    removedByFile.push({ file, removedIds });
  }
}

console.log(`Removed ${totalRemoved} clean-tools tasks from ${modulesTouched} modules.`);
if (removedByFile.length && process.argv.includes('--verbose')) {
  for (const { file, removedIds } of removedByFile) {
    console.log(`  ${file}: ${removedIds.join(', ')}`);
  }
}
