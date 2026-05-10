#!/usr/bin/env node
// Static probe: walk every "protection family" scenario, follow its
// modules to their tasks, report which protection task IDs are
// reachable. Cross-check against expected (new system) and legacy
// (retired) lists.
//
// Output:
//   - PER FAMILY: scenario_id → modules[] → tasks[] (by task_id)
//   - COVERAGE: expected protection task IDs reachable vs missing
//   - LEAKS: legacy task IDs that are still reachable through any scenario
//   - REVERSE GAPS: scenarios still referencing archived modules (should be 0)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function loadJsonDir(dir) {
  const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
  const out = {};
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const raw = await fs.readFile(path.join(dir, f), 'utf8');
    try { out[id] = JSON.parse(raw); } catch {}
  }
  return out;
}

// Expected protection task IDs from the dedicated SF_ROOM_PROTECTION +
// SF_FIXTURE_PROTECTION system. Pulled from the retirement audit MD.
const EXPECTED_PROTECTION_TASKS = [
  'TSK_CONTAINMENT_DOOR_ZIPPER', 'TSK_CONTAINMENT_SETUP', 'TSK_CONTAINMENT_TEARDOWN',
  'TSK_MASK_APPLIANCES_INSTALL', 'TSK_MASK_APPLIANCES_REMOVE',
  'TSK_MASK_BATHTUB_INSTALL', 'TSK_MASK_BATHTUB_REMOVE',
  'TSK_MASK_BUILTIN_INSTALL', 'TSK_MASK_BUILTIN_REMOVE',
  'TSK_MASK_COUNTERTOP_INSTALL', 'TSK_MASK_COUNTERTOP_REMOVE',
  'TSK_MASK_DOOR_CASING_INSTALL', 'TSK_MASK_DOOR_CASING_REMOVE',
  'TSK_MASK_DOOR_FRAME_INSTALL', 'TSK_MASK_DOOR_FRAME_REMOVE',
  'TSK_MASK_DOOR_SLAB_INSTALL', 'TSK_MASK_DOOR_SLAB_REMOVE',
  'TSK_MASK_FEATURE_WALL_INSTALL', 'TSK_MASK_FEATURE_WALL_REMOVE',
  'TSK_MASK_FIREPLACE_INSTALL', 'TSK_MASK_FIREPLACE_REMOVE',
  'TSK_MASK_HVAC_VENT_INSTALL', 'TSK_MASK_HVAC_VENT_REMOVE',
  'TSK_MASK_OUTLET_SWITCH_INSTALL', 'TSK_MASK_OUTLET_SWITCH_REMOVE',
  'TSK_MASK_SHOWER_INSTALL', 'TSK_MASK_SHOWER_REMOVE',
  'TSK_MASK_TOILET_INSTALL', 'TSK_MASK_TOILET_REMOVE',
  'TSK_MASK_VANITY_INSTALL', 'TSK_MASK_VANITY_REMOVE',
  'TSK_MASK_WINDOW_APRON_INSTALL', 'TSK_MASK_WINDOW_APRON_REMOVE',
  'TSK_MASK_WINDOW_CASING_INSTALL', 'TSK_MASK_WINDOW_CASING_REMOVE',
  'TSK_MASK_WINDOW_FULL_LG_INSTALL', 'TSK_MASK_WINDOW_FULL_LG_REMOVE',
  'TSK_MASK_WINDOW_FULL_SMALL_INSTALL', 'TSK_MASK_WINDOW_FULL_SMALL_REMOVE',
  'TSK_MASK_WINDOW_FULL_STD_INSTALL', 'TSK_MASK_WINDOW_FULL_STD_REMOVE',
  'TSK_MASK_WINDOW_FULL_XL_INSTALL', 'TSK_MASK_WINDOW_FULL_XL_REMOVE',
  'TSK_MASK_WINDOW_GLASS_INSTALL', 'TSK_MASK_WINDOW_GLASS_REMOVE',
  'TSK_MASK_WINDOW_JAMB_INSTALL', 'TSK_MASK_WINDOW_JAMB_REMOVE',
  'TSK_MASK_WINDOW_STOOL_INSTALL', 'TSK_MASK_WINDOW_STOOL_REMOVE',
  'TSK_PREP_HVAC_VENT_REINSTALL', 'TSK_PREP_HVAC_VENT_REMOVE',
  'TSK_PREP_OUTLET_COVER_REINSTALL', 'TSK_PREP_OUTLET_COVER_REMOVE',
  'TSK_PROJECT_LIGHT_FAN_MANTEL_INSTALL', 'TSK_PROJECT_LIGHT_FAN_MANTEL_REMOVE',
  'TSK_PROTECT_CEILING_EDGE_INSTALL', 'TSK_PROTECT_CEILING_EDGE_REMOVE',
  'TSK_PROTECT_CEILING_ENCAPSULATE_INSTALL', 'TSK_PROTECT_CEILING_ENCAPSULATE_REMOVE',
  'TSK_PROTECT_CEILING_PARTIAL_INSTALL', 'TSK_PROTECT_CEILING_PARTIAL_REMOVE',
  'TSK_PROTECT_CEILING_SPOT_INSTALL', 'TSK_PROTECT_CEILING_SPOT_REMOVE',
  'TSK_PROTECT_DEBRIS_CLEANUP',
  'TSK_PROTECT_FLOOR_EDGE_INSTALL', 'TSK_PROTECT_FLOOR_EDGE_REMOVE',
  'TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL', 'TSK_PROTECT_FLOOR_ENCAPSULATE_REMOVE',
  'TSK_PROTECT_FLOOR_FULL_INSTALL', 'TSK_PROTECT_FLOOR_FULL_REMOVE',
  'TSK_PROTECT_FLOOR_PARTIAL_INSTALL', 'TSK_PROTECT_FLOOR_PARTIAL_REMOVE',
  'TSK_PROTECT_FLOOR_SPOT_INSTALL', 'TSK_PROTECT_FLOOR_SPOT_REMOVE',
  'TSK_PROTECT_WALL_EDGE_INSTALL', 'TSK_PROTECT_WALL_EDGE_REMOVE',
  'TSK_PROTECT_WALL_ENCAPSULATE_INSTALL', 'TSK_PROTECT_WALL_ENCAPSULATE_REMOVE',
  'TSK_PROTECT_WALL_FULL_INSTALL', 'TSK_PROTECT_WALL_FULL_REMOVE',
  'TSK_PROTECT_WALL_PARTIAL_INSTALL', 'TSK_PROTECT_WALL_PARTIAL_REMOVE',
  'TSK_TRIM_TAPELINE_INSTALL', 'TSK_TRIM_TAPELINE_REMOVE',
  'TSK_VANITY_SMALL_ENCAP_INSTALL', 'TSK_VANITY_SMALL_ENCAP_REMOVE',
];

