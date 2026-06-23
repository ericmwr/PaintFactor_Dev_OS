import { describe, it, expect } from 'vitest';
import { deriveStainScope, resolveSystem, resolveCoatingType } from '../scenario-resolution.js';
import { createRoom, createSubstrateConfig, createOpening } from '../../state/initial-state.js';
import { buildScenarioInputs } from '../context-adapter.js';
import { findBestMatch } from '../scenario-matcher.js';
import { scenarios } from '../../data/scenario-bundle.gen.js';
import { computeScenarioEstimate } from '../scenario-estimate.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

// ---------------------------------------------------------------------------
// deriveStainScope — pure helper, all flag combinations
// ---------------------------------------------------------------------------
describe('deriveStainScope — flag-to-system mapping (B3)', () => {
  it('stain+sealer+clear → system stain_sealer_clear, coating_type stain_clear', () => {
    expect(deriveStainScope({ stain_on: true, sealer_on: true, clear_on: true }))
      .toEqual({ system: 'stain_sealer_clear', coating_type: 'stain_clear' });
  });

  it('stain+clear (no sealer) → system stain_clear, coating_type stain_clear', () => {
    expect(deriveStainScope({ stain_on: true, sealer_on: false, clear_on: true }))
      .toEqual({ system: 'stain_clear', coating_type: 'stain_clear' });
  });

  it('stain only → system stain_only, coating_type stain_only', () => {
    expect(deriveStainScope({ stain_on: true, sealer_on: false, clear_on: false }))
      .toEqual({ system: 'stain_only', coating_type: 'stain_only' });
  });

  // DEFERRED (Design Decision #7): clear-over-bare needs clear-only scenarios not yet authored.
  // Decomposed families are stain-required; clear-only now returns null (fires nothing safely).
  it('clear only (no stain) → null [deferred: decomposed clear-over-bare not authored]', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: false, clear_on: true })).toBeNull();
  });

  it('no flags set → null', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: false, clear_on: false })).toBeNull();
  });

  it('undefined flags (legacy substrate, no flags) → null', () => {
    expect(deriveStainScope({})).toBeNull();
  });

  it('null config → null', () => {
    expect(deriveStainScope(null)).toBeNull();
  });

  it('sealer alone (no stain, no clear) → null (not a standalone system)', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: true, clear_on: false })).toBeNull();
  });

  it('stain+sealer (no clear) → system stain_only, coating_type stain_only (sealer irrelevant without clear)', () => {
    // stain=true, sealer=true, clear=false → falls into stain-only path
    expect(deriveStainScope({ stain_on: true, sealer_on: true, clear_on: false }))
      .toEqual({ system: 'stain_only', coating_type: 'stain_only' });
  });
});

// ---------------------------------------------------------------------------
// resolveSystem — flag-driven value wins; flagless substrates unchanged
// ---------------------------------------------------------------------------
const project = { default_quality_tier: 'QT3' };

function makeRoom(subKey, subConfig) {
  const room = createRoom({ label: 'Test' });
  room.substrates[subKey] = subConfig;
  return room;
}

