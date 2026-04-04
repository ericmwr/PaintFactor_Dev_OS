import { describe, it, expect } from 'vitest';
import { buildLineItemId, buildDescription, collectAvailableTiers } from '../multi-qt.js';

describe('buildLineItemId', () => {
  it('creates deterministic ID from roomIndex and substrate', () => {
    expect(buildLineItemId(0, 'walls')).toBe('line_0_walls');
    expect(buildLineItemId(3, 'baseboard')).toBe('line_3_baseboard');
  });
});

describe('buildDescription', () => {
  it('formats product-forward description', () => {
    const result = buildDescription({
      coats: 2,
      productName: 'SW Cashmere',
      sheen: 'eggshell',
      method: 'spray + backroll'
    });
    expect(result).toBe('2 coats SW Cashmere eggshell, spray + backroll');
  });

  it('uses singular "coat" for 1 coat', () => {
    const result = buildDescription({
      coats: 1,
      productName: 'SW ProMar 200',
      sheen: 'flat',
      method: 'spray'
    });
    expect(result).toBe('1 coat SW ProMar 200 flat, spray');
  });
});

describe('collectAvailableTiers', () => {
  it('returns sorted unique tiers from spec dimensions', () => {
    const dimensions = [
      { dimension_id: 'quality_tier', values: ['QT3', 'QT4', 'QT5'] },
      { dimension_id: 'application_method', values: ['spray', 'roll'] }
    ];
    expect(collectAvailableTiers(dimensions)).toEqual(['QT3', 'QT4', 'QT5']);
  });

  it('returns empty array if no quality_tier dimension', () => {
    const dimensions = [
      { dimension_id: 'application_method', values: ['spray'] }
    ];
    expect(collectAvailableTiers(dimensions)).toEqual([]);
  });
});