// Legacy (retired) task IDs that should NOT appear via any active scenario.
const LEGACY_TASKS = [
  'TSK_TRIM_REMOVE_WALL_MASK', 'TSK_TRIM_REMOVE_FIXTURE_COVERS', 'TSK_TRIM_REMOVE_FLOOR_PROTECTION',
  'TSK_TRIM_FLOOR_PROTECT_SETUP',
  'TSK_TRIM_PAINT_FLOOR_PROTECT', 'TSK_TRIM_PAINT_WALL_MASK', 'TSK_TRIM_PAINT_FIXTURE_COVER',
  'TSK_TRIM_PAINT_PROTECT_TEARDOWN', 'TSK_TRIM_PAINT_REMOVE_WALL_MASK',
  'TSK_STRS_TREAD_PROTECT', 'TSK_STRS_FLOOR_PROTECT', 'TSK_STRS_WALL_MASK',
  'TSK_STRS_REMOVE_WALL_MASK', 'TSK_STRS_REMOVE_FLOOR_PROTECT', 'TSK_STRS_REMOVE_TREAD_PROTECT',
];

function isProtectionScenario(sc) {
  if (!sc) return false;
  if (sc.matches?.coating_type === 'protect') return true;
  if (sc.matches?.paintable_item === 'room_protection') return true;
  return false;
}

