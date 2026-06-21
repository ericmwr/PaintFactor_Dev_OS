import { describe, it, expect } from 'vitest';
import { entryClass, transformModule } from '../../../../../../../scripts/lib/strip-qt-gates-core.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModule(tasks, id = 'MOD_TEST') {
  return {
    module_id: id,
    name: 'Test Module',
    phase: 'apply',
    tasks,
  };
}

// ---------------------------------------------------------------------------
// entryClass
// ---------------------------------------------------------------------------

describe('entryClass', () => {
  it('returns "none" when no applies_when', () => {
    expect(entryClass({ task_ref: 'TSK_A' })).toBe('none');
  });

  it('returns "none" when applies_when has no quality_tier key', () => {
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { application_method: ['roll'] } })).toBe('none');
  });

  it('returns "none" when applies_when is empty object', () => {
    expect(entryClass({ task_ref: 'TSK_A', applies_when: {} })).toBe('none');
  });

  it('returns "none" when applies_when.quality_tier is a scalar (skipped per engine rule)', () => {
    // Engine only enforces array-valued keys; scalar quality_tier would never fire.
    // entryClass treats non-array as not a gate — but in practice data uses arrays.
    // Verify the function handles the scalar gracefully as "none".
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: 'QT3' } })).toBe('none');
  });

  it('returns "include_qt3" when quality_tier array contains QT3', () => {
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT3'] } })).toBe('include_qt3');
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT3', 'QT4'] } })).toBe('include_qt3');
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT2', 'QT3', 'QT5'] } })).toBe('include_qt3');
  });

  it('returns "exclude_qt3" when quality_tier array does not contain QT3', () => {
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT2'] } })).toBe('exclude_qt3');
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT4'] } })).toBe('exclude_qt3');
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT5'] } })).toBe('exclude_qt3');
    expect(entryClass({ task_ref: 'TSK_A', applies_when: { quality_tier: ['QT4', 'QT5'] } })).toBe('exclude_qt3');
  });
});

// ---------------------------------------------------------------------------
// transformModule — include_qt3 cases
// ---------------------------------------------------------------------------

describe('transformModule — include_qt3 (strip quality_tier, keep other keys)', () => {
  it('strips quality_tier and removes applies_when entirely when it becomes empty', () => {
    const module = makeModule([
      { task_ref: 'TSK_A', applies_when: { quality_tier: ['QT3'] } },
    ]);
    const { module: out, stripped, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]).not.toHaveProperty('applies_when');
    expect(stripped).toEqual(['TSK_A']);
    expect(removed).toEqual([]);
  });

  it('strips quality_tier but keeps applies_when when other keys remain', () => {
    const module = makeModule([
      {
        task_ref: 'TSK_B',
        applies_when: {
          quality_tier: ['QT3', 'QT4'],
          application_method: ['roll'],
        },
      },
    ]);
    const { module: out, stripped, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0].applies_when).toEqual({ application_method: ['roll'] });
    expect(out.tasks[0].applies_when).not.toHaveProperty('quality_tier');
    expect(stripped).toEqual(['TSK_B']);
    expect(removed).toEqual([]);
  });

  it('strips quality_tier but keeps multiple other applies_when keys', () => {
    const module = makeModule([
      {
        task_ref: 'TSK_C',
        applies_when: {
          substrate_type: ['concrete'],
          quality_tier: ['QT3', 'QT4'],
          application_method: ['spray_backroll'],
        },
      },
    ]);
    const { module: out, stripped } = transformModule(module);
    expect(out.tasks[0].applies_when).toEqual({
      substrate_type: ['concrete'],
      application_method: ['spray_backroll'],
    });
    expect(stripped).toEqual(['TSK_C']);
  });
});

// ---------------------------------------------------------------------------
// transformModule — exclude_qt3 cases
// ---------------------------------------------------------------------------

