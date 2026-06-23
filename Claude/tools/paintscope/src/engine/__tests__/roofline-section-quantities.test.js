import { describe, it, expect } from 'vitest';
import { buildRooflineSectionQuantities } from '../quantity-lookups-exterior.js';
import { deriveRooflineSection } from '../derive-elevation.js';
import { createRooflineSection } from '../../state/exterior-state.js';

describe('roofline section quantities', () => {
  it('emits siding/fascia/soffit PS keys for one section', () => {
    const d = deriveRooflineSection(createRooflineSection({ siding_sf: 140, fascia_lf: 22, soffit_depth_ft: 1.5, height_high_ft: 30 }));
    const out = buildRooflineSectionQuantities([d]);
    expect(out).toHaveLength(1);
    expect(out[0].accessBand).toBe('LIFT');
    expect(out[0].qty.get('PS_EXT_SURFACE_SF.SIDING_FIELD').value).toBe(140);
    expect(out[0].qty.get('PS_EXT_EDGE_LF.FASCIA').value).toBe(22);
    expect(out[0].qty.get('PS_EXT_SURFACE_SF.SOFFIT_FIELD').value).toBe(33);
  });

  it('skips empty sections', () => {
    const d = deriveRooflineSection(createRooflineSection({ siding_sf: 0, fascia_lf: 0 }));
    expect(buildRooflineSectionQuantities([d])).toHaveLength(0);
  });
});
