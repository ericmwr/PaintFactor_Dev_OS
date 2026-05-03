// Smoke: Scope Tree Phase 1 data layer.
//
// Verifies buildScopeTree + pivotTree against the framework's Phase 1
// requirements (project_scope_tree.md v1.0):
//   1. Totals roundtrip — project hours/dollars === sum of leaf hours/dollars
//   2. Same totals in every view orientation (room/phase/element)
//   3. Annotation fires for combined-prime activations
//   4. Annotation fires for finish-group activations
//   5. Coating level inserted ONLY when a substrate carries multiple coatings
//   6. Protection routes to a virtual Element Group at level 3, skipping Substrate
//   7. Project Setup sibling node sources mobilization + travel from pricing
//
// Synthetic but realistic engine output — exercises the full builder shape
// without booting the scenario engine. The shapes mirror useEstimateScenario's
// hook return.

import { buildScopeTree, pivotTree } from '../tools/paintscope/src/engine/scope-tree.js';

let pass = 0;
let fail = 0;
const results = [];

function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  if (ok) pass++;
  else fail++;
}

function approxEq(a, b, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

// ------------------------------------------------------------
// Synthetic engine output
// ------------------------------------------------------------
// Two rooms:
//   Room 0 — Living Room: walls, ceiling (combined prime), baseboard (paint), crown (paint)
//   Room 1 — Master Bath: walls, baseboard (paint), crown (STAIN)
// Crown has paint in Room 0 + stain in Room 1 → triggers Coating level on Crown substrate.
// Baseboard has paint in both rooms only → Coating level suppressed.
// Walls + Ceiling combined-prime in Room 0 → 'combined pass' annotation on ceiling Prime phase.
// Baseboard finish-grouped with Crown in Room 0 → 'grouped with crown' on baseboard Apply phase.

const project = {
  project_name: 'Smoke Test Project',
  rooms: [
    { id: 'r0', label: 'Living Room' },
    { id: 'r1', label: 'Master Bath' },
  ],
};

const specResults = [
  {
    specId: 'SF_DRYWALL_WALL_NC_FINISH',
    specName: 'Drywall Wall Finish',
    domain: 'interior',
    totalHours: 5.0,
    phaseHours: { prep: 1.0, apply: 4.0 },
    tasks: [
      { taskId: 'TSK_PREP_WALL', taskLabel: 'Wall Prep', phase: 'prep', hours: 1.0, roomIndex: 0, roomLabel: 'Living Room' },
      { taskId: 'TSK_ROLL_WALL', taskLabel: 'Roll Walls', phase: 'apply', hours: 4.0, roomIndex: 0, roomLabel: 'Living Room' },
      { taskId: 'TSK_PREP_WALL', taskLabel: 'Wall Prep', phase: 'prep', hours: 0.5, roomIndex: 1, roomLabel: 'Master Bath' },
      { taskId: 'TSK_ROLL_WALL', taskLabel: 'Roll Walls', phase: 'apply', hours: 2.0, roomIndex: 1, roomLabel: 'Master Bath' },
    ],
  },
  {
    specId: 'SF_DRYWALL_CEILING_NC_PRIME',
    specName: 'Drywall Ceiling Prime',
    domain: 'interior',
    totalHours: 1.5,
    phaseHours: { prime: 1.5 },
    tasks: [
      { taskId: 'TSK_PRIME_CEILING', taskLabel: 'Prime Ceiling', phase: 'prime', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' },
    ],
  },
  {
    specId: 'SF_BASEBOARD_NC_PAINT',
    specName: 'Baseboard Paint',
    domain: 'interior',
    totalHours: 2.5,
    phaseHours: { prep: 0.5, apply: 2.0 },
    tasks: [
      { taskId: 'TSK_BASEBOARD_PREP', taskLabel: 'Baseboard Prep', phase: 'prep', hours: 0.3, roomIndex: 0, roomLabel: 'Living Room' },
      { taskId: 'TSK_BASEBOARD_BRUSH_FINISH', taskLabel: 'Baseboard Finish', phase: 'apply', hours: 1.2, roomIndex: 0, roomLabel: 'Living Room' },
      { taskId: 'TSK_BASEBOARD_PREP', taskLabel: 'Baseboard Prep', phase: 'prep', hours: 0.2, roomIndex: 1, roomLabel: 'Master Bath' },
      { taskId: 'TSK_BASEBOARD_BRUSH_FINISH', taskLabel: 'Baseboard Finish', phase: 'apply', hours: 0.8, roomIndex: 1, roomLabel: 'Master Bath' },
    ],
  },
  {
    specId: 'SF_CROWN_NC_PAINT',
    specName: 'Crown Paint',
    domain: 'interior',
    totalHours: 1.5,
    phaseHours: { apply: 1.5 },
    tasks: [
      { taskId: 'TSK_CROWN_BRUSH_FINISH', taskLabel: 'Crown Finish', phase: 'apply', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' },
    ],
  },
  {
    specId: 'SF_CROWN_NC_STAIN',
    specName: 'Crown Stain',
    domain: 'interior',
    totalHours: 2.0,
    phaseHours: { apply: 2.0 },
    tasks: [
      { taskId: 'TSK_CROWN_STAIN_FINISH', taskLabel: 'Crown Stain Finish', phase: 'apply', hours: 2.0, roomIndex: 1, roomLabel: 'Master Bath' },
    ],
  },
];

// perInputResults — preserves ctx for annotations
const perInputResults = [
  // Combined-prime activation: ceiling primed alongside walls
  {
    roomIndex: 0,
    specId: 'SF_DRYWALL_CEILING_NC_PRIME',
    ctx: { prime_mode: 'combined', paintable_item: 'ceiling' },
  },
  // Finish-group activation: baseboard grouped with crown
  {
    roomIndex: 0,
    specId: 'SF_BASEBOARD_NC_PAINT',
    ctx: {
      finish_group: 'A',
      pass_group_id: 'PG_TRIM_A',
      pass_group_substrates: ['baseboard', 'crown'],
      paintable_item: 'baseboard',
    },
  },
  {
    roomIndex: 0,
    specId: 'SF_CROWN_NC_PAINT',
    ctx: {
      finish_group: 'A',
      pass_group_id: 'PG_TRIM_A',
      pass_group_substrates: ['baseboard', 'crown'],
      paintable_item: 'crown',
    },
  },
  // Plain activations (no annotations)
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
  0: {
    totalHours: 0.2,
    tasks: [
      { taskId: 'TSK_OUTLET_MASK', taskName: 'Outlet Mask', phase: 'setup', hours: 0.2 },
    ],
  },
};

// Hours sum: walls(7.5) + ceiling(1.5) + baseboard(2.5) + crown_paint(1.5) + crown_stain(2.0)
//          = 15.0 from specResults
//          + roomProtection 0.5 + fixtureProtection 0.2 = 15.7 total
const expectedTotalHours = 15.7;

const pricing = {
  subtotal: 1570.0,            // $100/hr blended on 15.7 hrs
  mobilization: 150,
  travelCost: 75,
  bidPrice: 1795,
  lineItems: [
    // Per (roomIndex, specFamilyId) — engine emits these
    { roomIndex: 0, specFamilyId: 'SF_DRYWALL_WALL_NC_FINISH', hours: 5.0,  lineCost: 500 },
    { roomIndex: 1, specFamilyId: 'SF_DRYWALL_WALL_NC_FINISH', hours: 2.5,  lineCost: 250 },
    { roomIndex: 0, specFamilyId: 'SF_DRYWALL_CEILING_NC_PRIME', hours: 1.5, lineCost: 150 },
    { roomIndex: 0, specFamilyId: 'SF_BASEBOARD_NC_PAINT', hours: 1.5, lineCost: 150 },
    { roomIndex: 1, specFamilyId: 'SF_BASEBOARD_NC_PAINT', hours: 1.0, lineCost: 100 },
    { roomIndex: 0, specFamilyId: 'SF_CROWN_NC_PAINT', hours: 1.5, lineCost: 150 },
    { roomIndex: 1, specFamilyId: 'SF_CROWN_NC_STAIN', hours: 2.0, lineCost: 200 },
    // Protection lines
    { roomIndex: 0, specFamilyId: 'SF_ROOM_PROTECTION', hours: 0.5, lineCost: 50 },
    { roomIndex: 0, specFamilyId: 'SF_FIXTURE_PROTECTION', hours: 0.2, lineCost: 20 },
  ],
};
const expectedTotalDollars = 1570.0; // sum of leaf lineCosts
const expectedSetupDollars = pricing.mobilization + pricing.travelCost; // 225

const estimateResult = {
  specResults,
  perInputResults,
  roomProtection,
  fixtureProtection,
  pricing,
  totalHours: expectedTotalHours,
};

// ------------------------------------------------------------
// Build canonical tree
// ------------------------------------------------------------
const tree = buildScopeTree(estimateResult, project);

// 1. Totals roundtrip
function sumLeaves(node, key) {
  if (node.kind === 'task') return node[key] || 0;
  return (node.children || []).reduce((s, c) => s + sumLeaves(c, key), 0);
}
const projectHours = tree.hours;
const projectDollars = tree.dollars;
const leafHoursSum = sumLeaves(tree, 'hours');
const leafDollarsSum = sumLeaves(tree, 'dollars');

check('canonical: project.hours === sum of leaf hours',
  approxEq(projectHours, leafHoursSum),
  `project=${projectHours} leaves=${leafHoursSum}`);
check('canonical: project.hours matches expected',
  approxEq(projectHours, expectedTotalHours),
  `project=${projectHours} expected=${expectedTotalHours}`);
check('canonical: project.dollars === sum of leaf dollars',
  approxEq(projectDollars, leafDollarsSum, 0.10),
  `project=${projectDollars} leaves=${leafDollarsSum}`);
check('canonical: project.dollars matches subtotal + setup ($1795)',
  approxEq(projectDollars, expectedTotalDollars + expectedSetupDollars, 0.10),
  `project=${projectDollars} expected=${expectedTotalDollars + expectedSetupDollars}`);

// 2. Same totals in phase + element orientations
const phaseTree = pivotTree(tree, 'phase');
const elementTree = pivotTree(tree, 'element');
check('phase orientation: total hours matches canonical',
  approxEq(phaseTree.hours, projectHours),
  `phase=${phaseTree.hours} canonical=${projectHours}`);
check('element orientation: total hours matches canonical',
  approxEq(elementTree.hours, projectHours),
  `element=${elementTree.hours} canonical=${projectHours}`);
check('phase orientation: total dollars matches canonical',
  approxEq(phaseTree.dollars, projectDollars, 0.10),
  `phase=${phaseTree.dollars} canonical=${projectDollars}`);
check('element orientation: total dollars matches canonical',
  approxEq(elementTree.dollars, projectDollars, 0.10),
  `element=${elementTree.dollars} canonical=${projectDollars}`);

// 3. Combined-prime annotation — Living Room → Surfaces → Ceiling → Prime phase
function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const c of node.children || []) {
    const hit = findNode(c, predicate);
    if (hit) return hit;
  }
  return null;
}

const livingRoom = findNode(tree, n => n.kind === 'room' && n.label === 'Living Room');
const ceilingNode = livingRoom ? findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'ceiling') : null;
const primePhaseNode = ceilingNode ? findNode(ceilingNode, n => n.kind === 'phase' && n.label.toLowerCase().includes('prime')) : null;
check('combined-prime annotation present on Ceiling > Prime phase',
  primePhaseNode?.displayAnnotation === 'combined pass',
  `annotation=${primePhaseNode?.displayAnnotation}`);

