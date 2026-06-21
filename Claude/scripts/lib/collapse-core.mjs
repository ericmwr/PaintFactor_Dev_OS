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

// A "family" is the set of scenarios identical on EVERY `matches` constraint
// except `quality_tier`. The key is therefore derived from all non-quality_tier
// keys: sorted (so insertion order is irrelevant), with array values normalized
// (sorted copy) and absent keys omitted entirely (absence is itself a distinct
// constraint shape). Two scenarios share a familyKey iff they are true
// tier-variants of one another.
export function familyKey(s) {
  const m = s?.matches || {};
  const entries = Object.keys(m)
    .filter((k) => k !== 'quality_tier')
    .sort()
    .map((k) => [k, norm(m[k])]);
  return JSON.stringify(entries);
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
