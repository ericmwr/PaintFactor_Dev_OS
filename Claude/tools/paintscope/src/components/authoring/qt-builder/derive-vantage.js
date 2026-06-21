// Pure view-model for the QT Builder vantage grid. Resolves the governing
// scenario per tier (findBestMatch) over the overlaid bundle and lays out the
// Scenario → Module → Task hierarchy with the quality tiers as columns. A
// forked MOD_..._QT<n> aligns under its shared base id so the fork and its
// baseline share one row. No mutation; no engine calls beyond findBestMatch.

import { findBestMatch } from '../../../engine/scenario-matcher.js';
import { QT_BUCKETS } from '../../../data/quality-tier.js';
import { PHASE_ORDER } from '../../../data/constants.js';
import { scenarioTierPin } from './tier-files.js';
import { getFactor } from '../../../engine/modifier-registry.js';

const GATE_KEYS = ['application_method', 'substrate_state']; // NOT quality_tier — tier = file

function baseId(id) { return id.replace(/_QT[2-5](?=_|$)/g, ''); }

function taskApplies(appliesWhen, sel) {
  if (!appliesWhen || typeof appliesWhen !== 'object') return true;
  for (const key of GATE_KEYS) {
    if (!(key in appliesWhen)) continue;
    const allowed = appliesWhen[key];
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    if (!arr.includes(sel[key])) return false;
  }
  return true;
}

function taskRowsFor(b, perTier, scnByTier, tiers, served, bundle, refScn, sel) {
  const tierTaskSet = {};
  for (const t of served) {
    const e = perTier[t].get(b);
    const mod = e ? bundle.modules?.[e.actualId] : null;
    const set = new Set();
    for (const entry of (mod?.tasks || [])) {
      if (entry?.task_ref && taskApplies(entry.applies_when, sel)) set.add(entry.task_ref);
    }
    tierTaskSet[t] = set;
  }
  const refActual = refScn ? (refScn.modules || []).find(id => baseId(id) === b) : null;
  const refMod = refActual ? bundle.modules?.[refActual] : null;
  const refTasks = new Set();
  for (const entry of (refMod?.tasks || [])) {
    if (entry?.task_ref && taskApplies(entry.applies_when, sel)) refTasks.add(entry.task_ref);
  }

  const order = [];
  const seen = new Set();
  const sources = [refMod, ...served.map(t => { const e = perTier[t].get(b); return e ? bundle.modules?.[e.actualId] : null; })];
  for (const mod of sources) {
    for (const entry of (mod?.tasks || [])) {
      const ref = entry?.task_ref;
      if (ref && taskApplies(entry.applies_when, sel) && !seen.has(ref)) { seen.add(ref); order.push(ref); }
    }
  }
  return order.map(ref => {
    const name = bundle.tasks?.[ref]?.name || ref;
    const cells = {};
    for (const t of tiers) {
      if (!scnByTier[t]) cells[t] = 'na';
      else if (!tierTaskSet[t]?.has(ref)) cells[t] = 'absent';
      else if (!refTasks.has(ref)) cells[t] = 'added';
      else cells[t] = 'present';
    }
    return { task_ref: ref, name, cells };
  });
}

