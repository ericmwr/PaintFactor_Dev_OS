// Painting scope presets — bulk-toggle substrates in a room based on a
// single dropdown choice on the Identity tab. UI scope-selection convenience
// only; engine still activates each substrate's own scenario individually.
//
// "Trim only" activates the four most-common trim substrates (baseboard,
// crown, door_casing, window_casing). Estimator can extend via Surfaces /
// Trim / Openings tabs after picking the preset.

export const PAINTING_SCOPE_PRESETS = [
  {
    id: 'ceiling_only',
    label: 'Ceilings only',
    substrates: ['ceiling'],
  },
  {
    id: 'walls_only',
    label: 'Walls only',
    substrates: ['walls'],
  },
  {
    id: 'trim_only',
    label: 'Trim only',
    substrates: ['baseboard', 'door_casing', 'window_casing'],
  },
  {
    id: 'ceilings_walls',
    label: 'Ceilings + Walls',
    substrates: ['ceiling', 'walls'],
  },
  {
    id: 'ceilings_walls_trim',
    label: 'Ceilings + Walls + Trim',
    substrates: ['ceiling', 'walls', 'baseboard', 'door_casing', 'window_casing'],
  },
  {
    id: 'full',
    label: 'Full (incl. doors + windows)',
    substrates: [
      'ceiling', 'walls',
      'baseboard', 'crown', 'door_casing', 'window_casing',
      'doors', 'windows', 'door_frames', 'window_jamb',
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    substrates: null,  // null = no auto-action; user manages substrates manually
  },
];

export const PAINTING_SCOPE_PRESET_MAP = Object.fromEntries(
  PAINTING_SCOPE_PRESETS.map(p => [p.id, p])
);

// Substrates that are "always present" — never deleted, just toggled via
// the `painting` flag. Mirrors the special-case set in reducer's TOGGLE_SUBSTRATE.
export const ALWAYS_PRESENT_SUBSTRATES = new Set([
  'doors', 'windows', 'door_casing', 'window_casing',
]);
