// System catalog: workflow intent + activation logic.
//
// A "system" expresses what the estimator intends to DO with a surface:
//   - paint_full: prime + finish (NC default for bare substrates)
//   - paint_finish: finish only (primed / previously-painted substrates)
//   - paint_plus_spot_prime: targeted priming (stain blocks / repairs / patches) + finish
//   - paint_full_reprime: full prime over existing paint + finish (glossy, dark→light)
//   - prime_only: stop at primer (garage, phase 1 NC)
//   - stain_clear / stain_sealer_clear / stain_only / clear_refresh: wood stain workflows
//   - paint_acrylic: masonry — block filler + acrylic paint (standard)
//   - paint_masonry_primer: masonry — Loxon-type aggressive primer + paint
//   - paint_elastomeric: masonry — elastomeric coating system
//   - more exterior-specific systems below
//
// Pass A (current): this catalog drives WHICH specs activate per substrate and
// WHAT substrate_state each spec's ctx gets. Scenarios don't yet match on system.
//
// Pass B (deferred): scenarios will add `matches.system` + a data-driven
// (system × substrate × state × QT) → material_system lookup will replace
// hardcoded material_systems on scenarios.

// ============================================================
// METADATA — human labels & descriptions
// ============================================================
export const SYSTEM_METADATA = {
  // Paint workflows
  paint_full:             { label: 'Paint — prime + finish',         description: 'Full system: primer + finish coats. Standard for bare substrates.' },
  paint_finish:           { label: 'Paint — finish only',            description: 'No prime required; substrate already primed or painted.' },
  paint_plus_spot_prime:  { label: 'Paint — spot prime + finish',    description: 'Targeted priming (stain blocks, patches, repairs) + finish coats.' },
  paint_full_reprime:     { label: 'Paint — full reprime + finish',  description: 'Full prime pass over existing paint; for glossy or dramatic color change.' },
  prime_only:             { label: 'Prime only',                     description: 'Primer only; finish to come later. Phase-1 NC or garage-type work.' },

  // Stain / clear workflows (wood)
  stain_clear:            { label: 'Stain + clear',                  description: 'Stain + clear topcoat.' },
  stain_sealer_clear:     { label: 'Stain + sealer + clear',         description: 'Stain, sealer, clear topcoat (full wood finishing system).' },
  stain_only:             { label: 'Stain only',                     description: 'Stain without topcoat.' },
  clear_refresh:          { label: 'Clear coat refresh',             description: 'Re-coat existing stained surfaces with new clear.' },
  restain_recoat:         { label: 'Re-stain + recoat',              description: 'Reapply stain and clear over existing stained wood.' },

  // Strip + rebuild
  strip_and_paint:        { label: 'Strip + paint',                  description: 'Strip existing finish, then full paint system.' },
  strip_and_stain_clear:  { label: 'Strip + stain + clear',          description: 'Strip existing finish, then stain system.' },

  // Masonry
  paint_acrylic:          { label: 'Masonry — acrylic + block filler', description: 'Block filler + acrylic paint. Standard porous masonry system.' },
  paint_masonry_primer:   { label: 'Masonry — aggressive primer (Loxon-type)', description: 'High-adhesion masonry primer (pH neutralizing) + paint.' },
  paint_elastomeric:      { label: 'Masonry — elastomeric coating',  description: 'Elastomeric high-build coating system.' },
  paint_elastomeric_overcoat: { label: 'Elastomeric overcoat',       description: 'Elastomeric over existing painted masonry.' },
  encapsulate_elastomeric:{ label: 'Encapsulate + elastomeric',      description: 'Consolidate failing paint, then elastomeric.' },
  seal_only:              { label: 'Sealer only',                    description: 'Penetrating sealer; no paint/stain topcoat.' },

  // Exterior wood specialty
  stain_solid:            { label: 'Solid stain',                    description: 'Opaque solid-body stain.' },
  stain_transparent:      { label: 'Transparent stain',              description: 'Semi-transparent / transparent stain.' },
  stain_refresh:          { label: 'Stain refresh',                  description: 'Re-coat existing stain (decks, fences).' },
  strip_and_restain:      { label: 'Strip + re-stain',               description: 'Strip weathered/failing stain, re-stain.' },

  // Metal
  rust_prime_paint:       { label: 'Rust primer + paint',            description: 'Rust-inhibiting primer + paint for bare/galvanized metal.' },
  bonding_prime_paint:    { label: 'Bonding primer + paint',         description: 'Bonding primer for slick substrates (laminate, thermofoil, vinyl).' },
  rust_convert_prime_paint:{ label: 'Rust converter + primer + paint', description: 'Chemical rust conversion, then prime + paint.' },
  clean_prime_paint:      { label: 'Clean + prime + paint',          description: 'Deoxidize/clean, then prime + paint (chalked aluminum, etc.).' },
  paint_degloss_finish:   { label: 'Degloss + finish paint',         description: 'Mechanical de-gloss + finish coats (cabinets, pre-painted trim).' },

  // Scope variants
  prime_refresh:          { label: 'Prime refresh',                  description: 'Spot-prime refresh over factory primer before finish.' },
};

