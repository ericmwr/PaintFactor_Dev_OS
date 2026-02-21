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
