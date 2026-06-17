// Scope Tree — view-model layer producing a canonical hierarchical
// representation of scenario-engine output. Pure data structure consumed
// by Estimate, Proposal, Field Tracker, Diagnostic, and future surfaces.
//
// Framework reference: project_scope_tree.md v1.0 (Phase 1 data layer).
//
// Hierarchy (canonical, Room-oriented):
//   Project (1)
//   ├─ Project Setup (2, sibling of Room)            ← mobilization/travel
//   └─ Room (2)
//      └─ Element Group (3)                          ← Surfaces / Trim / etc.
//         └─ Substrate (4)                           ← skipped under Protection
//            └─ [Coating (5)]                        ← only when >1 coating present
//               └─ Phase (6)                         ← setup / prep / prime / apply / interstage / cleanup
//                  └─ Task (7)
//
// pivotTree(canonical, orientation) re-buckets the same leaves under
// 'phase' or 'element' orientation, suppressing Coating in non-Room views.

import { SUBSTRATE_MAP } from '../data/substrate-catalog.js';
import { SPEC_SUBSTRATE_MAP } from '../data/scenario-maps.js';

const PHASE_ORDER = ['setup', 'protection', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];
const PHASE_ORDER_INDEX = Object.fromEntries(PHASE_ORDER.map((p, i) => [p, i]));
const PHASE_LABELS = {
  setup:      'Setup',
  protection: 'Protection',
  prep:       'Prep',
  prime:      'Prime',
  apply:      'Apply',
  interstage: 'Between Coats',
  finish:     'Finish',
  cleanup:    'Cleanup',
};

const ELEMENT_GROUP_ORDER = ['Surfaces', 'Trim', 'Doors & Windows', 'Specialty', 'Cabinets', 'Stairway', 'Protection'];

const COATING_ORDER = ['paint', 'stain', 'clear'];
const COATING_LABELS = { paint: 'Paint', stain: 'Stain', clear: 'Clear' };

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Build the canonical Room-oriented Scope Tree from scenario-engine output.
 *
 * @param {object} estimateResult - hook return shape from useEstimateScenario:
 *   { specResults, perInputResults, roomProtection, fixtureProtection, pricing, totalHours }
 * @param {object} project - project record (project_name, rooms[])
 * @returns {ScopeTreeNode} root project node with rolled-up totals
 */
export function buildScopeTree(estimateResult, project = {}) {
  const {
    specResults = [],
    perInputResults = [],
    roomProtection = {},
    fixtureProtection = {},
    pricing = null,
    totalHours = 0,
  } = estimateResult || {};

  const rooms = project.rooms || [];
  const dollarPerHr = buildDollarAllocator(pricing, totalHours);

  // (roomIndex, specId) → ctx — for combined-prime and finish-group annotations
  const ctxByRoomSpec = new Map();
  for (const pr of perInputResults) {
    const key = `${pr.roomIndex}|${pr.specId}`;
    if (!ctxByRoomSpec.has(key)) ctxByRoomSpec.set(key, pr.ctx);
  }

  // Flatten every task into a normalized leaf record carrying its full
  // categorical metadata (room/group/substrate/coating/phase). pivotTree
  // re-buckets these same leaves under different axis orders.
  const leaves = [];

  for (const sr of specResults) {
    const isProtection = isProtectionSpec(sr.specId);
    const substrate = isProtection ? null : deriveSubstrate(sr.specId);
    const elementGroup = isProtection ? 'Protection' : (substrate ? SUBSTRATE_MAP[substrate]?.group || 'Specialty' : 'Specialty');
    const coating = isProtection ? null : deriveCoating(sr.specId);

    for (const t of sr.tasks || []) {
      const phase = (t.phase || 'apply').toLowerCase();
      const hours = t.hours || 0;
      const ri = t.roomIndex;
      leaves.push({
        roomIndex: ri,
        roomLabel: t.roomLabel || rooms[ri]?.label || `Room ${ri + 1}`,
        elementGroup,
        substrate,
        coating,
        phase,
        taskId: t.taskId,
        taskLabel: t.taskName || t.taskLabel || t.taskId,
        hours,
        dollars: round2(hours * dollarPerHr(ri, sr.specId)),
        specId: sr.specId,
        specName: sr.specName,
        ctx: ctxByRoomSpec.get(`${ri}|${sr.specId}`) || null,
        band: t.band || null,
      });
    }
  }

  // Floor + fixture protection — route to virtual Protection element group
  pushProtectionLeaves(leaves, roomProtection, 'SF_ROOM_PROTECTION', 'Room Protection', rooms, dollarPerHr);
  pushProtectionLeaves(leaves, fixtureProtection, 'SF_FIXTURE_PROTECTION', 'Fixture Protection', rooms, dollarPerHr);

  const roomNodes = bucketByRoom(leaves, rooms);
  const projectSetup = buildProjectSetup(pricing);

  const root = {
    id: 'project',
    label: project.project_name || project.name || 'Project',
    level: 1,
    kind: 'project',
    hours: 0,
    dollars: 0,
    children: projectSetup ? [projectSetup, ...roomNodes] : roomNodes,
  };

  rollupTotals(root);
  applyAnnotations(root);
  return root;
}

