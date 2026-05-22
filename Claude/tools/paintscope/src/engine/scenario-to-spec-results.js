// Converts scenario engine perInputResults → specResult shape used by EstimateView.
//
// runScenarioEstimate returns one result per (room|elevation, spec) input, with
// per-task hours. Legacy runEstimate aggregates by spec.id and returns a specResult
// per spec with totalHours / phaseHours / tasks. This helper bridges the shapes
// so the existing EstimateView / sort / materials / pricing code doesn't change.
//
// Filter by `domain` to scope which scenario results get folded in (e.g. 'exterior').
//
// roomIndex convention (set by buildElevationScenarioInputs / buildStandaloneScenarioInputs):
//   -100 to  -999 → exterior elevation (roomLabel = elevation label, e.g. "Front Elevation")
//  -1000 to -1999 → standalone exterior item (roomLabel = "Standalone: <type>")

export function scenarioResultsToSpecResults(scenarioResults, { domain = 'exterior' } = {}) {
  if (!Array.isArray(scenarioResults) || scenarioResults.length === 0) return [];

  // Group per scenario engine input by specId — each spec becomes one specResult.
  const bySpec = new Map();
  for (const r of scenarioResults) {
    if (!r || !r.specId) continue;
    if (!bySpec.has(r.specId)) {
      bySpec.set(r.specId, {
        specId: r.specId,
        specName: r.specName || r.specId,
        domain,
        totalHours: 0,
        phaseHours: {},
        tasks: [],
      });
    }
    const sr = bySpec.get(r.specId);
    sr.totalHours += r.totalHours || 0;
    for (const [phase, hrs] of Object.entries(r.phaseHours || {})) {
      sr.phaseHours[phase] = (sr.phaseHours[phase] || 0) + hrs;
    }
    for (const t of r.tasks || []) {
      // Stamp domain + elevation/standalone labels onto each task so EstimateView
      // groupings still work. The scenario engine writes roomLabel; map to the
      // exterior-shaped fields the legacy block used.
      const isElevation = r.roomLabel && r.roomIndex <= -100 && r.roomIndex > -1000;
      const isStandalone = r.roomLabel && r.roomIndex <= -1000 && r.roomIndex > -2000;
      sr.tasks.push({
        ...t,
        domain,
        elevationLabel: isElevation ? r.roomLabel : null,
        standaloneType: isStandalone ? r.roomLabel.replace(/^Standalone:\s*/, '') : null,
        coatMultiplier: t.coatMultiplier ?? t.coatNumber ?? 1,
        conditionScale: r.ctx?.condition_scale || null,
      });
    }
  }

  // Round consistent with legacy.
  return Array.from(bySpec.values()).map(sr => ({
    ...sr,
    totalHours: Math.round(sr.totalHours * 100) / 100,
    phaseHours: Object.fromEntries(Object.entries(sr.phaseHours).map(([k, v]) => [k, Math.round(v * 100) / 100])),
  }));
}