// 4. Finish-group annotation — Living Room → Trim → Baseboard → Apply phase
const baseboardNode = livingRoom ? findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'baseboard') : null;
const baseboardApply = baseboardNode ? findNode(baseboardNode, n => n.kind === 'phase' && n.label.toLowerCase().includes('apply')) : null;
check('finish-group annotation present on Baseboard > Apply phase',
  baseboardApply?.displayAnnotation && baseboardApply.displayAnnotation.includes('crown'),
  `annotation=${baseboardApply?.displayAnnotation}`);

// 5. Coating level conditional
// Crown has paint (Room 0) + stain (Room 1). Element-orientation walks Element Group → Substrate → Room → Phase
// (Coating is not a separate level in pivoted views; it's only in canonical Room view).
// In canonical: at Master Bath → Trim → Crown, both paint+stain coexist? No — stain is in Master Bath only.
// In Living Room → Trim → Crown, ONLY paint exists. So coating level should NOT appear there.
// To get coating level visible, look at element-orientation's Crown node which aggregates BOTH rooms.
// Element-view structure: Trim element_group → Crown substrate → Room → Phase.
// But coating level is canonical-only per design. Verify canonical: Crown in each room has 1 coating only,
// so neither room's Crown should have a coating level. Stain coating should still exist via stain spec.

