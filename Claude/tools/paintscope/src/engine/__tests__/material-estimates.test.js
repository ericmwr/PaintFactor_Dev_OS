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

// Golden: interior material gallons after scenario-array selection cutover (P3 Task 4).
// All four lines are CHANGED-SYSTEM entries in phase3-materials-parity.md:
//   SCN_CEILING_FINISH_QT3_SPRAY_BACKROLL: matcher=SYS_FLAT_CEILING_PAINT → array=SYS_CEIL_FINISH_FLAT_STUB
//   SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL:  matcher=SYS_PVA_PRIMER         → array=SYS_PRIMER_PVA_STUB
//   SCN_DRYWALL_FINISH_QT3_SPRAY_BACKROLL: matcher=SYS_WALL_EGGSHELL      → array=SYS_WALL_FINISH_STUB
//   SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL:  matcher=SYS_PVA_PRIMER         → array=SYS_PRIMER_PVA_STUB
// SYS_WALL_FINISH_STUB has no product rows → coats defaults to 1 (was 2 for SYS_WALL_EGGSHELL),
// so wall finish gallons change from 3 → 2. All other gallon values are unchanged.
const EXPECTED = [
  {
    "spec": "SF_DRYWALL_CEILING_NC_FINISH",
    "role": "finish",
    "gal": 1,
    "psKey": "PS_SURFACE_SF.CEILING_FIELD"
  },
  {
    "spec": "SF_DRYWALL_CEILING_NC_PRIME",
    "role": "primer",
    "gal": 1,
    "psKey": "PS_SURFACE_SF.CEILING_FIELD"
  },
  {
    "spec": "SF_DRYWALL_WALL_NC_FINISH",
    "role": "finish",
    "gal": 2,
    "psKey": "PS_SURFACE_SF.WALL_FIELD"
  },
  {
    "spec": "SF_DRYWALL_WALL_NC_PRIME",
    "role": "primer",
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