describe('resolveSystem — presence-flag integration (B3)', () => {
  it('returns flag-derived system when stain+clear flags are set on a bare-wood substrate', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: false,
        clear_on: true,
      })
    );
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_clear');
  });

  it('returns stain_sealer_clear when all three flags set', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: true,
        clear_on: true,
      })
    );
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_sealer_clear');
  });

  it('returns stain_only when only stain_on is set', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: false,
        clear_on: false,
      })
    );
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_only');
  });

  // DEFERRED: deriveStainScope now returns null for no-stain combos. resolveSystem falls
  // through to the legacy coating_type/system back-compat path (still valid for bundled
  // families). For a door_frames config with only clear_on, the fallback ultimately
  // resolves via the legacy system field or inferredDefault — not a stain system.
  it('returns clear_refresh when only clear_on is set (legacy fallback path for bundled families)', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
        // Explicitly set system to clear_refresh so the legacy path is honored
        system: 'clear_refresh',
      })
    );
    // deriveStainScope returns null (no stain), so resolveSystem falls to explicit
    // config.system → 'clear_refresh' (legacy path, bundled families only).
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('clear_refresh');
  });

  it('falls through to existing logic when no flags are set (flagless bare_wood + coating_type)', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        coating_type: 'stain_clear',
        // no stain_on / sealer_on / clear_on
      })
    );
    // Existing logic: coating_type === 'stain_clear' → 'stain_sealer_clear'
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_sealer_clear');
  });

  it('flagless paint substrate does not return a stain system (no regression)', () => {
    const room = makeRoom(
      'walls',
      createSubstrateConfig('walls', {
        substrate_state: 'previously_painted',
        coating_type: 'paint',
      })
    );
    // Existing inference path — may return null (unknown) or a paint system.
    // The critical invariant: it must NOT return a stain system.
    const result = resolveSystem('SF_DRYWALL_WALL_NC_FINISH', room, project);
    if (result !== null) {
      expect(result).not.toMatch(/stain/);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveCoatingType — flag-driven coating_type; flagless path unchanged
// ---------------------------------------------------------------------------
describe('resolveCoatingType — presence-flag integration (B3)', () => {
  it('returns stain_clear when stain+clear flags set', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: false,
        clear_on: true,
      })
    );
    expect(resolveCoatingType('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_clear');
  });

  it('returns stain_only when only stain_on', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: false,
        clear_on: false,
      })
    );
    expect(resolveCoatingType('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_only');
  });

  // DEFERRED: deriveStainScope now returns null for no-stain combos.
  // resolveCoatingType falls through to the config.coating_type field (legacy path).
  it('returns clear_only when only clear_on (falls through to config.coating_type)', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
        coating_type: 'clear_only', // explicit so fallback resolves correctly
      })
    );
    // deriveStainScope returns null (no stain), so resolveCoatingType reads
    // config.coating_type directly → 'clear_only'.
    expect(resolveCoatingType('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('clear_only');
  });

  it('flagless substrate returns coating_type from config (existing logic unchanged)', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        coating_type: 'stain_only',
        // no presence flags
      })
    );
    expect(resolveCoatingType('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('stain_only');
  });

  it('flagless paint substrate returns paint (no regression)', () => {
    const room = makeRoom(
      'walls',
      createSubstrateConfig('walls', {
        substrate_state: 'previously_painted',
      })
    );
    expect(resolveCoatingType('SF_DRYWALL_WALL_NC_FINISH', room, project)).toBe('paint');
  });
});

// ---------------------------------------------------------------------------
// B2: coating_phase stamping + decomposed-family coat-field policy
// ---------------------------------------------------------------------------
// Helpers: build a minimal state with a bare-wood door_casing substrate.
function makeStainState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'B2 Test' });
  room.substrates.door_casing = createSubstrateConfig('door_casing', {
    substrate_state: 'bare_wood',
    painting: true,
    stain_on,
    sealer_on,
    clear_on,
  });
  return { project: { default_quality_tier: 'QT3' }, rooms: [room] };
}

function casingInputs(roomInputs) {
  return roomInputs.filter(i =>
    i.specId === 'SF_DOOR_CASING_NC_STAIN' ||
    i.specId === 'SF_DOOR_CASING_NC_SEALER' ||
    i.specId === 'SF_DOOR_CASING_NC_CLEAR'
  );
}

