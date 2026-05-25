import { describe, it, expect } from 'vitest';
import { deriveStage, deriveLifecycleActivityName, deriveProtectionMaskName } from '../activity-rules.js';

describe('deriveStage', () => {
  it('returns "install" for tasks ending in _INSTALL', () => {
    expect(deriveStage('TSK_MASK_OUTLET_SWITCH_INSTALL')).toBe('install');
    expect(deriveStage('TSK_PROTECT_FLOOR_EDGE_INSTALL')).toBe('install');
    expect(deriveStage('TSK_MASK_BATHTUB_INSTALL')).toBe('install');
  });

  it('returns "install" for tasks ending in _REINSTALL', () => {
    expect(deriveStage('TSK_PREP_OUTLET_COVER_REINSTALL')).toBe('install');
    expect(deriveStage('TSK_CABT_DOOR_REINSTALL')).toBe('install');
    expect(deriveStage('TSK_DOOR_HARDWARE_REINSTALL')).toBe('install');
  });

  it('returns "remove" for tasks ending in _REMOVE', () => {
    expect(deriveStage('TSK_MASK_OUTLET_SWITCH_REMOVE')).toBe('remove');
    expect(deriveStage('TSK_PROTECT_FLOOR_EDGE_REMOVE')).toBe('remove');
    expect(deriveStage('TSK_CABT_DOOR_REMOVE')).toBe('remove');
  });

  it('returns null for tasks with no install/remove suffix', () => {
    expect(deriveStage('TSK_CAULK_JOINTS_BASEBOARD')).toBeNull();
    expect(deriveStage('TSK_SPACKLE_WALL')).toBeNull();
    expect(deriveStage('TSK_ROLL_FINISH_WALL')).toBeNull();
    expect(deriveStage('TSK_INSPECT_FLOOR_PROTECTION')).toBeNull();
  });

  it('returns null for missing/empty taskId', () => {
    expect(deriveStage('')).toBeNull();
    expect(deriveStage(null)).toBeNull();
    expect(deriveStage(undefined)).toBeNull();
  });

  it('only matches at end of taskId (anchored suffix)', () => {
    // Hypothetical task with INSTALL in the middle — should not match.
    expect(deriveStage('TSK_INSTALL_SOMETHING_ELSE')).toBeNull();
    expect(deriveStage('TSK_REMOVE_PREFIX_DOWNSTREAM')).toBeNull();
  });

  it('treats _SETUP / _TEARDOWN as install / remove (protection masks)', () => {
    expect(deriveStage('TSK_CABT_PROT_ENCAP_SETUP')).toBe('install');
    expect(deriveStage('TSK_CABT_PROT_ENCAP_TEARDOWN')).toBe('remove');
    expect(deriveStage('TSK_CLOSET_SHELF_PROT_EDGE_SETUP')).toBe('install');
    expect(deriveStage('TSK_CLOSET_SHELF_PROT_FULL_TEARDOWN')).toBe('remove');
  });
});

describe('deriveProtectionMaskName', () => {
  it('derives same canonical name for SETUP + TEARDOWN halves of a pair', () => {
    expect(deriveProtectionMaskName('TSK_CABT_PROT_ENCAP_SETUP')).toBe('Cabinet Encapsulate Mask');
    expect(deriveProtectionMaskName('TSK_CABT_PROT_ENCAP_TEARDOWN')).toBe('Cabinet Encapsulate Mask');
  });

  it('handles all known cabinet protection variants', () => {
    expect(deriveProtectionMaskName('TSK_CABT_PROT_EDGE_SETUP')).toBe('Cabinet Edge Mask');
    expect(deriveProtectionMaskName('TSK_CABT_PROT_FULL_TEARDOWN')).toBe('Cabinet Full Drape Mask');
    expect(deriveProtectionMaskName('TSK_CABT_PROT_PARTIAL_SETUP')).toBe('Cabinet Partial Mask');
  });

  it('handles closet shelf protection variants', () => {
    expect(deriveProtectionMaskName('TSK_CLOSET_SHELF_PROT_EDGE_SETUP')).toBe('Closet Shelf Edge Mask');
    expect(deriveProtectionMaskName('TSK_CLOSET_SHELF_PROT_ENCAP_TEARDOWN')).toBe('Closet Shelf Encapsulate Mask');
  });

  it('returns null for task IDs that do not match the pattern', () => {
    // HVY/STD/LIGHT cabinet protection variants don't have a SETUP/TEARDOWN
    // pairing structure — they're handled as one-shot tasks.
    expect(deriveProtectionMaskName('TSK_CABT_PROT_HVY_APPLIANCES')).toBeNull();
    expect(deriveProtectionMaskName('TSK_CABT_PROT_HVY_TEARDOWN')).toBeNull();
    expect(deriveProtectionMaskName('TSK_MASK_OUTLET_SWITCH_INSTALL')).toBeNull();
    expect(deriveProtectionMaskName(null)).toBeNull();
  });
});

