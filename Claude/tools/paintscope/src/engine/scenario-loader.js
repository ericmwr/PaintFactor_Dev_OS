// Phase 0 scenario/module loader.
//
// Reads module and scenario JSON files from disk and returns a bundle object
// of the shape expected by run-estimate-scenario.js:
//
//   {
//     modules:   { MOD_ID: { module_id, phase, tasks, ... }, ... },
//     scenarios: [ { scenario_id, matches, modules, ... }, ... ]
//   }
//
// Node-only (uses fs + path). For browser/Vite usage, build a prebundled JS
// module via a codegen step — deferred past Phase 0.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Load all MOD_*.json files from modulesDir into a map keyed by module_id.
 */
export function loadModules(modulesDir) {
  const modules = {};
  const files = fs.readdirSync(modulesDir).filter(f => f.startsWith('MOD_') && f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(modulesDir, file), 'utf8');
    const mod = JSON.parse(raw);
    if (!mod.module_id) {
      throw new Error(`Module ${file} is missing module_id`);
    }
    if (modules[mod.module_id]) {
      throw new Error(`Duplicate module_id ${mod.module_id} (${file})`);
    }
    modules[mod.module_id] = mod;
  }
  return modules;
}

/**
 * Load all SCN_*.json files from scenariosDir into an array.
 */
export function loadScenarios(scenariosDir) {
  const scenarios = [];
  const files = fs.readdirSync(scenariosDir).filter(f => f.startsWith('SCN_') && f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(scenariosDir, file), 'utf8');
    const scn = JSON.parse(raw);
    if (!scn.scenario_id) {
      throw new Error(`Scenario ${file} is missing scenario_id`);
    }
    scenarios.push(scn);
  }
  return scenarios;
}

/**
 * Load the full scenario bundle from a repo root path.
 * Expects:   <repoRoot>/Claude/modules/MOD_*.json
 *            <repoRoot>/Claude/scenarios/SCN_*.json
 */
export function loadScenarioBundle(repoRoot) {
  const modulesDir   = path.join(repoRoot, 'Claude', 'modules');
  const scenariosDir = path.join(repoRoot, 'Claude', 'scenarios');
  const modules   = loadModules(modulesDir);
  const scenarios = loadScenarios(scenariosDir);

  // Integrity check: every scenario module reference must resolve
  const unresolved = [];
  for (const scn of scenarios) {
    for (const mid of scn.modules) {
      if (!modules[mid]) unresolved.push(`${scn.scenario_id} -> ${mid}`);
    }
  }
  if (unresolved.length > 0) {
    throw new Error(`Scenario bundle has unresolved module references:\n  ${unresolved.join('\n  ')}`);
  }

  return { modules, scenarios };
}