/**
 * Re-bucket the canonical tree under a different primary axis.
 * Coating is suppressed in non-room orientations (paint/stain coexist
 * naturally within their phase buckets).
 *
 * @param {ScopeTreeNode} canonicalTree - output of buildScopeTree
 * @param {'room'|'phase'|'element'} orientation
 * @returns {ScopeTreeNode}
 */
export function pivotTree(canonicalTree, orientation = 'room') {
  if (orientation === 'room') return canonicalTree;
  const leaves = collectLeaves(canonicalTree);
  if (orientation === 'phase') {
    return buildOrientedTree(leaves, ['phase', 'elementGroup', 'substrate', 'room'], canonicalTree);
  }
  if (orientation === 'element') {
    return buildOrientedTree(leaves, ['elementGroup', 'substrate', 'room', 'phase'], canonicalTree);
  }
  throw new Error(`Unknown orientation: ${orientation}`);
}

// ============================================================
// LEAF EXTRACTION & ROUTING
// ============================================================

function isProtectionSpec(specId) {
  return specId === 'SF_ROOM_PROTECTION' || specId === 'SF_FIXTURE_PROTECTION';
}

function deriveSubstrate(specId) {
  if (SPEC_SUBSTRATE_MAP[specId]) return SPEC_SUBSTRATE_MAP[specId];
  const base = specId.replace(/_v\d+$/, '');
  return SPEC_SUBSTRATE_MAP[base] || null;
}

function deriveCoating(specId) {
  if (/_STAIN(?:_v\d+)?$/.test(specId)) return 'stain';
  if (/_CLEAR(?:_v\d+)?$/.test(specId)) return 'clear';
  return 'paint';
}

function pushProtectionLeaves(leaves, byRoom, specId, specName, rooms, dollarPerHr) {
  for (const [riStr, bundle] of Object.entries(byRoom || {})) {
    const ri = Number(riStr);
    for (const t of bundle.tasks || []) {
      const hours = t.hours || 0;
      leaves.push({
        roomIndex: ri,
        roomLabel: rooms[ri]?.label || `Room ${ri + 1}`,
        elementGroup: 'Protection',
        substrate: null,
        coating: null,
        phase: (t.phase || 'protection').toLowerCase(),
        taskId: t.taskId,
        taskLabel: t.taskName || t.taskId,
        hours,
        dollars: round2(hours * dollarPerHr(ri, specId)),
        specId,
        specName,
        ctx: null,
        band: null,
      });
    }
  }
}

// ============================================================
// PRICING ALLOCATOR
// ============================================================
// Derive per-(room, spec) $/hr from pricing.lineItems when available;
// fall back to a project-wide rate. Returns 0 when pricing missing
// (matches engine behavior — Estimate renders without pricing too).