describe('B2 — coating_phase + decomposed coat-field suppression', () => {
  it('stain+clear (no sealer): emits exactly two casing inputs — stain@SS_BARE and clear@SS_STAINED', () => {
    const state = makeStainState({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = casingInputs(roomInputs);

    expect(inputs).toHaveLength(2);

    const stainInput = inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_STAIN');
    const clearInput = inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_CLEAR');

    expect(stainInput).toBeDefined();
    expect(stainInput.ctx.coating_phase).toBe('stain');
    expect(stainInput.ctx.substrate_state).toBe('SS_BARE');

    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.coating_phase).toBe('clear');
    expect(clearInput.ctx.substrate_state).toBe('SS_STAINED');

    // No sealer input
    expect(inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_SEALER')).toBeUndefined();
  });

  it('decomposed stain input has no ctx coat fields (coat_counts drives coats)', () => {
    const state = makeStainState({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = casingInputs(roomInputs);

    for (const inp of inputs) {
      expect(inp.ctx.stain_coats).toBeUndefined();
      expect(inp.ctx.sealer_coats).toBeUndefined();
      expect(inp.ctx.clear_coats).toBeUndefined();
    }
  });

  it('toggling sealer_on adds sealer@SS_STAINED and shifts clear to SS_SEALED', () => {
    const state = makeStainState({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = casingInputs(roomInputs);

    expect(inputs).toHaveLength(3);

    const stainInput = inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_STAIN');
    const sealerInput = inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_SEALER');
    const clearInput = inputs.find(i => i.specId === 'SF_DOOR_CASING_NC_CLEAR');

    expect(stainInput).toBeDefined();
    expect(stainInput.ctx.coating_phase).toBe('stain');
    expect(stainInput.ctx.substrate_state).toBe('SS_BARE');

    expect(sealerInput).toBeDefined();
    expect(sealerInput.ctx.coating_phase).toBe('sealer');
    expect(sealerInput.ctx.substrate_state).toBe('SS_STAINED');

    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.coating_phase).toBe('clear');
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('paint substrate (walls) emits NO coating_phase (paint inputs byte-identical)', () => {
    const room = createRoom({ label: 'Paint Room' });
    room.substrates.walls = createSubstrateConfig('walls', {
      substrate_state: 'bare_drywall',
    });
    const state = { project: { default_quality_tier: 'QT3' }, rooms: [room] };
    const { roomInputs } = buildScenarioInputs(state);
    const wallInputs = roomInputs.filter(i =>
      i.specId === 'SF_DRYWALL_WALL_NC_PRIME' || i.specId === 'SF_DRYWALL_WALL_NC_FINISH'
    );
    // Wall inputs should exist but have no coating_phase
    for (const inp of wallInputs) {
      expect(inp.ctx.coating_phase).toBeUndefined();
    }
  });

  it('bundled stain family still emits ctx coat fields (non-decomposed path unchanged)', () => {
    // SF_DOOR_FRAME_NC_STAIN is in STAIN_SPEC_FAMILIES but NOT in DECOMPOSED_STAIN_FAMILIES
    const room = createRoom({ label: 'Bundled Stain' });
    room.substrates.door_frames = createSubstrateConfig('door_frames', {
      substrate_state: 'bare_wood',
      stain_on: true,
      sealer_on: false,
      clear_on: true,
    });
    const state = { project: { default_quality_tier: 'QT3' }, rooms: [room] };
    const { roomInputs } = buildScenarioInputs(state);
    const frameStainInput = roomInputs.find(i => i.specId === 'SF_DOOR_FRAME_NC_STAIN');
    expect(frameStainInput).toBeDefined();
    // Bundled family: ctx coat fields ARE present
    expect(frameStainInput.ctx.stain_coats).toBeDefined();
    // coating_phase is still stamped (STAIN role)
    expect(frameStainInput.ctx.coating_phase).toBe('stain');
  });
});

// ---------------------------------------------------------------------------
// D1: findBestMatch — three door_casing phase scenarios in bundle
// ---------------------------------------------------------------------------
const bundle = { scenarios };

describe('D1 — door_casing phase scenario routing via findBestMatch', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_DOOR_CASING_STAIN', () => {
    const ctx = { paintable_item: 'int_door_casing', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_DOOR_CASING_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_DOOR_CASING_SEALER', () => {
    const ctx = { paintable_item: 'int_door_casing', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_DOOR_CASING_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_DOOR_CASING_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'int_door_casing', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_DOOR_CASING_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_DOOR_CASING_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_door_casing', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_DOOR_CASING_CLEAR');
  });

  it('bundled SCN_INT_DOOR_CASING_STAIN_CLEAR is no longer in the bundle', () => {
    // net +2 door_casing scenarios (3 new − 1 archived = +2)
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_DOOR_CASING_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// D2: findBestMatch — three arch_element phase scenarios in bundle
// ---------------------------------------------------------------------------
describe('D2 — arch_element phase scenario routing via findBestMatch', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_AEST_STAIN', () => {
    const ctx = { paintable_item: 'int_arch_element', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_AEST_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_AEST_SEALER', () => {
    const ctx = { paintable_item: 'int_arch_element', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_AEST_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_AEST_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'int_arch_element', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_AEST_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_AEST_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_arch_element', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_AEST_CLEAR');
  });

  it('bundled SCN_INT_AEST_STAIN_CLEAR is no longer in the bundle', () => {
    // net +2 arch scenarios (3 new − 1 archived = +2)
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_AEST_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// D3: Full end-to-end integration — pilot families fire correct phases
// ---------------------------------------------------------------------------
//
// Approach: computeScenarioEstimate (approach 1) against the canonical bundle.
// door_casing gets casing LF from one opening (single door = 17 LF per side,
// both sides = 34 LF openingCasingLF autoDerive). beams use lf_manual so the
// PS_SURFACE_LF.ARCH_BEAM quantity is non-zero without vault geometry.
//
// Assertions cover:
//   A) specResults inclusion/exclusion for each flag combo
//   B) no "no scenario matched" warnings for pilot phase inputs
//   C) stain material line resolves to a real product with coats === 1
//   D) sealer flag shifts clear input to SS_SEALED (already tested at adapter
//      level in B2; D3 confirms the full pipeline honours it)

// Build minimal state for door_casing bare + given presence flags.
// One opening produces 34 LF of casing (single door × 2 sides × 17 LF/side).
function makeDoorCasingState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'D3 Casing' });
  // Add one single-door opening so openingCasingLF > 0
  room.openings = [createOpening({ opening_type: 'single', count: 1 })];
  // door_casing bare + stain presence flags
  room.substrates.door_casing = createSubstrateConfig('door_casing', {
    substrate_state: 'bare_wood',
    painting: true,
    stain_on,
    sealer_on,
    clear_on,
  });
  return {
    project: {
      default_quality_tier: 'QT3',
      material_overrides: { system: {}, manual: [] },
    },
    rooms: [room],
    exterior: { elevations: [], defaults: {} },
  };
}

// Build minimal state for arch_element (beams substrate) bare + given flags.
function makeArchElementState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'D3 Arch' });
  // lf_manual = 10, beam_sides = 3, beam_qty = 2  →  60 LF of ARCH_BEAM quantity
  room.substrates.beams = createSubstrateConfig('beams', {
    substrate_state: 'bare_wood',
    stain_on,
    sealer_on,
    clear_on,
    lf_manual: 10,
    beam_sides: 3,
    beam_qty: 2,
  });
  return {
    project: {
      default_quality_tier: 'QT3',
      material_overrides: { system: {}, manual: [] },
    },
    rooms: [room],
    exterior: { elevations: [], defaults: {} },
  };
}

// Helper: filter gap entries to only pilot phase specIds (avoids noise from
// other specs in the same room that may have genuine gaps).
function casingGaps(result) {
  const PILOT = new Set([
    'SF_DOOR_CASING_NC_STAIN',
    'SF_DOOR_CASING_NC_SEALER',
    'SF_DOOR_CASING_NC_CLEAR',
  ]);
  return (result.gaps || []).filter(g => PILOT.has(g.specId));
}

function archGaps(result) {
  const PILOT = new Set([
    'SF_ARCH_ELEMENT_NC_STAIN',
    'SF_ARCH_ELEMENT_NC_SEALER',
    'SF_ARCH_ELEMENT_NC_CLEAR',
  ]);
  return (result.gaps || []).filter(g => PILOT.has(g.specId));
}

// Helper: warnings that mention casing pilot specIds
function casingWarnings(result) {
  const PILOT_NAMES = ['SF_DOOR_CASING_NC_STAIN', 'SF_DOOR_CASING_NC_SEALER', 'SF_DOOR_CASING_NC_CLEAR'];
  return (result.warnings || []).filter(w => PILOT_NAMES.some(n => String(w).includes(n)));
}

function archWarnings(result) {
  const PILOT_NAMES = ['SF_ARCH_ELEMENT_NC_STAIN', 'SF_ARCH_ELEMENT_NC_SEALER', 'SF_ARCH_ELEMENT_NC_CLEAR'];
  return (result.warnings || []).filter(w => PILOT_NAMES.some(n => String(w).includes(n)));
}

describe('D3 — door_casing integration: stain+clear (no sealer)', () => {
  const state = makeDoorCasingState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_DOOR_CASING_NC_STAIN', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    expect(found).toBe(true);
  });

  it('specResults includes SF_DOOR_CASING_NC_CLEAR', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(found).toBe(true);
  });

  it('specResults does NOT include SF_DOOR_CASING_NC_SEALER (sealer_on=false)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_SEALER');
    expect(found).toBe(false);
  });

  it('no "no scenario matched" gaps for door_casing pilot specIds', () => {
    expect(casingGaps(result)).toHaveLength(0);
  });

  it('no warnings mentioning door_casing pilot specIds', () => {
    expect(casingWarnings(result)).toHaveLength(0);
  });

  it('stain material line has a real productId (not null) and productName not equal to the raw system id', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    // productId must be a real catalog id (not null)
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    // productName must not be the raw system id (SYS_STAIN_OIL) or '(unknown)'
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.productName).not.toBe('(unknown)');
    expect(typeof stainMat.productName).toBe('string');
    expect(stainMat.productName.length).toBeGreaterThan(0);
  });

  it('stain material line has coats === 1 (coat_counts default)', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.coats).toBe(1);
  });

  it('both spec lines have positive totalHours', () => {
    const stainSpec = (result.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    const clearSpec = (result.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(stainSpec.totalHours).toBeGreaterThan(0);
    expect(clearSpec.totalHours).toBeGreaterThan(0);
  });
});

