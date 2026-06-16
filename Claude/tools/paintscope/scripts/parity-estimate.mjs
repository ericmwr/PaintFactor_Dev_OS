// parity-estimate.mjs — headless full-estimate (HOURS) for a given project state.
//
// Reproduces useEstimateScenario.js's grand-total-hours computation (the two
// private helpers normalizeToSpecResults + dedupeSharedTasks are copied verbatim
// below). Pricing + material estimates are intentionally skipped — they do not
// affect hours. Runs against the CANONICAL scenario bundle (no IDB draft
// overlays), so the absolute number may differ from an in-app display that has
// unsaved authoring drafts — but a before/after comparison is unaffected because
// both sides use the same canonical bundle.
//
// Usage:  node scripts/parity-estimate.mjs <state.json> <out.json>
//   <state.json> = the McLeod project state (localStorage key `paintscope_state`)
//   <out.json>   = where to write the deterministic per-spec result for diffing
//
// Purpose: run at commit 75f349a (pre-P1) and at HEAD (post-P1) and diff the
// output to prove the spec-layer re-home did not change the estimate.

import { readFileSync, writeFileSync } from 'node:fs';
import { buildScenarioInputs } from '../src/engine/context-adapter.js';
import { DB_BUNDLE } from '../src/data/db-bundle.js';
import canonicalBundle from '../src/data/scenario-bundle.gen.js';
import { findBestMatch, findNearMisses } from '../src/engine/scenario-matcher.js';
import { runScenarioEstimate } from '../src/engine/run-estimate-scenario.js';
import { resolveRoomFloorProtection } from '../src/engine/floor-protection.js';
import { resolveRoomFixtureProtection } from '../src/engine/fixture-protection.js';

// ─── verbatim copies of the two module-private helpers in useEstimateScenario.js ───

