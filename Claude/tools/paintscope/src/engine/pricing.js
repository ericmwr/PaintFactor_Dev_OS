/**
 * Compute weighted average hourly rate for a crew configuration.
 * @param {{ painter: number, lead: number, apprentice: number }} rates - $/hr per role
 * @param {{ lead: number, painter: number, apprentice: number }} crew - headcount per role
 * @returns {number} blended $/hr
 */
export function computeBlendedRate(rates, crew) {
  const totalHeads = crew.lead + crew.painter + crew.apprentice;
  if (totalHeads === 0) return 0;
  const weightedSum =
    rates.lead * crew.lead +
    rates.painter * crew.painter +
    rates.apprentice * crew.apprentice;
  return weightedSum / totalHeads;
}

/**
 * Compute cost for a single line item (one substrate in one room).
 * @param {{ hours: number, blendedRate: number, burdenPct: number, materialCost: number }} params
 * @returns {{ laborCost: number, materialCost: number, lineCost: number }}
 */
export function computeLineCost({ hours, blendedRate, burdenPct, materialCost }) {
  const laborCost = Math.round(hours * blendedRate * (1 + burdenPct) * 100) / 100;
  return {
    laborCost,
    materialCost,
    lineCost: Math.round((laborCost + materialCost) * 100) / 100
  };
}

/**
 * Compute final bid price from subtotal + company profile settings.
 * @param {{ subtotal: number, overheadPct: number, marginPct: number, mobilization: number, travelCost: number, minJobCharge: number }} params
 * @returns {{ subtotal: number, overhead: number, margin: number, mobilization: number, travelCost: number, bidPrice: number, minJobApplied: boolean }}
 */
export function computeBidPrice({ subtotal, overheadPct, marginPct, mobilization, travelCost, minJobCharge }) {
  const afterOverhead = subtotal * (1 + overheadPct);
  const overhead = Math.round((afterOverhead - subtotal) * 100) / 100;
  const afterMargin = afterOverhead * (1 + marginPct);
  const margin = Math.round((afterMargin - afterOverhead) * 100) / 100;
  const rawBid = Math.round((afterMargin + mobilization + travelCost) * 100) / 100;
  const minJobApplied = rawBid < minJobCharge;
  return {
    subtotal,
    overhead,
    margin,
    mobilization,
    travelCost,
    bidPrice: minJobApplied ? minJobCharge : rawBid,
    minJobApplied
  };
}

/**
 * Compute travel cost from minutes + blended burdened rate.
 * @param {number} travelMinutes
 * @param {number} blendedRate $/hr
 * @param {number} burdenPct decimal (0.30)
 * @returns {number} travel cost in dollars
 */
export function computeTravelCost(travelMinutes, blendedRate, burdenPct) {
  return Math.round((travelMinutes / 60) * blendedRate * (1 + burdenPct) * 100) / 100;
}

/**
 * Full pricing aggregation pass. Takes the engine output (specResults +
 * materialEstimates) plus a company profile and returns the pricing object
 * that EstimateView consumes. Shared by the legacy engine (run-estimate.js)
 * and the scenario engine (useEstimateScenario.js) so both produce the same
 * shape.
 *
 * Returns null when profile is missing (matches legacy behavior — Estimate
 * view renders without pricing when no company profile is set).
 *
 * @param {object} profile — company profile from useCompanyProfile
 * @param {Array} specResults — per-spec totals with tasks[] (roomIndex, hours)
 * @param {Array} materialEstimates — per-spec material lines with totalCost
 * @returns {object|null} { subtotal, overhead, margin, mobilization, travelCost, bidPrice, minJobApplied, laborRates, lineItems } or null
 */
export function computePricing(profile, specResults, materialEstimates) {
  if (!profile) return null;

  const crew = profile.crew_configs?.[0] || { lead: 1, painter: 1, apprentice: 0 };
  const blendedRate = computeBlendedRate(profile.labor_rates, crew);
  const burdenPct = (profile.labor_burden_pct || 0) / 100;

  // Build material cost lookup: specFamilyId → totalCost
  const matCostBySpec = new Map();
  for (const mat of materialEstimates || []) {
    const prev = matCostBySpec.get(mat.specFamilyId) || 0;
    matCostBySpec.set(mat.specFamilyId, prev + (mat.totalCost || 0));
  }

  // Aggregate hours per room+spec from specResults
  const lineMap = new Map();
  for (const sr of specResults) {
    for (const task of sr.tasks) {
      const key = `${task.roomIndex}_${sr.specId}`;
      if (!lineMap.has(key)) {
        lineMap.set(key, {
          room: task.roomLabel,
          roomIndex: task.roomIndex,
          domain: sr.domain || 'interior',
          specFamilyId: sr.specId,
          specName: sr.specName,
          hours: 0
        });
      }
      lineMap.get(key).hours += task.hours;
    }
  }

  // Compute line costs
  let subtotal = 0;
  const lineItems = [];
  for (const [, line] of lineMap) {
    const specTotalHours = specResults.find(s => s.specId === line.specFamilyId)?.totalHours || 1;
    const matCostForSpec = matCostBySpec.get(line.specFamilyId) || 0;
    const matShare = Math.round((line.hours / specTotalHours) * matCostForSpec * 100) / 100;

    const lc = computeLineCost({
      hours: line.hours,
      blendedRate,
      burdenPct,
      materialCost: matShare
    });

    subtotal += lc.lineCost;
    lineItems.push({
      room: line.room,
      roomIndex: line.roomIndex,
      domain: line.domain,
      specFamilyId: line.specFamilyId,
      specName: line.specName,
      hours: Math.round(line.hours * 100) / 100,
      laborCost: lc.laborCost,
      materialCost: lc.materialCost,
      lineCost: lc.lineCost
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const rules = profile.business_rules || {};
  const travelCost = computeTravelCost(rules.travel_time_min || 0, blendedRate, burdenPct);

  const pricing = computeBidPrice({
    subtotal,
    overheadPct: (profile.overhead_rate_pct || 0) / 100,
    marginPct: (profile.profit_margin_pct || 0) / 100,
    mobilization: rules.mobilization_charge || 0,
    travelCost,
    minJobCharge: rules.min_job_charge || 0
  });
  pricing.laborRates = { blended: blendedRate, burdened: Math.round(blendedRate * (1 + burdenPct) * 100) / 100 };
  pricing.lineItems = lineItems;
  return pricing;
}