describe('D3 — door_casing integration: stain+sealer+clear', () => {
  const state = makeDoorCasingState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('specResults includes all three decomposed casing specs', () => {
    const stainFound   = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    const sealerFound  = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_SEALER');
    const clearFound   = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(stainFound).toBe(true);
    expect(sealerFound).toBe(true);
    expect(clearFound).toBe(true);
  });

  it('no gaps for any of the three casing pilot specIds', () => {
    expect(casingGaps(result)).toHaveLength(0);
  });

  it('clear input is matched at SS_SEALED (sealer path)', () => {
    // The perInputResults for the clear spec should have substrate_state SS_SEALED
    const clearInput = (result.perInputResults || []).find(
      pr => pr.specId === 'SF_DOOR_CASING_NC_CLEAR'
    );
    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });
});

describe('D3 — arch_element integration: stain+clear (no sealer)', () => {
  // Fix applied (task-D3): TSK_AEST_* tasks updated from PS_SURFACE_LF.ARCH_ELEMENT
  // to PS_SURFACE_LF.ARCH_BEAM, matching what the quantity lookup emits for the
  // beams substrate. Arch stain now resolves real hours and a real material line,
  // on par with door_casing health.
  // lf_manual=10, beam_sides=3, beam_qty=2 → 60 LF of ARCH_BEAM quantity.

  const state = makeArchElementState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_ARCH_ELEMENT_NC_STAIN', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_ARCH_ELEMENT_NC_STAIN');
    expect(found).toBe(true);
  });

  it('specResults includes SF_ARCH_ELEMENT_NC_CLEAR', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_ARCH_ELEMENT_NC_CLEAR');
    expect(found).toBe(true);
  });

  it('specResults does NOT include SF_ARCH_ELEMENT_NC_SEALER (sealer_on=false)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_ARCH_ELEMENT_NC_SEALER');
    expect(found).toBe(false);
  });

  it('no gaps for arch_element pilot specIds (scenarios matched correctly)', () => {
    expect(archGaps(result)).toHaveLength(0);
  });

  it('no warnings mentioning arch_element pilot specIds', () => {
    expect(archWarnings(result)).toHaveLength(0);
  });

  it('arch stain totalHours is greater than 0 (PS key fix resolves ARCH_BEAM quantity)', () => {
    const stainSpec = (result.specResults || []).find(sr => sr.specId === 'SF_ARCH_ELEMENT_NC_STAIN');
    expect(stainSpec).toBeDefined();
    expect(stainSpec.totalHours).toBeGreaterThan(0);
  });

  it('arch stain material line has a real productId (not null) with coats === 1', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_ARCH_ELEMENT_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    // productId must be a real catalog id (not null)
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    // productName must not be the raw system id or '(unknown)'
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.productName).not.toBe('(unknown)');
    expect(stainMat.coats).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// E1: Parametrized "no gaps for any flag combo" guard
