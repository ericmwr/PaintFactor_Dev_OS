import { describe, it, expect } from 'vitest';
import { deriveStainScope, resolveSystem, resolveCoatingType } from '../scenario-resolution.js';
import { createRoom, createSubstrateConfig } from '../../state/initial-state.js';
import { buildScenarioInputs } from '../context-adapter.js';

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

  it('clear only (no stain) → system clear_refresh, coating_type clear_only', () => {
    expect(deriveStainScope({ stain_on: false, sealer_on: false, clear_on: true }))
      .toEqual({ system: 'clear_refresh', coating_type: 'clear_only' });
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

  it('returns clear_refresh when only clear_on is set', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
      })
    );
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

  it('returns clear_only when only clear_on', () => {
    const room = makeRoom(
      'door_frames',
      createSubstrateConfig('door_frames', {
        substrate_state: 'bare_wood',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
      })
    );
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