export function deriveVantage(bundle, sel) {
  const tiers = [...QT_BUCKETS];

  const scenarioByTier = {};
  const scnByTier = {};
  for (const tier of tiers) {
    const ctx = {
      paintable_item: sel.paintable_item, application_method: sel.application_method,
      substrate_state: sel.substrate_state, coating_type: sel.coating_type, quality_tier: tier,
    };
    const { scenario } = findBestMatch(bundle, ctx);
    scnByTier[tier] = scenario || null;
    scenarioByTier[tier] = scenario ? scenario.scenario_id : null;
  }
  const served = tiers.filter(t => scnByTier[t]);
  const isForkByTier = {};
  for (const t of tiers) isForkByTier[t] = !!(scnByTier[t] && scenarioTierPin(scnByTier[t]) === t);

  // A tier whose governing scenario pins quality_tier as a multi-value ARRAY
  // (legacy multi-tier pattern) reads as baseline (pin = null) but is NOT
  // independently editable: forking would add a scalar quality_tier that does
  // not out-specify the array, so the fork stays inert. The UI uses this flag to
  // disable edits on such tiers until the array→baseline conversion (staged).
  const isArrayTierByTier = {};
  for (const t of tiers) {
    const qt = scnByTier[t] && scnByTier[t].matches && scnByTier[t].matches.quality_tier;
    isArrayTierByTier[t] = Array.isArray(qt) && qt.length > 1;
  }

  let refScn = served.map(t => scnByTier[t]).find(s => scenarioTierPin(s) === null) || null;
  if (!refScn && served.length) refScn = scnByTier[served[0]];
  const refBaseIds = new Set((refScn?.modules || []).map(baseId));

  const perTier = {};
  for (const t of served) {
    const m = new Map();
    for (const modId of scnByTier[t].modules || []) {
      const b = baseId(modId);
      const cur = m.get(b);
      if (cur) cur.count++; else m.set(b, { actualId: modId, count: 1 });
    }
    perTier[t] = m;
  }

  const order = [];
  const seen = new Set();
  for (const s of [refScn, ...served.map(t => scnByTier[t])]) {
    if (!s) continue;
    for (const modId of s.modules || []) {
      const b = baseId(modId);
      if (!seen.has(b)) { seen.add(b); order.push(b); }
    }
  }

  const moduleRows = order.map(b => {
    let modObj = null;
    for (const t of served) { const e = perTier[t].get(b); if (e) { modObj = bundle.modules?.[e.actualId]; break; } }
    const phase = modObj?.phase || 'apply';
    const name = modObj?.name || b;
    const cells = {};
    for (const t of tiers) {
      if (!scnByTier[t]) { cells[t] = { moduleId: null, count: 0, state: 'na' }; continue; }
      const e = perTier[t].get(b);
      if (!e) { cells[t] = { moduleId: null, count: 0, state: 'absent' }; continue; }
      let state;
      if (!refBaseIds.has(b)) state = 'added';
      else if (e.actualId !== b) state = 'forked';
      else state = 'shared';
      cells[t] = { moduleId: e.actualId, count: e.count, state };
    }
    const tasks = taskRowsFor(b, perTier, scnByTier, tiers, served, bundle, refScn, sel);
    return { baseModuleId: b, name, phase, cells, tasks };
  });

  const byPhase = new Map();
  for (const r of moduleRows) {
    if (!byPhase.has(r.phase)) byPhase.set(r.phase, []);
    byPhase.get(r.phase).push(r);
  }
  const phaseGroups = [...byPhase.keys()]
    .sort((a, c) => {
      const ia = PHASE_ORDER.indexOf(a), ic = PHASE_ORDER.indexOf(c);
      return (ia === -1 ? PHASE_ORDER.length : ia) - (ic === -1 ? PHASE_ORDER.length : ic);
    })
    .map(phase => ({ phase, modules: byPhase.get(phase) }));

  const ANCHOR_TIER = 'QT3';
  const multiplierRow = {};
  for (const t of tiers) {
    const def = getFactor(bundle, 'FAC_QT', t);
    if (t === ANCHOR_TIER) {
      multiplierRow[t] = { value: 1.0, def: 1.0, isOverride: false, isAnchor: true, served: !!scnByTier[t] };
      continue;
    }
    const scn = scnByTier[t];
    const ov = scn && scn.modifier_overrides && scn.modifier_overrides.FAC_QT
      ? scn.modifier_overrides.FAC_QT[t] : undefined;
    multiplierRow[t] = {
      value: typeof ov === 'number' ? ov : def,
      def,
      isOverride: typeof ov === 'number',
      isAnchor: false,
      served: !!scn,
    };
  }

  return { tiers, served, scenarioByTier, isForkByTier, isArrayTierByTier, multiplierRow, phaseGroups };
}
