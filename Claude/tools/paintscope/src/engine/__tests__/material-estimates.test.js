import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeScenarioEstimate } from '../scenario-estimate.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';

const interior = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../__fixtures__/p2a-int.json', import.meta.url)),
    'utf8'
  )
);

// Golden: interior material gallons must be byte-identical through the
// spec_required_inputs → task-psKey migration (P3 Task 3).
const EXPECTED = [
  {
    "spec": "SF_DRYWALL_CEILING_NC_FINISH",
    "role": "finish",
    "gal": 1,
    "psKey": "PS_SURFACE_SF.CEILING_FIELD"
  },
  {
    "spec": "SF_DRYWALL_CEILING_NC_PRIME",
    "role": "finish",
    "gal": 1,
    "psKey": "PS_SURFACE_SF.CEILING_FIELD"
  },
  {
    "spec": "SF_DRYWALL_WALL_NC_FINISH",
    "role": "finish",
    "gal": 3,
    "psKey": "PS_SURFACE_SF.WALL_FIELD"
  },
  {
    "spec": "SF_DRYWALL_WALL_NC_PRIME",
    "role": "finish",
    "gal": 2,
    "psKey": "PS_SURFACE_SF.WALL_FIELD"
  }
];

describe('interior material estimates (P3 golden)', () => {
  it('produces the same per-spec gallons after dropping spec_required_inputs', () => {
    const r = computeScenarioEstimate(interior, canonicalBundle, null, []);
    const got = (r.materialEstimates || [])
      .map(m => ({ spec: m.specFamilyId, role: m.productRole, gal: m.gallons, psKey: m.psKey }))
      .sort((a, b) => (a.spec + a.role).localeCompare(b.spec + b.role));
    expect(got).toEqual(EXPECTED);
  });
});
