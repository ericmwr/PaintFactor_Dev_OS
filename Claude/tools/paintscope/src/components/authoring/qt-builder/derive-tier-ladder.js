// Finder helpers for the QT Builder: the substrate list and the
// method / state / coating dimensions for a chosen substrate. (The former
// per-tier ladder view-model that lived here was removed in Phase 1b-2b when
// the vantage grid replaced it; see derive-vantage.js for the current model.)

function uniqSorted(set) { return [...set].sort(); }

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

const STAIN_PHASE_ORDER = ['stain', 'sealer', 'clear'];
const STAIN_METHOD_KEY = { stain: 'application_method_stain', sealer: 'application_method_clear', clear: 'application_method_clear' };
// Defensive fallback if a family's apply tasks carry no method-keyed applies_when.
const STAIN_METHOD_FALLBACK = { application_method_stain: ['brush', 'roll', 'spray'], application_method_clear: ['brush', 'spray'] };

// Distinct coating_phase values for an item, in chain order. Empty for paint.
export function listStainPhases(bundle, paintable_item) {
  const set = new Set();
  for (const s of bundle.scenarios || []) {
    if (s.matches?.paintable_item !== paintable_item) continue;
    const cp = s.matches?.coating_phase;
    if (cp) set.add(cp);
  }
  return STAIN_PHASE_ORDER.filter(p => set.has(p));
}

// For one (item, phase): the default stained-chain input state + the method
// options (from the phase's apply-module tasks) + the ctx method key.
export function stainPhaseInfo(bundle, paintable_item, phase) {
  const scns = (bundle.scenarios || []).filter(
    s => s.matches?.paintable_item === paintable_item && s.matches?.coating_phase === phase
  );
  const states = new Set();
  for (const s of scns) {
    const st = s.matches?.substrate_state;
    (Array.isArray(st) ? st : st ? [st] : []).forEach(x => x && states.add(x));
  }
  const defaultState = phase === 'stain'
    ? (states.has('SS_BARE') ? 'SS_BARE' : [...states][0] || '')
    : ([...states].find(x => x !== 'SS_BARE') || [...states][0] || '');

  const methodKey = STAIN_METHOD_KEY[phase] || 'application_method_clear';
  const methods = [];
  const seen = new Set();
  for (const s of scns) {
    for (const modId of Object.keys(s.dynamic_coats || {})) {
      const mod = bundle.modules?.[modId];
      for (const t of (mod?.tasks || [])) {
        const v = t.applies_when?.[methodKey];
        (Array.isArray(v) ? v : v ? [v] : []).forEach(x => { if (x && !seen.has(x)) { seen.add(x); methods.push(x); } });
      }
    }
  }
  return { defaultState, methods: methods.length ? methods : STAIN_METHOD_FALLBACK[methodKey].slice(), methodKey };
}
