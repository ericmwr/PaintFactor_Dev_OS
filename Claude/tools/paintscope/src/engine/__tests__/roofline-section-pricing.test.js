import { describe, it, expect } from 'vitest';
import { buildElevationScenarioInputs } from '../context-adapter.js';
import { createElevation, createRooflineSection, createExteriorState } from '../../state/exterior-state.js';

describe('roofline section pricing', () => {
  it('prices a section under its own access band, not the wall', () => {
    const elev = createElevation({
      id: 'e1', access_type: 'ground', width_ft: 30, height_to_eave_ft: 9,
      roofline_sections: [createRooflineSection({ siding_sf: 140, height_high_ft: 30 })],
    });
    const state = { project: {}, exterior: createExteriorState({ elevations: [elev] }) };
    const inputs = buildElevationScenarioInputs(state);

    // The wall prices at ground (its eave height)…
    expect(inputs.some(i => i.ctx.access_type === 'ground')).toBe(true);
    // …while the section prices at lift (its 30 ft peak).
    const sectionInput = inputs.find(i => i.ctx.access_type === 'lift');
    expect(sectionInput).toBeTruthy();
    expect(sectionInput.roomQty.get('PS_EXT_SURFACE_SF.SIDING_FIELD').value).toBe(140);
    expect(sectionInput.roomIndex).toBeLessThanOrEqual(-100); // still namespaced exterior
  });

  it('emits no section inputs when the elevation has none', () => {
    const elev = createElevation({ id: 'e2', access_type: 'ground', width_ft: 30, height_to_eave_ft: 9 });
    const state = { project: {}, exterior: createExteriorState({ elevations: [elev] }) };
    const inputs = buildElevationScenarioInputs(state);
    expect(inputs.every(i => i.ctx.access_type === 'ground')).toBe(true);
  });
});