// ============================================================
// VALID SYSTEMS PER SUBSTRATE
// ============================================================
// Substrates not listed here fall back to an empty list (no system choice exposed).
export const SUBSTRATE_SYSTEMS = {
  // Interior surfaces (drywall)
  walls:             ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'prime_only'],
  ceiling:           ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'prime_only'],

  // Interior trim (wood)
  baseboard:         ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'restain_recoat', 'strip_and_paint', 'strip_and_stain_clear', 'prime_only'],
  crown:             ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'restain_recoat', 'strip_and_paint', 'strip_and_stain_clear', 'prime_only'],
  door_casing:       ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  window_casing:     ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  chair_rail:        ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  shoe_mold:         ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  picture_rail:      ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  window_stool:      ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  window_apron:      ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  shadow_box:        ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  panel_mold:        ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],

  // Interior doors & windows
  doors:             ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'strip_and_paint', 'strip_and_stain_clear', 'prime_only', 'paint_degloss_finish'],
  door_frames:       ['paint_full', 'paint_finish', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  windows:           ['paint_full', 'paint_finish', 'paint_plus_spot_prime', 'paint_full_reprime', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  window_jamb:       ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],

  // Interior specialty (wood)
  wainscoting:       ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  wood_feature_wall: ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  wood_ceiling:      ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  closet_shelving:   ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'prime_only'],
  beams:             ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  columns:           ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  mantels:           ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
  builtins:          ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'prime_only'],
  stairway:          ['paint_full', 'paint_finish', 'stain_clear', 'stain_sealer_clear', 'stain_only', 'clear_refresh', 'prime_only'],
};

