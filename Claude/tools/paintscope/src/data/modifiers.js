// Window modifiers from SF_WINDOW_INT_NC production.json
// Size bucket: all per-EA rates calibrated to Medium (1.00), modifiers adjust time
export const WINDOW_SIZE_MODIFIERS = { S: 0.75, M: 1.00, L: 1.40, O: 2.00 };

// Window type: normalized to double-hung baseline (most common NC residential)
export const WINDOW_TYPE_MODIFIERS = { double_hung: 1.00, single_hung: 1.00, casement: 0.96, slider: 0.96, fixed: 0.78, awning: 1.00 };

// Muntin modifier: TDL adds +20% to application and sanding tasks
export const MUNTIN_MODIFIER = 1.20;

// Door type complexity from SF_DOOR_SLAB_INT_NC production.json
export const DOOR_TYPE_MODIFIERS = { flush: 1.0, panel_4: 1.25, panel_6: 1.35, french: 2.0, bifold: 0.7, louvered: 2.5, sliding_glass: 1.8 };

// Human-readable labels for item types (used in per-item task line items)
export const WINDOW_TYPE_LABELS = { double_hung:'Double Hung', single_hung:'Single Hung', casement:'Casement', slider:'Slider', fixed:'Fixed', awning:'Awning' };
export const WINDOW_SIZE_LABELS = { S:'SM', M:'STD', L:'LG', O:'XL' };
export const DOOR_TYPE_LABELS = { flush:'Flush/Slab', panel_4:'4-Panel', panel_6:'6-Panel', french:'French', bifold:'Bifold', louvered:'Louvered', sliding_glass:'Sliding Glass' };
export const ARCH_ELEMENT_PS_GROUPS = { 'PS_SURFACE_LF.ARCH_BEAM':'Beams', 'PS_SURFACE_EA.ARCH_COLUMN':'Columns', 'PS_SURFACE_EA.ARCH_MANTEL':'Mantels' };

// ============================================================
// EXTERIOR MODIFIERS
// ============================================================

// Access type modifiers — time multiplier per access method
export const EXT_ACCESS_MODIFIERS = {
  ground:   1.00,
  ladder:   1.35,
  scaffold: 1.50,
  lift:     1.25,  // lift is faster than scaffold for large areas
};

// Wind condition modifiers
export const EXT_WIND_MODIFIERS = {
  calm:          1.00,
  light_breeze:  1.00,
  moderate:      1.10,
  high:          1.25,
};

// Sun exposure modifiers
export const EXT_SUN_MODIFIERS = {
  full_shade:    1.00,
  partial_shade: 1.00,
  mixed:         1.05,
  full_sun:      1.10,
};

// Surface temperature modifiers
export const EXT_SURFACE_TEMP_MODIFIERS = {
  optimal:      1.00,
  standard:     1.00,
  cold_surface: 1.15,
  hot_surface:  1.20,
};

// Trim profile complexity modifiers
export const EXT_PROFILE_MODIFIERS = {
  standard:   1.00,
  detailed:   1.20,
  ornate:     1.50,
  crown:      1.30,
};

// Siding texture modifiers (affects labor rate and material coverage)
export const EXT_TEXTURE_MODIFIERS = {
  smooth:     1.00,
  cedarmill:  1.15,
  sand:       1.25,
  lace:       1.50,
  dash:       2.00,
};

// Coating type modifiers (deck/fence)
export const EXT_COATING_MODIFIERS = {
  paint:          1.00,
  stain:          0.85,
  stain_solid:    0.90,
  stain_semi:     0.75,
  clear_seal:     0.65,
};

// Labels for exterior modifier values
export const EXT_ACCESS_LABELS = { ground: 'Ground (0-8 ft)', ladder: 'Ladder (8-16 ft)', scaffold: 'Scaffold (16-25 ft)', lift: 'Lift (25+ ft)' };
export const EXT_WIND_LABELS = { calm: 'Calm', light_breeze: 'Light Breeze', moderate: 'Moderate', high: 'High Wind' };
export const EXT_SUN_LABELS = { full_shade: 'Full Shade', partial_shade: 'Partial Shade', mixed: 'Mixed', full_sun: 'Full Sun' };
export const EXT_SURFACE_TEMP_LABELS = { optimal: 'Optimal (50-90°F)', standard: 'Standard', cold_surface: 'Cold (<50°F)', hot_surface: 'Hot (>90°F)' };
export const EXT_PROFILE_LABELS = { standard: 'Standard', detailed: 'Detailed', ornate: 'Ornate', crown: 'Crown' };
export const EXT_TEXTURE_LABELS = { smooth: 'Smooth', cedarmill: 'Cedarmill', sand: 'Sand', lace: 'Spanish Lace', dash: 'Dash/Roughcast' };

// ── Exterior Per-Item Modifiers ──

// Exterior window size modifiers — same size buckets as interior (S/M/L)
export const EXT_WINDOW_SIZE_MODIFIERS = { S: 0.75, M: 1.00, L: 1.40 };

// Exterior window type modifiers — normalized to double_hung baseline
export const EXT_WINDOW_TYPE_MODIFIERS = { double_hung: 1.00, single_hung: 1.00, casement: 0.96, slider: 0.96, fixed: 0.78, awning: 1.00 };

// Exterior door type modifiers — exterior doors differ from interior (heavier/larger)
export const EXT_DOOR_TYPE_MODIFIERS = { entry: 1.0, panel: 1.15, french: 1.8, sidelite: 1.4, storm: 0.6, dutch: 1.3 };

// Exterior door substrate modifiers — affects prime + finish labor
export const EXT_DOOR_SUBSTRATE_MODIFIERS = { fiberglass: 1.0, wood: 1.15, steel: 0.90, aluminum: 0.85 };

// Garage door size modifiers — single (~8x7), double (~16x7), triple (~24x7)
export const EXT_GARAGE_SIZE_MODIFIERS = { single: 0.55, double: 1.00, triple: 1.45 };

// Garage door panel type modifiers
export const EXT_GARAGE_PANEL_MODIFIERS = { flush: 0.80, raised_panel: 1.00, recessed_panel: 1.10, carriage: 1.25, window_insert: 1.15 };

// Labels
export const EXT_WINDOW_TYPE_LABELS = { double_hung: 'Double Hung', single_hung: 'Single Hung', casement: 'Casement', slider: 'Slider', fixed: 'Fixed', awning: 'Awning' };
export const EXT_WINDOW_SIZE_LABELS = { S: 'SM', M: 'STD', L: 'LG' };
export const EXT_DOOR_TYPE_LABELS = { entry: 'Entry', panel: 'Panel', french: 'French', sidelite: 'Sidelite', storm: 'Storm', dutch: 'Dutch' };
export const EXT_DOOR_SUBSTRATE_LABELS = { fiberglass: 'Fiberglass', wood: 'Wood', steel: 'Steel', aluminum: 'Aluminum' };
export const EXT_GARAGE_SIZE_LABELS = { single: 'Single', double: 'Double', triple: 'Triple' };
export const EXT_GARAGE_PANEL_LABELS = { flush: 'Flush', raised_panel: 'Raised Panel', recessed_panel: 'Recessed Panel', carriage: 'Carriage', window_insert: 'Window Insert' };
