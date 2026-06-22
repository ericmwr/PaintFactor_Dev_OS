import { describe, it, expect } from 'vitest';
import { reducer } from '../reducer.js';
import { createRoom, createSubstrateConfig } from '../initial-state.js';

/**
 * Build a minimal state with one room that has a wood substrate (baseboard)
 * seeded with a stain-mode system and bare_wood state.
 */
function makeStateWithWoodSubstrate(substrateId = 'baseboard', overrides = {}) {
  const room = createRoom({ label: 'R1' });
  room.substrates[substrateId] = createSubstrateConfig(substrateId, overrides);
  return {
    rooms: [room],
    project: { name: 'test', default_quality_tier: 'QT3' },
    ui: {},
  };
}

function dispatch(state, payload) {
  return reducer(state, { type: 'SET_SUBSTRATE', payload });
}

const ROOM_ID = () => null; // resolved lazily below

describe('stain-presence-flags (C1)', () => {
  // -----------------------------------------------------------------------
  // 1. createSubstrateConfig seeds all three flags to false for wood substrates
  // -----------------------------------------------------------------------
  describe('initial-state seeding', () => {
    it('seeds stain_on, sealer_on, clear_on to false for a wood substrate', () => {
      const cfg = createSubstrateConfig('baseboard');
      expect(cfg.stain_on).toBe(false);
      expect(cfg.sealer_on).toBe(false);
      expect(cfg.clear_on).toBe(false);
    });

    it('preserves explicit values passed via overrides', () => {
      const cfg = createSubstrateConfig('baseboard', { stain_on: true, sealer_on: true, clear_on: false });
      expect(cfg.stain_on).toBe(true);
      expect(cfg.sealer_on).toBe(true);
      expect(cfg.clear_on).toBe(false);
    });

    it('does not add stain_on to a non-wood substrate (walls)', () => {
      const cfg = createSubstrateConfig('walls');
      expect(cfg.stain_on).toBeUndefined();
      expect(cfg.sealer_on).toBeUndefined();
      expect(cfg.clear_on).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 2. Entering stain mode (system change) seeds stain_on/clear_on/sealer_on
  // -----------------------------------------------------------------------
  describe('entering stain mode via system change', () => {
    it('seeds stain_on:true, clear_on:true, sealer_on:false when system → stain_clear', () => {
      const state = makeStateWithWoodSubstrate('baseboard', { substrate_state: 'bare_wood' });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'system',
        value: 'stain_clear',
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.stain_on).toBe(true);
      expect(cfg.clear_on).toBe(true);
      expect(cfg.sealer_on).toBe(false);
      expect(cfg.coating_type).toBe('stain_clear');
    });

    it('seeds stain_on:true, clear_on:false, sealer_on:false when system → stain_only', () => {
      const state = makeStateWithWoodSubstrate('baseboard', { substrate_state: 'bare_wood' });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'system',
        value: 'stain_only',
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.stain_on).toBe(true);
      expect(cfg.clear_on).toBe(false);
      expect(cfg.sealer_on).toBe(false);
      expect(cfg.coating_type).toBe('stain_only');
    });

    it('seeds stain_on:false, clear_on:true, sealer_on:false when system → clear_only', () => {
      const state = makeStateWithWoodSubstrate('baseboard', { substrate_state: 'bare_wood' });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'system',
        value: 'clear_only',
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.stain_on).toBe(false);
      expect(cfg.clear_on).toBe(true);
      expect(cfg.sealer_on).toBe(false);
      expect(cfg.coating_type).toBe('clear_only');
    });

    it('does not re-seed flags if already chosen (stain_on already true)', () => {
      // Pre-seeded: user already toggled sealer_on
      const state = makeStateWithWoodSubstrate('baseboard', {
        substrate_state: 'bare_wood',
        stain_on: true,
        sealer_on: true,
        clear_on: true,
      });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'system',
        value: 'stain_clear',
      });

      const cfg = next.rooms[0].substrates.baseboard;
      // Flags already chosen — should not be reset
      expect(cfg.stain_on).toBe(true);
      expect(cfg.sealer_on).toBe(true);
      expect(cfg.clear_on).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Toggling presence flags syncs coating_type
  // -----------------------------------------------------------------------
  describe('presence flag toggles sync coating_type', () => {
    it('toggling sealer_on:true keeps coating_type as stain_clear (stain+sealer+clear → stain_clear)', () => {
      // Start in stain_clear mode with flags already seeded
      const state = makeStateWithWoodSubstrate('baseboard', {
        coating_type: 'stain_clear',
        system: 'stain_clear',
        stain_on: true,
        sealer_on: false,
        clear_on: true,
      });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'sealer_on',
        value: true,
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.sealer_on).toBe(true);
      // stain+sealer+clear still maps to stain_clear
      expect(cfg.coating_type).toBe('stain_clear');
    });

    it('toggling clear_on:false with stain_on:true → coating_type becomes stain_only', () => {
      const state = makeStateWithWoodSubstrate('baseboard', {
        coating_type: 'stain_clear',
        system: 'stain_clear',
        stain_on: true,
        sealer_on: false,
        clear_on: true,
      });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'clear_on',
        value: false,
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.clear_on).toBe(false);
      expect(cfg.coating_type).toBe('stain_only');
    });

    it('toggling stain_on:false with clear_on:true → coating_type becomes clear_only', () => {
      const state = makeStateWithWoodSubstrate('baseboard', {
        coating_type: 'stain_clear',
        system: 'stain_clear',
        stain_on: true,
        sealer_on: false,
        clear_on: true,
      });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'stain_on',
        value: false,
      });

      const cfg = next.rooms[0].substrates.baseboard;
      expect(cfg.stain_on).toBe(false);
      expect(cfg.coating_type).toBe('clear_only');
    });

    it('toggling stain_on:true with no clear → coating_type becomes stain_only', () => {
      const state = makeStateWithWoodSubstrate('baseboard', {
        coating_type: 'clear_only',
        system: 'clear_only',
        stain_on: false,
        sealer_on: false,
        clear_on: true,
      });
      const roomId = state.rooms[0].id;

      const next = dispatch(state, {
        roomId,
        substrateId: 'baseboard',
        field: 'stain_on',
        value: true,
      });

      const cfg = next.rooms[0].substrates.baseboard;
      // stain+clear → stain_clear
      expect(cfg.coating_type).toBe('stain_clear');
    });
  });
});
