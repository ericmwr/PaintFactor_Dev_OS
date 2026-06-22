// Dry-run parity: for every non-protection scenario, compare today's MATCHER
// system selection vs the Phase-3 ARRAY selection (scenario.material_systems),
// per role. Selection-level only (hours unaffected). Writes a categorized report.
import { writeFileSync } from 'node:fs';
import bundle from '../tools/paintscope/src/data/scenario-bundle.gen.js';
import { MATERIAL_SYSTEMS, MATERIAL_SYSTEM_PRODUCTS } from '../tools/paintscope/src/data/scenario-rate-data.js';
import { buildRoleBySystemId, classifySystemRole, resolveSpecSystems } from '../tools/paintscope/src/engine/material-system-roles.js';
import { specForScenarioMatches } from '../tools/paintscope/src/engine/spec-for-scenario.js';
import { scenarioTierPin } from '../tools/paintscope/src/components/authoring/qt-builder/tier-files.js';

const roleBySystemId = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);
const systemsBySpec = {};
for (const ms of MATERIAL_SYSTEMS) (systemsBySpec[ms.spec_family_id] = systemsBySpec[ms.spec_family_id] || []).push(ms);
const sheenFor = (id) => id.includes('CEILING') || id.includes('PRIME') ? 'flat'
  : (/(TRIM|DOOR|CABINET|WINDOW)/.test(id) ? 'semi-gloss' : 'eggshell');

const cats = { correction: [], regression: [], changed: [], identical: 0, skippedNoSpec: [] };

for (const scn of bundle.scenarios) {
  const arr = scn.material_systems || [];
  if (arr.length === 0) continue;                         // protection scenarios — no materials
  const specId = specForScenarioMatches(scn.matches);
  if (!specId) { cats.skippedNoSpec.push(scn.scenario_id); continue; }
  const tier = scenarioTierPin(scn) || (bundle?.modifiers?.FAC_QT?.default) || 'QT3';
  const isStain = specId.includes('STAIN');

  // ARRAY selection: group the scenario array by role (one per role).
  const arrayByRole = {};
  for (const id of arr) { const r = classifySystemRole(id, roleBySystemId, isStain ? 'stain' : 'finish'); if (!(r in arrayByRole)) arrayByRole[r] = id; }

  // MATCHER selection: today's resolveSpecSystems over the full family catalog.
  const states = Array.isArray(scn.matches?.substrate_state) ? scn.matches.substrate_state : (scn.matches?.substrate_state ? [scn.matches.substrate_state] : []);
  const matched = resolveSpecSystems({ specSystems: systemsBySpec[specId] || [], roleBySystemId, isStain, defaultQT: tier, defaultSheen: sheenFor(specId), specStates: states, specOverride: null });
  const matcherByRole = {}; for (const { system, role } of matched) matcherByRole[role] = system ? system.id : null;

  const roles = [...new Set([...Object.keys(arrayByRole), ...Object.keys(matcherByRole)])];
  let anyDiff = false;
  for (const role of roles) {
    const a = arrayByRole[role] || null, m = matcherByRole[role] || null;
    if (a === m) continue;
    anyDiff = true;
    const row = { scenario: scn.scenario_id, specId, tier, role, matcher: m, array: a };
    if (m == null && a != null) cats.correction.push(row);       // array adds a role the matcher missed
    else if (a == null && m != null) cats.regression.push(row);  // array DROPS a role the matcher had
    else cats.changed.push(row);                                  // different system, same role
  }
  if (!anyDiff) cats.identical++;
}

const lines = [];
lines.push('# Phase 3 Materials Parity — matcher selection vs scenario-array selection', '');
lines.push(`Scenarios with materials compared. Identical: **${cats.identical}**. ` +
  `Corrections: **${cats.correction.length}**. Regressions: **${cats.regression.length}**. ` +
  `Changed-system: **${cats.changed.length}**. No-spec(skipped): **${cats.skippedNoSpec.length}**.`, '');
lines.push('Hours are unaffected (selection-level change only).', '');
for (const [title, rows] of [['REGRESSIONS (array drops a role — must pre-fix the array)', cats.regression], ['CORRECTIONS (array adds a role — accepted)', cats.correction], ['CHANGED SYSTEM (same role, different system — accepted, review)', cats.changed]]) {
  lines.push(`## ${title} (${rows.length})`);
  for (const r of rows) lines.push(`- ${r.scenario} [${r.specId} ${r.tier} ${r.role}] matcher=${r.matcher} array=${r.array}`);
  lines.push('');
}
if (cats.skippedNoSpec.length) { lines.push('## NO SPEC RESOLVED (skipped — investigate)'); for (const s of cats.skippedNoSpec) lines.push(`- ${s}`); lines.push(''); }
writeFileSync(new URL('../devos/reports/phase3-materials-parity.md', import.meta.url), lines.join('\n'));
console.log(`identical=${cats.identical} corrections=${cats.correction.length} regressions=${cats.regression.length} changed=${cats.changed.length} noSpec=${cats.skippedNoSpec.length}`);
