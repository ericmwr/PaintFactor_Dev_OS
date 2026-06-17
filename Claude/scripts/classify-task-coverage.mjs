#!/usr/bin/env node
// Three-tier task coverage classifier.
//
//   ORPHAN              — no canonical module references this task → archive-safe
//   REACHABLE_UNFIRED   — at least one module references it, but no fire in ledger
//   ACTIVE              — fired at least once in the ledger
//   ARCHIVED            — already in Claude/tasks/archive/
//
// Combines:
//   - canonical bundle (tasks + modules + scenarios + _derived classifications)
//   - the user's downloaded fired-tasks ledger JSON
//
// Writes a CSV the user filters/sorts in Excel.
//
// Usage:
//   node Claude/scripts/classify-task-coverage.mjs <ledger.json> [--out path]
//
// Example:
//   node Claude/scripts/classify-task-coverage.mjs ~/Downloads/paintscope-fired-tasks-*.json

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');
const MODULES_DIR = path.join(ROOT, 'modules');
const BUNDLE_PATH = path.join(ROOT, 'tools', 'paintscope', 'src', 'data', 'scenario-bundle.gen.js');

function parseArgs(argv) {
  const args = { ledger: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') { args.out = argv[++i]; continue; }
    if (!args.ledger && !a.startsWith('--')) args.ledger = a;
  }
  if (!args.ledger) {
    console.error('Usage: node classify-task-coverage.mjs <ledger.json> [--out path]');
    process.exit(2);
  }
  if (!args.out) args.out = path.join(ROOT, '_task_coverage_report.csv');
  return args;
}

