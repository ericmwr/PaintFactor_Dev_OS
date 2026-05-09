// Smoke runner — browser-importable, callable by both the CLI script
// (Claude/scripts/smoke-scope-tree.mjs) and DraftsView's pre-publish gate.
//
// Two layers of assertions:
//   1. runScopeTreeSmoke() — synthetic engine output exercises buildScopeTree
//      shape (totals roundtrip, pivots, annotations, coating level, protection,
//      project setup). 20 assertions, no dependence on canonical bundle state.
//   2. runBundleShapeSmoke(canonicalBundle, drafts?) — reference-graph
//      invariants on the hypothetical post-publish bundle. Catches the
//      operations that bypass the engine's automatic cascade (renames,
//      orphan modules, duplicate IDs, broken task_refs).
//
// runSmoke({ canonicalBundle, drafts }) runs both and returns a flat result
// list. DraftsView uses this synchronously before writing JSON; the CLI
// uses runScopeTreeSmoke() only (no bundle access from a node script
// without fs reads we'd rather avoid).

import { buildScopeTree, pivotTree } from './scope-tree.js';

// ============================================================
// Helpers
// ============================================================

function approxEq(a, b, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const c of node.children || []) {
    const hit = findNode(c, predicate);
    if (hit) return hit;
  }
  return null;
}

function sumLeaves(node, key) {
  if (node.kind === 'task') return node[key] || 0;
  return (node.children || []).reduce((s, c) => s + sumLeaves(c, key), 0);
}

class Checker {
  constructor() {
    this.results = [];
  }
  // severity: 'error' (default) blocks publish; 'warn' shows in panel only.
  check(label, ok, detail = '', severity = 'error') {
    this.results.push({ label, ok: !!ok, detail, severity });
  }
  // Wrap an assertion that might throw. The inner fn returns either:
  //   true  → assertion passes
  //   false → assertion fails with no detail
  //   { ok: false, detail: '...' } → assertion fails with detail
  safe(label, fn, severity = 'error') {
    try {
      const r = fn();
      if (r === true) {
        this.check(label, true, '', severity);
      } else if (r === false) {
        this.check(label, false, '', severity);
      } else if (r && typeof r === 'object') {
        this.check(label, !!r.ok, r.detail || '', severity);
      } else {
        this.check(label, !!r, '', severity);
      }
    } catch (e) {
      this.check(label, false, `threw: ${e.message}`, severity);
    }
  }
}

function summarize(results) {
  const pass = results.filter(r => r.ok).length;
  const errors = results.filter(r => !r.ok && r.severity !== 'warn').length;
  const warns = results.filter(r => !r.ok && r.severity === 'warn').length;
  return { pass, fail: errors + warns, errors, warns, total: results.length, results };
}

// ============================================================
// Synthetic engine output (shared between CLI + browser)
// ============================================================
// Two rooms:
//   Room 0 — Living Room: walls, ceiling (combined prime), baseboard (paint), crown (paint)
//   Room 1 — Master Bath: walls, baseboard (paint), crown (STAIN)
// Crown has paint in Room 0 + stain in Room 1 → exercises Coating level.
// Walls + Ceiling combined-prime in Room 0 → 'combined pass' annotation.
// Baseboard finish-grouped with Crown in Room 0 → 'grouped with crown'.

