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
