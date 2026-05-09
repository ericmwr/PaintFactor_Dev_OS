// Smoke: Scope Tree Phase 1 data layer (CLI entry point).
//
// Thin wrapper around runScopeTreeSmoke() in smoke-runner.js. The same
// runner is also imported by DraftsView's pre-publish gate. Bundle-shape
// invariants live in runBundleShapeSmoke and run from the browser only —
// the CLI doesn't load the canonical bundle.

import { runScopeTreeSmoke } from '../tools/paintscope/src/engine/smoke-runner.js';

const { pass, fail, total, results } = runScopeTreeSmoke();

console.log('\n=== Scope Tree Phase 1 Smoke ===\n');
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const detail = r.ok ? '' : `   → ${r.detail}`;
  console.log(`  ${mark} ${r.label}${detail}`);
}
console.log(`\n${pass}/${total} passed`);

process.exit(fail > 0 ? 1 : 0);
