import { describe, it, expect } from 'vitest';
import { buildScenarioInputs } from '../context-adapter.js';
import { createRoom, createSubstrateConfig } from '../../state/initial-state.js';

// Minimal interior project: one room with a bare-wood door frame and door slab,
// both set to a stain coating. The adapter should emit a stain ctx for each.
// F3: door_frame and door_slab are now decomposed families — use stain_on/clear_on
// flags (not legacy coating_type) to trigger the decomposed path.
function stainedDoorState() {
  const room = createRoom({ label: 'R1' });
  room.substrates.door_frames = createSubstrateConfig('door_frames', {
    coating_type: 'stain_clear', substrate_state: 'bare_wood',
    stain_on: true, sealer_on: false, clear_on: true,
  });
  room.substrates.doors = createSubstrateConfig('doors', {
    coating_type: 'stain_clear', substrate_state: 'bare_wood', painting: true,
    stain_on: true, sealer_on: false, clear_on: true,
  });
  return { rooms: [room], project: { default_quality_tier: 'QT3' }, colors: {}, exterior: { defaults: {} } };
}

describe('door-stain activation (WS1)', () => {
  const { roomInputs } = buildScenarioInputs(stainedDoorState());
  const ctxFor = (item) => roomInputs.find(i => i.ctx && i.ctx.paintable_item === item);

  it('emits a door-frame stain ctx (paintable_item int_door_frame, SS_BARE, stain coating)', () => {
    const di = ctxFor('int_door_frame');
    expect(di).toBeTruthy();
    expect(di.specId).toBe('SF_DOOR_FRAME_NC_STAIN');
    expect(di.ctx.substrate_state).toBe('SS_BARE');
    expect(['stain', 'stain_clear', 'stain_only', 'clear_only']).toContain(di.ctx.coating_type);
  });

  it('emits a door-slab stain ctx (paintable_item int_door_slab, SS_BARE, stain coating)', () => {
    const di = ctxFor('int_door_slab');
    expect(di).toBeTruthy();
    expect(di.specId).toBe('SF_DOOR_SLAB_INT_NC_STAIN');
    expect(di.ctx.substrate_state).toBe('SS_BARE');
    expect(['stain', 'stain_clear', 'stain_only', 'clear_only']).toContain(di.ctx.coating_type);
  });
});