function normalizeToSpecResults(perInputResults, specData) {
  const specLookup = {};
  if (specData?.spec_families) {
    for (const sf of specData.spec_families) {
      specLookup[sf.id] = { name: sf.name, domain: sf.domain || 'interior' };
    }
  }
  const groups = new Map();
  for (const pr of perInputResults) {
    const key = `${pr.roomIndex}|${pr.specId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pr);
  }
  const specResults = [];
  for (const [, group] of groups) {
    const first = group[0];
    const specId = first.specId;
    const info = specLookup[specId] || {};
    const allTasks = [];
    for (const pr of group) {
      const prBand = pr.ctx?.height_band || 'STD';
      for (const t of pr.tasks || []) {
        allTasks.push({ ...t, module: t.moduleId || t.module || null, band: prBand });
      }
    }
    const totalHours = Math.round(allTasks.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100;
    const phaseHours = {};
    for (const t of allTasks) {
      const p = t.phase || 'apply';
      phaseHours[p] = Math.round(((phaseHours[p] || 0) + (t.hours || 0)) * 100) / 100;
    }
    specResults.push({
      specId,
      specName: info.name || first.scenarioName || specId,
      domain: info.domain || 'interior',
      totalHours,
      phaseHours,
      tasks: allTasks,
    });
  }
  specResults.sort((a, b) => b.totalHours - a.totalHours);
  return specResults;
}

function dedupeSharedTasks(perInputResults) {
  const groups = new Map();
  for (const pr of perInputResults) {
    const band = pr.ctx?.height_band || '';
    const key = `${pr.roomIndex}|${pr.specId}|${band}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(pr);
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const seenTasks = new Set();
    for (const pr of group) {
      const kept = [];
      for (const t of pr.tasks || []) {
        const tk = `${t.taskId}|${t.coatNumber}`;
        if (seenTasks.has(tk)) continue;
        seenTasks.add(tk);
        kept.push(t);
      }
      pr.tasks = kept;
      pr.totalHours = Math.round(kept.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100;
      const ph = {};
      for (const t of kept) {
        const phase = t.phase || 'other';
        ph[phase] = Math.round(((ph[phase] || 0) + (t.hours || 0)) * 100) / 100;
      }
      pr.phaseHours = ph;
    }
  }
}

// ─── main ───

const statePath = process.argv[2];
const outPath = process.argv[3];
if (!statePath) { console.error('Usage: node scripts/parity-estimate.mjs <state.json> [out.json]'); process.exit(1); }

const state = JSON.parse(readFileSync(statePath, 'utf8'));
const specData = DB_BUNDLE;
const bundle = canonicalBundle;

const adapter = buildScenarioInputs(state, specData);
const perInputResults = [];
const gaps = [];
const warnings = [...adapter.warnings];

// Per-project task-rate overlayMap (protection_heuristics + user rate_overrides) —
// these DO affect hours, so replicate them exactly for fidelity.
const ph = state?.project?.protection_heuristics || {};
const projectOverlayMap = {};
const setRate = (taskId, rate) => { if (rate != null && rate > 0) projectOverlayMap[taskId] = { rate_per_hour: rate }; };
setRate('TSK_MASK_OUTLET_SWITCH_INSTALL',  ph.outlet_mask_rate);
setRate('TSK_MASK_OUTLET_SWITCH_REMOVE',   ph.outlet_mask_rate);
setRate('TSK_PREP_OUTLET_COVER_REMOVE',    ph.outlet_remove_reinstall_rate);
setRate('TSK_PREP_OUTLET_COVER_REINSTALL', ph.outlet_remove_reinstall_rate);
setRate('TSK_MASK_HVAC_VENT_INSTALL',      ph.hvac_mask_rate);
setRate('TSK_MASK_HVAC_VENT_REMOVE',       ph.hvac_mask_rate);
setRate('TSK_PREP_HVAC_VENT_REMOVE',       ph.hvac_remove_reinstall_rate);
setRate('TSK_PREP_HVAC_VENT_REINSTALL',    ph.hvac_remove_reinstall_rate);
const userOverrides = state?.project?.rate_overrides || {};
for (const [taskId, ov] of Object.entries(userOverrides)) {
  if (ov?.rate_per_hour != null && ov.rate_per_hour > 0) projectOverlayMap[taskId] = { rate_per_hour: ov.rate_per_hour };
}

for (const input of adapter.roomInputs) {
  try {
    const matchInfo = findBestMatch(bundle, input.ctx);
    if (!matchInfo.scenario) {
      const near = findNearMisses(bundle, input.ctx, 2).slice(0, 2);
      gaps.push({ roomIndex: input.roomIndex, specId: input.specId });
      continue;
    }
    if (matchInfo.tied) warnings.push(...matchInfo.warnings);
    const result = runScenarioEstimate({
      scenarioBundle: bundle, ctx: input.ctx, roomQty: input.roomQty, roomItems: input.roomItems,
      overlayMap: projectOverlayMap, roomIndex: input.roomIndex, roomLabel: input.roomLabel,
    });
    perInputResults.push({
      roomIndex: input.roomIndex, roomLabel: input.roomLabel, specId: input.specId,
      scenarioId: result.scenarioId, scenarioName: result.scenarioName,
      totalHours: result.totalHours, phaseHours: result.phaseHours, tasks: result.tasks,
      outputState: result.outputState, ctx: input.ctx,
    });
    if (result.warnings.length) warnings.push(...result.warnings);
  } catch (innerErr) {
    warnings.push(`[${input.roomLabel}] ${input.specId}: ${innerErr.message}`);
  }
}

dedupeSharedTasks(perInputResults);
const specResults = normalizeToSpecResults(perInputResults, specData);

const rooms = state.rooms || [];
const roomSpecMethods = perInputResults.map(pr => ({
  roomIndex: pr.roomIndex, specId: pr.specId, method: pr.ctx?.application_method || 'brush_roll',
}));
const roomProtection = resolveRoomFloorProtection(specResults, specData, rooms);
const fixtureProtection = resolveRoomFixtureProtection(rooms, roomSpecMethods);

let grandTotalHours = specResults.reduce((s, sr) => s + sr.totalHours, 0);
Object.values(roomProtection).forEach(rp => { grandTotalHours += rp.totalHours; });
Object.values(fixtureProtection).forEach(fp => { grandTotalHours += fp.totalHours; });
grandTotalHours = Math.round(grandTotalHours * 100) / 100;

// Deterministic, diff-friendly output. Per-(room,spec) hours sorted by key so
// the JSON is byte-stable across runs/commits.
const perSpec = specResults
  .map(sr => ({ specId: sr.specId, domain: sr.domain, totalHours: sr.totalHours }))
  .sort((a, b) => (a.specId + a.domain).localeCompare(b.specId + b.domain));
const protectionHours = Object.fromEntries(
  Object.entries(roomProtection).map(([k, v]) => [k, Math.round(v.totalHours * 100) / 100]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
);
const fixtureHours = Object.fromEntries(
  Object.entries(fixtureProtection).map(([k, v]) => [k, Math.round(v.totalHours * 100) / 100]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
);

const out = {
  grandTotalHours,
  roomInputCount: adapter.roomInputs.length,
  activatedSpecs: specResults.length,
  gapCount: gaps.length,
  gaps: gaps.sort((a, b) => (a.roomIndex - b.roomIndex) || a.specId.localeCompare(b.specId)),
  warningCount: warnings.length,
  perSpec,
  protectionHours,
  fixtureHours,
};

const json = JSON.stringify(out, null, 2);
if (outPath) writeFileSync(outPath, json);
console.log(`grandTotalHours=${grandTotalHours}  activatedSpecs=${specResults.length}  roomInputs=${adapter.roomInputs.length}  gaps=${gaps.length}  warnings=${warnings.length}`);
console.log(json);
