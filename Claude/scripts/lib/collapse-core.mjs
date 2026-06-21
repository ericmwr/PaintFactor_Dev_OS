// Pure core for the QT3-baseline collapse. No fs, no engine — just classify,
// group, and choose the keeper per family. The migration script wires these to
// disk + the parity gate.

const TIER_ORDER = { QT2: 2, QT3: 3, QT4: 4, QT5: 5 };

function norm(v) { return Array.isArray(v) ? [...v].sort() : (v == null ? null : [v]); }

export function qtKind(s) {
  const qt = s?.matches?.quality_tier;
  if (qt == null) return 'baseline';
  if (Array.isArray(qt)) return qt.length > 1 ? 'array' : 'scalar';
  return 'scalar';
}

export function familyKey(s) {
  const m = s?.matches || {};
  return JSON.stringify({
    pi: m.paintable_item ?? null,
    am: norm(m.application_method),
    st: norm(m.substrate_state),
    ct: norm(m.coating_type),
  });
}

export function groupByFamily(scenarios) {
  const g = new Map();
  for (const s of scenarios) {
    const k = familyKey(s);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(s);
  }
  return g;
}

function tiersOf(s) {
  const qt = s?.matches?.quality_tier;
  if (qt == null) return [];
  return Array.isArray(qt) ? qt : [qt];
}
function includesQt3(s) { return tiersOf(s).includes('QT3'); }
function minTier(s) {
  const ts = tiersOf(s).map(t => TIER_ORDER[t] ?? 99);
  return ts.length ? Math.min(...ts) : 0; // baseline (no tiers) sorts first
}
const byId = (a, b) => String(a.scenario_id).localeCompare(String(b.scenario_id));

export function proposeKeeper(familyScenarios) {
  const fam = [...familyScenarios];
  const scalarQt3 = fam.filter(s => qtKind(s) === 'scalar' && tiersOf(s)[0] === 'QT3').sort(byId);
  const arrayQt3 = fam.filter(s => qtKind(s) === 'array' && includesQt3(s)).sort(byId);
  const baselines = fam.filter(s => qtKind(s) === 'baseline').sort(byId);

  let keeper, reason, noQt3 = false;
  if (scalarQt3.length) { keeper = scalarQt3[0]; reason = 'scalar-QT3'; }
  else if (arrayQt3.length) { keeper = arrayQt3[0]; reason = 'array-incl-QT3'; }
  else if (baselines.length) { keeper = baselines[0]; reason = 'existing-baseline'; }
  else { keeper = [...fam].sort((a, b) => minTier(a) - minTier(b) || byId(a, b))[0]; reason = 'promote-lowest'; noQt3 = true; }

  const archive = fam.filter(s => s !== keeper);
  return { keeper, archive, reason, noQt3 };
}

export function stripQualityTier(scenario) {
  const clone = JSON.parse(JSON.stringify(scenario));
  if (clone.matches) delete clone.matches.quality_tier;
  return clone;
}
