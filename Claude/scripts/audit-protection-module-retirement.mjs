#!/usr/bin/env node
// Audit candidate modules for protection-decoupling retirement.
//
// Walks every setup/interstage/cleanup module, classifies each task as
// protection-side or real-work, and emits a markdown report grouped by:
//   PURE_PROTECTION  — every task is protection. Strong retirement candidate.
//   MIXED            — some protection, some real work. Needs splitting.
//
// For each module the report shows:
//   - reference count (how many scenarios use it)
//   - the tasks it emits, with applies_when gates
//   - sample scenario IDs using it
//
// Plus a header section listing what the room/fixture protection specs emit
// today so the user can do a side-by-side coverage check.
//
// Output: Claude/_protection_module_retirement_audit.md (NOT git-tracked)
//
// Usage: node Claude/scripts/audit-protection-module-retirement.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const bundlePath = path.join(repoRoot, 'Claude', 'tools', 'paintscope', 'src', 'data', 'scenario-bundle.gen.js');
const outPath = path.join(repoRoot, 'Claude', '_protection_module_retirement_audit.md');

// Heuristic: tasks whose IDs/names contain these substrings are protection
// work. Conservative — skews false-positive (we'd rather flag for review
// than silently miss).
function isProtectionTask(t) {
  const text = (t.task_id + ' ' + (t.name || '')).toUpperCase();
  return /MASK|PROTECT|FLOOR_(INSTALL|REMOVE|TEARDOWN|MAINTAIN)|FIXTURE_COVER|OUTLET_(REMOVE|REINSTALL|INSTALL)|HVAC_VENT|TEARDOWN/.test(text);
}

function isProtectionSpec(scenarioId) {
  // SF_ROOM_PROTECTION and SF_FIXTURE_PROTECTION are the dedicated protection
  // specs that emit room/fixture protection tasks at the room level.
  return /^SCN_ROOM_PROTECTION/.test(scenarioId) || /^SCN_(FLOOR|FIXTURE)_PROTECTION/.test(scenarioId);
}