function buildDollarAllocator(pricing, totalHours) {
  if (!pricing) return () => 0;
  const lineRates = new Map();
  for (const li of pricing.lineItems || []) {
    if ((li.hours || 0) > 0) {
      lineRates.set(`${li.roomIndex}|${li.specFamilyId}`, li.lineCost / li.hours);
    }
  }
  const fallback = totalHours > 0 ? (pricing.subtotal || 0) / totalHours : 0;
  return (roomIndex, specId) => {
    const r = lineRates.get(`${roomIndex}|${specId}`);
    return r != null ? r : fallback;
  };
}

// ============================================================
// PROJECT SETUP NODE (sibling to rooms)
// ============================================================

function buildProjectSetup(pricing) {
  if (!pricing) return null;
  const children = [];
  if ((pricing.mobilization || 0) > 0) {
    children.push(taskNode('project-setup__mobilization', 'Mobilization', 0, pricing.mobilization));
  }
  if ((pricing.travelCost || 0) > 0) {
    children.push(taskNode('project-setup__travel', 'Travel', 0, pricing.travelCost));
  }
  if (children.length === 0) return null;
  return {
    id: 'project-setup',
    label: 'Project Setup',
    level: 2,
    kind: 'room',
    groupKind: 'project_setup',
    hours: 0,
    dollars: 0,
    children,
  };
}

function taskNode(id, label, hours, dollars, taskMeta = null) {
  const node = { id, label, level: 7, kind: 'task', hours: round2(hours), dollars: round2(dollars), children: [] };
  if (taskMeta) node.taskMeta = taskMeta;
  return node;
}

// ============================================================
// CANONICAL ROOM-ORIENTED BUCKETING
// ============================================================

function bucketByRoom(leaves, rooms) {
  const byRoom = groupBy(leaves, l => l.roomIndex);
  const sortedRoomIndices = [...byRoom.keys()].sort((a, b) => a - b);
  return sortedRoomIndices.map(ri => {
    const ls = byRoom.get(ri);
    const label = ls[0].roomLabel || rooms[ri]?.label || `Room ${ri + 1}`;
    return {
      id: `room-${ri}`,
      label,
      level: 2,
      kind: 'room',
      hours: 0,
      dollars: 0,
      children: bucketElementGroups(ls, `room-${ri}`),
    };
  });
}

function bucketElementGroups(leaves, parentId) {
  const byGroup = groupBy(leaves, l => l.elementGroup || 'Specialty');
  const result = [];
  for (const group of ELEMENT_GROUP_ORDER) {
    if (!byGroup.has(group)) continue;
    const groupLeaves = byGroup.get(group);
    const isProtection = group === 'Protection';
    const id = `${parentId}__group-${slug(group)}`;
    result.push({
      id,
      label: group,
      level: 3,
      kind: 'element_group',
      groupKind: isProtection ? 'protection' : undefined,
      hours: 0,
      dollars: 0,
      children: isProtection
        ? bucketPhases(groupLeaves, id)             // Protection skips substrate+coating
        : bucketSubstrates(groupLeaves, id),
    });
  }
  return result;
}

function bucketSubstrates(leaves, parentId) {
  const bySubstrate = groupBy(leaves, l => l.substrate || 'unknown');
  const result = [];
  for (const [substrateId, subLeaves] of bySubstrate) {
    const meta = SUBSTRATE_MAP[substrateId];
    const id = `${parentId}__sub-${substrateId}`;
    const coatings = new Set(subLeaves.map(l => l.coating || 'paint'));
    const children = coatings.size > 1
      ? bucketCoatings(subLeaves, id)
      : bucketPhases(subLeaves, id);
    result.push({
      id,
      label: meta?.label || substrateId,
      level: 4,
      kind: 'substrate',
      substrateMeta: { substrateId },
      hours: 0,
      dollars: 0,
      children,
    });
  }
  return result;
}

function bucketCoatings(leaves, parentId) {
  const byCoating = groupBy(leaves, l => l.coating || 'paint');
  const result = [];
  for (const c of COATING_ORDER) {
    if (!byCoating.has(c)) continue;
    const id = `${parentId}__coat-${c}`;
    result.push({
      id,
      label: COATING_LABELS[c] || c,
      level: 5,
      kind: 'coating',
      hours: 0,
      dollars: 0,
      children: bucketPhases(byCoating.get(c), id),
    });
  }
  return result;
}