async function main() {
  const modulesDir = path.join(ROOT, 'modules');
  const scenariosDir = path.join(ROOT, 'scenarios');

  const modules = await loadJsonDir(modulesDir);
  const scenariosMap = await loadJsonDir(scenariosDir);
  const scenarios = Object.values(scenariosMap);

  console.log(`loaded ${Object.keys(modules).length} modules, ${scenarios.length} scenarios\n`);

  // 1. Walk every protection scenario; for each, list module → task IDs
  const protectionScenarios = scenarios.filter(isProtectionScenario);
  console.log(`=== PROTECTION SCENARIOS (${protectionScenarios.length}) ===\n`);

  const reachableTasks = new Set();
  const unresolvedRefs = []; // scenario→module ref where module not in canonical
  const taskRefByScenario = {}; // sid → Set<task_id>

  for (const sc of protectionScenarios) {
    const sid = sc.scenario_id || sc.id;
    const mods = sc.modules || [];
    taskRefByScenario[sid] = new Set();
    for (const mid of mods) {
      const m = modules[mid];
      if (!m) {
        unresolvedRefs.push({ scenario: sid, module: mid });
        continue;
      }
      for (const t of (m.tasks || [])) {
        if (t?.task_ref) {
          reachableTasks.add(t.task_ref);
          taskRefByScenario[sid].add(t.task_ref);
        }
      }
    }
  }

  // Print per-scenario task counts
  for (const sc of protectionScenarios) {
    const sid = sc.scenario_id || sc.id;
    const tasks = [...(taskRefByScenario[sid] || [])].sort();
    console.log(`${sid}  (${sc.modules?.length || 0} modules → ${tasks.length} tasks)`);
    for (const t of tasks) console.log(`    · ${t}`);
  }

  // 2. Coverage: expected protection tasks reachable
  const expectedSet = new Set(EXPECTED_PROTECTION_TASKS);
  const missingExpected = [...expectedSet].filter(t => !reachableTasks.has(t));
  const reachableExpected = [...expectedSet].filter(t => reachableTasks.has(t));

  console.log(`\n=== EXPECTED PROTECTION TASK COVERAGE ===`);
  console.log(`reachable: ${reachableExpected.length} / ${expectedSet.size}`);
  if (missingExpected.length) {
    console.log(`MISSING (${missingExpected.length}) — expected but no protection scenario emits:`);
    for (const t of missingExpected.sort()) console.log(`    ✗ ${t}`);
  } else {
    console.log('✓ all expected protection tasks reachable through some protection scenario');
  }

  // 3. Leaks: legacy task IDs reachable through ANY scenario (not just protection)
  const allReachableTasks = new Set();
  for (const sc of scenarios) {
    for (const mid of (sc.modules || [])) {
      const m = modules[mid];
      if (!m) continue;
      for (const t of (m.tasks || [])) {
        if (t?.task_ref) allReachableTasks.add(t.task_ref);
      }
    }
  }
  const leaks = LEGACY_TASKS.filter(t => allReachableTasks.has(t));

  console.log(`\n=== LEGACY TASK LEAKS ===`);
  if (leaks.length) {
    console.log(`✗ ${leaks.length} legacy tasks still reachable through some scenario:`);
    for (const t of leaks.sort()) {
      // Find which scenarios+modules expose this leak
      const exposing = [];
      for (const sc of scenarios) {
        for (const mid of (sc.modules || [])) {
          const m = modules[mid];
          if (!m) continue;
          if ((m.tasks || []).some(x => x?.task_ref === t)) {
            exposing.push(`${sc.scenario_id || sc.id} → ${mid}`);
            break;
          }
        }
      }
      console.log(`    ✗ ${t} via:`);
      for (const e of exposing.slice(0, 5)) console.log(`        ${e}`);
      if (exposing.length > 5) console.log(`        ... +${exposing.length - 5} more`);
    }
  } else {
    console.log('✓ no legacy tasks reachable through any scenario');
  }

  // 4. Reverse gaps: scenarios still referencing modules NOT in canonical
  console.log(`\n=== UNRESOLVED MODULE REFERENCES ===`);
  if (unresolvedRefs.length) {
    console.log(`✗ ${unresolvedRefs.length} unresolved refs in protection scenarios:`);
    for (const { scenario, module } of unresolvedRefs) console.log(`    ${scenario} → ${module}`);
  } else {
    console.log('✓ all protection scenario modules resolve');
  }

  // 5. Whole-bundle unresolved — should match what build-scenario-bundle.mjs validates
  const allUnresolved = [];
  for (const sc of scenarios) {
    for (const mid of (sc.modules || [])) {
      if (!modules[mid]) allUnresolved.push({ scenario: sc.scenario_id || sc.id, module: mid });
    }
  }
  console.log(`\n=== WHOLE-BUNDLE UNRESOLVED REFS ===`);
  console.log(allUnresolved.length === 0
    ? '✓ all scenario module refs resolve across the entire bundle'
    : `✗ ${allUnresolved.length} unresolved refs across the bundle`);
  if (allUnresolved.length) {
    for (const { scenario, module } of allUnresolved.slice(0, 10)) console.log(`    ${scenario} → ${module}`);
    if (allUnresolved.length > 10) console.log(`    ... +${allUnresolved.length - 10} more`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Protection scenarios: ${protectionScenarios.length}`);
  console.log(`Expected protection tasks reachable: ${reachableExpected.length} / ${expectedSet.size}`);
  console.log(`Legacy task leaks: ${leaks.length}`);
  console.log(`Unresolved module refs: ${allUnresolved.length}`);

  const ok = missingExpected.length === 0 && leaks.length === 0 && allUnresolved.length === 0;
  console.log(ok ? '\n✓ PROBE PASSED' : '\n✗ PROBE FAILED');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
