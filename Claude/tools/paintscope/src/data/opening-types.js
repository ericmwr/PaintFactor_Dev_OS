// ============================================================
// OPENING TYPES — structural wall holes (deductions, casing, frames)
// ============================================================
export const OPENING_TYPES = {
  single: { label: 'Single Door',  width_ft: 3,  height_ft: 7, deduction_sf: 21, casing_lf: 17 },
  double: { label: 'Double Door',  width_ft: 6,  height_ft: 7, deduction_sf: 42, casing_lf: 20 },
  wide:   { label: 'Wide Opening', width_ft: 12, height_ft: 7, deduction_sf: 84, casing_lf: 26 }
};