describe('transformModule — exclude_qt3 (remove entry)', () => {
  it('removes entry when quality_tier array excludes QT3', () => {
    const module = makeModule([
      { task_ref: 'TSK_D', applies_when: { quality_tier: ['QT2'] } },
    ]);
    const { module: out, stripped, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(0);
    expect(stripped).toEqual([]);
    expect(removed).toEqual(['TSK_D']);
  });

  it('removes QT4-only entry', () => {
    const module = makeModule([
      { task_ref: 'TSK_E', applies_when: { quality_tier: ['QT4'] } },
    ]);
    const { module: out, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(0);
    expect(removed).toEqual(['TSK_E']);
  });

  it('removes QT5-only entry', () => {
    const module = makeModule([
      { task_ref: 'TSK_F', applies_when: { quality_tier: ['QT5'] } },
    ]);
    const { module: out, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(0);
    expect(removed).toEqual(['TSK_F']);
  });

  it('removes entry gated on QT4+QT5 (no QT3)', () => {
    const module = makeModule([
      { task_ref: 'TSK_G', applies_when: { quality_tier: ['QT4', 'QT5'] } },
    ]);
    const { module: out, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(0);
    expect(removed).toEqual(['TSK_G']);
  });

  it('removes entry gated on QT4+QT5 even when other applies_when keys present', () => {
    const module = makeModule([
      {
        task_ref: 'TSK_H',
        applies_when: {
          substrate_type: ['concrete'],
          quality_tier: ['QT4', 'QT5'],
        },
      },
    ]);
    const { module: out, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(0);
    expect(removed).toEqual(['TSK_H']);
  });
});

// ---------------------------------------------------------------------------
// transformModule — none cases (no-op)
// ---------------------------------------------------------------------------

describe('transformModule — no gate entries (none classification)', () => {
  it('returns unchanged module when no task has quality_tier gate', () => {
    const module = makeModule([
      { task_ref: 'TSK_I' },
      { task_ref: 'TSK_J', applies_when: { application_method: ['roll'] } },
      { task_ref: 'TSK_K', applies_when: { has_steps: true } },
    ]);
    const { module: out, stripped, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(3);
    expect(stripped).toEqual([]);
    expect(removed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// transformModule — mixed module
// ---------------------------------------------------------------------------

describe('transformModule — mixed module (include + exclude + none)', () => {
  it('correctly handles a module with all three entry types', () => {
    const module = makeModule([
      // none — untouched
      { task_ref: 'TSK_ALWAYS' },
      // exclude_qt3 — removed
      { task_ref: 'TSK_QT2_ONLY', applies_when: { quality_tier: ['QT2'] } },
      // include_qt3 with other key — strip QT
      {
        task_ref: 'TSK_QT3_QT4_ROLL',
        applies_when: { quality_tier: ['QT3', 'QT4'], application_method: ['roll'] },
      },
      // include_qt3 standalone → applies_when removed
      { task_ref: 'TSK_QT3_ONLY', applies_when: { quality_tier: ['QT3'] } },
      // exclude_qt3 — removed
      { task_ref: 'TSK_QT5_ONLY', applies_when: { quality_tier: ['QT5'] } },
    ]);

    const { module: out, stripped, removed } = transformModule(module);

    // Remaining tasks: TSK_ALWAYS, TSK_QT3_QT4_ROLL, TSK_QT3_ONLY
    expect(out.tasks).toHaveLength(3);

    const always = out.tasks.find(t => t.task_ref === 'TSK_ALWAYS');
    expect(always).toBeDefined();
    expect(always.applies_when).toBeUndefined();

    const qt3qt4 = out.tasks.find(t => t.task_ref === 'TSK_QT3_QT4_ROLL');
    expect(qt3qt4).toBeDefined();
    expect(qt3qt4.applies_when).toEqual({ application_method: ['roll'] });
    expect(qt3qt4.applies_when).not.toHaveProperty('quality_tier');

    const qt3only = out.tasks.find(t => t.task_ref === 'TSK_QT3_ONLY');
    expect(qt3only).toBeDefined();
    expect(qt3only.applies_when).toBeUndefined();

    expect(stripped.sort()).toEqual(['TSK_QT3_ONLY', 'TSK_QT3_QT4_ROLL']);
    expect(removed.sort()).toEqual(['TSK_QT2_ONLY', 'TSK_QT5_ONLY']);
  });

  it('mirrors the real MOD_APPLY_EXT_PORCH_FLOOR_FINISH shape', () => {
    // 3 INCLUDE_QT3 enamel tasks (QT3+QT4, each gated on application_method)
    // 2 EXCLUDE_QT3 tasks (QT2 acrylic sealer, QT5 polyurea)
    // 1 EXCLUDE_QT3 wood-enamel-single (QT2)
    // 1 NONE task (step detail, no quality_tier gate — has_steps:true scalar skipped)
    const module = makeModule([
      {
        task_ref: 'TSK_XPRFL_ACRYLIC_SEALER_ROLL',
        applies_when: { substrate_type: ['concrete'], quality_tier: ['QT2'] },
      },
      {
        task_ref: 'TSK_XPRFL_ENAMEL_ROLL',
        applies_when: { quality_tier: ['QT3', 'QT4'], application_method: ['roll'] },
      },
      {
        task_ref: 'TSK_XPRFL_ENAMEL_BRUSH',
        applies_when: { quality_tier: ['QT3', 'QT4'], application_method: ['brush_roll'] },
      },
      {
        task_ref: 'TSK_XPRFL_ENAMEL_SPRAY_BACKROLL',
        applies_when: { quality_tier: ['QT3', 'QT4'], application_method: ['spray_backroll'] },
      },
      {
        task_ref: 'TSK_XPRFL_POLYUREA_ROLL',
        applies_when: { substrate_type: ['concrete'], quality_tier: ['QT5'] },
      },
      {
        task_ref: 'TSK_XPRFL_WOOD_ENAMEL_SINGLE',
        applies_when: { substrate_type: ['wood'], quality_tier: ['QT2'] },
      },
      {
        task_ref: 'TSK_XPRFL_STEP_DETAIL',
        applies_when: { has_steps: true },
      },
    ]);

    const { module: out, stripped, removed } = transformModule(module);

    // 3 enamel (stripped) + 1 step_detail (none) = 4 remaining
    expect(out.tasks).toHaveLength(4);

    expect(stripped.sort()).toEqual([
      'TSK_XPRFL_ENAMEL_BRUSH',
      'TSK_XPRFL_ENAMEL_ROLL',
      'TSK_XPRFL_ENAMEL_SPRAY_BACKROLL',
    ]);
    expect(removed.sort()).toEqual([
      'TSK_XPRFL_ACRYLIC_SEALER_ROLL',
      'TSK_XPRFL_POLYUREA_ROLL',
      'TSK_XPRFL_WOOD_ENAMEL_SINGLE',
    ]);

    // Enamel tasks retain application_method but lose quality_tier
    const roll = out.tasks.find(t => t.task_ref === 'TSK_XPRFL_ENAMEL_ROLL');
    expect(roll.applies_when).toEqual({ application_method: ['roll'] });

    // Step detail unchanged (scalar has_steps gate is type "none")
    const step = out.tasks.find(t => t.task_ref === 'TSK_XPRFL_STEP_DETAIL');
    expect(step.applies_when).toEqual({ has_steps: true });
  });
});

// ---------------------------------------------------------------------------
// transformModule — input mutation guard
// ---------------------------------------------------------------------------

describe('transformModule — immutability', () => {
  it('does not mutate the input module', () => {
    const module = makeModule([
      { task_ref: 'TSK_M', applies_when: { quality_tier: ['QT3'], application_method: ['roll'] } },
      { task_ref: 'TSK_N', applies_when: { quality_tier: ['QT4'] } },
    ]);
    // deep-freeze a snapshot to detect mutations
    const before = JSON.stringify(module);
    transformModule(module);
    expect(JSON.stringify(module)).toBe(before);
  });

  it('output module is a deep clone — mutating it does not affect input', () => {
    const module = makeModule([
      { task_ref: 'TSK_O', applies_when: { quality_tier: ['QT3'] } },
    ]);
    const { module: out } = transformModule(module);
    // Mutate output
    out.tasks[0].task_ref = 'MUTATED';
    // Input must be unchanged
    expect(module.tasks[0].task_ref).toBe('TSK_O');
  });

  it('returns same shape object even when nothing changes', () => {
    const module = makeModule([{ task_ref: 'TSK_P' }]);
    const { module: out, stripped, removed } = transformModule(module);
    expect(out.tasks).toHaveLength(1);
    expect(stripped).toEqual([]);
    expect(removed).toEqual([]);
  });
});