function buildSyntheticEstimate() {
  const project = {
    project_name: 'Smoke Test Project',
    rooms: [
      { id: 'r0', label: 'Living Room' },
      { id: 'r1', label: 'Master Bath' },
    ],
  };

  const specResults = [
    {
      specId: 'SF_DRYWALL_WALL_NC_FINISH', specName: 'Drywall Wall Finish', domain: 'interior',
      totalHours: 5.0, phaseHours: { prep: 1.0, apply: 4.0 },
      tasks: [
        { taskId: 'TSK_PREP_WALL', taskLabel: 'Wall Prep', phase: 'prep', hours: 1.0, roomIndex: 0, roomLabel: 'Living Room' },
        { taskId: 'TSK_ROLL_WALL', taskLabel: 'Roll Walls', phase: 'apply', hours: 4.0, roomIndex: 0, roomLabel: 'Living Room' },
        { taskId: 'TSK_PREP_WALL', taskLabel: 'Wall Prep', phase: 'prep', hours: 0.5, roomIndex: 1, roomLabel: 'Master Bath' },
        { taskId: 'TSK_ROLL_WALL', taskLabel: 'Roll Walls', phase: 'apply', hours: 2.0, roomIndex: 1, roomLabel: 'Master Bath' },
      ],
    },
    {
      specId: 'SF_DRYWALL_CEILING_NC_PRIME', specName: 'Drywall Ceiling Prime', domain: 'interior',
      totalHours: 1.5, phaseHours: { prime: 1.5 },
      tasks: [
        { taskId: 'TSK_PRIME_CEILING', taskLabel: 'Prime Ceiling', phase: 'prime', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' },
      ],
    },
    {
      specId: 'SF_BASEBOARD_NC_PAINT', specName: 'Baseboard Paint', domain: 'interior',
      totalHours: 2.5, phaseHours: { prep: 0.5, apply: 2.0 },
      tasks: [
        { taskId: 'TSK_BASEBOARD_PREP', taskLabel: 'Baseboard Prep', phase: 'prep', hours: 0.3, roomIndex: 0, roomLabel: 'Living Room' },
        { taskId: 'TSK_BASEBOARD_BRUSH_FINISH', taskLabel: 'Baseboard Finish', phase: 'apply', hours: 1.2, roomIndex: 0, roomLabel: 'Living Room' },
        { taskId: 'TSK_BASEBOARD_PREP', taskLabel: 'Baseboard Prep', phase: 'prep', hours: 0.2, roomIndex: 1, roomLabel: 'Master Bath' },
        { taskId: 'TSK_BASEBOARD_BRUSH_FINISH', taskLabel: 'Baseboard Finish', phase: 'apply', hours: 0.8, roomIndex: 1, roomLabel: 'Master Bath' },
      ],
    },
    {
      specId: 'SF_CROWN_NC_PAINT', specName: 'Crown Paint', domain: 'interior',
      totalHours: 1.5, phaseHours: { apply: 1.5 },
      tasks: [
        { taskId: 'TSK_CROWN_BRUSH_FINISH', taskLabel: 'Crown Finish', phase: 'apply', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' },
      ],
    },
    {
      specId: 'SF_CROWN_NC_STAIN', specName: 'Crown Stain', domain: 'interior',
      totalHours: 2.0, phaseHours: { apply: 2.0 },
      tasks: [
        { taskId: 'TSK_CROWN_STAIN_FINISH', taskLabel: 'Crown Stain Finish', phase: 'apply', hours: 2.0, roomIndex: 1, roomLabel: 'Master Bath' },
      ],
    },
  ];

  const perInputResults = [
    { roomIndex: 0, specId: 'SF_DRYWALL_CEILING_NC_PRIME', ctx: { prime_mode: 'combined', paintable_item: 'ceiling' } },
    { roomIndex: 0, specId: 'SF_BASEBOARD_NC_PAINT', ctx: { finish_group: 'A', pass_group_id: 'PG_TRIM_A', pass_group_substrates: ['baseboard', 'crown'], paintable_item: 'baseboard' } },
    { roomIndex: 0, specId: 'SF_CROWN_NC_PAINT', ctx: { finish_group: 'A', pass_group_id: 'PG_TRIM_A', pass_group_substrates: ['baseboard', 'crown'], paintable_item: 'crown' } },
    { roomIndex: 0, specId: 'SF_DRYWALL_WALL_NC_FINISH', ctx: { paintable_item: 'walls' } },
    { roomIndex: 1, specId: 'SF_DRYWALL_WALL_NC_FINISH', ctx: { paintable_item: 'walls' } },
    { roomIndex: 1, specId: 'SF_BASEBOARD_NC_PAINT', ctx: { paintable_item: 'baseboard' } },
    { roomIndex: 1, specId: 'SF_CROWN_NC_STAIN', ctx: { paintable_item: 'crown' } },
  ];

  const roomProtection = {
    0: {
      totalHours: 0.5,
      tasks: [
        { taskId: 'TSK_FLOOR_MASK_INSTALL', taskName: 'Floor Mask Install', phase: 'setup', hours: 0.3 },
        { taskId: 'TSK_FLOOR_MASK_REMOVE', taskName: 'Floor Mask Remove', phase: 'cleanup', hours: 0.2 },
      ],
    },
  };
  const fixtureProtection = {
    0: { totalHours: 0.2, tasks: [{ taskId: 'TSK_OUTLET_MASK', taskName: 'Outlet Mask', phase: 'setup', hours: 0.2 }] },
  };

  const pricing = {
    subtotal: 1570.0, mobilization: 150, travelCost: 75, bidPrice: 1795,
    lineItems: [
      { roomIndex: 0, specFamilyId: 'SF_DRYWALL_WALL_NC_FINISH', hours: 5.0, lineCost: 500 },
      { roomIndex: 1, specFamilyId: 'SF_DRYWALL_WALL_NC_FINISH', hours: 2.5, lineCost: 250 },
      { roomIndex: 0, specFamilyId: 'SF_DRYWALL_CEILING_NC_PRIME', hours: 1.5, lineCost: 150 },
      { roomIndex: 0, specFamilyId: 'SF_BASEBOARD_NC_PAINT', hours: 1.5, lineCost: 150 },
      { roomIndex: 1, specFamilyId: 'SF_BASEBOARD_NC_PAINT', hours: 1.0, lineCost: 100 },
      { roomIndex: 0, specFamilyId: 'SF_CROWN_NC_PAINT', hours: 1.5, lineCost: 150 },
      { roomIndex: 1, specFamilyId: 'SF_CROWN_NC_STAIN', hours: 2.0, lineCost: 200 },
      { roomIndex: 0, specFamilyId: 'SF_ROOM_PROTECTION', hours: 0.5, lineCost: 50 },
      { roomIndex: 0, specFamilyId: 'SF_FIXTURE_PROTECTION', hours: 0.2, lineCost: 20 },
    ],
  };

  return {
    project,
    estimateResult: {
      specResults, perInputResults, roomProtection, fixtureProtection, pricing,
      totalHours: 15.7, // walls(7.5) + ceiling(1.5) + baseboard(2.5) + crown_paint(1.5) + crown_stain(2.0) + protection(0.7)
    },
    expected: {
      totalHours: 15.7,
      totalDollars: 1570.0,
      setupDollars: 225, // mobilization + travel
    },
  };
}

// ============================================================
// Layer 1 — Scope Tree shape assertions
// ============================================================

export function runScopeTreeSmoke() {
  const c = new Checker();
  const { project, estimateResult, expected } = buildSyntheticEstimate();
  const tree = buildScopeTree(estimateResult, project);

  // 1. Totals roundtrip
  c.check('canonical: project.hours === sum of leaf hours',
    approxEq(tree.hours, sumLeaves(tree, 'hours')),
    `project=${tree.hours} leaves=${sumLeaves(tree, 'hours')}`);
  c.check('canonical: project.hours matches expected',
    approxEq(tree.hours, expected.totalHours),
    `project=${tree.hours} expected=${expected.totalHours}`);
  c.check('canonical: project.dollars === sum of leaf dollars',
    approxEq(tree.dollars, sumLeaves(tree, 'dollars'), 0.10),
    `project=${tree.dollars} leaves=${sumLeaves(tree, 'dollars')}`);
  c.check('canonical: project.dollars matches subtotal + setup ($1795)',
    approxEq(tree.dollars, expected.totalDollars + expected.setupDollars, 0.10),
    `project=${tree.dollars} expected=${expected.totalDollars + expected.setupDollars}`);

  // 2. Pivot orientations conserve totals
  const phaseTree = pivotTree(tree, 'phase');
  const elementTree = pivotTree(tree, 'element');
  c.check('phase orientation: total hours matches canonical', approxEq(phaseTree.hours, tree.hours));
  c.check('element orientation: total hours matches canonical', approxEq(elementTree.hours, tree.hours));
  c.check('phase orientation: total dollars matches canonical', approxEq(phaseTree.dollars, tree.dollars, 0.10));
  c.check('element orientation: total dollars matches canonical', approxEq(elementTree.dollars, tree.dollars, 0.10));

  // 3. Combined-prime annotation
  const livingRoom = findNode(tree, n => n.kind === 'room' && n.label === 'Living Room');
  const ceilingNode = livingRoom && findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'ceiling');
  const primePhase = ceilingNode && findNode(ceilingNode, n => n.kind === 'phase' && n.label.toLowerCase().includes('prime'));
  c.check('combined-prime annotation present on Ceiling > Prime phase',
    primePhase?.displayAnnotation === 'combined pass',
    `annotation=${primePhase?.displayAnnotation}`);

  // 4. Finish-group annotation
  const baseboardNode = livingRoom && findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'baseboard');
  const baseboardApply = baseboardNode && findNode(baseboardNode, n => n.kind === 'phase' && n.label.toLowerCase().includes('apply'));
  c.check('finish-group annotation present on Baseboard > Apply phase',
    baseboardApply?.displayAnnotation && baseboardApply.displayAnnotation.includes('crown'),
    `annotation=${baseboardApply?.displayAnnotation}`);

  // 5. Coating level — single coating suppresses
  const crownLR = livingRoom && findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'crown');
  const crownLRChildren = crownLR?.children?.map(x => x.kind) || [];
  c.check('canonical: Crown in Living Room has only Phase children (single coating)',
    crownLRChildren.every(k => k === 'phase'),
    `kinds=${JSON.stringify(crownLRChildren)}`);

  // Multi-coating exercise — same room, paint + stain
  const multi = buildScopeTree({
    specResults: [
      { specId: 'SF_CROWN_NC_PAINT', specName: 'Crown Paint',
        tasks: [{ taskId: 'TSK_CROWN_PAINT', taskLabel: 'Crown Paint', phase: 'apply', hours: 1.0, roomIndex: 0, roomLabel: 'Living Room' }] },
      { specId: 'SF_CROWN_NC_STAIN', specName: 'Crown Stain',
        tasks: [{ taskId: 'TSK_CROWN_STAIN', taskLabel: 'Crown Stain', phase: 'apply', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' }] },
    ],
    perInputResults: [
      { roomIndex: 0, specId: 'SF_CROWN_NC_PAINT', ctx: { paintable_item: 'crown' } },
      { roomIndex: 0, specId: 'SF_CROWN_NC_STAIN', ctx: { paintable_item: 'crown' } },
    ],
    roomProtection: {}, fixtureProtection: {}, pricing: null, totalHours: 2.5,
  }, { project_name: 'Multi', rooms: [{ id: 'r0', label: 'Living Room' }] });

  const multiCrown = findNode(multi, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'crown');
  const multiKinds = multiCrown?.children?.map(x => x.kind) || [];
  c.check('multi-coating: Crown with paint+stain in same room shows Coating level',
    multiKinds.includes('coating') && multiKinds.every(k => k === 'coating'),
    `kinds=${JSON.stringify(multiKinds)}`);
  c.check('multi-coating: Paint and Stain coating nodes both present',
    !!findNode(multiCrown, n => n.kind === 'coating' && n.label === 'Paint') &&
    !!findNode(multiCrown, n => n.kind === 'coating' && n.label === 'Stain'),
    '');

  // 6. Protection virtual element group
  const protectionGroup = livingRoom && findNode(livingRoom, n => n.kind === 'element_group' && n.label === 'Protection');
  c.check('Protection element group exists at level 3', protectionGroup?.level === 3, `level=${protectionGroup?.level}`);
  const protKinds = protectionGroup?.children?.map(x => x.kind) || [];
  c.check('Protection skips substrate level (children are phase nodes)',
    protKinds.length > 0 && protKinds.every(k => k === 'phase'),
    `kinds=${JSON.stringify(protKinds)}`);
  c.check('Protection groupKind set on element_group node',
    protectionGroup?.groupKind === 'protection');

  // 7. Project Setup sibling node
  const setupNode = findNode(tree, n => n.id === 'project-setup');
  c.check('Project Setup sibling node exists', !!setupNode);
  c.check('Project Setup at level 2 (sibling to rooms)', setupNode?.level === 2, `level=${setupNode?.level}`);
  c.check('Project Setup dollars === mobilization + travel',
    approxEq(setupNode?.dollars || 0, expected.setupDollars),
    `setup=${setupNode?.dollars} expected=${expected.setupDollars}`);
  const setupChildLabels = setupNode?.children?.map(x => x.label) || [];
  c.check('Project Setup contains Mobilization + Travel children',
    setupChildLabels.includes('Mobilization') && setupChildLabels.includes('Travel'),
    `children=${JSON.stringify(setupChildLabels)}`);

  return summarize(c.results);
}

// ============================================================
// Layer 2 — Bundle-shape invariants (cascade safety)
// ============================================================
//
// Apply pending drafts on top of canonical to get the hypothetical
// post-publish bundle, then check that the reference graph is intact.
// These catch cascade operations (rename, archive, bulk transform) that
// could break references silently.

export function applyDraftsToBundle(canonical, drafts = {}) {
  const tasks = { ...(canonical.tasks || {}) };
  const modules = { ...(canonical.modules || {}) };
  const scenarios = Array.isArray(canonical.scenarios)
    ? [...canonical.scenarios]
    : Object.values(canonical.scenarios || {});

  for (const d of drafts.tasks || []) {
    const id = d.id || d.payload?.task_id;
    if (!id) continue;
    tasks[id] = d.payload || d;
  }
  for (const d of drafts.modules || []) {
    const id = d.id || d.payload?.module_id;
    if (!id) continue;
    modules[id] = d.payload || d;
  }
  // Scenarios: replace by scenario_id, append if new
  const scnIndex = new Map(scenarios.map((s, i) => [s.scenario_id, i]));
  for (const d of drafts.scenarios || []) {
    const payload = d.payload || d;
    const id = payload.scenario_id;
    if (!id) continue;
    if (scnIndex.has(id)) scenarios[scnIndex.get(id)] = payload;
    else scenarios.push(payload);
  }
  return { tasks, modules, scenarios };
}

export function runBundleShapeSmoke(canonical, drafts = {}) {
  const c = new Checker();
  const merged = applyDraftsToBundle(canonical, drafts);

  // Invariant 1: every task_ref in every module resolves (HARD — rename
  // that missed a module / archive of a still-referenced task)
  c.safe('every task_ref in modules resolves to an existing task', () => {
    const orphans = [];
    for (const mod of Object.values(merged.modules)) {
      for (const entry of mod.tasks || []) {
        if (entry?.task_ref && !merged.tasks[entry.task_ref]) {
          orphans.push(`${mod.module_id}.tasks → ${entry.task_ref}`);
          if (orphans.length >= 5) break;
        }
      }
      if (orphans.length >= 5) break;
    }
    return orphans.length === 0
      ? true
      : { ok: false, detail: `orphan refs: ${orphans.slice(0, 5).join('; ')}${orphans.length === 5 ? '…' : ''}` };
  });

  // Invariant 2: every module_id in scenario.modules[] resolves (HARD —
  // module archived without scenario cleanup)
  c.safe('every module_id in scenarios resolves to an existing module', () => {
    const orphans = [];
    for (const scn of merged.scenarios) {
      for (const modId of scn.modules || []) {
        if (typeof modId === 'string' && !merged.modules[modId]) {
          orphans.push(`${scn.scenario_id} → ${modId}`);
          if (orphans.length >= 5) break;
        }
      }
      if (orphans.length >= 5) break;
    }
    return orphans.length === 0
      ? true
      : { ok: false, detail: `orphan refs: ${orphans.slice(0, 5).join('; ')}${orphans.length === 5 ? '…' : ''}` };
  });

  // Invariant 3: no orphan modules (WARN — useful signal, but post-
  // consolidation the catalog has many legitimately-unreferenced
  // modules; don't block publish on this)
  c.safe('no orphan modules (every module referenced by a scenario)', () => {
    const referenced = new Set();
    for (const scn of merged.scenarios) {
      for (const modId of scn.modules || []) {
        if (typeof modId === 'string') referenced.add(modId);
      }
    }
    const orphans = Object.keys(merged.modules).filter(id => !referenced.has(id));
    return orphans.length === 0
      ? true
      : { ok: false, detail: `${orphans.length} orphans: ${orphans.slice(0, 5).join(', ')}${orphans.length > 5 ? '…' : ''}` };
  }, 'warn');

  // Invariant 4: no duplicate task IDs in drafts (HARD — rename collision)
  c.safe('no duplicate task IDs in drafts', () => {
    const seen = new Set();
    const dupes = [];
    for (const d of drafts.tasks || []) {
      const id = d.id || d.payload?.task_id;
      if (!id) continue;
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    return dupes.length === 0
      ? true
      : { ok: false, detail: `dupes: ${dupes.join(', ')}` };
  });

  return summarize(c.results);
}

// ============================================================
// Combined entry point
// ============================================================

/**
 * Run scope-tree + bundle-shape smoke. Used by DraftsView before publish.
 *
 * @param {object} opts
 * @param {object} opts.canonicalBundle - { tasks, modules, scenarios }
 * @param {object} [opts.drafts] - { tasks: [], modules: [], scenarios: [] } pending drafts
 * @returns {{ pass, fail, total, results: [{label, ok, detail}] }}
 */
export function runSmoke({ canonicalBundle, drafts } = {}) {
  const scopeTree = runScopeTreeSmoke();
  const bundle = canonicalBundle ? runBundleShapeSmoke(canonicalBundle, drafts) : { results: [] };
  const all = [...scopeTree.results, ...bundle.results];
  return summarize(all);
}