async function main() {
  const bundle = (await import(pathToFileURL(bundlePath).href)).default;
  const modules = Object.values(bundle.modules || {}).filter(m => m.kind !== 'template');
  const tasks = bundle.tasks || {};
  const scenarios = bundle.scenarios || [];

  // Module reference counts and scenarios using each module
  const refsByModule = new Map();
  const scnsByModule = new Map();
  for (const m of modules) { refsByModule.set(m.module_id, 0); scnsByModule.set(m.module_id, []); }
  for (const s of scenarios) {
    for (const mid of s.modules || []) {
      if (refsByModule.has(mid)) {
        refsByModule.set(mid, refsByModule.get(mid) + 1);
        scnsByModule.get(mid).push(s.scenario_id);
      }
    }
  }

  // Classify modules with phase setup/interstage/cleanup
  const targets = modules.filter(m => ['setup','interstage','cleanup'].includes(m.phase));
  const pureProtection = [];
  const mixed = [];
  for (const m of targets) {
    const taskRefs = (m.tasks || []).map(t => t.task_ref).filter(Boolean);
    if (taskRefs.length === 0) continue;
    const total = taskRefs.length;
    const protCount = taskRefs.filter(id => tasks[id] && isProtectionTask(tasks[id])).length;
    const refs = refsByModule.get(m.module_id) || 0;
    const entry = { module: m, refs, total, protCount, scnSample: scnsByModule.get(m.module_id).slice(0, 5) };
    if (protCount === total) pureProtection.push(entry);
    else if (protCount > 0) mixed.push(entry);
  }

  // What does SF_ROOM_PROTECTION and SF_FIXTURE_PROTECTION emit today?
  // Collect every task ID emitted by the dedicated protection specs.
  const protectionSystemTasks = new Set();
  for (const s of scenarios) {
    if (!isProtectionSpec(s.scenario_id)) continue;
    for (const mid of s.modules || []) {
      const m = bundle.modules[mid];
      for (const e of m?.tasks || []) {
        if (e?.task_ref) protectionSystemTasks.add(e.task_ref);
      }
    }
  }

  pureProtection.sort((a, b) => b.refs - a.refs);
  mixed.sort((a, b) => b.refs - a.refs);

  // ------------------------------------------------------------
  // Render markdown
  // ------------------------------------------------------------
  const lines = [];

  lines.push('# Protection-module retirement audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **${pureProtection.length} modules** emit only protection tasks. Strong retirement candidates. Total scenario references: **${pureProtection.reduce((s,x)=>s+x.refs,0)}**.`);
  lines.push(`- **${mixed.length} modules** are mixed (some protection, some real cleanup work). Need splitting. Total scenario references: **${mixed.reduce((s,x)=>s+x.refs,0)}**.`);
  lines.push('');

  lines.push('## What the dedicated protection system emits today');
  lines.push('');
  lines.push('Reference list — these are every task ID currently emitted by `SF_ROOM_PROTECTION` and `SF_FIXTURE_PROTECTION`. Compare to the per-module task lists below to confirm coverage before retiring.');
  lines.push('');
  if (protectionSystemTasks.size === 0) {
    lines.push('_No protection-spec tasks found in bundle — verify SF_ROOM_PROTECTION / SF_FIXTURE_PROTECTION scenarios exist._');
  } else {
    const sorted = [...protectionSystemTasks].sort();
    for (const id of sorted) {
      lines.push(`- \`${id}\` — ${tasks[id]?.name || '(no name)'}`);
    }
  }
  lines.push('');

  // ------------------------------------------------------------
  // PURE PROTECTION
  // ------------------------------------------------------------
  lines.push('## PURE PROTECTION — retire candidates');
  lines.push('');
  lines.push(`${pureProtection.length} modules. For each, verify the dedicated protection system covers what this module emits, then retire.`);
  lines.push('');

  for (const e of pureProtection) {
    const m = e.module;
    lines.push(`### \`${m.module_id}\` · ${e.refs} scenarios · phase=${m.phase}`);
    lines.push('');
    lines.push(`**Tasks** (${e.total}):`);
    lines.push('');
    for (const entry of m.tasks || []) {
      const ref = entry.task_ref;
      if (!ref) continue;
      const t = tasks[ref];
      const name = t?.name || '(no name)';
      const aw = entry.applies_when ? ` _applies_when_: \`${JSON.stringify(entry.applies_when)}\`` : '';
      const inSystem = protectionSystemTasks.has(ref) ? ' ✓ in protection system' : ' ✗ NOT in protection system';
      lines.push(`- \`${ref}\` — ${name}${aw}${inSystem}`);
    }
    lines.push('');
    lines.push(`**Sample scenarios using this module** (showing ${Math.min(5, e.scnSample.length)} of ${e.refs}):`);
    lines.push('');
    for (const sid of e.scnSample) lines.push(`- \`${sid}\``);
    lines.push('');
  }

  // ------------------------------------------------------------
  // MIXED
  // ------------------------------------------------------------
  lines.push('## MIXED — split candidates');
  lines.push('');
  lines.push(`${mixed.length} modules. For each, the protection-tagged tasks should be removed; the real-work tasks should stay.`);
  lines.push('');

  for (const e of mixed) {
    const m = e.module;
    lines.push(`### \`${m.module_id}\` · ${e.refs} scenarios · phase=${m.phase} · ${e.protCount}/${e.total} protection`);
    lines.push('');
    for (const entry of m.tasks || []) {
      const ref = entry.task_ref;
      if (!ref) continue;
      const t = tasks[ref];
      const name = t?.name || '(no name)';
      const aw = entry.applies_when ? ` _applies_when_: \`${JSON.stringify(entry.applies_when)}\`` : '';
      const tag = (t && isProtectionTask(t)) ? '🛡️  REMOVE' : '🔨 KEEP   ';
      lines.push(`- ${tag} \`${ref}\` — ${name}${aw}`);
    }
    lines.push('');
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  ${pureProtection.length} pure-protection modules · ${pureProtection.reduce((s,x)=>s+x.refs,0)} total refs`);
  console.log(`  ${mixed.length} mixed modules · ${mixed.reduce((s,x)=>s+x.refs,0)} total refs`);
  console.log(`  ${protectionSystemTasks.size} task IDs currently emitted by SF_ROOM_PROTECTION / SF_FIXTURE_PROTECTION`);
}

main().catch(e => { console.error(e); process.exit(1); });
