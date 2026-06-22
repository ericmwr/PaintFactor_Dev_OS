import { describe, it, expect } from 'vitest';
import { deriveStainScope, resolveSystem, resolveCoatingType } from '../scenario-resolution.js';
import { createRoom, createSubstrateConfig } from '../../state/initial-state.js';

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