// Verifies that ALL 8 combinations of (stain_on, sealer_on, clear_on) on a
// bare-wood door_casing substrate produce ZERO "no scenario matched" gaps
// attributable to decomposed pilot spec ids. The no-stain combos additionally
// must emit NO decomposed phase inputs (clear-only is deferred → fires nothing).
// ---------------------------------------------------------------------------
const CASING_PILOT = new Set([
  'SF_DOOR_CASING_NC_STAIN',
  'SF_DOOR_CASING_NC_SEALER',
  'SF_DOOR_CASING_NC_CLEAR',
]);

const FLAG_COMBOS = [
  { stain_on: false, sealer_on: false, clear_on: false, label: 'none' },
  { stain_on: false, sealer_on: false, clear_on: true,  label: 'clear-only' },
  { stain_on: false, sealer_on: true,  clear_on: false, label: 'sealer-only' },
  { stain_on: false, sealer_on: true,  clear_on: true,  label: 'sealer+clear (no stain)' },
  { stain_on: true,  sealer_on: false, clear_on: false, label: 'stain-only' },
  { stain_on: true,  sealer_on: false, clear_on: true,  label: 'stain+clear' },
  { stain_on: true,  sealer_on: true,  clear_on: false, label: 'stain+sealer' },
  { stain_on: true,  sealer_on: true,  clear_on: true,  label: 'stain+sealer+clear' },
];