const crownLR = livingRoom ? findNode(livingRoom, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'crown') : null;
const crownLRChildren = crownLR?.children?.map(c => c.kind) || [];
check('canonical: Crown in Living Room has only Phase children (single coating)',
  crownLRChildren.every(k => k === 'phase'),
  `children kinds=${JSON.stringify(crownLRChildren)}`);

// To exercise the multi-coating path, build a single-room tree where one room has both crown paint AND stain
const multiCoatingResult = {
  ...estimateResult,
  specResults: [
    {
      specId: 'SF_CROWN_NC_PAINT',
      specName: 'Crown Paint',
      tasks: [{ taskId: 'TSK_CROWN_PAINT', taskLabel: 'Crown Paint', phase: 'apply', hours: 1.0, roomIndex: 0, roomLabel: 'Living Room' }],
      totalHours: 1.0,
      phaseHours: { apply: 1.0 },
    },
    {
      specId: 'SF_CROWN_NC_STAIN',
      specName: 'Crown Stain',
      tasks: [{ taskId: 'TSK_CROWN_STAIN', taskLabel: 'Crown Stain', phase: 'apply', hours: 1.5, roomIndex: 0, roomLabel: 'Living Room' }],
      totalHours: 1.5,
      phaseHours: { apply: 1.5 },
    },
  ],
  perInputResults: [
    { roomIndex: 0, specId: 'SF_CROWN_NC_PAINT', ctx: { paintable_item: 'crown' } },
    { roomIndex: 0, specId: 'SF_CROWN_NC_STAIN', ctx: { paintable_item: 'crown' } },
  ],
  roomProtection: {},
  fixtureProtection: {},
  pricing: null,
  totalHours: 2.5,
};
const multiTree = buildScopeTree(multiCoatingResult, { project_name: 'Multi', rooms: [{ id: 'r0', label: 'Living Room' }] });
const multiCrown = findNode(multiTree, n => n.kind === 'substrate' && n.substrateMeta?.substrateId === 'crown');
const multiCrownChildren = multiCrown?.children?.map(c => c.kind) || [];
check('multi-coating: Crown with paint+stain in same room shows Coating level',
  multiCrownChildren.includes('coating') && multiCrownChildren.every(k => k === 'coating'),
  `children kinds=${JSON.stringify(multiCrownChildren)}`);