async function loadJsonDir(dir) {
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const out = {};
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    try {
      out[id] = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
    } catch (e) {
      console.warn(`! parse error: ${f}`);
    }
  }
  return out;
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const args = parseArgs(process.argv);

  console.log('loading canonical bundle…');
  // Use a file URL so Node ESM imports the gen.js cleanly regardless of OS path style.
  const bundleMod = await import(pathToFileURL(BUNDLE_PATH).href);
  const bundle = bundleMod.default || bundleMod;
  const bundleTasks = bundle.tasks || {};
  // The gen.js has _derived classifications computed at build time, baked into each task.
  console.log(`  ${Object.keys(bundleTasks).length} canonical tasks in bundle`);

  console.log('loading canonical modules…');
  const modules = await loadJsonDir(MODULES_DIR);
  console.log(`  ${Object.keys(modules).length} modules`);

  // Build reverse-lookup: task_id → [module_ids that reference it]
  const moduleRefsByTask = {};
  for (const [mid, mod] of Object.entries(modules)) {
    for (const t of (mod.tasks || [])) {
      const tid = t?.task_ref;
      if (!tid) continue;
      if (!moduleRefsByTask[tid]) moduleRefsByTask[tid] = new Set();
      moduleRefsByTask[tid].add(mid);
    }
  }

  // Find archived tasks (already removed from canonical)
  const archivedTaskIds = new Set();
  if (await exists(TASKS_ARCHIVE_DIR)) {
    const archived = (await fs.readdir(TASKS_ARCHIVE_DIR)).filter(f => f.endsWith('.json'));
    for (const f of archived) archivedTaskIds.add(f.replace(/\.json$/, ''));
  }
  console.log(`  ${archivedTaskIds.size} archived tasks (excluded from active classification)`);

  console.log(`loading ledger from ${args.ledger}…`);
  const ledger = JSON.parse(await fs.readFile(args.ledger, 'utf8'));
  const ledgerByTask = {};
  for (const r of (ledger.records || [])) {
    if (r?.task_id) ledgerByTask[r.task_id] = r;
  }
  console.log(`  ${Object.keys(ledgerByTask).length} distinct task_ids in ledger (probe + organic)`);

  // Classify every canonical task
  const rows = [];
  for (const [tid, task] of Object.entries(bundleTasks)) {
    const ledgerRec = ledgerByTask[tid];
    const moduleRefs = moduleRefsByTask[tid] || new Set();
    let classification;
    if (archivedTaskIds.has(tid)) {
      classification = 'ARCHIVED';
    } else if (moduleRefs.size === 0) {
      classification = 'ORPHAN';
    } else if (ledgerRec && (ledgerRec.fire_count || 0) > 0) {
      classification = 'ACTIVE';
    } else {
      classification = 'REACHABLE_UNFIRED';
    }
    const d = task._derived || {};
    rows.push({
      task_id: tid,
      name: task.name || '',
      classification,
      buckets: (d.buckets || []).join('|') || '',
      phases: (d.phases || []).join('|') || '',
      substrates: (d.substrates || []).join('|') || '',
      methods: (d.methods || []).join('|') || '',
      qts: (d.qts || []).join('|') || '',
      coatings: (d.coatings || []).join('|') || '',
      module_ref_count: moduleRefs.size,
      module_count_via_derived: d.module_count || 0,
      scenario_count_via_derived: d.scenario_count || 0,
      fire_count: ledgerRec?.fire_count || 0,
      last_seen: ledgerRec?.last_seen || '',
      last_source: ledgerRec?.last_source || '',
      last_probe_id: ledgerRec?.last_context?.probe_id || '',
      ps_key: task.ps_key || '',
      uom: task.uom || '',
      base_rate: task.rate_per_hour ?? '',
      skill_level: task.skill_level || '',
    });
  }

  // Also include archived tasks the ledger has seen (sanity)
  for (const tid of archivedTaskIds) {
    if (bundleTasks[tid]) continue; // already covered
    const ledgerRec = ledgerByTask[tid];
    rows.push({
      task_id: tid,
      name: '(archived)',
      classification: 'ARCHIVED',
      buckets: '',
      phases: '',
      substrates: '',
      methods: '',
      qts: '',
      coatings: '',
      module_ref_count: 0,
      module_count_via_derived: 0,
      scenario_count_via_derived: 0,
      fire_count: ledgerRec?.fire_count || 0,
      last_seen: ledgerRec?.last_seen || '',
      last_source: ledgerRec?.last_source || '',
      last_probe_id: ledgerRec?.last_context?.probe_id || '',
      ps_key: '',
      uom: '',
      base_rate: '',
      skill_level: '',
    });
  }

  rows.sort((a, b) => {
    // Group by classification first, then by bucket, then task_id
    const order = { ACTIVE: 0, REACHABLE_UNFIRED: 1, ORPHAN: 2, ARCHIVED: 3 };
    const c = (order[a.classification] || 9) - (order[b.classification] || 9);
    if (c !== 0) return c;
    const b1 = (a.buckets || '').localeCompare(b.buckets || '');
    if (b1 !== 0) return b1;
    return a.task_id.localeCompare(b.task_id);
  });

  // Summary report to stdout — group by classification + bucket
  const summary = {};
  for (const r of rows) {
    const cls = r.classification;
    const buckets = (r.buckets || '(unbucketed)').split('|').filter(Boolean);
    const labels = buckets.length ? buckets : ['(unbucketed)'];
    for (const b of labels) {
      summary[cls] = summary[cls] || {};
      summary[cls][b] = (summary[cls][b] || 0) + 1;
    }
  }
  console.log('\n=== Summary (rows counted once per bucket — multi-bucket tasks count multiple times) ===');
  for (const cls of ['ACTIVE', 'REACHABLE_UNFIRED', 'ORPHAN', 'ARCHIVED']) {
    if (!summary[cls]) continue;
    console.log(`\n${cls}`);
    const buckets = Object.entries(summary[cls]).sort((a, b) => b[1] - a[1]);
    for (const [b, n] of buckets) console.log(`  ${String(n).padStart(5)} · ${b}`);
  }

  // Write CSV
  const cols = [
    'task_id', 'name', 'classification', 'buckets', 'phases', 'substrates',
    'methods', 'qts', 'coatings', 'module_ref_count', 'module_count_via_derived',
    'scenario_count_via_derived', 'fire_count', 'last_seen', 'last_source',
    'last_probe_id', 'ps_key', 'uom', 'base_rate', 'skill_level',
  ];
  const header = cols.join(',');
  const lines = rows.map(r => cols.map(c => csvEscape(r[c])).join(','));
  await fs.writeFile(args.out, header + '\n' + lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${rows.length} rows to ${path.relative(ROOT, args.out)}`);

  // NC interior actionable picks at the top of the user's mind
  const ncOrphans = rows.filter(r => r.classification === 'ORPHAN' && r.buckets.includes('nc_interior'));
  const ncReachableUnfired = rows.filter(r => r.classification === 'REACHABLE_UNFIRED' && r.buckets.includes('nc_interior'));
  const ncActive = rows.filter(r => r.classification === 'ACTIVE' && r.buckets.includes('nc_interior'));
  console.log('\n=== NC interior focus ===');
  console.log(`  ACTIVE:             ${ncActive.length} (confirmed used — keep)`);
  console.log(`  REACHABLE_UNFIRED:  ${ncReachableUnfired.length} (need probes to verify before archiving)`);
  console.log(`  ORPHAN:             ${ncOrphans.length} (archive candidates — no module references them)`);

  if (ncOrphans.length > 0 && ncOrphans.length <= 25) {
    console.log('\nNC interior ORPHAN tasks (archive candidates):');
    for (const r of ncOrphans) console.log(`  ${r.task_id}  ${r.name ? `· ${r.name}` : ''}`);
  } else if (ncOrphans.length > 25) {
    console.log(`\nNC interior ORPHAN tasks: ${ncOrphans.length} total — see CSV`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
