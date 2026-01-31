# Zone/Key Alignment Audit

**Task Type:** Audit
**Status:** Complete (report generated 2026-01-31, see Zone_Key_Alignment_Report.md)
**Created:** 2026-01-31
**Priority:** High (Blocks Spec Completeness Doctrine finalization)

---

## Objective

Verify that all protection zone IDs referenced in doctrine have corresponding PaintScope keys, and that all PaintScope protection-related keys have zone definitions.

---

## Scope

### Documents to Audit

| Document | Location | Contains |
|----------|----------|----------|
| Protection_Zones_Reference.md | Claude/docs/ | Zone ID definitions |
| paintscope_quantity_key_catalog.md | Claude/docs/ | PaintScope key definitions |
| Spec_Completeness_Doctrine.md | Claude/docs/ | Zone patterns by spec type |
| Interior_Protection_Doctrine.md | Claude/docs/ | Protection strategy references |

### Zone IDs to Verify

From Spec_Completeness_Doctrine Zone Patterns table:

**Floor Protection:**
- `floor_perimeter`
- `floor_full`
- `floor_full_8ft_radius`
- `floor_full_kitchen`
- `floor_door_swing`

**Fixture/Asset Protection:**
- `fixture_covers`
- `hardware_covers`
- `furniture_room`
- `countertop_covers`
- `appliance_adjacent`
- `appliance_covers`

**Surface-Adjacent Protection:**
- `ceiling_line`
- `trim_edges`
- `wall_upper_band`
- `wall_adjacent`
- `wall_adjacent_door`
- `wall_adjacent_window`
- `wall_adjacent_cabinet`
- `jamb_adjacent`

**Masking Zones:**
- `glass_mask`
- `backsplash_mask`
- `sill_protection`

**Millwork/Specialty:**
- `millwork_beam`

---

## Deliverables

### 1. Alignment Report

Create `Zone_Key_Alignment_Report.md` with:

| Zone ID | In Protection_Zones_Reference | Has PaintScope Key | Key ID | Status |
|---------|------------------------------|-------------------|--------|--------|
| floor_perimeter | Yes/No | Yes/No | PS_xxx | ✓/Gap |

### 2. Gap Analysis

For each gap identified:
- Zone without key: Propose PaintScope key ID and definition
- Key without zone: Determine if zone definition needed or key is orphaned
- Inconsistent naming: Propose standardization

### 3. Recommended Actions

Prioritized list of:
- New keys to add to paintscope_quantity_key_catalog.md
- New zones to add to Protection_Zones_Reference.md
- Naming standardizations required
- Cross-reference updates needed

---

## Acceptance Criteria

- [ ] All zone IDs from Spec_Completeness_Doctrine verified
- [ ] All protection-related PaintScope keys verified
- [ ] Gap analysis complete with proposed solutions
- [ ] Alignment report generated
- [ ] Recommended actions prioritized

---

## Notes

- This audit blocks finalization of Spec_Completeness_Doctrine
- New zones may require PaintScope UI/capture updates (flag for future work)
- Zone naming should follow pattern: `[location]_[type]` (e.g., floor_perimeter, wall_adjacent)
