// ============================================================
// LIGHT FIXTURE TYPES — taxonomy for the light-fixtures detail panel.
//
// Each type provides only structural metadata (id, label, default
// protection level, whether remove mode is offered). Per-fixture TIMES
// are user-entered on each item — see LightFixturesInlinePanel for the
// four time fields (mask install/remove, fixture uninstall/reinstall).
//
// allow_remove gates whether the "Remove + reinstall" action mode is
// offered. Types where physical R&R isn't realistic (e.g. ceiling fan)
// keep the mask path only.
// ============================================================

export const LIGHT_FIXTURE_TYPES = [
  {
    id: 'recessed_light',
    label: 'Recessed Lighting Cover',
    default_protection: 'full',
    allow_remove: true,
    description: 'Insert with springs or snaps. Pops off and on quickly.',
  },
  {
    id: 'ceiling_fan',
    label: 'Ceiling Fan',
    default_protection: 'full',
    allow_remove: false,
    description: 'Wrap blades + light globe. Remove mode disabled — disassembling a ceiling fan for a paint job is rarely worth it.',
  },
  {
    id: 'bulb_fixture',
    label: 'Bulb Fixture Cover',
    default_protection: 'full',
    allow_remove: true,
    description: 'Glass globe / dome over bulb. Remove = unscrew globe and reinstall.',
  },
  {
    id: 'transparent_glass',
    label: 'Transparent Glass Cover',
    default_protection: 'partial',
    allow_remove: true,
    description: 'Clear or decorative glass shade. Often pendant or wall-mounted.',
  },
  {
    id: 'other',
    label: 'Other / Custom',
    default_protection: null,    // user picks
    allow_remove: true,
    is_custom: true,
    description: 'Free-form bucket for non-standard fixtures the user can name themselves.',
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