describe('E1 — no gaps for any flag combo on bare door_casing', () => {
  for (const combo of FLAG_COMBOS) {
    const hasStain = combo.stain_on;
    describe(`combo: ${combo.label}`, () => {
      const state = makeDoorCasingState(combo);
      const { roomInputs } = buildScenarioInputs(state);
      const pilotInputs = roomInputs.filter(ri => CASING_PILOT.has(ri.specId));
      const result = computeScenarioEstimate(state, canonicalBundle, null, []);
      const gaps = casingGaps(result);

      it('ZERO "no scenario matched" gaps for casing pilot specs', () => {
        expect(gaps).toHaveLength(0);
      });

      if (!hasStain) {
        // No-stain combos: decomposed phase specs must be completely absent (deferred)
        it('NO decomposed casing phase inputs emitted (clear-only deferred → fires nothing)', () => {
          expect(pilotInputs).toHaveLength(0);
        });
      } else {
        // Stain-present combos: stain spec must fire
        it('SF_DOOR_CASING_NC_STAIN input is emitted', () => {
          expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_STAIN')).toBe(true);
        });
        // SEALER only fires when system = stain_sealer_clear (requires stain+sealer+clear).
        // stain+sealer alone → system=stain_only → SEALER role is inactive (correct behavior).
        if (combo.sealer_on && combo.clear_on) {
          it('SF_DOOR_CASING_NC_SEALER input is emitted (sealer+clear path)', () => {
            expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_SEALER')).toBe(true);
          });
        }
        if (combo.clear_on) {
          it('SF_DOOR_CASING_NC_CLEAR input is emitted', () => {
            expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_CLEAR')).toBe(true);
          });
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// E2: Bundled family (baseboard) stain+clear still fires for regression guard
// ---------------------------------------------------------------------------
describe('E2 — bundled stain family (baseboard) stain+clear fires, no gaps (regression guard)', () => {
  function makeBaseboardState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'E2 Baseboard' });
    room.substrates.baseboard = createSubstrateConfig('baseboard', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
    });
    return {
      project: {
        default_quality_tier: 'QT3',
        material_overrides: { system: {}, manual: [] },
      },
      rooms: [room],
      exterior: { elevations: [], defaults: {} },
    };
  }

  it('bundled stain+clear: SF_BASEBOARD_NC_STAIN input is emitted', () => {
    const state = makeBaseboardState({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const found = roomInputs.some(i => i.specId === 'SF_BASEBOARD_NC_STAIN');
    expect(found).toBe(true);
  });

  it('bundled stain+clear: no "no scenario matched" gaps for baseboard stain', () => {
    const state = makeBaseboardState({ stain_on: true, sealer_on: false, clear_on: true });
    const result = computeScenarioEstimate(state, canonicalBundle, null, []);
    const gaps = (result.gaps || []).filter(g => g.specId === 'SF_BASEBOARD_NC_STAIN');
    expect(gaps).toHaveLength(0);
  });
});
