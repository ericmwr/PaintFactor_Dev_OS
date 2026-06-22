// Pure helpers for the PS Key picker. parsePsKey splits a key into its
// category/unit per the PS_[EXT_]<DOMAIN>_<UOM>.<NAME> convention; humanize
// turns a raw NAME segment into a readable title for uncatalogued keys.

export function parsePsKey(key) {
  if (!key || !key.startsWith('PS_')) {
    return { scope: 'special', domain: 'SPECIAL', uom: null, name: key || '' };
  }
  let rest = key.slice(3);                       // drop "PS_"
  const scope = rest.startsWith('EXT_') ? 'exterior' : 'interior';
  if (scope === 'exterior') rest = rest.slice(4);

  const dot = rest.indexOf('.');
  const head = dot === -1 ? rest : rest.slice(0, dot);
  const tail = dot === -1 ? '' : rest.slice(dot + 1);

  const headTokens = head.split('_');
  const domain = headTokens[0];                  // SURFACE | EDGE | OPENING | PROTECT | META | DOOR
  let uom, name;
  if (headTokens.length > 1) {
    uom = headTokens.slice(1).join('_');         // SF | LF | EA | EA_SIDE | FIXED
    name = tail;
  } else {
    const tailParts = tail.split('.');           // META.<UOM>.<NAME>
    uom = tailParts[0] || null;                  // EA | SF | TEXT | ENUM | FLAG
    name = tailParts.slice(1).join('.');
  }
  return { scope, domain, uom, name };
}

export function humanize(str) {
  if (!str) return '';
  const spaced = str.replace(/[._]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// UOMs that map onto the Task editor's UOM dropdown (TaskEditor UOM_OPTIONS).
// Only these auto-fill UOM on an explicit pick; TEXT/ENUM/FLAG/FIXED do not.
export const AUTOFILL_UOMS = new Set(['SF', 'LF', 'EA', 'EA_SIDE']);

export const DOMAIN_LABEL = {
  SURFACE: 'Surface',
  EDGE: 'Edge',
  OPENING: 'Opening',
  DOOR: 'Opening',     // exterior PS_EXT_DOOR_EA.* folds into Opening
  PROTECT: 'Protection',
  META: 'Meta',
  SPECIAL: 'Special',
};

const DOMAIN_ORDER = { SURFACE: 0, EDGE: 1, OPENING: 2, DOOR: 2, PROTECT: 3, META: 4, SPECIAL: 9 };
const UOM_ORDER = { SF: 0, LF: 1, EA: 2, EA_SIDE: 3, FIXED: 4 };
const UOM_SPLIT_DOMAINS = new Set(['SURFACE', 'EDGE', 'OPENING', 'DOOR', 'PROTECT']);

function categoryFor(scope, domain, uom) {
  const base = DOMAIN_LABEL[domain] || humanize(domain);
  let label;
  if (domain === 'SPECIAL') label = 'Special';
  else if (UOM_SPLIT_DOMAINS.has(domain) && uom) label = `${base} · ${uom}`;
  else label = base;
  if (scope === 'exterior') label = `Exterior ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  const scopeOrder = scope === 'interior' ? 0 : scope === 'exterior' ? 1 : 2;
  const order = scopeOrder * 100 + (DOMAIN_ORDER[domain] ?? 8) * 10 + (UOM_ORDER[uom] ?? 8);
  return { label, order };
}

function makeEntry(key, label, catalogued) {
  const { scope, domain, uom, name } = parsePsKey(key);
  const { label: categoryLabel, order: categoryOrder } = categoryFor(scope, domain, uom);
  const displayTitle = label || humanize(name || key);
  return { key, label: label || null, displayTitle, catalogued, scope, domain, uom, categoryLabel, categoryOrder };
}

// Union of the label catalog and the keys real tasks reference. Catalogued
// keys win on dedup (they carry a friendly label); in-use-only keys are flagged
// catalogued:false so the UI can surface the "no label yet" gap.
export function buildPsKeyCatalog(bundle, labels) {
  const map = new Map();
  for (const [key, label] of Object.entries(labels || {})) {
    if (!key) continue;
    map.set(key, makeEntry(key, label, true));
  }
  for (const task of Object.values(bundle?.tasks || {})) {
    const k = task && task.ps_key;
    if (!k || map.has(k)) continue;
    map.set(k, makeEntry(k, null, false));
  }
  return [...map.values()];
}

// Groups a flat catalog into ordered category buckets for display.
export function groupPsKeyCatalog(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.categoryLabel)) {
      groups.set(e.categoryLabel, { categoryLabel: e.categoryLabel, scope: e.scope, categoryOrder: e.categoryOrder, entries: [] });
    }
    groups.get(e.categoryLabel).entries.push(e);
  }
  const ordered = [...groups.values()].sort((a, b) => a.categoryOrder - b.categoryOrder);
  for (const g of ordered) g.entries.sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
  return ordered;
}
