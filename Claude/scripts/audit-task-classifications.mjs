#!/usr/bin/env node
// Audit canonical tasks against their derived classifications.
//
// Reads task._derived from the bundle, runs each task through a set of flag
// rules, and writes a CSV of every task that has at least one flag.
//
// Flag rules:
//   ORPHAN              - no module references this task
//   NO_PHASE            - non-orphan task whose modules carry no phase
//   NO_SUBSTRATE        - task lives in modules, but those modules aren't in
//                         any scenario with a paintable_item
//   NO_QT               - modules -> scenarios, but quality_tier missing on
//                         every reachable scenario
//   ACTIVITY_UNMATCHED  - name doesn't match any rule in activity-rules.js
//   PHASE_DOCTRINE_HINT - name implies one phase, derivation says another
//                         (e.g. CLEAR_BRUSH -> name suggests finish, derived
//                         says apply)
//   MULTI_PHASE         - task lives across modules of different phases
//                         (sometimes legit, sometimes a content mistake)
//   MULTI_SUBSTRATE     - task reaches scenarios with >5 distinct substrates
//                         (universal task - usually fine, flag for review)
//   PI_INT_PREFIX_DUPE  - task reaches BOTH int_X and X paintable_items;
//                         a data-side normalization is overdue
//
// Usage:
//   node Claude/scripts/audit-task-classifications.mjs
//
// Writes:
//   Claude/_task_audit.csv        (one row per task, all classifications)
//   Claude/_task_audit.flags.csv  (one row per (task, flag) pair)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTIVITY_RULES } from '../tools/paintscope/src/data/activity-rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const bundlePath = path.join(repoRoot, 'Claude', 'tools', 'paintscope', 'src', 'data', 'scenario-bundle.gen.js');
const outAllPath = path.join(repoRoot, 'Claude', '_task_audit.csv');
const outFlagsPath = path.join(repoRoot, 'Claude', '_task_audit.flags.csv');

const PHASE_HINTS = [
  { match: /SAND/, expect: ['prep', 'interstage'] },
  { match: /CLEAN_INTERSTAGE/, expect: ['interstage'] },
  { match: /VACUUM_INTERCOAT/, expect: ['interstage'] },
  { match: /FILL_FASTENERS|FILL_DEFECT|SPACKLE|CAULK/, expect: ['prep'] },
  { match: /PRIME(?!R)/, expect: ['prime'] },
  { match: /FINAL_INSPECT|TOUCHUP_FINAL/, expect: ['cleanup', 'finish'] },
  { match: /FLOOR_MASK_INSTALL|OUTLET.*INSTALL|HVAC.*INSTALL/, expect: ['setup'] },
  { match: /FLOOR_MASK_REMOVE|OUTLET.*REMOVE|HVAC.*REMOVE/, expect: ['cleanup'] },
];

function matchActivity(taskId) {
  for (const rule of ACTIVITY_RULES) {
    if (rule.match.test(taskId)) return rule.activity;
  }
  return null;
}

function escape(v) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join(';') : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const { pathToFileURL } = await import('node:url');
  const bundle = (await import(pathToFileURL(bundlePath).href)).default;
  const tasks = bundle.tasks || {};

  const allRows = [];
  const flagRows = [];

  for (const [taskId, task] of Object.entries(tasks)) {
    const d = task._derived || {};
    const flags = [];

    if (d.module_count === 0) flags.push('ORPHAN');
    if (!flags.includes('ORPHAN') && d.phases.length === 0) flags.push('NO_PHASE');
    if (d.substrates.length === 0 && d.module_count > 0) flags.push('NO_SUBSTRATE');
    if (d.qts.length === 0 && d.scenario_count > 0) flags.push('NO_QT');

    const activity = matchActivity(taskId);
    if (!activity) flags.push('ACTIVITY_UNMATCHED');

    if (d.phases.length > 1) flags.push('MULTI_PHASE');
    if (d.substrates.length > 5) flags.push('MULTI_SUBSTRATE');

    for (const hint of PHASE_HINTS) {
      if (!hint.match.test(taskId)) continue;
      if (d.phases.length === 0) continue;
      const overlap = d.phases.some(p => hint.expect.includes(p));
      if (!overlap) {
        flags.push(`PHASE_DOCTRINE_HINT(name->${hint.expect.join('|')}, derived->${d.phases.join('|')})`);
        break;
      }
    }

    const stripped = new Set(d.substrates.map(s => s.replace(/^int_/, '').replace(/^ext_/, '')));
    if (stripped.size < d.substrates.length) flags.push('PI_INT_PREFIX_DUPE');

    const row = {
      task_id: taskId,
      name: task.name || '',
      activity: activity || '',
      module_count: d.module_count,
      scenario_count: d.scenario_count,
      phases: d.phases,
      substrates: d.substrates,
      qts: d.qts,
      buckets: d.buckets,
      methods: d.methods,
      coatings: d.coatings,
      flags: flags.join('|'),
    };
    allRows.push(row);

    for (const f of flags) {
      flagRows.push({
        task_id: taskId,
        name: task.name || '',
        flag: f,
        activity: activity || '',
        phases: d.phases.join(';'),
        substrates: d.substrates.join(';'),
        module_count: d.module_count,
      });
    }
  }

  const allHeader = ['task_id','name','activity','module_count','scenario_count','phases','substrates','qts','buckets','methods','coatings','flags'];
  const allCsv = [allHeader.join(',')]
    .concat(allRows.map(r => allHeader.map(h => escape(r[h])).join(',')))
    .join('\n');
  fs.writeFileSync(outAllPath, allCsv, 'utf8');

  const flagsHeader = ['task_id','name','flag','activity','phases','substrates','module_count'];
  const flagsCsv = [flagsHeader.join(',')]
    .concat(flagRows.map(r => flagsHeader.map(h => escape(r[h])).join(',')))
    .join('\n');
  fs.writeFileSync(outFlagsPath, flagsCsv, 'utf8');

  const totalTasks = allRows.length;
  const flaggedTasks = allRows.filter(r => r.flags).length;
  const flagCounts = {};
  for (const f of flagRows) {
    const k = f.flag.startsWith('PHASE_DOCTRINE_HINT') ? 'PHASE_DOCTRINE_HINT' : f.flag;
    flagCounts[k] = (flagCounts[k] || 0) + 1;
  }
  console.log(`\n=== Task Audit Summary ===`);
  console.log(`Total canonical tasks: ${totalTasks}`);
  console.log(`Flagged tasks:         ${flaggedTasks} (${(flaggedTasks*100/totalTasks).toFixed(1)}%)`);
  console.log(`\nFlag counts:`);
  const sorted = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]);
  for (const [flag, count] of sorted) {
    console.log(`  ${flag.padEnd(28)} ${String(count).padStart(5)}`);
  }
  console.log(`\nWrote:`);
  console.log(`  ${outAllPath}`);
  console.log(`  ${outFlagsPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