// ============================================================
// DEFAULT SYSTEM INFERENCE — (substrate × substrate_state) → system
// ============================================================
// Used when no explicit `system` is set on the substrate config.
// Reads current substrate_state to pick a sensible default. UI shows
// the inferred default with an "(auto-inferred)" chip until the user
// explicitly picks a value.
export const DEFAULT_SYSTEM_INFERENCE = {
  walls: {
    bare_drywall:      'paint_full',
    factory_primed:    'paint_finish',
    painted_drywall:   'paint_finish',
    skim_coated:       'paint_full',
  },
  ceiling: {
    bare_drywall:      'paint_full',
    factory_primed:    'paint_finish',
    painted_drywall:   'paint_finish',
    skim_coated:       'paint_full',
  },
  baseboard: {
    bare_wood:         'paint_full',
    factory_primed:    'paint_finish',
    painted_wood:      'paint_finish',
    stained_wood:      'clear_refresh',
  },
  crown:             { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  door_casing:       { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  window_casing:     { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  chair_rail:        { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  shoe_mold:         { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  picture_rail:      { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  window_stool:      { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  window_apron:      { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  shadow_box:        { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  panel_mold:        { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },

  doors:             { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  door_frames:       { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  windows:           { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', vinyl_clad: 'paint_finish' },
  window_jamb:       { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },

  wainscoting:       { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  wood_feature_wall: { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  wood_ceiling:      { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  closet_shelving:   { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  beams:             { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  columns:           { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  mantels:           { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
  builtins:          { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish' },
  stairway:          { bare_wood: 'paint_full', factory_primed: 'paint_finish', painted_wood: 'paint_finish', stained_wood: 'clear_refresh' },
};

export function inferDefaultSystem(substrateId, substrateState) {
  return DEFAULT_SYSTEM_INFERENCE[substrateId]?.[substrateState] || null;
}

// System → coating_type derivation. The Coating Type field was retired from
// the substrate detail panel — System is the single source of truth. Callers
// that still need a coating_type value (engine context, scenario matchers)
// derive it from system via this helper.
export function coatingTypeFromSystem(system) {
  if (!system) return 'paint';
  if (system === 'stain_only' || system === 'stain_solid' || system === 'stain_transparent' || system === 'stain_refresh') return 'stain_only';
  if (system === 'clear_refresh' || system === 'seal_only' || system === 'prime_refresh') return 'clear_only';
  if (/stain/.test(system)) return 'stain_clear'; // stain_clear, stain_sealer_clear, restain_recoat, strip_and_stain_clear, strip_and_restain
  return 'paint';
}

// ============================================================
// SYSTEM → SPEC ACTIVATION MATRIX
// ============================================================
// For each (system, specRole) pair, decides:
//   - Whether the spec activates at all
//   - What substrate_state its ctx should carry ("input" = use current substrate
//     state from the room; "primed" = force SS_PRIMED because a prime pass
//     precedes this spec in the workflow; "stained" / "sealed" likewise)
//
// specRole values come from SPEC_ROLE in spec-maps.js:
//   PRIME    — spec runs only the prime pass
//   FINISH   — spec runs only the finish pass
//   STAIN    — spec runs only the stain pass
//   CLEAR    — spec runs only the clear pass
//   COMBINED — single spec runs the whole workflow internally (doors, windows, cabinets, etc.)
export const SYSTEM_SPEC_ACTIVATION = {
  paint_full: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_finish: {
    PRIME:    { active: false },
    FINISH:   { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_plus_spot_prime: {
    PRIME:    { active: true,  stateTransition: 'input' }, // Pass B scenarios distinguish spot vs full prime
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_full_reprime: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  prime_only: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: false },
    COMBINED: { active: false }, // combined specs need a dedicated prime-only scenario in Pass B
    STAIN:    { active: false },
  },
  prime_refresh: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },

  // Stain / clear workflows
  stain_clear: {
    STAIN:    { active: true,  stateTransition: 'input' },
    CLEAR:    { active: true,  stateTransition: 'stained' },
    COMBINED: { active: false },  // paint-path COMBINED specs suppressed under stain systems
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  stain_sealer_clear: {
    STAIN:    { active: true,  stateTransition: 'input' },
    SEALER:   { active: true,  stateTransition: 'stained' },
    CLEAR:    { active: true,  stateTransition: 'sealed' },
    COMBINED: { active: false },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  stain_only: {
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: false },
    CLEAR:    { active: false },
    SEALER:   { active: false },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  clear_refresh: {
    CLEAR:    { active: true,  stateTransition: 'input' },
    // STAIN-role specs hold the per-substrate workflow (stain+sealer+clear)
    // as one bundled spec. Under clear_refresh we still want that spec to
    // activate so its PREP/CLEAR/CLEANUP modules fire — stain and sealer
    // modules are zeroed out via resolveCoatCounts' coating_type gating.
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: false },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  restain_recoat: {
    STAIN:    { active: true,  stateTransition: 'input' },
    CLEAR:    { active: true,  stateTransition: 'stained' },
    COMBINED: { active: false },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },

  // Strip variants — treat like bare after strip
  strip_and_paint: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  strip_and_stain_clear: {
    STAIN:    { active: true,  stateTransition: 'input' },
    CLEAR:    { active: true,  stateTransition: 'stained' },
    COMBINED: { active: false },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },

  // Masonry
  paint_acrylic: {
    PRIME:    { active: true,  stateTransition: 'input' }, // block filler acts as prime
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_masonry_primer: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_elastomeric: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_elastomeric_overcoat: {
    PRIME:    { active: false },
    FINISH:   { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  encapsulate_elastomeric: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  seal_only: {
    PRIME:    { active: false },
    FINISH:   { active: false },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },

  // Exterior stain variants
  stain_solid: {
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  stain_transparent: {
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  stain_refresh: {
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },
  strip_and_restain: {
    STAIN:    { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    PRIME:    { active: false },
    FINISH:   { active: false },
  },

  // Metal
  rust_prime_paint: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  bonding_prime_paint: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  rust_convert_prime_paint: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  clean_prime_paint: {
    PRIME:    { active: true,  stateTransition: 'input' },
    FINISH:   { active: true,  stateTransition: 'primed' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
  paint_degloss_finish: {
    PRIME:    { active: false },
    FINISH:   { active: true,  stateTransition: 'input' },
    COMBINED: { active: true,  stateTransition: 'input' },
    STAIN:    { active: false },
  },
};

// ============================================================
// STATE TRANSITION → SPEC substrate_state
// ============================================================
// Maps the transition label to the actual SS_* state to stamp on ctx.
// Used by the adapter after SYSTEM_SPEC_ACTIVATION lookup.
export const STATE_TRANSITION_TARGET = {
  input:   null,              // sentinel: use the room's resolved substrate_state
  primed:  'SS_PRIMED',
  stained: 'SS_STAINED',
  sealed:  'SS_SEALED',
};

/**
 * Lookup the activation record for a (system, specRole) pair.
 * Returns { active: bool, stateTransition?: string } or a safe default when unknown.
 */
export function resolveActivation(system, specRole) {
  if (!system || !specRole) return { active: true, stateTransition: 'input' };
  const systemEntry = SYSTEM_SPEC_ACTIVATION[system];
  if (!systemEntry) return { active: true, stateTransition: 'input' };
  const roleEntry = systemEntry[specRole];
  if (!roleEntry) return { active: true, stateTransition: 'input' };
  return roleEntry;
}
