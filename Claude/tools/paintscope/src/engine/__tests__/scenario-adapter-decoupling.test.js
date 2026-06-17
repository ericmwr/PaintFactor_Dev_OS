import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
