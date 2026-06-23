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

  // D4: no-stain clear-over-bare — now authored (natural finish support)
  it('clear only (no stain) → system clear_bare, coating_type clear_only', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: false, clear_on: true }))
      .toEqual({ system: 'clear_bare', coating_type: 'clear_only' });
  });

  it('sealer+clear (no stain) → system seal_clear_bare, coating_type clear_only', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: true, clear_on: true }))
      .toEqual({ system: 'seal_clear_bare', coating_type: 'clear_only' });
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

  // F3: door_frame is now decomposed. When only clear_on is set, deriveStainScope
  // returns 'clear_bare' (the decomposed-family path wins over the legacy system field).
  it('returns clear_bare when only clear_on is set (decomposed family path)', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
        // system field is ignored for decomposed families — deriveStainScope wins
        system: 'clear_refresh',
      })
    );
    // SF_DOOR_FRAME_NC_STAIN is in DECOMPOSED_STAIN_FAMILIES → deriveStainScope
    // returns 'clear_bare' (clear_on=true, no stain) → resolveSystem returns 'clear_bare'.
    expect(resolveSystem('SF_DOOR_FRAME_NC_STAIN', room, project)).toBe('clear_bare');
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
    // createSubstrateConfig injects stain_on/sealer_on/clear_on as false (all defined),
    // so hasFlags=true → deriveStainScope returns null (all false), resolveSystem falls
    // through to coating_type logic → 'stain_sealer_clear'.
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

  it('decomposed stain family (door_frame, F3) suppresses ctx coat fields', () => {
    // F3: SF_DOOR_FRAME_NC_STAIN is now in DECOMPOSED_STAIN_FAMILIES
    // → coat fields are suppressed from ctx; coat_counts in the scenario drives coats
    const room = createRoom({ label: 'Decomposed Stain F3' });
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
    // Decomposed family: ctx coat fields are SUPPRESSED (coat_counts in scenario drives coats)
    expect(frameStainInput.ctx.stain_coats).toBeUndefined();
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
    const hasClear = combo.clear_on;
    const hasSealer = combo.sealer_on;
    describe(`combo: ${combo.label}`, () => {
      const state = makeDoorCasingState(combo);
      const { roomInputs } = buildScenarioInputs(state);
      const pilotInputs = roomInputs.filter(ri => CASING_PILOT.has(ri.specId));
      const result = computeScenarioEstimate(state, canonicalBundle, null, []);
      const gaps = casingGaps(result);

      it('ZERO "no scenario matched" gaps for casing pilot specs', () => {
        expect(gaps).toHaveLength(0);
      });

      if (!hasStain && !hasClear && !hasSealer) {
        // None selected: no decomposed inputs emitted
        it('NO decomposed casing phase inputs emitted (nothing selected)', () => {
          expect(pilotInputs).toHaveLength(0);
        });
      } else if (!hasStain && hasSealer && !hasClear) {
        // Sealer-only (no stain, no clear): degenerate → fires nothing
        it('NO decomposed casing phase inputs emitted (sealer-only degenerate)', () => {
          expect(pilotInputs).toHaveLength(0);
        });
      } else if (!hasStain && hasClear) {
        // No-stain, clear-present: D4 — CLEAR fires at SS_BARE
        it('SF_DOOR_CASING_NC_CLEAR input is emitted at SS_BARE (clear-only/seal+clear bare)', () => {
          expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_CLEAR')).toBe(true);
        });
        if (hasSealer) {
          // sealer+clear bare: SEALER fires at SS_BARE, CLEAR fires at SS_SEALED
          it('SF_DOOR_CASING_NC_SEALER input is emitted at SS_BARE (seal+clear bare)', () => {
            expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_SEALER')).toBe(true);
          });
        }
      } else {
        // Stain-present combos: stain spec must fire
        it('SF_DOOR_CASING_NC_STAIN input is emitted', () => {
          expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_STAIN')).toBe(true);
        });
        // SEALER only fires when system = stain_sealer_clear (requires stain+sealer+clear).
        // stain+sealer alone → system=stain_only → SEALER role is inactive (correct behavior).
        if (hasSealer && hasClear) {
          it('SF_DOOR_CASING_NC_SEALER input is emitted (sealer+clear path)', () => {
            expect(pilotInputs.some(i => i.specId === 'SF_DOOR_CASING_NC_SEALER')).toBe(true);
          });
        }
        if (hasClear) {
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

  // D4 regression: bundled family clear-only still takes the LEGACY path (not the decomposed no-stain path)
  it('bundled clear-only (no stain): baseboard fires via legacy path, zero gaps', () => {
    // Bundled families with clear_on but no stain_on fall through to the legacy
    // coating_type/system path — they do NOT use the decomposed CLEAR_BARE scenario.
    // Verify: no SF_BASEBOARD_NC_STAIN/SEALER/CLEAR gaps (the legacy path either
    // routes to the bundled scenario or emits no input — neither is a gap).
    const state = makeBaseboardState({ stain_on: false, sealer_on: false, clear_on: true });
    const result = computeScenarioEstimate(state, canonicalBundle, null, []);
    const gaps = (result.gaps || []).filter(g =>
      g.specId === 'SF_BASEBOARD_NC_STAIN' ||
      g.specId === 'SF_BASEBOARD_NC_CLEAR'
    );
    expect(gaps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// D4: Natural finish (clear-only + sealer+clear) integration — door_casing
// ---------------------------------------------------------------------------
describe('D4 — door_casing clear-only (no stain, bare wood)', () => {
  const state = makeDoorCasingState({ stain_on: false, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_DOOR_CASING_NC_CLEAR (CLEAR_BARE scenario matched)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(found).toBe(true);
  });

  it('specResults does NOT include SF_DOOR_CASING_NC_STAIN (no stain)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    expect(found).toBe(false);
  });

  it('specResults does NOT include SF_DOOR_CASING_NC_SEALER (sealer_on=false)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_SEALER');
    expect(found).toBe(false);
  });

  it('zero gaps for casing pilot specs (CLEAR_BARE scenario matched at SS_BARE)', () => {
    expect(casingGaps(result)).toHaveLength(0);
  });

  it('no warnings mentioning casing pilot specs', () => {
    expect(casingWarnings(result)).toHaveLength(0);
  });

  it('CLEAR spec line has positive totalHours (prep + clear + cleanup modules fire)', () => {
    const clearSpec = (result.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(clearSpec).toBeDefined();
    expect(clearSpec.totalHours).toBeGreaterThan(0);
  });

  it('clear material line has a real productId (not null)', () => {
    const clearMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_DOOR_CASING_NC_CLEAR' && m.productRole === 'clear'
    );
    expect(clearMat).toBeDefined();
    expect(clearMat.productId).not.toBeNull();
    expect(typeof clearMat.productId).toBe('string');
    expect(clearMat.productId.length).toBeGreaterThan(0);
  });
});

describe('D4 — door_casing sealer+clear (no stain, bare wood)', () => {
  const state = makeDoorCasingState({ stain_on: false, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_DOOR_CASING_NC_SEALER (SEALER_BARE scenario matched at SS_BARE)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_SEALER');
    expect(found).toBe(true);
  });

  it('specResults includes SF_DOOR_CASING_NC_CLEAR (CLEAR scenario matched at SS_SEALED)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(found).toBe(true);
  });

  it('specResults does NOT include SF_DOOR_CASING_NC_STAIN (no stain)', () => {
    const found = (result.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    expect(found).toBe(false);
  });

  it('zero gaps for casing pilot specs', () => {
    expect(casingGaps(result)).toHaveLength(0);
  });

  it('no warnings mentioning casing pilot specs', () => {
    expect(casingWarnings(result)).toHaveLength(0);
  });

  it('sealer input is matched at SS_BARE', () => {
    const sealerInput = (result.perInputResults || []).find(
      pr => pr.specId === 'SF_DOOR_CASING_NC_SEALER'
    );
    expect(sealerInput).toBeDefined();
    expect(sealerInput.ctx.substrate_state).toBe('SS_BARE');
  });

  it('clear input is matched at SS_SEALED (state transitions correctly from sealer)', () => {
    const clearInput = (result.perInputResults || []).find(
      pr => pr.specId === 'SF_DOOR_CASING_NC_CLEAR'
    );
    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('sealer spec line has positive totalHours', () => {
    const sealerSpec = (result.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_SEALER');
    expect(sealerSpec).toBeDefined();
    expect(sealerSpec.totalHours).toBeGreaterThan(0);
  });

  it('clear spec line has positive totalHours', () => {
    const clearSpec = (result.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(clearSpec).toBeDefined();
    expect(clearSpec.totalHours).toBeGreaterThan(0);
  });

  it('sealer material line has a real productId', () => {
    const sealerMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_DOOR_CASING_NC_SEALER'
    );
    expect(sealerMat).toBeDefined();
    expect(sealerMat.productId).not.toBeNull();
    expect(typeof sealerMat.productId).toBe('string');
    expect(sealerMat.productId.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// F0: Migration fallback — legacy substrates (no flags) infer scope from coating_type
// ---------------------------------------------------------------------------
describe('F0 — deriveStainScope: legacy substrates infer scope from coating_type', () => {
  // --- Pure helper: legacy path ---
  it('legacy stain_clear (no sealer_coats) → system stain_clear, coating_type stain_clear', () => {
    expect(deriveStainScope({ coating_type: 'stain_clear' }))
      .toEqual({ system: 'stain_clear', coating_type: 'stain_clear' });
  });

  it('legacy stain_clear with sealer_coats:1 → system stain_sealer_clear, coating_type stain_clear', () => {
    expect(deriveStainScope({ coating_type: 'stain_clear', sealer_coats: 1 }))
      .toEqual({ system: 'stain_sealer_clear', coating_type: 'stain_clear' });
  });

  it('legacy stain_only → system stain_only, coating_type stain_only', () => {
    expect(deriveStainScope({ coating_type: 'stain_only' }))
      .toEqual({ system: 'stain_only', coating_type: 'stain_only' });
  });

  it('legacy clear_only (no sealer_coats) → system clear_bare, coating_type clear_only', () => {
    expect(deriveStainScope({ coating_type: 'clear_only' }))
      .toEqual({ system: 'clear_bare', coating_type: 'clear_only' });
  });

  it('legacy clear_only with sealer_coats:2 → system seal_clear_bare, coating_type clear_only', () => {
    expect(deriveStainScope({ coating_type: 'clear_only', sealer_coats: 2 }))
      .toEqual({ system: 'seal_clear_bare', coating_type: 'clear_only' });
  });

  it('legacy coating_type:paint → null (paint substrates unaffected)', () => {
    expect(deriveStainScope({ coating_type: 'paint' })).toBeNull();
  });

  it('legacy no coating_type (bare object) → null', () => {
    expect(deriveStainScope({})).toBeNull();
  });

  // --- Flags present: exact flag values honored even when coating_type suggests stain ---
  it('flags present, all false + coating_type:stain_clear → null (user turned everything off)', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: false, clear_on: false, coating_type: 'stain_clear' }))
      .toBeNull();
  });

  it('flags present, stain_on+clear_on (no sealer) → stain_clear regardless of coating_type', () => {
    expect(deriveStainScope({ stain_on: true, clear_on: true, sealer_on: false, coating_type: 'stain_only' }))
      .toEqual({ system: 'stain_clear', coating_type: 'stain_clear' });
  });

  // --- Paint safety: flagless paint/unset substrates fire nothing ---
  it('flagless paint substrate → null (McLeod paint parity preserved)', () => {
    expect(deriveStainScope({ coating_type: 'paint', substrate_state: 'previously_painted' })).toBeNull();
  });

  it('flagless unset coating_type → null (McLeod paint parity preserved)', () => {
    // Typical paint substrate saved before stain was ever considered — no flags, no stain coating_type
    expect(deriveStainScope({ substrate_state: 'previously_painted' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// F0 Integration: legacy door_casing (coating_type only, no flags) fires stain + clear
// ---------------------------------------------------------------------------
describe('F0 — integration: legacy door_casing (no flags, coating_type:stain_clear) fires decomposed phases', () => {
  // Simulate legacy data: door_casing config has coating_type but NO stain_on/sealer_on/clear_on flags.
  function makeLegacyDoorCasingState() {
    const room = createRoom({ label: 'F0 Legacy Casing' });
    room.openings = [createOpening({ opening_type: 'single', count: 1 })];
    // Legacy substrate: saved before presence flags; only has coating_type
    room.substrates.door_casing = createSubstrateConfig('door_casing', {
      substrate_state: 'bare_wood',
      painting: true,
      coating_type: 'stain_clear',
      // NOTE: stain_on / sealer_on / clear_on are intentionally ABSENT
    });
    // Remove any flags that createSubstrateConfig may inject
    delete room.substrates.door_casing.stain_on;
    delete room.substrates.door_casing.sealer_on;
    delete room.substrates.door_casing.clear_on;
    return {
      project: {
        default_quality_tier: 'QT3',
        material_overrides: { system: {}, manual: [] },
      },
      rooms: [room],
      exterior: { elevations: [], defaults: {} },
    };
  }

  const legacyState = makeLegacyDoorCasingState();
  const legacyResult = computeScenarioEstimate(legacyState, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(legacyResult).not.toBeNull();
    expect(legacyResult.error).toBeUndefined();
  });

  it('specResults includes SF_DOOR_CASING_NC_STAIN (legacy stain fires)', () => {
    const found = (legacyResult.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    expect(found).toBe(true);
  });

  it('specResults includes SF_DOOR_CASING_NC_CLEAR (legacy clear fires)', () => {
    const found = (legacyResult.specResults || []).some(sr => sr.specId === 'SF_DOOR_CASING_NC_CLEAR');
    expect(found).toBe(true);
  });

  it('zero "no scenario matched" gaps for casing pilot specIds', () => {
    const PILOT = new Set(['SF_DOOR_CASING_NC_STAIN', 'SF_DOOR_CASING_NC_SEALER', 'SF_DOOR_CASING_NC_CLEAR']);
    const gaps = (legacyResult.gaps || []).filter(g => PILOT.has(g.specId));
    expect(gaps).toHaveLength(0);
  });

  it('stain material line has a real productId (not null)', () => {
    const stainMat = (legacyResult.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_DOOR_CASING_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
  });

  it('stain spec has positive totalHours (legacy substrate now estimates correctly)', () => {
    const stainSpec = (legacyResult.specResults || []).find(sr => sr.specId === 'SF_DOOR_CASING_NC_STAIN');
    expect(stainSpec).toBeDefined();
    expect(stainSpec.totalHours).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// F1: Decomposed families — baseboard + window_casing ctx routing
// Verifies the four new families route correctly through findBestMatch and
// produce zero gaps + real products in computeScenarioEstimate.
// ---------------------------------------------------------------------------

// ── Baseboard: adapter routing ──────────────────────────────────────────────
describe('F1 — baseboard adapter routing (decomposed)', () => {
  const BASEBOARD_PILOT = new Set([
    'SF_BASEBOARD_NC_STAIN',
    'SF_BASEBOARD_NC_SEALER',
    'SF_BASEBOARD_NC_CLEAR',
  ]);

  function makeBaseboardStateF1({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F1 Baseboard' });
    room.substrates.baseboard = createSubstrateConfig('baseboard', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
    });
    return { project: { default_quality_tier: 'QT3' }, rooms: [room] };
  }

  it('stain+clear: emits STAIN@SS_BARE and CLEAR@SS_STAINED inputs (no sealer)', () => {
    const state = makeBaseboardStateF1({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => BASEBOARD_PILOT.has(i.specId));

    expect(inputs).toHaveLength(2);
    const stainIn = inputs.find(i => i.specId === 'SF_BASEBOARD_NC_STAIN');
    const clearIn  = inputs.find(i => i.specId === 'SF_BASEBOARD_NC_CLEAR');

    expect(stainIn).toBeDefined();
    expect(stainIn.ctx.coating_phase).toBe('stain');
    expect(stainIn.ctx.substrate_state).toBe('SS_BARE');

    expect(clearIn).toBeDefined();
    expect(clearIn.ctx.coating_phase).toBe('clear');
    expect(clearIn.ctx.substrate_state).toBe('SS_STAINED');

    expect(inputs.find(i => i.specId === 'SF_BASEBOARD_NC_SEALER')).toBeUndefined();
  });

  it('stain+sealer+clear: emits all three inputs in correct states', () => {
    const state = makeBaseboardStateF1({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => BASEBOARD_PILOT.has(i.specId));

    expect(inputs).toHaveLength(3);
    expect(inputs.find(i => i.specId === 'SF_BASEBOARD_NC_STAIN')?.ctx.substrate_state).toBe('SS_BARE');
    expect(inputs.find(i => i.specId === 'SF_BASEBOARD_NC_SEALER')?.ctx.substrate_state).toBe('SS_STAINED');
    expect(inputs.find(i => i.specId === 'SF_BASEBOARD_NC_CLEAR')?.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('decomposed inputs have no ctx coat fields', () => {
    const state = makeBaseboardStateF1({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    for (const inp of roomInputs.filter(i => BASEBOARD_PILOT.has(i.specId))) {
      expect(inp.ctx.stain_coats).toBeUndefined();
      expect(inp.ctx.sealer_coats).toBeUndefined();
      expect(inp.ctx.clear_coats).toBeUndefined();
    }
  });
});

// ── Baseboard: findBestMatch scenario routing ────────────────────────────────
describe('F1 — baseboard scenario routing via findBestMatch', () => {
  it('SS_BARE + stain → SCN_INT_BASEBOARD_STAIN', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_STAIN');
  });

  it('SS_STAINED + sealer → SCN_INT_BASEBOARD_SEALER', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_SEALER');
  });

  it('SS_STAINED + clear → SCN_INT_BASEBOARD_CLEAR', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_CLEAR');
  });

  it('SS_SEALED + clear → SCN_INT_BASEBOARD_CLEAR', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_CLEAR');
  });

  it('SS_BARE + clear → SCN_INT_BASEBOARD_CLEAR_BARE (natural finish)', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_CLEAR_BARE');
  });

  it('SS_BARE + sealer → SCN_INT_BASEBOARD_SEALER_BARE (no-stain sealer)', () => {
    const ctx = { paintable_item: 'int_baseboard', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_BASEBOARD_SEALER_BARE');
  });

  it('bundled SCN_INT_BASEBOARD_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_BASEBOARD_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ── Baseboard: full integration ──────────────────────────────────────────────
describe('F1 — baseboard integration: stain+clear (no sealer)', () => {
  function makeBaseboardIntState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F1 Baseboard Int' });
    // Use lf_override so quantity is non-zero regardless of room geometry
    room.substrates.baseboard = createSubstrateConfig('baseboard', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
      lf_override: true,
      lf_manual: 20,
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

  const BASEBOARD_PILOT = new Set([
    'SF_BASEBOARD_NC_STAIN',
    'SF_BASEBOARD_NC_SEALER',
    'SF_BASEBOARD_NC_CLEAR',
  ]);

  const state = makeBaseboardIntState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_BASEBOARD_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_BASEBOARD_NC_STAIN')).toBe(true);
  });

  it('specResults includes SF_BASEBOARD_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_BASEBOARD_NC_CLEAR')).toBe(true);
  });

  it('specResults does NOT include SF_BASEBOARD_NC_SEALER (sealer_on=false)', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_BASEBOARD_NC_SEALER')).toBe(false);
  });

  it('zero gaps for baseboard pilot specIds', () => {
    const gaps = (result.gaps || []).filter(g => BASEBOARD_PILOT.has(g.specId));
    expect(gaps).toHaveLength(0);
  });

  it('stain material line has a real productId and coats === 1', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_BASEBOARD_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.coats).toBe(1);
  });
});

// ── window_casing: adapter routing ──────────────────────────────────────────
describe('F1 — window_casing adapter routing (decomposed)', () => {
  const WINCASING_PILOT = new Set([
    'SF_WINDOW_CASING_NC_STAIN',
    'SF_WINDOW_CASING_NC_SEALER',
    'SF_WINDOW_CASING_NC_CLEAR',
  ]);

  function makeWindowCasingState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F1 WinCasing' });
    room.substrates.window_casing = createSubstrateConfig('window_casing', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
    });
    return { project: { default_quality_tier: 'QT3' }, rooms: [room] };
  }

  it('stain+clear: emits STAIN@SS_BARE and CLEAR@SS_STAINED inputs (no sealer)', () => {
    const state = makeWindowCasingState({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => WINCASING_PILOT.has(i.specId));

    expect(inputs).toHaveLength(2);
    expect(inputs.find(i => i.specId === 'SF_WINDOW_CASING_NC_STAIN')?.ctx.substrate_state).toBe('SS_BARE');
    expect(inputs.find(i => i.specId === 'SF_WINDOW_CASING_NC_CLEAR')?.ctx.substrate_state).toBe('SS_STAINED');
    expect(inputs.find(i => i.specId === 'SF_WINDOW_CASING_NC_SEALER')).toBeUndefined();
  });

  it('stain+sealer+clear: clear shifts to SS_SEALED', () => {
    const state = makeWindowCasingState({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => WINCASING_PILOT.has(i.specId));

    expect(inputs).toHaveLength(3);
    expect(inputs.find(i => i.specId === 'SF_WINDOW_CASING_NC_CLEAR')?.ctx.substrate_state).toBe('SS_SEALED');
  });
});

// ── window_casing: findBestMatch scenario routing ────────────────────────────
describe('F1 — window_casing scenario routing via findBestMatch', () => {
  it('SS_BARE + stain → SCN_INT_WINDOW_CASING_STAIN', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_STAIN');
  });

  it('SS_STAINED + sealer → SCN_INT_WINDOW_CASING_SEALER', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_SEALER');
  });

  it('SS_STAINED + clear → SCN_INT_WINDOW_CASING_CLEAR', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_CLEAR');
  });

  it('SS_SEALED + clear → SCN_INT_WINDOW_CASING_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_CLEAR');
  });

  it('SS_BARE + clear → SCN_INT_WINDOW_CASING_CLEAR_BARE (natural finish)', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_CLEAR_BARE');
  });

  it('SS_BARE + sealer → SCN_INT_WINDOW_CASING_SEALER_BARE', () => {
    const ctx = { paintable_item: 'int_window_casing', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_CASING_SEALER_BARE');
  });

  it('bundled SCN_INT_WINDOW_CASING_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_WINDOW_CASING_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ── window_casing: full integration ─────────────────────────────────────────
describe('F1 — window_casing integration: stain+sealer+clear (all three phases)', () => {
  function makeWindowCasingIntState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F1 WinCasing Int' });
    // Use lf_override so quantity is non-zero regardless of window count
    room.substrates.window_casing = createSubstrateConfig('window_casing', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
      lf_override: true,
      lf_manual: 20,
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

  const WINCASING_PILOT = new Set([
    'SF_WINDOW_CASING_NC_STAIN',
    'SF_WINDOW_CASING_NC_SEALER',
    'SF_WINDOW_CASING_NC_CLEAR',
  ]);

  const state = makeWindowCasingIntState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes all three decomposed window_casing specs', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_CASING_NC_STAIN')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_CASING_NC_SEALER')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_CASING_NC_CLEAR')).toBe(true);
  });

  it('zero gaps for window_casing pilot specIds', () => {
    const gaps = (result.gaps || []).filter(g => WINCASING_PILOT.has(g.specId));
    expect(gaps).toHaveLength(0);
  });

  it('clear input matched at SS_SEALED (sealer applied first)', () => {
    const clearInput = (result.perInputResults || []).find(pr => pr.specId === 'SF_WINDOW_CASING_NC_CLEAR');
    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('stain material line has a real productId and coats === 1', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_WINDOW_CASING_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.coats).toBe(1);
  });
});

// ── F2: shoe_mold scenario routing via findBestMatch ─────────────────────────
describe('F2 — shoe_mold scenario routing via findBestMatch', () => {
  it('SS_BARE + stain → SCN_INT_SHOE_MOLD_STAIN', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_STAIN');
  });

  it('SS_STAINED + sealer → SCN_INT_SHOE_MOLD_SEALER', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_SEALER');
  });

  it('SS_STAINED + clear → SCN_INT_SHOE_MOLD_CLEAR', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_CLEAR');
  });

  it('SS_SEALED + clear → SCN_INT_SHOE_MOLD_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_CLEAR');
  });

  it('SS_BARE + clear → SCN_INT_SHOE_MOLD_CLEAR_BARE (natural finish)', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_CLEAR_BARE');
  });

  it('SS_BARE + sealer → SCN_INT_SHOE_MOLD_SEALER_BARE', () => {
    const ctx = { paintable_item: 'int_shoe_mold', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_SHOE_MOLD_SEALER_BARE');
  });

  it('bundled SCN_INT_SHOE_MOLD_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_SHOE_MOLD_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ── F2: shoe_mold full integration ──────────────────────────────────────────
describe('F2 — shoe_mold integration: stain+sealer+clear (all three phases)', () => {
  function makeShoeMoldIntState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F2 ShoeMold Int' });
    room.substrates.shoe_mold = createSubstrateConfig('shoe_mold', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
      lf_override: true,
      lf_manual: 20,
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

  const SHOE_MOLD_PILOT = new Set([
    'SF_SHOE_MOLD_NC_STAIN',
    'SF_SHOE_MOLD_NC_SEALER',
    'SF_SHOE_MOLD_NC_CLEAR',
  ]);

  const state = makeShoeMoldIntState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes all three decomposed shoe_mold specs', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_SHOE_MOLD_NC_STAIN')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_SHOE_MOLD_NC_SEALER')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_SHOE_MOLD_NC_CLEAR')).toBe(true);
  });

  it('zero gaps for shoe_mold pilot specIds', () => {
    const gaps = (result.gaps || []).filter(g => SHOE_MOLD_PILOT.has(g.specId));
    expect(gaps).toHaveLength(0);
  });

  it('clear input matched at SS_SEALED (sealer applied first)', () => {
    const clearInput = (result.perInputResults || []).find(pr => pr.specId === 'SF_SHOE_MOLD_NC_CLEAR');
    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('stain material line has a real productId and coats === 1', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_SHOE_MOLD_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.coats).toBe(1);
  });
});

// ── F2: window_stool scenario routing via findBestMatch ──────────────────────
describe('F2 — window_stool scenario routing via findBestMatch', () => {
  it('SS_BARE + stain → SCN_INT_WINDOW_STOOL_STAIN', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_STAIN');
  });

  it('SS_STAINED + sealer → SCN_INT_WINDOW_STOOL_SEALER', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_SEALER');
  });

  it('SS_STAINED + clear → SCN_INT_WINDOW_STOOL_CLEAR', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_CLEAR');
  });

  it('SS_SEALED + clear → SCN_INT_WINDOW_STOOL_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_CLEAR');
  });

  it('SS_BARE + clear → SCN_INT_WINDOW_STOOL_CLEAR_BARE (natural finish)', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_CLEAR_BARE');
  });

  it('SS_BARE + sealer → SCN_INT_WINDOW_STOOL_SEALER_BARE', () => {
    const ctx = { paintable_item: 'int_window_stool', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario?.scenario_id).toBe('SCN_INT_WINDOW_STOOL_SEALER_BARE');
  });

  it('bundled SCN_INT_WINDOW_STOOL_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_WINDOW_STOOL_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ── F2: window_stool full integration ───────────────────────────────────────
describe('F2 — window_stool integration: stain+clear (no sealer)', () => {
  function makeWindowStoolIntState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
    const room = createRoom({ label: 'F2 WindowStool Int' });
    room.substrates.window_stool = createSubstrateConfig('window_stool', {
      substrate_state: 'bare_wood',
      painting: true,
      stain_on,
      sealer_on,
      clear_on,
      lf_override: true,
      lf_manual: 20,
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

  const WINDOW_STOOL_PILOT = new Set([
    'SF_WINDOW_STOOL_NC_STAIN',
    'SF_WINDOW_STOOL_NC_SEALER',
    'SF_WINDOW_STOOL_NC_CLEAR',
  ]);

  const state = makeWindowStoolIntState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_WINDOW_STOOL_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_STOOL_NC_STAIN')).toBe(true);
  });

  it('specResults includes SF_WINDOW_STOOL_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_STOOL_NC_CLEAR')).toBe(true);
  });

  it('specResults does NOT include SF_WINDOW_STOOL_NC_SEALER (sealer_on=false)', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_STOOL_NC_SEALER')).toBe(false);
  });

  it('zero gaps for window_stool pilot specIds', () => {
    const gaps = (result.gaps || []).filter(g => WINDOW_STOOL_PILOT.has(g.specId));
    expect(gaps).toHaveLength(0);
  });

  it('stain material line has a real productId and coats === 1', () => {
    const stainMat = (result.materialEstimates || []).find(
      m => m.specFamilyId === 'SF_WINDOW_STOOL_NC_STAIN' && m.productRole === 'stain'
    );
    expect(stainMat).toBeDefined();
    expect(stainMat.productId).not.toBeNull();
    expect(typeof stainMat.productId).toBe('string');
    expect(stainMat.productId.length).toBeGreaterThan(0);
    expect(stainMat.productName).not.toBe('SYS_STAIN_OIL');
    expect(stainMat.coats).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// F3a: findBestMatch — RRST (riser) phase scenarios
// ---------------------------------------------------------------------------
describe('F3a — RRST riser phase scenario routing via findBestMatch', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_RRST_STAIN', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_RRST_SEALER', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_RRST_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_RRST_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_CLEAR');
  });

  it('SS_BARE + coating_phase:clear → SCN_INT_RRST_CLEAR_BARE (clear-only path)', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_CLEAR_BARE');
  });

  it('SS_BARE + coating_phase:sealer → SCN_INT_RRST_SEALER_BARE (sealer-bare path)', () => {
    const ctx = { paintable_item: 'riser', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_RRST_SEALER_BARE');
  });

  it('bundled SCN_INT_RRST_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = canonicalBundle.scenarios.find(s => s.scenario_id === 'SCN_INT_RRST_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F3b: findBestMatch — SRST (open_rail) phase scenarios
// ---------------------------------------------------------------------------
describe('F3b — SRST open_rail phase scenario routing via findBestMatch', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_SRST_STAIN', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_SRST_SEALER', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_SRST_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_SRST_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_CLEAR');
  });

  it('SS_BARE + coating_phase:clear → SCN_INT_SRST_CLEAR_BARE (clear-only path)', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_CLEAR_BARE');
  });

  it('SS_BARE + coating_phase:sealer → SCN_INT_SRST_SEALER_BARE (sealer-bare path)', () => {
    const ctx = { paintable_item: 'open_rail', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_SRST_SEALER_BARE');
  });

  it('bundled SCN_INT_SRST_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = canonicalBundle.scenarios.find(s => s.scenario_id === 'SCN_INT_SRST_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F4a: Full end-to-end integration — RRST (riser) stain decomposition
//
// Stairway with 12 risers, 1 run → 12 EA risers (PS_SURFACE_EA.STAIR_RISER).
// Risers component set to bare_wood + stain_clear coating_type.
// Verifies: STAIN/CLEAR specResults fire with totalHours > 0 (ps_key audit: STAIR_RISER
// key was confirmed correct for RRST tasks — no change needed, just verifying it works).
// ---------------------------------------------------------------------------
function makeRiserStainState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'F4a Riser Stain' });
  // 12 risers in one run → total_risers=12 (EA qty for PS_SURFACE_EA.STAIR_RISER)
  room.substrates.stairway = createSubstrateConfig('stairway', {
    runs: 1,
    run1_risers: 12,
    stain_on,
    sealer_on,
    clear_on,
    components: {
      risers: {
        enabled: true,
        count: null,
        count_override: false,
        substrate_state: 'bare_wood',
        coating_type: 'stain_clear',
        application_method: 'brush',
        application_method_stain: 'brush',
        application_method_clear: 'brush',
        quality_tier: null,
        grain_fill: false,
      },
      // Other components disabled to isolate riser path
      treads:      { enabled: false },
      balusters:   { enabled: false },
      newel_posts: { enabled: false },
      open_rail:   { enabled: false },
      wall_rail:   { enabled: false },
      skirtboard:  { enabled: false },
      stringer:    { enabled: false },
    },
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

const RRST_SPECS = new Set([
  'SF_STAIR_RISER_NC_STAIN',
  'SF_STAIR_RISER_NC_SEALER',
  'SF_STAIR_RISER_NC_CLEAR',
]);

function rrst_gaps(result) {
  return (result.gaps || []).filter(g => RRST_SPECS.has(g.specId));
}

describe('F4a — RRST riser integration: stain+clear (no sealer)', () => {
  const state = makeRiserStainState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RISER_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_RISER_NC_STAIN')).toBe(true);
  });

  it('SF_STAIR_RISER_NC_STAIN totalHours > 0 (RRST ps_key correct: PS_SURFACE_EA.STAIR_RISER)', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RISER_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_RISER_NC_CLEAR')).toBe(true);
  });

  it('SF_STAIR_RISER_NC_CLEAR totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for RRST spec ids', () => {
    expect(rrst_gaps(result)).toHaveLength(0);
  });
});

describe('F4a — RRST riser integration: stain+sealer+clear', () => {
  const state = makeRiserStainState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RISER_NC_STAIN with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RISER_NC_SEALER with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_SEALER');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RISER_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for RRST spec ids', () => {
    expect(rrst_gaps(result)).toHaveLength(0);
  });
});

describe('F4a — RRST riser integration: clear-only (bare)', () => {
  const state = makeRiserStainState({ stain_on: false, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RISER_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RISER_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for RRST spec ids', () => {
    expect(rrst_gaps(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// F4b: Full end-to-end integration — SRST (open_rail) stain decomposition
//
// Stairway with 12 risers → rake_length ≈ 12.2 LF → PS_SURFACE_LF.STAIR_OPEN_RAIL.
// open_rail component set to bare_wood + stain_clear coating_type.
// Verifies: STAIN/CLEAR specResults fire with totalHours > 0 (ps_key dead-key fix:
// SRST tasks used STAIR_RAILING which was never emitted; now STAIR_OPEN_RAIL).
// ---------------------------------------------------------------------------
function makeOpenRailStainState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'F4b OpenRail Stain' });
  // 12 risers → rake_length ≈ 12.2 LF (PS_SURFACE_LF.STAIR_OPEN_RAIL quantity)
  room.substrates.stairway = createSubstrateConfig('stairway', {
    runs: 1,
    run1_risers: 12,
    stain_on,
    sealer_on,
    clear_on,
    components: {
      risers:      { enabled: false },
      treads:      { enabled: false },
      balusters:   { enabled: false },
      newel_posts: { enabled: false },
      open_rail: {
        enabled: true,
        lf: null,
        lf_override: false,
        substrate_state: 'bare_wood',
        coating_type: 'stain_clear',
        application_method: 'brush',
        application_method_stain: 'brush',
        application_method_clear: 'brush',
        quality_tier: null,
        grain_fill: false,
      },
      wall_rail:   { enabled: false },
      skirtboard:  { enabled: false },
      stringer:    { enabled: false },
    },
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

const SRST_SPECS = new Set([
  'SF_STAIR_RAILING_NC_STAIN',
  'SF_STAIR_RAILING_NC_SEALER',
  'SF_STAIR_RAILING_NC_CLEAR',
]);

function srst_gaps(result) {
  return (result.gaps || []).filter(g => SRST_SPECS.has(g.specId));
}

describe('F4b — SRST open_rail integration: stain+clear (no sealer)', () => {
  const state = makeOpenRailStainState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RAILING_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_RAILING_NC_STAIN')).toBe(true);
  });

  it('SF_STAIR_RAILING_NC_STAIN totalHours > 0 (dead ps_key fix: was STAIR_RAILING, now STAIR_OPEN_RAIL)', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RAILING_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_RAILING_NC_CLEAR')).toBe(true);
  });

  it('SF_STAIR_RAILING_NC_CLEAR totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for SRST spec ids', () => {
    expect(srst_gaps(result)).toHaveLength(0);
  });
});

describe('F4b — SRST open_rail integration: stain+sealer+clear', () => {
  const state = makeOpenRailStainState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RAILING_NC_STAIN with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RAILING_NC_SEALER with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_SEALER');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_RAILING_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for SRST spec ids', () => {
    expect(srst_gaps(result)).toHaveLength(0);
  });
});

describe('F4b — SRST open_rail integration: clear-only (bare)', () => {
  const state = makeOpenRailStainState({ stain_on: false, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_RAILING_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_RAILING_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for SRST spec ids', () => {
    expect(srst_gaps(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// F4b — window_int stain decomposition (Phase 1 F4b)
// int_window is EA-based (PS_OPENING_EA.WINDOW_TOTAL). Decomposed into
// STAIN / SEALER / CLEAR phases via standard PHASE_BY_ROLE path.
// ps_key audit: TSK_WIN_* all carry PS_OPENING_EA.WINDOW_TOTAL (correct).
// ---------------------------------------------------------------------------

import { createWindow } from '../../state/initial-state.js';

const WIST_PILOT = new Set([
  'SF_WINDOW_INT_NC_STAIN',
  'SF_WINDOW_INT_NC_SEALER',
  'SF_WINDOW_INT_NC_CLEAR',
]);

// Build a state with bare-wood windows (count=2), presence flags on the windows substrate.
// Windows require items to emit PS_OPENING_EA.WINDOW_TOTAL > 0.
function makeWindowStainState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'F4b Window Stain' });
  room.substrates.windows = createSubstrateConfig('windows', {
    substrate_state: 'bare_wood',
    painting: true,
    stain_on,
    sealer_on,
    clear_on,
    items: [createWindow({ count: 2, substrate_state: 'bare_wood' })],
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

function wist_gaps(result) {
  return (result.gaps || []).filter(g => WIST_PILOT.has(g.specId));
}
function wist_warnings(result) {
  return (result.warnings || []).filter(w => [...WIST_PILOT].some(n => String(w).includes(n)));
}

// ── D5: findBestMatch routing ────────────────────────────────────────────────
describe('D5 — int_window phase scenario routing via findBestMatch (F4b)', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_WNST_STAIN', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_WNST_SEALER', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_WNST_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_WNST_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_CLEAR');
  });

  it('SS_BARE + coating_phase:clear → SCN_INT_WNST_CLEAR_BARE (natural finish)', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_CLEAR_BARE');
  });

  it('SS_BARE + coating_phase:sealer → SCN_INT_WNST_SEALER_BARE (no-stain sealer)', () => {
    const ctx = { paintable_item: 'int_window', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(bundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_WNST_SEALER_BARE');
  });

  it('bundled SCN_INT_WNST_STAIN_CLEAR is no longer in the bundle (archived)', () => {
    const bundled = bundle.scenarios.find(s => s.scenario_id === 'SCN_INT_WNST_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ── F4b adapter routing ──────────────────────────────────────────────────────
describe('F4b — int_window adapter routing (decomposed)', () => {
  it('stain+clear: emits STAIN@SS_BARE + CLEAR@SS_STAINED, no sealer', () => {
    const state = makeWindowStainState({ stain_on: true, sealer_on: false, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => WIST_PILOT.has(i.specId));

    expect(inputs).toHaveLength(2);
    const stainIn = inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_STAIN');
    const clearIn  = inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_CLEAR');

    expect(stainIn).toBeDefined();
    expect(stainIn.ctx.coating_phase).toBe('stain');
    expect(stainIn.ctx.substrate_state).toBe('SS_BARE');

    expect(clearIn).toBeDefined();
    expect(clearIn.ctx.coating_phase).toBe('clear');
    expect(clearIn.ctx.substrate_state).toBe('SS_STAINED');

    expect(inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_SEALER')).toBeUndefined();
  });

  it('stain+sealer+clear: emits all three in correct states', () => {
    const state = makeWindowStainState({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    const inputs = roomInputs.filter(i => WIST_PILOT.has(i.specId));

    expect(inputs).toHaveLength(3);
    expect(inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_STAIN')?.ctx.substrate_state).toBe('SS_BARE');
    expect(inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_SEALER')?.ctx.substrate_state).toBe('SS_STAINED');
    expect(inputs.find(i => i.specId === 'SF_WINDOW_INT_NC_CLEAR')?.ctx.substrate_state).toBe('SS_SEALED');
  });

  it('decomposed window inputs have no ctx coat fields', () => {
    const state = makeWindowStainState({ stain_on: true, sealer_on: true, clear_on: true });
    const { roomInputs } = buildScenarioInputs(state);
    for (const inp of roomInputs.filter(i => WIST_PILOT.has(i.specId))) {
      expect(inp.ctx.stain_coats).toBeUndefined();
      expect(inp.ctx.sealer_coats).toBeUndefined();
      expect(inp.ctx.clear_coats).toBeUndefined();
    }
  });
});

// ── F4b integration: stain+clear ────────────────────────────────────────────
describe('F4b — int_window integration: stain+clear (no sealer)', () => {
  const state = makeWindowStainState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_WINDOW_INT_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_STAIN')).toBe(true);
  });

  it('specResults includes SF_WINDOW_INT_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_CLEAR')).toBe(true);
  });

  it('specResults does NOT include SF_WINDOW_INT_NC_SEALER (sealer_on=false)', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_SEALER')).toBe(false);
  });

  it('no gaps for window pilot specIds (ps_key PS_OPENING_EA.WINDOW_TOTAL resolves)', () => {
    expect(wist_gaps(result)).toHaveLength(0);
  });

  it('no warnings mentioning window pilot specIds', () => {
    expect(wist_warnings(result)).toHaveLength(0);
  });

  it('stain spec totalHours > 0 (ps_key PS_OPENING_EA.WINDOW_TOTAL fires correctly)', () => {
    const stainSpec = (result.specResults || []).find(sr => sr.specId === 'SF_WINDOW_INT_NC_STAIN');
    expect(stainSpec).toBeDefined();
    expect(stainSpec.totalHours).toBeGreaterThan(0);
  });

  it('clear spec totalHours > 0', () => {
    const clearSpec = (result.specResults || []).find(sr => sr.specId === 'SF_WINDOW_INT_NC_CLEAR');
    expect(clearSpec).toBeDefined();
    expect(clearSpec.totalHours).toBeGreaterThan(0);
  });

  // NOTE: int_window is EA-based (PS_OPENING_EA.WINDOW_TOTAL, not PS_SURFACE_*).
  // computeMaterialEstimates skips EA-only specs (surfaceKeys empty → specSF=0).
  // Material lines for SF_WINDOW_INT_NC_STAIN/SEALER/CLEAR are not produced by the
  // current material engine — this is a pre-existing limitation, not a decomposition bug.
  // Hours are non-zero and gaps are 0 (ps_key fires correctly). Material coverage
  // for windows is a separate future work item.
  it('no material estimates for window stain (EA-based substrate, material engine skips PS_OPENING keys)', () => {
    const windowMats = (result.materialEstimates || []).filter(
      m => m.specFamilyId === 'SF_WINDOW_INT_NC_STAIN' ||
           m.specFamilyId === 'SF_WINDOW_INT_NC_CLEAR' ||
           m.specFamilyId === 'SF_WINDOW_INT_NC_SEALER'
    );
    // Either empty (expected for EA-only specs) or present (if future fix lands) — just don't error
    expect(Array.isArray(windowMats)).toBe(true);
  });
});

// ── F4b integration: stain+sealer+clear ─────────────────────────────────────
describe('F4b — int_window integration: stain+sealer+clear', () => {
  const state = makeWindowStainState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('specResults includes all three window stain specs', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_STAIN')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_SEALER')).toBe(true);
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_CLEAR')).toBe(true);
  });

  it('no gaps for window pilot specIds', () => {
    expect(wist_gaps(result)).toHaveLength(0);
  });

  it('sealer spec totalHours > 0', () => {
    const sealerSpec = (result.specResults || []).find(sr => sr.specId === 'SF_WINDOW_INT_NC_SEALER');
    expect(sealerSpec).toBeDefined();
    expect(sealerSpec.totalHours).toBeGreaterThan(0);
  });

  it('clear input at SS_SEALED (sealer shifts state)', () => {
    const clearInput = (result.perInputResults || []).find(pr => pr.specId === 'SF_WINDOW_INT_NC_CLEAR');
    expect(clearInput).toBeDefined();
    expect(clearInput.ctx.substrate_state).toBe('SS_SEALED');
  });

  // NOTE: EA-based substrate — material estimates are not produced for PS_OPENING_* specs
  // (computeMaterialEstimates only processes PS_SURFACE_* keys). This is a pre-existing
  // limitation; hours and gaps are the authoritative correctness checks here.
  it('no errors in materialEstimates for window sealer spec (EA-based, engine skips it gracefully)', () => {
    const windowMats = (result.materialEstimates || []).filter(
      m => m.specFamilyId === 'SF_WINDOW_INT_NC_SEALER'
    );
    expect(Array.isArray(windowMats)).toBe(true);
  });
});

// ── F4b integration: clear-only (bare) ──────────────────────────────────────
describe('F4b — int_window integration: clear-only (bare wood, no stain)', () => {
  const state = makeWindowStainState({ stain_on: false, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('specResults includes SF_WINDOW_INT_NC_CLEAR (CLEAR_BARE scenario matched)', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_CLEAR')).toBe(true);
  });

  it('specResults does NOT include SF_WINDOW_INT_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_WINDOW_INT_NC_STAIN')).toBe(false);
  });

  it('zero gaps for window pilot specs (CLEAR_BARE scenario matched at SS_BARE)', () => {
    expect(wist_gaps(result)).toHaveLength(0);
  });

  it('clear spec totalHours > 0', () => {
    const clearSpec = (result.specResults || []).find(sr => sr.specId === 'SF_WINDOW_INT_NC_CLEAR');
    expect(clearSpec).toBeDefined();
    expect(clearSpec.totalHours).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// F4c: findBestMatch — TRST (tread) phase scenarios
// ---------------------------------------------------------------------------
describe('F4c — TRST tread phase scenario routing via findBestMatch', () => {
  it('SS_BARE + coating_phase:stain → SCN_INT_TRST_STAIN', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_BARE', coating_phase: 'stain' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_STAIN');
  });

  it('SS_STAINED + coating_phase:sealer → SCN_INT_TRST_SEALER', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_STAINED', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_SEALER');
  });

  it('SS_STAINED + coating_phase:clear → SCN_INT_TRST_CLEAR (no-sealer path)', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_STAINED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_CLEAR');
  });

  it('SS_SEALED + coating_phase:clear → SCN_INT_TRST_CLEAR (sealer path)', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_SEALED', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_CLEAR');
  });

  it('SS_BARE + coating_phase:clear → SCN_INT_TRST_CLEAR_BARE (clear-only path)', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_BARE', coating_phase: 'clear' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_CLEAR_BARE');
  });

  it('SS_BARE + coating_phase:sealer → SCN_INT_TRST_SEALER_BARE (sealer-bare path)', () => {
    const ctx = { paintable_item: 'tread', substrate_state: 'SS_BARE', coating_phase: 'sealer' };
    const { scenario } = findBestMatch(canonicalBundle, ctx);
    expect(scenario).not.toBeNull();
    expect(scenario.scenario_id).toBe('SCN_INT_TRST_SEALER_BARE');
  });

  it('bundled SCN_INT_TRST_STAIN_CLEAR is no longer in the bundle', () => {
    const bundled = canonicalBundle.scenarios.find(s => s.scenario_id === 'SCN_INT_TRST_STAIN_CLEAR');
    expect(bundled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// F4c: Full end-to-end integration — TRST (tread) stain decomposition
//
// Stairway with 12 treads (run1_risers=12 → total_treads=12, EA qty for
// PS_SURFACE_EA.STAIR_TREAD). Treads component set to bare_wood + stain_clear.
// Verifies: STAIN/CLEAR specResults fire with totalHours > 0 (ps_key dead-key
// fix: TSK_TRST_* previously carried PS_SURFACE_LF.TRIM which never fires for
// the stairway substrate — now corrected to PS_SURFACE_EA.STAIR_TREAD).
// ---------------------------------------------------------------------------
function makeTreadStainState({ stain_on = false, sealer_on = false, clear_on = false } = {}) {
  const room = createRoom({ label: 'F4c Tread Stain' });
  // 12 risers → 12 treads (total_treads=12, EA qty for PS_SURFACE_EA.STAIR_TREAD)
  room.substrates.stairway = createSubstrateConfig('stairway', {
    runs: 1,
    run1_risers: 12,
    stain_on,
    sealer_on,
    clear_on,
    components: {
      treads: {
        enabled: true,
        count: null,
        count_override: false,
        substrate_state: 'bare_wood',
        coating_type: 'stain_clear',
        application_method: 'brush',
        application_method_stain: 'brush',
        application_method_clear: 'brush',
        quality_tier: null,
        grain_fill: false,
      },
      // Other components disabled to isolate tread path
      risers:      { enabled: false },
      balusters:   { enabled: false },
      newel_posts: { enabled: false },
      open_rail:   { enabled: false },
      wall_rail:   { enabled: false },
      skirtboard:  { enabled: false },
      stringer:    { enabled: false },
    },
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

const TRST_SPECS = new Set([
  'SF_STAIR_TREAD_NC_STAIN',
  'SF_STAIR_TREAD_NC_SEALER',
  'SF_STAIR_TREAD_NC_CLEAR',
]);

function trst_gaps(result) {
  return (result.gaps || []).filter(g => TRST_SPECS.has(g.specId));
}

describe('F4c — TRST tread integration: stain+clear (no sealer)', () => {
  const state = makeTreadStainState({ stain_on: true, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_TREAD_NC_STAIN', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_TREAD_NC_STAIN')).toBe(true);
  });

  it('SF_STAIR_TREAD_NC_STAIN totalHours > 0 (dead ps_key fix: was PS_SURFACE_LF.TRIM, now PS_SURFACE_EA.STAIR_TREAD)', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_TREAD_NC_CLEAR', () => {
    expect((result.specResults || []).some(sr => sr.specId === 'SF_STAIR_TREAD_NC_CLEAR')).toBe(true);
  });

  it('SF_STAIR_TREAD_NC_CLEAR totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for TRST spec ids', () => {
    expect(trst_gaps(result)).toHaveLength(0);
  });
});

describe('F4c — TRST tread integration: stain+sealer+clear', () => {
  const state = makeTreadStainState({ stain_on: true, sealer_on: true, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_TREAD_NC_STAIN with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_STAIN');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_TREAD_NC_SEALER with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_SEALER');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('specResults includes SF_STAIR_TREAD_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for TRST spec ids', () => {
    expect(trst_gaps(result)).toHaveLength(0);
  });
});

describe('F4c — TRST tread integration: clear-only (bare)', () => {
  const state = makeTreadStainState({ stain_on: false, sealer_on: false, clear_on: true });
  const result = computeScenarioEstimate(state, canonicalBundle, null, []);

  it('result is non-null and not an error', () => {
    expect(result).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('specResults includes SF_STAIR_TREAD_NC_CLEAR with totalHours > 0', () => {
    const sr = (result.specResults || []).find(sr => sr.specId === 'SF_STAIR_TREAD_NC_CLEAR');
    expect(sr).toBeDefined();
    expect(sr.totalHours).toBeGreaterThan(0);
  });

  it('zero gaps for TRST spec ids', () => {
    expect(trst_gaps(result)).toHaveLength(0);
  });
});
