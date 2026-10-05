// One-shot audit: for each exterior substrate state in the UI dropdown and
// each siding_type, list the (paintable_item × substrate_state) coverage
// across SCN_EXT_*.json scenarios.
//
// Source of truth:
//   - UI dropdown:   Claude/tools/paintscope/src/state/exterior-state.js
//   - Scenarios:     Claude/scenarios/SCN_EXT_*.json (excludes /archive)
//
// Run with:   node Claude/tools/paintscope/scripts/audit-exterior-states.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '../../../..');
const scenarioDir = path.join(repoRoot, 'Claude/scenarios');

// ── Dropdown contents (mirrors exterior-state.js EXT_SUBSTRATE_STATES) ──
const UI_STATES = [
  ['bare_wood',         'SS_EXT_BARE_WOOD'],
  ['factory_primed',    'SS_EXT_PRIMED_FACTORY'],
  ['field_primed',      'SS_EXT_PRIMED_FIELD'],
  ['factory_finished',  'SS_EXT_FACTORY_FINISHED'],
  ['bare_fibercement',  'SS_EXT_BARE_FIBERCEMENT'],
  ['sound_paint',       'SS_EXT_SOUND_PAINT'],
  ['chalking',          'SS_EXT_CHALKING'],
  ['failing_paint',     'SS_EXT_FAILING_PAINT'],
  ['peeling',           'SS_EXT_PEELING'],
  ['weathered',         'SS_EXT_WEATHERED'],
  ['stained_solid',     'SS_EXT_STAINED_SOLID'],
  ['stained_semi',      'SS_EXT_STAINED_SEMI'],
  ['painted_flat',      'SS_EXT_PAINTED_FLAT'],
  ['painted_satin',     'SS_EXT_PAINTED_SATIN'],
  ['painted_semigloss', 'SS_EXT_PAINTED_SEMIGLOSS'],
];

const SIDING_TYPES = [
  ['wood_lap',           'siding'],
  ['wood_shingle',       'siding'],
  ['cedar_shingle',      'siding'],                // no dedicated paintable_item
  ['board_and_batten',   'siding'],                // no dedicated paintable_item
  ['fiber_cement_lap',   'ext_fc_siding'],
  ['fiber_cement_panel', 'ext_fc_siding'],
  ['engineered_wood',    'ext_eng_siding'],
  ['vinyl',              'ext_vinyl_siding'],      // RP only
  ['aluminum',           'ext_aluminum_siding'],   // RP only
  ['stucco',             'ext_stucco_wall'],
  ['masonry',            'ext_masonry_wall'],
];

// ── Walk scenarios ──
const files = fs.readdirSync(scenarioDir)
  .filter(f => f.startsWith('SCN_EXT_') && f.endsWith('.json'));

// coverage[paintable_item] = { [SS_EXT_*]: Set<scenarioFile> }
const coverage = new Map();
// reverse[SS_EXT_*] = Set<paintable_item>
const reverse  = new Map();
// uncoveredStates: substrate_states that appear in scenarios but not in UI
const allSeenStates = new Set();

for (const f of files) {
  const raw = fs.readFileSync(path.join(scenarioDir, f), 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch { continue; }
  const m = data.matches || {};
  const piRaw = m.paintable_item;
  if (!piRaw) continue;
  const piList = Array.isArray(piRaw) ? piRaw : [piRaw];
  const states = Array.isArray(m.substrate_state) ? m.substrate_state : (m.substrate_state ? [m.substrate_state] : []);
  for (const pi of piList) {
    if (typeof pi !== 'string') continue;
    if (!coverage.has(pi)) coverage.set(pi, new Map());
    const bucket = coverage.get(pi);
    for (const st of states) {
      allSeenStates.add(st);
      if (!bucket.has(st)) bucket.set(st, new Set());
      bucket.get(st).add(f);
      if (!reverse.has(st)) reverse.set(st, new Set());
      reverse.get(st).add(pi);
    }
  }
}

// ── Print: per-UI-state report ──
console.log('═'.repeat(78));
console.log('UI DROPDOWN STATES → coverage by paintable_item');
console.log('═'.repeat(78));
for (const [ui, specSt] of UI_STATES) {
  const items = reverse.get(specSt);
  if (!items || items.size === 0) {
    console.log(`\n  ⚠  ${ui.padEnd(20)} (${specSt}) — NO SCENARIOS`);
    continue;
  }
  const sorted = [...items].sort();
  console.log(`\n  ✓ ${ui.padEnd(20)} (${specSt}) — ${sorted.length} paintable_items`);
  for (const pi of sorted) {
    const cnt = coverage.get(pi).get(specSt).size;
    console.log(`      • ${pi.padEnd(24)} ${cnt} scenario${cnt === 1 ? '' : 's'}`);
  }
}

// ── Print: per-siding-type report ──
console.log('\n' + '═'.repeat(78));
console.log('SIDING TYPES → paintable_item → covered substrate_states');
console.log('═'.repeat(78));
for (const [sidingType, pi] of SIDING_TYPES) {
  const bucket = coverage.get(pi);
  if (!bucket || bucket.size === 0) {
    console.log(`\n  ⚠  ${sidingType.padEnd(20)} → ${pi.padEnd(22)} — NO SCENARIOS`);
    continue;
  }
  console.log(`\n  ✓ ${sidingType.padEnd(20)} → ${pi.padEnd(22)} — ${bucket.size} states covered`);
  const sortedStates = [...bucket.keys()].sort();
  for (const st of sortedStates) {
    const uiName = UI_STATES.find(([_, s]) => s === st)?.[0] || '(not in UI)';
    const cnt = bucket.get(st).size;
    console.log(`      • ${st.padEnd(28)} ${uiName.padEnd(20)} ${cnt} scenario${cnt === 1 ? '' : 's'}`);
  }
}

// ── Print: spec states referenced by scenarios but NOT in UI dropdown ──
const uiSpecSet = new Set(UI_STATES.map(([_, s]) => s));
const orphans = [...allSeenStates].filter(s => !uiSpecSet.has(s)).sort();
console.log('\n' + '═'.repeat(78));
console.log('SCENARIO STATES NOT EXPOSED IN UI DROPDOWN');
console.log('═'.repeat(78));
if (orphans.length === 0) {
  console.log('\n  (none — every scenario state has a UI entry)');
} else {
  for (const st of orphans) {
    const items = [...reverse.get(st)].sort().join(', ');
    console.log(`\n  ${st}`);
    console.log(`      paintable_items: ${items}`);
  }
}

// ── Print: full paintable_item × state matrix (compact) ──
console.log('\n' + '═'.repeat(78));
console.log('FULL MATRIX — paintable_item × substrate_state (scenario count)');
console.log('═'.repeat(78));
const allPI = [...coverage.keys()].sort();
const allStates = [...allSeenStates].sort();
for (const pi of allPI) {
  console.log(`\n  ${pi}`);
  const bucket = coverage.get(pi);
  for (const st of allStates) {
    if (!bucket.has(st)) continue;
    console.log(`      ${st.padEnd(28)} ${bucket.get(st).size}`);
  }
}
