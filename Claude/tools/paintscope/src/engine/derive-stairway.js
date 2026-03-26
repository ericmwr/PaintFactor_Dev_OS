// IRC code constants
const RISER_HEIGHT_FT = 0.625;  // 7.5 inches
const TREAD_DEPTH_FT = 0.875;   // 10.5 inches
const TREAD_DEPTH_IN = 10.5;
const BALUSTER_MAX_SPACING_IN = 4;

function deriveRun(risers) {
  if (!risers || risers <= 0) return { total_rise: 0, total_run: 0, rake_length: 0, treads: 0 };
  const total_rise = risers * RISER_HEIGHT_FT;
  const total_run = (risers - 1) * TREAD_DEPTH_FT;
  const rake_length = Math.sqrt(total_rise * total_rise + total_run * total_run);
  const treads = risers - 1;
  return { total_rise, total_run, rake_length, treads };
}

export function deriveStairway(config) {
  if (!config) return null;
  const { runs = 1, layout = 'l_shape', run1_risers = 0, run2_risers = 0, stair_width = 3.5 } = config;

  const r1 = deriveRun(run1_risers);
  const r2 = runs >= 2 ? deriveRun(run2_risers) : { total_rise: 0, total_run: 0, rake_length: 0, treads: 0 };

  const total_risers = run1_risers + (runs >= 2 ? run2_risers : 0);
  const total_treads = r1.treads + r2.treads;
  const total_rake_lf = Math.round((r1.rake_length + r2.rake_length) * 10) / 10;
  const total_rise = Math.round((r1.total_rise + r2.total_rise) * 10) / 10;
  const total_run = Math.round((r1.total_run + r2.total_run) * 10) / 10;

  const balusters_per_tread = Math.ceil(TREAD_DEPTH_IN / BALUSTER_MAX_SPACING_IN);
  const total_balusters = total_treads * balusters_per_tread;

  let newel_posts = 0;
  if (runs === 1 && run1_risers > 0) newel_posts = 2;
  else if (runs >= 2) {
    newel_posts = 3;
    if (layout === 'u_shape') newel_posts = 4;
  }

  const skirtboard_lf = Math.round(total_rake_lf * 2 * 10) / 10;

  return {
    total_risers, total_treads, total_rise, total_run, total_rake_lf,
    total_balusters, newel_posts, skirtboard_lf,
    run1: r1, run2: r2,
  };
}

export function getComponentQuantity(component, derivedValue) {
  if (!component) return 0;
  const overrideKey = component.count_override !== undefined ? 'count_override' : 'lf_override';
  const valueKey = component.count !== undefined ? 'count' : 'lf';
  if (component[overrideKey] && component[valueKey] != null) return component[valueKey];
  return derivedValue || 0;
}