describe('deriveLifecycleActivityName', () => {
  it('strips trailing " — Install" / " — Remove" / " — Reinstall"', () => {
    expect(deriveLifecycleActivityName('TSK_MASK_TOILET_INSTALL',     'Toilet Mask — Install')).toBe('Toilet Mask');
    expect(deriveLifecycleActivityName('TSK_MASK_TOILET_REMOVE',      'Toilet Mask — Remove')).toBe('Toilet Mask');
    expect(deriveLifecycleActivityName('TSK_CABT_DOOR_REINSTALL',     'Cabinet Door — Reinstall')).toBe('Cabinet Door');
  });

  it('strips trailing " — Remove (project allowance)" parenthetical', () => {
    expect(deriveLifecycleActivityName(
      'TSK_PROJECT_LIGHT_FAN_MANTEL_REMOVE',
      'Light Fixtures + Ceiling Fans + Mantels — Remove (project allowance)',
    )).toBe('Light Fixtures + Ceiling Fans + Mantels');
  });

  it('strips leading "Install " / "Remove " verb', () => {
    expect(deriveLifecycleActivityName('TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL', 'Install Floor Encapsulation')).toBe('Floor Encapsulation');
    expect(deriveLifecycleActivityName('TSK_PROTECT_FLOOR_PARTIAL_REMOVE',      'Remove Floor Partial Drop')).toBe('Floor Partial Drop');
  });

  it('produces the same name for install and remove halves of a pair', () => {
    const installName = deriveLifecycleActivityName('TSK_MASK_DOOR_SLAB_INSTALL', 'Door Slab Mask — Install');
    const removeName  = deriveLifecycleActivityName('TSK_MASK_DOOR_SLAB_REMOVE',  'Door Slab Mask — Remove');
    expect(installName).toBe(removeName);
    expect(installName).toBe('Door Slab Mask');
  });

  it('returns null when the taskId has no lifecycle suffix', () => {
    expect(deriveLifecycleActivityName('TSK_CAULK_JOINTS_BASEBOARD', 'Caulk Joints — Baseboard')).toBeNull();
    expect(deriveLifecycleActivityName('TSK_ROLL_FINISH_WALL', 'Roll Finish — Wall')).toBeNull();
  });

  it('strips trailing verb without em-dash separator', () => {
    // Trim Tape Line tasks: taskName is just "Trim Tape Line Install" / "Trim Tape Line Remove".
    expect(deriveLifecycleActivityName('TSK_TRIM_TAPELINE_INSTALL', 'Trim Tape Line Install')).toBe('Trim Tape Line');
    expect(deriveLifecycleActivityName('TSK_TRIM_TAPELINE_REMOVE',  'Trim Tape Line Remove')).toBe('Trim Tape Line');
  });

  it('peels engine-appended coating suffix before stripping the verb', () => {
    // The engine appends " — Finish" / " — Primer" / etc. to finish/apply
    // phase tasks whose base name doesn't carry the coating role. For
    // lifecycle pairs, the Remove half is shielded (NAME_CONVEYS_TASK
    // includes "Remove") but the Install half is not, so the two halves
    // arrive asymmetric: "Foo Install — Finish" vs "Foo Remove".
    expect(deriveLifecycleActivityName('TSK_TRIM_TAPELINE_INSTALL', 'Trim Tape Line Install — Finish')).toBe('Trim Tape Line');
    expect(deriveLifecycleActivityName('TSK_TRIM_TAPELINE_REMOVE',  'Trim Tape Line Remove')).toBe('Trim Tape Line');
    expect(deriveLifecycleActivityName('TSK_FOO_INSTALL', 'Foo Bar Install — Primer')).toBe('Foo Bar');
    expect(deriveLifecycleActivityName('TSK_FOO_INSTALL', 'Foo Bar Install — Coat 2')).toBe('Foo Bar');
  });

  it('returns null when no strip pattern matches the taskName', () => {
    // taskNames that don't end in a lifecycle verb fall back so the caller
    // can use the raw taskName instead.
    expect(deriveLifecycleActivityName('TSK_FOO_INSTALL', 'Some random task name')).toBeNull();
    expect(deriveLifecycleActivityName('TSK_FOO_INSTALL', 'Caulk Joints')).toBeNull();
  });

  it('returns null for missing inputs', () => {
    expect(deriveLifecycleActivityName(null, 'Anything')).toBeNull();
    expect(deriveLifecycleActivityName('TSK_FOO_INSTALL', null)).toBeNull();
    expect(deriveLifecycleActivityName('', '')).toBeNull();
  });
});
