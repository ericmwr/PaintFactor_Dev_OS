#!/usr/bin/env node
// Batch-retire a list of legacy modules:
//   1. Strip each module ID from every Claude/scenarios/*.json `modules[]` array
//   2. Move each Claude/modules/<id>.json to Claude/modules/archive/
// Regen the bundle separately afterwards via build-scenario-bundle.mjs.
//
// All edits are direct file-system writes (no IDB drafts). Git is the
// safety net.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR  = path.join(ROOT, 'modules');
const ARCHIVE_DIR  = path.join(MODULES_DIR, 'archive');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');

const RETIRE_IDS = [
  'MOD_CLEANUP_FINISH_GROUP',
  'MOD_CLEANUP_STAIR_RISER',
  'MOD_CLEANUP_TRIM_PRIME',
  'MOD_DOOR_GLASS_MASK',
  'MOD_SETUP_ARCH_ELEMENT',
  'MOD_SETUP_BUILTIN',
  'MOD_SETUP_CEIL_MASK_ADJACENT',
  'MOD_SETUP_CLOSET_SHELF_PAINT',
  'MOD_SETUP_COMBINED_WC_FINISH',
  'MOD_SETUP_DOOR_FRAME_PAINT_PROTECT',
  'MOD_SETUP_FINISH_GROUP',
  'MOD_SETUP_FIXTURE_COVERS',
  'MOD_SETUP_FLOOR_PROTECT_CEILING',
  'MOD_SETUP_FLOOR_PROTECT_FULL',
  'MOD_SETUP_FLOOR_PROTECT_PERIMETER',
  'MOD_SETUP_STAIR_RISER',
  'MOD_SETUP_TRIM_FLOOR_PROTECT',
  'MOD_SETUP_TRIM_PAINT_PROTECT',
  'MOD_SETUP_WAINSCOT',
  'MOD_SETUP_WINDOW',
  'MOD_SETUP_WOOD_CEILING',
  'MOD_SETUP_WOOD_WALL',
];

const RETIRE_SET = new Set(RETIRE_IDS);

const summary = {
  scenariosScanned: 0,
  scenariosModified: 0,
  moduleRefsRemoved: 0,
  modulesArchived: 0,
  modulesNotFound: 0,
  archiveOverwrites: 0,
  perModule: {},
};

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function rewriteScenarios() {
  const files = (await fs.readdir(SCENARIOS_DIR)).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const full = path.join(SCENARIOS_DIR, f);
    summary.scenariosScanned++;
    let raw;
    try { raw = await fs.readFile(full, 'utf8'); } catch { continue; }
    let obj;
    try { obj = JSON.parse(raw); } catch { console.warn(`! parse error: ${f}`); continue; }
    if (!Array.isArray(obj.modules)) continue;
    const before = obj.modules.length;
    const filtered = obj.modules.filter(m => !RETIRE_SET.has(m));
    const removed = before - filtered.length;
    if (removed === 0) continue;
    obj.modules = filtered;
    summary.moduleRefsRemoved += removed;
    summary.scenariosModified++;
    // Track which retired modules were in this scenario
    for (const id of RETIRE_IDS) {
      const inHere = (raw.match(new RegExp(`"${id}"`, 'g')) || []).length;
      if (inHere > 0) {
        summary.perModule[id] = (summary.perModule[id] || 0) + inHere;
      }
    }
    await fs.writeFile(full, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  }
}

async function archiveModules() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  for (const id of RETIRE_IDS) {
    const src = path.join(MODULES_DIR, `${id}.json`);
    const dst = path.join(ARCHIVE_DIR, `${id}.json`);
    if (!(await exists(src))) {
      console.warn(`! source missing: ${id}.json (already archived?)`);
      summary.modulesNotFound++;
      continue;
    }
    if (await exists(dst)) {
      console.warn(`  overwriting stale archive: ${id}.json`);
      summary.archiveOverwrites++;
      await fs.unlink(dst);
    }
    await fs.rename(src, dst);
    summary.modulesArchived++;
  }
}

async function main() {
  console.log(`retire-modules-batch: ${RETIRE_IDS.length} modules`);
  console.log('-- rewriting scenarios --');
  await rewriteScenarios();
  console.log(`  scanned ${summary.scenariosScanned}, modified ${summary.scenariosModified}, removed ${summary.moduleRefsRemoved} refs`);
  console.log('-- archiving modules --');
  await archiveModules();
  console.log(`  archived ${summary.modulesArchived}, missing ${summary.modulesNotFound}, overwrote ${summary.archiveOverwrites}`);
  console.log('-- per-module ref count --');
  for (const id of RETIRE_IDS) {
    const n = summary.perModule[id] || 0;
    console.log(`  ${n.toString().padStart(4)}  ${id}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
