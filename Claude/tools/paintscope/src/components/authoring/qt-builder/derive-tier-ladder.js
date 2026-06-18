// Pure derivation for the QT Builder's read-only tier ladder. Given the
// canonical scenario bundle and a (paintable_item, application_method,
// substrate_state, coating_type) selection, this resolves the governing
// scenario PER quality tier (via the same matcher the engine uses) and aligns
// each tier's concrete task set into a tier ladder. Resolving per tier means
// it handles BOTH authoring patterns transparently: one multi-tier scenario
// (quality_tier: [...]) and separate per-tier scenario files.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';
import { PHASE_ORDER } from '../../../data/constants.js';

// Only these selection dimensions gate a task into a tier's ladder. Other
// applies_when keys (per-instance geometry/coat gates like has_steps, coat)
// are not tier-structural, so they must NOT filter the ladder view.
const LADDER_GATE_KEYS = ['quality_tier', 'application_method', 'substrate_state'];

function appliesAtTier(appliesWhen, tierCtx) {
  if (!appliesWhen || typeof appliesWhen !== 'object') return true;
  for (const key of LADDER_GATE_KEYS) {
    if (!(key in appliesWhen)) continue;
    const allowed = appliesWhen[key];
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    if (!arr.includes(tierCtx[key])) return false;
  }
  return true;
}

function uniqSorted(set) {
  return [...set].sort();
}

export function listSubstrates(bundle, { domain = 'interior' } = {}) {
  const set = new Set();
  for (const s of bundle.scenarios || []) {
    if (domain && s.domain && s.domain !== domain) continue;
    const pi = s.matches?.paintable_item;
    if (pi) set.add(pi);
  }
  return uniqSorted(set);
}

export function listDimensions(bundle, paintable_item) {
  const methods = new Set();
  const states = new Set();
  const coatings = new Set();
  for (const s of bundle.scenarios || []) {
    if (s.matches?.paintable_item !== paintable_item) continue;
    const m = s.matches?.application_method;
    if (Array.isArray(m)) m.forEach(x => x && methods.add(x)); else if (m) methods.add(m);
    const st = s.matches?.substrate_state;
    if (Array.isArray(st)) st.forEach(x => x && states.add(x)); else if (st) states.add(st);
    const ct = s.matches?.coating_type;
    if (Array.isArray(ct)) ct.forEach(x => x && coatings.add(x)); else if (ct) coatings.add(ct);
  }
  return { methods: uniqSorted(methods), states: uniqSorted(states), coatings: uniqSorted(coatings) };
}

// Resolve one tier's concrete task set → Map<task_id, {name, phase, order}>.
function tierTaskSet(bundle, ctx) {
  const { scenario, warnings } = findBestMatch(bundle, ctx);
  if (!scenario) return { scenario: null, tasks: new Map(), warnings: warnings || [] };
  const tasks = new Map();
  let order = 0;
  for (const modId of scenario.modules || []) {
    const mod = bundle.modules?.[modId];
    if (!mod || !Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      const ref = entry?.task_ref;
      if (!ref || tasks.has(ref)) continue;
      if (!appliesAtTier(entry.applies_when, ctx)) continue;
      const t = bundle.tasks?.[ref];
      tasks.set(ref, { name: t?.name || ref, phase: mod.phase || 'apply', order: order++ });
    }
  }
  return { scenario, tasks, warnings: warnings || [] };
}

export function deriveTierLadder(bundle, sel) {
  const tiers = QT_BUCKETS;
  const perTier = {};
  const warnings = [];

  for (const tier of tiers) {
    const ctx = {
      paintable_item: sel.paintable_item,
      application_method: sel.application_method,
      substrate_state: sel.substrate_state,
      coating_type: sel.coating_type,
      quality_tier: tier,
    };
    const { scenario, tasks, warnings: w } = tierTaskSet(bundle, ctx);
    for (const msg of w) warnings.push(`${tier}: ${msg}`);
    perTier[tier] = scenario ? { scenarioId: scenario.scenario_id, tasks } : null;
  }

  const served = tiers.filter(t => perTier[t]);
  const baseline = perTier['QT3'] ? 'QT3' : (served[0] || null);

  // Collect distinct tasks, baseline tier first so its ordering dominates.
  const collectOrder = baseline ? [baseline, ...tiers.filter(t => t !== baseline)] : tiers;
  const taskInfo = new Map();
  for (const t of collectOrder) {
    const pt = perTier[t];
    if (!pt) continue;
    for (const [id, info] of pt.tasks) {
      if (!taskInfo.has(id)) taskInfo.set(id, info);
    }
  }

  const rows = [...taskInfo.entries()].map(([id, info]) => {
    const inBaseline = baseline ? perTier[baseline].tasks.has(id) : false;
    const cells = {};
    for (const t of tiers) {
      const pt = perTier[t];
      if (!pt) { cells[t] = 'na'; continue; }
      cells[t] = pt.tasks.has(id) ? (inBaseline ? 'fires' : 'added') : 'skip';
    }
    return { task_id: id, name: info.name, phase: info.phase, cells, _order: info.order };
  });

  rows.sort((a, b) => {
    const pa = PHASE_ORDER.indexOf(a.phase); const pb = PHASE_ORDER.indexOf(b.phase);
    const pai = pa === -1 ? PHASE_ORDER.length : pa;
    const pbi = pb === -1 ? PHASE_ORDER.length : pb;
    if (pai !== pbi) return pai - pbi;
    return a._order - b._order;
  });
  rows.forEach(r => { delete r._order; });

  return { tiers, served, baseline, rows, warnings };
}
