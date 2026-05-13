// ============================================================
// LIGHT FIXTURE TYPES — taxonomy for the light-fixtures detail panel.
// Source of truth: W-16 planning page (Notion).
//
// Each type defines the per-fixture default protection level and the
// per-fixture time cost in minutes for each action mode:
//   - mask  → protect in place with plastic/cover (mask_time_min applies)
//   - remove → physically uninstall + reinstall   (remove_time_min applies)
//
// allow_remove gates whether the "Remove" action is offered for this type.
// Types where remove isn't realistic (e.g. ceiling fan = too disruptive
// to disassemble for a paint job) keep the mask path only.
// ============================================================

export const LIGHT_FIXTURE_TYPES = [
  {
    id: 'recessed_light',
    label: 'Recessed Lighting Cover',
    default_protection: 'full',
    mask_time_min: 1,
    remove_time_min: 2,
    allow_remove: true,
    description: 'Insert with springs or snaps. Remove and replace — pops off in a minute, back on in two.',
  },
  {
    id: 'ceiling_fan',
    label: 'Ceiling Fan',
    default_protection: 'full',
    mask_time_min: 10,
    remove_time_min: null,
    allow_remove: false,
    description: 'Wrap blades + light globe. Remove mode disabled — disassembling a ceiling fan for a paint job is rarely worth it.',
  },
  {
    id: 'bulb_fixture',
    label: 'Bulb Fixture Cover',
    default_protection: 'full',
    mask_time_min: 2,
    remove_time_min: 5,
    allow_remove: true,
    description: 'Glass globe / dome over bulb. Remove = unscrew globe and reinstall.',
  },
  {
    id: 'transparent_glass',
    label: 'Transparent Glass Cover',
    default_protection: 'partial',
    mask_time_min: 2,
    remove_time_min: 5,
    allow_remove: true,
    description: 'Clear or decorative glass shade. Often pendant or wall-mounted.',
  },
  {
    id: 'other',
    label: 'Other / Custom',
    default_protection: null,    // user picks
    mask_time_min: null,         // user enters
    remove_time_min: null,       // user enters
    allow_remove: true,
    is_custom: true,
    description: 'Free-form bucket for non-standard fixtures the user can name and rate themselves.',
  },
];

export const LIGHT_FIXTURE_TYPE_MAP = Object.fromEntries(
  LIGHT_FIXTURE_TYPES.map(t => [t.id, t])
);

// Action mode enum — mask in place vs physically remove the fixture.
export const FIXTURE_ACTION_MODES = [
  { value: 'mask',   label: 'Mask in place' },
  { value: 'remove', label: 'Remove + reinstall' },
];