const multiCoatingPaint = multiCrown ? findNode(multiCrown, n => n.kind === 'coating' && n.label === 'Paint') : null;
const multiCoatingStain = multiCrown ? findNode(multiCrown, n => n.kind === 'coating' && n.label === 'Stain') : null;
check('multi-coating: Paint and Stain coating nodes both present',
  multiCoatingPaint && multiCoatingStain,
  `paint=${!!multiCoatingPaint} stain=${!!multiCoatingStain}`);

// 6. Protection routes to virtual element group, skips substrate
const protectionGroup = livingRoom ? findNode(livingRoom, n => n.kind === 'element_group' && n.label === 'Protection') : null;
check('Protection element group exists at level 3', protectionGroup?.level === 3, `level=${protectionGroup?.level}`);
const protChildKinds = protectionGroup?.children?.map(c => c.kind) || [];
check('Protection skips substrate level (children are phase nodes)',
  protChildKinds.length > 0 && protChildKinds.every(k => k === 'phase'),
  `child kinds=${JSON.stringify(protChildKinds)}`);
check('Protection groupKind set on element_group node',
  protectionGroup?.groupKind === 'protection',
  `groupKind=${protectionGroup?.groupKind}`);

// 7. Project Setup sibling node
const setupNode = findNode(tree, n => n.id === 'project-setup');
check('Project Setup sibling node exists', !!setupNode, `id=${setupNode?.id}`);
check('Project Setup at level 2 (sibling to rooms)', setupNode?.level === 2, `level=${setupNode?.level}`);
check('Project Setup dollars === mobilization + travel',
  approxEq(setupNode?.dollars || 0, expectedSetupDollars),
  `setup=${setupNode?.dollars} expected=${expectedSetupDollars}`);
const setupChildLabels = setupNode?.children?.map(c => c.label) || [];
check('Project Setup contains Mobilization + Travel children',
  setupChildLabels.includes('Mobilization') && setupChildLabels.includes('Travel'),
  `children=${JSON.stringify(setupChildLabels)}`);

// ------------------------------------------------------------
// Report
// ------------------------------------------------------------
console.log('\n=== Scope Tree Phase 1 Smoke ===\n');
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const detail = r.ok ? '' : `   → ${r.detail}`;
  console.log(`  ${mark} ${r.label}${detail}`);
}
console.log(`\n${pass}/${pass + fail} passed`);

if (fail > 0) {
  console.log('\n--- Canonical tree shape (first 2 levels) ---');
  console.log(JSON.stringify({
    label: tree.label,
    hours: tree.hours,
    dollars: tree.dollars,
    children: tree.children.map(c => ({
      label: c.label,
      kind: c.kind,
      level: c.level,
      hours: c.hours,
      dollars: c.dollars,
      childCount: c.children.length,
    })),
  }, null, 2));
  process.exit(1);
}
process.exit(0);
