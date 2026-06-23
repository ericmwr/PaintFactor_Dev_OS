import { describe, it, expect } from 'vitest';
import { deriveRooflineSection } from '../derive-elevation.js';
import { createRooflineSection } from '../../state/exterior-state.js';

describe('deriveRooflineSection', () => {
  it('uses direct entry as source of truth', () => {
    const d = deriveRooflineSection(createRooflineSection({ siding_sf: 140, fascia_lf: 22, soffit_depth_ft: 1.5 }));
    expect(d.sidingSF).toBe(140);
    expect(d.fasciaLF).toBe(22);
    expect(d.soffitSF).toBe(33); // 22 × 1.5
  });

  it('explicit soffit_sf overrides the depth derivation', () => {
    const d = deriveRooflineSection(createRooflineSection({ fascia_lf: 22, soffit_sf: 50 }));
    expect(d.soffitSF).toBe(50);
  });

  it('zeroes fascia + soffit when the rake edge is off', () => {
    const d = deriveRooflineSection(createRooflineSection({ fascia_lf: 22, edges: { rake: false, bottom: false, vertical: false } }));
    expect(d.fasciaLF).toBe(0);
    expect(d.soffitSF).toBe(0);
  });

  it('fills quantities from the calculator when enabled (triangle)', () => {
    // base 20 run, peak 15 rise → area 150, rake hypotenuse 25
    const d = deriveRooflineSection(createRooflineSection({
      calc: { enabled: true, base_ft: 20, peak_height_ft: 15, lower_roof_pitch: null, rake_pitch: null },
      soffit_depth_ft: 1,
    }));
    expect(d.sidingSF).toBe(150);
    expect(d.fasciaLF).toBe(25);
    expect(d.soffitSF).toBe(25);
  });

  it('derives the access band from the HIGH point', () => {
    expect(deriveRooflineSection(createRooflineSection({ height_low_ft: 16, height_high_ft: 32 })).accessBand).toBe('LIFT');
    expect(deriveRooflineSection(createRooflineSection({ height_low_ft: 9, height_high_ft: 15 })).accessBand).toBe('LADDER');
  });

  it('difficulty defaults to 1.0 and honors the override', () => {
    expect(deriveRooflineSection(createRooflineSection()).difficultyFactor).toBe(1.0);
    expect(deriveRooflineSection(createRooflineSection({ difficulty_override: 1.3 })).difficultyFactor).toBe(1.3);
  });
});
