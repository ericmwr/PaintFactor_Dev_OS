import { describe, it, expect } from 'vitest';
import { computeBlendedRate, computeLineCost, computeBidPrice } from '../pricing.js';

describe('computeBlendedRate', () => {
  it('computes weighted average for standard 2-man crew', () => {
    const rates = { painter: 25, lead: 35, apprentice: 18 };
    const crew = { lead: 1, painter: 1, apprentice: 0 };
    const result = computeBlendedRate(rates, crew);
    // (35*1 + 25*1 + 18*0) / (1+1+0) = 60/2 = 30
    expect(result).toBe(30);
  });

  it('computes weighted average for 3-man crew with apprentice', () => {
    const rates = { painter: 25, lead: 35, apprentice: 18 };
    const crew = { lead: 1, painter: 1, apprentice: 1 };
    const result = computeBlendedRate(rates, crew);
    // (35 + 25 + 18) / 3 = 26
    expect(result).toBeCloseTo(26, 2);
  });
});

describe('computeLineCost', () => {
  it('computes labor + material cost for a line item', () => {
    const result = computeLineCost({
      hours: 4.2,
      blendedRate: 30,
      burdenPct: 0.30,
      materialCost: 100
    });
    // labor = 4.2 * 30 * 1.30 = 163.80
    // total = 163.80 + 100 = 263.80
    expect(result.laborCost).toBeCloseTo(163.80, 2);
    expect(result.materialCost).toBe(100);
    expect(result.lineCost).toBeCloseTo(263.80, 2);
  });

  it('handles zero hours', () => {
    const result = computeLineCost({
      hours: 0,
      blendedRate: 30,
      burdenPct: 0.30,
      materialCost: 50
    });
    expect(result.laborCost).toBe(0);
    expect(result.lineCost).toBe(50);
  });
});

describe('computeBidPrice', () => {
  it('applies overhead and margin to subtotal', () => {
    const result = computeBidPrice({
      subtotal: 8450,
      overheadPct: 0.15,
      marginPct: 0.10,
      mobilization: 150,
      travelCost: 19.50,
      minJobCharge: 500
    });
    // markup = 8450 * 1.15 * 1.10 = 10689.25
    // + mobilization + travel = 10689.25 + 150 + 19.50 = 10858.75
    expect(result.subtotal).toBe(8450);
    expect(result.overhead).toBeCloseTo(1267.50, 2);
    expect(result.margin).toBeCloseTo(971.75, 2);
    expect(result.bidPrice).toBeCloseTo(10858.75, 2);
    expect(result.minJobApplied).toBe(false);
  });

  it('applies min job charge when subtotal is low', () => {
    const result = computeBidPrice({
      subtotal: 200,
      overheadPct: 0.15,
      marginPct: 0.10,
      mobilization: 0,
      travelCost: 0,
      minJobCharge: 500
    });
    expect(result.bidPrice).toBe(500);
    expect(result.minJobApplied).toBe(true);
  });
});