function bucketPhases(leaves, parentId) {
  const byPhase = groupBy(leaves, l => l.phase || 'apply');
  const phases = [...byPhase.keys()].sort((a, b) =>
    (PHASE_ORDER_INDEX[a] ?? 99) - (PHASE_ORDER_INDEX[b] ?? 99)
  );
  return phases.map(phase => {
    const id = `${parentId}__phase-${phase}`;
    return {
      id,
      label: PHASE_LABELS[phase] || phase,
      level: 6,
      kind: 'phase',
      hours: 0,
      dollars: 0,
      children: bucketTasks(byPhase.get(phase), id),
    };
  });
}

function bucketTasks(leaves, parentId) {
  return leaves.map((l, i) => ({
    id: `${parentId}__task-${l.taskId || 'unknown'}-${i}`,
    label: l.taskLabel,
    level: 7,
    kind: 'task',
    hours: round2(l.hours),
    dollars: round2(l.dollars),
    taskMeta: {
      taskId: l.taskId,
      ctx: l.ctx,
      band: l.band,
      specId: l.specId,
      specName: l.specName,
      roomIndex: l.roomIndex,
      roomLabel: l.roomLabel,
      elementGroup: l.elementGroup,
      substrate: l.substrate,
      coating: l.coating,
      phase: l.phase,
    },
    children: [],
  }));
}

// ============================================================
// ROLL-UP & ANNOTATIONS
// ============================================================

function rollupTotals(node) {
  if (!node.children || node.children.length === 0) {
    node.hours = round2(node.hours || 0);
    node.dollars = round2(node.dollars || 0);
    return;
  }
  let h = 0, d = 0;
  for (const c of node.children) {
    rollupTotals(c);
    h += c.hours;
    d += c.dollars;
  }
  node.hours = round2(h);
  node.dollars = round2(d);
}

// Walk every Phase node; consult the ctx of one of its tasks to attach a
// displayAnnotation when the engine flagged combined-pass execution.
function applyAnnotations(node) {
  if (node.kind === 'phase') {
    const ctx = firstTaskCtx(node);
    if (ctx) {
      const a = phaseAnnotation(ctx, node);
      if (a) node.displayAnnotation = a;
    }
  }
  for (const c of node.children || []) applyAnnotations(c);
}

function firstTaskCtx(phaseNode) {
  for (const c of phaseNode.children || []) {
    if (c.kind === 'task' && c.taskMeta?.ctx) return c.taskMeta.ctx;
  }
  return null;
}

function phaseAnnotation(ctx, phaseNode) {
  const phase = phaseNode.label.toLowerCase();
  if (ctx.prime_mode === 'combined' && phase.includes('prime')) {
    return 'combined pass';
  }
  if (ctx.finish_group && (phase.includes('apply') || phase.includes('finish'))) {
    const subs = (ctx.pass_group_substrates || []).filter(s => s !== ctx.paintable_item && s !== ctx.substrate);
    return subs.length ? `grouped with ${subs.join(', ')}` : `finish group ${ctx.finish_group}`;
  }
  return null;
}

// ============================================================
// PIVOT — re-bucket under a different axis order
// ============================================================

function collectLeaves(node, out = []) {
  if (node.kind === 'task' && node.taskMeta) {
    out.push(node);
    return out;
  }
  // Project Setup leaves (mobilization/travel) carry no taskMeta; preserve
  // them by emitting a synthetic leaf that pivots into their own bucket.
  if (node.kind === 'task' && node.children.length === 0 && node.id.startsWith('project-setup__')) {
    out.push({ ...node, taskMeta: { isProjectSetup: true } });
    return out;
  }
  for (const c of node.children || []) collectLeaves(c, out);
  return out;
}

