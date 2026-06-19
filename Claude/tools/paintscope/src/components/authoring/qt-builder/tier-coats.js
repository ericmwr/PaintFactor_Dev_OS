// Per-tier coats for the QT Builder. Coats are module repetitions: the engine
// counts apply/finish-phase module invocations in scenario.modules[]. A coat
// unit is a maximal contiguous run of coat-bearing modules; finish coats =
// number of runs. Editing adds/removes the last coat unit (+ its interstage).
// All immutable; no engine changes.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);
const isCoatPhase = (p) => p === 'apply' || p === 'finish';

export function coatUnits(scenario, modulesById) {
  const mods = (scenario && scenario.modules) || [];
  const runs = [];
  let cur = null;
  let curSeen = null;
  for (let i = 0; i < mods.length; i++) {
    const id = mods[i];
    const phase = modulesById?.[id]?.phase;
    if (isCoatPhase(phase)) {
      if (!cur) {
        cur = { start: i, end: i, ids: [id] };
        curSeen = new Set([id]);
      } else if (curSeen.has(id)) {
        // Repeated module ID within a contiguous coat block — new coat unit starts here
        runs.push(cur);
        cur = { start: i, end: i, ids: [id] };
        curSeen = new Set([id]);
      } else {
        cur.end = i;
        cur.ids.push(id);
        curSeen.add(id);
      }
    } else if (cur) {
      runs.push(cur);
      cur = null;
      curSeen = null;
    }
  }
  if (cur) runs.push(cur);
  const lastUnit = runs.length ? runs[runs.length - 1].ids.slice() : [];
  let interstageBetween = [];
  if (runs.length >= 2) {
    const a = runs[runs.length - 2], b = runs[runs.length - 1];
    interstageBetween = mods.slice(a.end + 1, b.start);
  }
  return { runs, count: runs.length, lastUnit, interstageBetween };
}

export function setFinishCoats(scenario, modulesById, targetCount) {
  if (!Number.isFinite(targetCount) || targetCount < 1) return scenario;
  const { runs, count, lastUnit, interstageBetween } = coatUnits(scenario, modulesById);
  if (count === 0 || targetCount === count) return scenario;
  const mods = scenario.modules.slice();
  const last = runs[runs.length - 1];
  if (targetCount > count) {
    const add = [];
    for (let k = 0; k < targetCount - count; k++) add.push(...interstageBetween, ...lastUnit);
    return { ...scenario, modules: [...mods.slice(0, last.end + 1), ...add, ...mods.slice(last.end + 1)] };
  }
  const removeCount = count - targetCount;
  const firstRemoved = runs[count - removeCount];
  const prev = runs[count - removeCount - 1];
  const cutStart = prev ? prev.end + 1 : firstRemoved.start;
  return { ...scenario, modules: [...mods.slice(0, cutStart), ...mods.slice(last.end + 1)] };
}

export function mergeScenarioDrafts(canonicalScenarios, drafts) {
  const active = (drafts || []).filter(d => d && d.payload && ACTIVE_DRAFT.has(d.status));
  const draftIds = new Set(active.map(d => d.id));
  const out = [];
  for (const s of canonicalScenarios || []) {
    if (!draftIds.has(s.scenario_id)) out.push(s);
  }
  for (const d of active) out.push(d.payload);
  return out;
}

export function deriveTierCoats(bundle, sel) {
  const out = {};
  for (const tier of QT_BUCKETS) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    if (!scenario) { out[tier] = null; continue; }
    const { count, interstageBetween } = coatUnits(scenario, bundle.modules);
    out[tier] = {
      scenarioId: scenario.scenario_id,
      finishCoats: count,
      interstageRounds: interstageBetween.length ? count - 1 : 0,
    };
  }
  return out;
}
