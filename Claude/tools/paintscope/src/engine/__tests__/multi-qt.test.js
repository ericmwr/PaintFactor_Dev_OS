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
  const mockDb = {
    quality_tier_effects: [
      { spec_family_id: 'SF_DRYWALL_WALL_NC_FINISH', quality_tier: 'QT2', time_modifier: 0.8 },
      { spec_family_id: 'SF_DRYWALL_WALL_NC_FINISH', quality_tier: 'QT3', time_modifier: 1.0 },
      { spec_family_id: 'SF_DRYWALL_WALL_NC_FINISH', quality_tier: 'QT4', time_modifier: 1.3 },
      { spec_family_id: 'SF_DRYWALL_WALL_NC_FINISH', quality_tier: 'QT5', time_modifier: 1.6 },
      { spec_family_id: 'SF_DOOR_FRAME_NC_FINISH', quality_tier: 'QT3', time_modifier: 1.0 }
    ]
  };

  it('returns sorted tiers for a spec from quality_tier_effects', () => {
    expect(collectAvailableTiers('SF_DRYWALL_WALL_NC_FINISH', mockDb.quality_tier_effects))
      .toEqual(['QT2', 'QT3', 'QT4', 'QT5']);
  });

  it('returns only tiers belonging to the requested spec', () => {
    expect(collectAvailableTiers('SF_DOOR_FRAME_NC_FINISH', mockDb.quality_tier_effects))
      .toEqual(['QT3']);
  });

  it('returns empty array if spec has no rows', () => {
    expect(collectAvailableTiers('SF_NONEXISTENT', mockDb.quality_tier_effects)).toEqual([]);
  });

  it('handles empty rows (no matching data)', () => {
    expect(collectAvailableTiers('SF_DRYWALL_WALL_NC_FINISH', [])).toEqual([]);
  });
});
