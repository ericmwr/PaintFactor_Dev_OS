import { describe, it, expect } from 'vitest';
import { computeScenarioModifierStack } from '../run-estimate-scenario.js';

describe('section_difficulty labor modifier', () => {
  const module = { modifier_eligibility: {} };
  const ctx = { quality_tier: 'QT3' };

  it('multiplies the modifier total by section_difficulty', () => {
    const base = computeScenarioModifierStack(module, ctx);
    const harder = computeScenarioModifierStack(module, { ...ctx, section_difficulty: 1.5 });
    expect(base.total).toBeGreaterThan(0);
    expect(harder.total).toBeCloseTo(base.total * 1.5, 3);
  });

  it('absent or 1.0 section_difficulty is a no-op', () => {
    const base = computeScenarioModifierStack(module, ctx);
    const explicit = computeScenarioModifierStack(module, { ...ctx, section_difficulty: 1.0 });
    expect(explicit.total).toBe(base.total);
  });
});
