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
