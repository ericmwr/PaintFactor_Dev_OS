import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Shim-integrity imports: prove the old spec-layer files forward the SAME
// bindings as the scenario-owned modules (reference equality).
import { SPEC_SUBSTRATE_MAP as mapViaShim } from '../../data/spec-maps.js';
import { SPEC_SUBSTRATE_MAP as mapViaNew } from '../../data/scenario-maps.js';
import { resolveQualityTier as resolveViaShim } from '../spec-resolution.js';
import { resolveQualityTier as resolveViaNew } from '../scenario-resolution.js';
import { isSpecStateCompatible as compatViaShim } from '../spec-compatibility.js';
import { isSpecStateCompatible as compatViaNew } from '../scenario-compatibility.js';

const adapterSrc = readFileSync(
  fileURLToPath(new URL('../context-adapter.js', import.meta.url)),
  'utf8'
);

describe('context-adapter is decoupled from the spec layer (P1)', () => {
  it('imports nothing from data/spec-maps.js', () => {
    expect(adapterSrc).not.toMatch(/from\s+['"][^'"]*spec-maps/);
  });

  it('imports nothing from engine/spec-resolution.js', () => {
    expect(adapterSrc).not.toMatch(/from\s+['"][^'"]*spec-resolution/);
  });

  it('imports nothing from engine/spec-compatibility.js', () => {
    expect(adapterSrc).not.toMatch(/from\s+['"][^'"]*spec-compatibility/);
  });

  it('does not reference db.spec_families for active-spec selection', () => {
    expect(adapterSrc).not.toMatch(/spec_families/);
  });
});

describe('spec-layer shims forward identical bindings (P1)', () => {
  it('spec-maps.js re-exports the same SPEC_SUBSTRATE_MAP object', () => {
    expect(mapViaShim).toBe(mapViaNew);
  });

  it('spec-resolution.js re-exports the same resolver function', () => {
    expect(resolveViaShim).toBe(resolveViaNew);
  });

  it('spec-compatibility.js re-exports the same compat function', () => {
    expect(compatViaShim).toBe(compatViaNew);
  });
});
