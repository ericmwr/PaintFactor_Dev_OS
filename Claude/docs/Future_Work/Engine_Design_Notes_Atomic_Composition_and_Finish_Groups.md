# Estimation Engine — Atomic Spec Composition & Finish Group Resolution

**Status:** Future Work — Pre-Development Notes  
**Version:** 0.1.0  
**Created:** 2026-02-01  
**Context:** Captured during spec architecture discussions prior to engine development  
**Decision Authority:** Eric (PaintFactor)

---

## 1. Architectural Decision: Atomic Specs Over Bundled Scopes

### Background

Initial spec design bundled related surfaces into single spec families with combined scopes (e.g., `SF_DOOR_INT_NC_FULL` covering slab + jamb + casing as one unit). This approach required separate spec families for every combination of door type, construction context, domain, and substrate — resulting in 16+ spec families for doors alone.

### Decision

Specs are authored as **atomic, single-surface units**. Each spec covers one paintable surface type with its own prep, prime, and finish workflow. The estimation engine composes atomic specs at project assembly time to form complete systems.

### Rationale

- Dramatically reduces spec family count (6 atomic door specs vs. 16 bundled)
- Eliminates pre-defined scope bundles — estimator composes freely
- Configuration dimensions absorb variation within a surface type (door type, substrate, method)
- Finish group system handles inter-spec edge optimization automatically
- EdgeLF system already provides the boundary measurement infrastructure between any two adjacent surfaces

### Example — Door System Composition

A single interior door opening in a project pulls from three independent specs:

```
Door Opening #1 (Interior, 6-panel, NC):
  → SF_DOOR_SLAB_INT_NC   (config: panel, QT4, spray)
  → SF_DOOR_FRAME_NC       (config: interior, QT4, spray)
  → SF_TRIM_NC_PAINT        (casing LF already counted in trim scope)
```

Each spec is complete and self-contained. The engine resolves interactions between them.

---

## 2. Edge Task Ownership — Convention Model

### The Problem

When two atomic specs share a boundary (e.g., door slab and door frame), both could theoretically include masking/protection tasks for that shared edge. Without a rule, the engine would double-count edge labor.

### Decision: Ownership by Convention

**The spec for the surface being painted owns the masking task for protecting the adjacent surface.**

The spec for the adjacent surface does NOT include a reciprocal masking task for that same boundary.

### How It Works

When painting the door slab:
- The slab spec includes "mask the frame to protect it from slab paint"
- The frame spec does NOT include "mask the frame from slab paint"

When painting the frame:
- The frame spec includes "mask the wall to protect it from frame paint"
- The wall spec does NOT include "mask the wall from frame paint"

Each spec only protects what it needs to protect **from its own application**, never the reverse.

### Why This Works

- Aligns with how painters actually think — "I'm spraying the door, so I mask the frame"
- No engine-side deduplication logic needed for masking tasks
- Finish group optimization is clean — if slab and frame share a finish group, the slab spec's "mask the frame" task gets skipped via `skip_when: same_finish_group`, and no other spec is trying to include it
- Each spec remains independently valid — pulling in just the slab spec gives you correct masking without needing the frame spec present

### Spec Authoring Rule

When authoring atomic specs, the SOP Librarian includes protection/masking tasks ONLY for surfaces that the current spec's application could damage. The spec never includes tasks that protect its own primary surface from other specs' work.

```
CORRECT (in door slab spec):
  TSK_DOOR_MASK_FRAME — masks frame during slab painting
  TSK_DOOR_MASK_WALL  — masks wall during slab painting (if slab is being sprayed)

INCORRECT (in door slab spec):
  TSK_FRAME_MASK_SLAB — this belongs to the frame spec, not the slab spec
```

---

## 3. Finish Group Resolution Algorithm

### Inputs

The engine receives three data streams at project assembly:

1. **Atomic specs** — each with adjacency_declarations and task-level adjacency_metadata
2. **PaintScope geometry** — quantities, edge measurements, surface keys
3. **Finish group assignments** — project-level mapping of surfaces to finish group IDs

### Finish Group Data Structure

```
Finish Group Assignments (project-level):
  wall_field         → FG_1
  ceiling_field      → FG_2
  trim_baseboard     → FG_3
  trim_casing_door   → FG_3
  door_leaf_face     → FG_3
  door_frame         → FG_3
  door_leaf_edge     → FG_3
```

The finish group ID is an opaque grouping key. Product, color, and sheen details live in the proposal/work order layer, not in the estimation engine. The engine only needs to know: **are two surfaces in the same group or not?**

### Resolution Logic (Per Task)

For each task in each spec that carries `adjacency_metadata`:

```
1. Read task.adjacency_metadata.adjacent_surface  (e.g., "wall_field")
2. Read spec.adjacency_declarations.primary_surface  (e.g., "door_leaf_face")
3. Look up finish group for primary_surface  → FG_3
4. Look up finish group for adjacent_surface → FG_1
5. Compare:
   - If SAME group:
     - If task has skip_when: "same_finish_group" → EXCLUDE task
     - If task has required_when: "same_finish_group" → INCLUDE task
     - Apply continuity_rate_modifier to production rate
   - If DIFFERENT group:
     - If task has skip_when: "different_finish_group" → EXCLUDE task
     - If task has required_when: "different_finish_group" → INCLUDE task
     - Use standard production rate (no modifier)
6. Tasks without adjacency_metadata → always included, standard rate
```

### Rate Modifier Application

When finish continuity is detected between adjacent surfaces, edge work production rates improve:

| Adjacency Type | Rate Improvement | Source |
|----------------|------------------|--------|
| Linear (wall/trim, wall/casing) | 15-25% faster on edge work | Estimation Engineer doctrine |
| Complex (door system, window system) | 20-30% faster when fully continuous | Estimation Engineer doctrine |

The `continuity_rate_modifier` on the spec's adjacency declaration provides the specific multiplier. The `rate_modifier_category` on the task's adjacency metadata classifies the type of rate adjustment (edge_masking, cut_in, spray_edge, inspection).

---

## 4. Protection Zone Deduplication

### Context

Separate from finish groups, protection zones handle setup/teardown optimization. Multiple atomic specs in the same room share floor protection, furniture handling, etc.

### Engine Rule

At project assembly:
- Include setup only for the FIRST spec needing each protection zone
- Include teardown only for the LAST spec using each zone
- Skip setup/teardown for middle specs sharing zones
- "Maintain" actions run for each spec that needs ongoing protection

### Interaction with Atomic Composition

Atomic specs make protection dedup more important, not less. A door opening might involve three specs (slab, frame, trim) all needing the same floor protection zone. Without dedup, floor protection setup gets charged three times. With zone-based dedup, it's charged once.

---

## 5. Spec Consistency Requirements

### Surface Vocabulary Alignment

All atomic specs that can be composed together MUST use consistent surface IDs from the Surface_Vocabulary_Reference. If the slab spec declares `door_leaf_face` and the frame spec references `door_leaf_face` as an adjacent surface, the IDs must match exactly.

### Edge Key Reciprocity

Both specs referencing a shared boundary must point to the same PaintScope edge key. The ownership convention determines which spec includes the masking task, but both specs' adjacency declarations reference the same physical edge.

### Adjacency Declaration Mirroring

Reciprocal specs should declare mirrored adjacency relationships:

```
Door Slab Spec:
  primary_surface: door_leaf_face
  adjacent: door_frame, typical_relationship: same_finish

Door Frame Spec:
  primary_surface: door_frame
  adjacent: door_leaf_face, typical_relationship: same_finish
```

If these contradict (one says `same_finish`, the other says `different_finish`), the engine has a conflict. Validation should catch this at project assembly.

---

## 6. Open Questions for Engine Development

### 6.1 Finish Group Assignment Granularity

**Question:** Does PaintScope assign finish groups at project level, room level, or individual surface level?

**Likely answer:** Project level with room-level overrides. Most residential projects have one trim color throughout, but some have room-specific schemes. The data model should support per-surface assignment with project-level defaults.

### 6.2 Finish Group Data Model

**Question:** What fields does a finish group carry?

**Minimum:** Group ID (opaque key for same/different comparison).  
**Recommended:** Group ID + product reference + color reference + sheen. This enables the engine to validate that "same group" actually means same product/color/sheen, and allows the proposal layer to pull finish details without a separate lookup.

### 6.3 Conflict Detection

**Question:** How does the engine handle contradictory adjacency declarations between two specs?

**Proposed:** Validation gate at project assembly. If Spec A says surface X is `adjacent to Y, same_finish` and Spec B says surface Y is `adjacent to X, different_finish`, flag as a conflict requiring human resolution before estimate generation.

### 6.4 Partial Composition

**Question:** When only some specs in a system are included (e.g., repaint slab only, skip frame and casing), how does the engine handle edges that reference specs not in the project?

**Proposed:** If the adjacent surface's spec is not present in the project, the task's adjacency metadata resolves against the `typical_relationship` default in the adjacency declaration. No optimization applied — tasks run as authored (discontinuous case).

### 6.5 Room-Level vs. Surface-Level Edge Resolution

**Question:** In a room where 8 doors have trim matching the wall but 2 doors have accent-color trim, how does the engine resolve?

**Proposed:** Finish group assignment happens per surface instance, not per surface type. PaintScope counts "6 door sides in FG_3, 4 door sides in FG_1" and the engine resolves edge tasks separately for each group. This requires PaintScope to support split quantities within a surface type by finish group.

---

## 7. Implementation Priority

When engine development begins, the recommended build order:

1. **Basic spec composition** — pull multiple atomic specs into a project, sum labor/materials without optimization
2. **Protection zone dedup** — implement setup/teardown sharing across specs
3. **Finish group assignment UI** — PaintScope interface for assigning surfaces to finish groups
4. **Finish group resolution** — implement the skip/include/modifier logic per task
5. **Conflict detection** — validate adjacency declaration consistency across composed specs
6. **Rate modifier application** — apply continuity rate improvements to production rates

Steps 1-2 deliver immediate value. Steps 3-4 are the core finish group feature. Steps 5-6 are refinement.

---

## 8. References

| Document | Relevance |
|----------|-----------|
| Surface_Vocabulary_Reference.md | Canonical surface IDs for adjacency declarations |
| Protection_Zones_Reference.md | Zone IDs for protection dedup |
| Estimation Engineer agent (estimation-engineer.md) | Rate modifier categories and improvement ranges |
| SpecFactory Enhancement Rollout Plan | Schema definitions for adjacency_metadata and protection_metadata |
| Fine Finish Doctrine | Interstage process, scrutiny definitions that inform edge task behavior |
| PaintScope EdgeLF Mapping | Edge key infrastructure that enables boundary measurement |
| Spec Input to PaintScope Key Mapping | Maps spec inputs to geometry keys |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-01 | Eric + Claude | Initial capture of architectural decisions from spec design discussions |
