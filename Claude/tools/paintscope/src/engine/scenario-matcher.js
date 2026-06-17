// Standalone scenario matcher. Extracted from run-estimate-scenario.js so
// tooling (test harness, UI debugger, scenario gap reports) can run scenario
// matching without invoking the full estimator.
//
// A scenario's `matches` object is a set of ctx key → expected value (or
// array of values) constraints. A scenario matches ctx when every key in
// `matches` is present in ctx and each ctx value is in the allowed set.
//
// Multiple matches are resolved by specificity — the scenario with the most
// keys in its `matches` object wins. Ties are flagged as warnings so the
// caller can audit ambiguity.

/**
 * Test whether a single scenario matches the given ctx.
 * Returns { matches: boolean, specificity: number, missing: string[], mismatches: object[] }
 * - specificity: count of keys in matches{} (for tie-breaking)
 * - missing: ctx keys that are required but absent (undefined)
 * - mismatches: objects describing which constraints failed
 */
export function scenarioMatches(scenario, ctx) {
  const m = scenario.matches || {};
  const keys = Object.keys(m);
  const mismatches = [];
  const missing = [];
  let ok = true;

  for (const key of keys) {
    const expected = m[key];
    const ctxVal = ctx[key];
    if (ctxVal === undefined || ctxVal === null) {
      missing.push(key);
      ok = false;
      continue;
    }
    if (Array.isArray(expected)) {
      if (!expected.includes(ctxVal)) {
        mismatches.push({ key, expected, got: ctxVal });
        ok = false;
      }
    } else {
      if (ctxVal !== expected) {
        mismatches.push({ key, expected, got: ctxVal });
        ok = false;
      }
    }
  }

  return { matches: ok, specificity: keys.length, missing, mismatches };
}

/**
 * Find the best matching scenario for a given ctx.
 * Returns { scenario, allMatches, tied, warnings }
 *
 * - scenario: the most-specific matching scenario, or null if none match
 * - allMatches: every scenario that matched (sorted by specificity desc),
 *   useful for debugging and writing gap reports
 * - tied: true if multiple scenarios tied for highest specificity
 * - warnings: human-readable strings describing ambiguity or gaps
 */
export function findBestMatch(scenarioBundle, ctx) {
  const warnings = [];
  const allMatches = [];

  for (const scenario of scenarioBundle.scenarios) {
    const result = scenarioMatches(scenario, ctx);
    if (result.matches) {
      allMatches.push({ scenario, specificity: result.specificity });
    }
  }

  if (allMatches.length === 0) {
    return { scenario: null, allMatches: [], tied: false, warnings: ['No scenario matched ctx'] };
  }

  // Sort by specificity desc; stable so first scenario in bundle order wins ties
  allMatches.sort((a, b) => b.specificity - a.specificity);

  const topScore = allMatches[0].specificity;
  const topMatches = allMatches.filter(m => m.specificity === topScore);
  const tied = topMatches.length > 1;

  if (tied) {
    const ids = topMatches.map(m => m.scenario.scenario_id).join(', ');
    warnings.push(
      `Multiple scenarios tied at specificity ${topScore}: ${ids}. Picked ${topMatches[0].scenario.scenario_id} (bundle order). Add more specific matches{} keys to disambiguate.`
    );
  }

  return {
    scenario: topMatches[0].scenario,
    allMatches,
    tied,
    warnings,
  };
}

/**
 * For a given ctx that FAILS to match any scenario, find the closest
 * near-matches so a diagnostic report can explain why no scenario fired.
 * A "near miss" is any scenario where missing.length + mismatches.length <= threshold.
 *
 * Returns Array<{ scenario, missing, mismatches, score }> sorted by score asc
 * (lowest score = closest match).
 */
export function findNearMisses(scenarioBundle, ctx, threshold = 2) {
  const hits = [];
  for (const scenario of scenarioBundle.scenarios) {
    const result = scenarioMatches(scenario, ctx);
    if (result.matches) continue;
    const score = result.missing.length + result.mismatches.length;
    if (score <= threshold) {
      hits.push({
        scenario,
        missing: result.missing,
        mismatches: result.mismatches,
        score,
      });
    }
  }
  hits.sort((a, b) => a.score - b.score);
  return hits;
}

/**
 * Summarize ctx gaps: which paintable_items have scenarios in the bundle but
 * no scenario matches any ctx from the input list? Useful for coverage reports.
 *
 * ctxList: Array<ctx>
 * Returns { matched: Set<paintable_item>, unmatched: Array<{ ctx, reason }> }
 */
export function summarizeMatches(scenarioBundle, ctxList) {
  const matched = new Set();
  const unmatched = [];
  for (const ctx of ctxList) {
    const { scenario, warnings } = findBestMatch(scenarioBundle, ctx);
    if (scenario) {
      matched.add(ctx.paintable_item || '(no paintable_item)');
    } else {
      unmatched.push({ ctx, reason: warnings.join('; ') });
    }
  }
  return { matched, unmatched };
}
