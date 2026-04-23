// ============================================================
// OPENING TYPES — structural wall holes (deductions, casing, frames)
// ============================================================
// casing_lf = perimeter LF for both casing AND door frame/jamb substrates.
// Keep these in sync; any addition/rename needs a migration in migrations.js.
export const OPENING_TYPES = {
  single:  { label: 'Single Door',       width_ft: 3,  height_ft: 7, deduction_sf: 21, casing_lf: 17 },
  double:  { label: 'Double Door',       width_ft: 6,  height_ft: 7, deduction_sf: 42, casing_lf: 20 },
  '3_door':{ label: '3-Door Opening',    width_ft: 9,  height_ft: 7, deduction_sf: 63, casing_lf: 23 },
  '4_door':{ label: '4-Door Opening',    width_ft: 12, height_ft: 7, deduction_sf: 84, casing_lf: 26 }
};