function buildOrientedTree(leafNodes, axisOrder, originalRoot) {
  // Separate Project Setup leaves — they always sit alongside the main tree.
  const setupLeaves = leafNodes.filter(l => l.taskMeta?.isProjectSetup);
  const taskLeaves = leafNodes.filter(l => !l.taskMeta?.isProjectSetup);

  const tree = bucketRecursive(taskLeaves, axisOrder, 0, '');

  const children = [];
  if (setupLeaves.length) {
    const setupTotal = setupLeaves.reduce((s, l) => s + l.dollars, 0);
    children.push({
      id: 'project-setup',
      label: 'Project Setup',
      level: 2,
      kind: 'room',
      groupKind: 'project_setup',
      hours: 0,
      dollars: round2(setupTotal),
      children: setupLeaves.map(l => ({ ...l, taskMeta: undefined })),
    });
  }
  children.push(...tree);

  const root = {
    id: 'project',
    label: originalRoot.label,
    level: 1,
    kind: 'project',
    hours: 0,
    dollars: 0,
    children,
  };
  rollupTotals(root);
  applyAnnotations(root);
  return root;
}

function bucketRecursive(leaves, axisOrder, depth, parentId) {
  if (depth === axisOrder.length) {
    return leaves.map((l, i) => ({
      ...cloneLeaf(l),
      id: `${parentId}__task-${l.taskMeta?.taskId || 'x'}-${i}`,
    }));
  }
  const axis = axisOrder[depth];
  const grouped = groupBy(leaves, l => leafAxisValue(l, axis));
  const orderedKeys = orderKeysForAxis(axis, [...grouped.keys()]);
  return orderedKeys.map(key => {
    const id = `${parentId}__${axis}-${slug(String(key))}`;
    return {
      id,
      label: labelForAxis(axis, key),
      level: 2 + depth,
      kind: kindForAxis(axis),
      hours: 0,
      dollars: 0,
      children: bucketRecursive(grouped.get(key), axisOrder, depth + 1, id),
    };
  });
}

function leafAxisValue(leaf, axis) {
  const tm = leaf.taskMeta || {};
  if (axis === 'phase') return tm.phase || 'apply';
  if (axis === 'elementGroup') return tm.elementGroup || 'Specialty';
  if (axis === 'substrate') return tm.substrate || (tm.elementGroup === 'Protection' ? '__protection' : 'unknown');
  if (axis === 'room') return tm.roomIndex;
  throw new Error(`Unknown axis: ${axis}`);
}

function labelForAxis(axis, value) {
  if (axis === 'phase') return PHASE_LABELS[value] || value;
  if (axis === 'elementGroup') return value;
  if (axis === 'substrate') {
    if (value === '__protection') return 'Protection';
    return SUBSTRATE_MAP[value]?.label || value;
  }
  if (axis === 'room') {
    // Pull room label from any leaf with this room index
    return value !== undefined ? `Room ${value + 1}` : 'Unknown';
  }
  return String(value);
}

function kindForAxis(axis) {
  if (axis === 'phase') return 'phase';
  if (axis === 'elementGroup') return 'element_group';
  if (axis === 'substrate') return 'substrate';
  if (axis === 'room') return 'room';
  return 'group';
}

function orderKeysForAxis(axis, keys) {
  if (axis === 'phase') {
    return [...keys].sort((a, b) => (PHASE_ORDER_INDEX[a] ?? 99) - (PHASE_ORDER_INDEX[b] ?? 99));
  }
  if (axis === 'elementGroup') {
    const idx = Object.fromEntries(ELEMENT_GROUP_ORDER.map((g, i) => [g, i]));
    return [...keys].sort((a, b) => (idx[a] ?? 99) - (idx[b] ?? 99));
  }
  if (axis === 'room') return [...keys].sort((a, b) => a - b);
  return [...keys].sort();
}

function cloneLeaf(leaf) {
  return {
    label: leaf.label,
    level: 7,
    kind: 'task',
    hours: leaf.hours,
    dollars: leaf.dollars,
    taskMeta: leaf.taskMeta,
    children: [],
    id: leaf.id,
  };
}

// ============================================================
// UTILITIES
// ============================================================

function groupBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}

function round2(n) {
  return Math.round((n || 0) * 100) / 100;
}

function slug(s) {
  return String(s).replace(/\s|&/g, '_').toLowerCase();
}
