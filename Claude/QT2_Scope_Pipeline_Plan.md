# QT2 Scope Integration Plan
## One-Time Pipeline Pass for New Specs

**Date:** 2026-02-03
**Purpose:** Add proper QT2 scope definitions to specs through the SpecFactory pipeline
**Approach:** One-time focused prompts per agent (no permanent instruction changes)

---

## Target Specs (5 total)

| Spec | Backlog Brief | Domain |
|------|---------------|--------|
| SF_DRYWALL_WALL_NC_PRIME_v1 | SF_DRYWALL_WALL_NC_PRIME | Drywall |
| SF_DRYWALL_CEILING_NC_PRIME_v1 | SF_DRYWALL_CEILING_NC_PRIME | Drywall |
| SF_DRYWALL_CEILING_NC_FINISH_v1 | SF_DRYWALL_CEILING_NC_FINISH | Drywall |
| SF_DOOR_FRAME_NC_FINISH_v1 | SF_DOOR_FRAME_NC_FINISH | Doors |
| SF_DOOR_SLAB_INT_NC_v1 | SF_DOOR_SLAB_INT_NC | Doors |

---

## What QT2 Scope Means

Per Quality_Tiers_and_Surface_Condition.md doctrine:

**QT2 Surface Eligibility:**
- Must pass putty knife test (legacy coating can't be lifted)
- Profile tolerance: 1/8" (vs 1/16" for QT3)
- Sheen limited to flat/eggshell (satin requires QT4+)

**QT2 Scope Characteristics:**
- Reduced prep intensity (fill major defects only)
- Minimal inspection (quick visual at 6ft, ambient light)
- Skip formal interstage cycles
- Application quality is NOT reduced (drips/sags still fail)
- Time modifier: 0.8 (20% faster than QT3 baseline)

---

## Pipeline Execution

### Per-Spec Flow

For each spec, run through agents in order with QT2-focused prompts:

```
1. Researcher   → Add qt2_scope_analysis to research.json
2. SOP Librarian → Update task classifications for QT2
3. Estimation Engineer → Validate/adjust QT2 rates in production.json
4. Critic       → Validate QT2 compliance
```

### Execution Order

**Batch 1: Drywall Prime**
1. SF_DRYWALL_WALL_NC_PRIME_v1
2. SF_DRYWALL_CEILING_NC_PRIME_v1

**Batch 2: Drywall Finish**
3. SF_DRYWALL_CEILING_NC_FINISH_v1

**Batch 3: Doors**
4. SF_DOOR_FRAME_NC_FINISH_v1
5. SF_DOOR_SLAB_INT_NC_v1

---

## Agent Prompts

### 1. Spec Researcher - QT2 Scope Analysis

```
TASK: Add QT2 scope analysis to research.json for [SPEC_NAME].

CONTEXT: This spec has QT2 mechanically added to quality_tier_effects but lacks
proper QT2 scope documentation. Research and document what QT2 means for this
specific surface type.

RESEARCH QUESTIONS:
1. Which prep tasks are SKIPPED or REDUCED at QT2?
2. What inspection standard applies? (distance, lighting, passes)
3. What defects are ACCEPTABLE at QT2 that would fail at QT3?
4. What disclaimers should accompany QT2 work on this surface?

DOCTRINE REFERENCE:
- Quality_Tiers_and_Surface_Condition.md § QT2 Surface Eligibility
- Putty knife test for surface eligibility
- Profile tolerance 1/8" for QT2

OUTPUT: Add to research.json:

"qt2_scope_analysis": {
  "included_tasks": [],      // Tasks performed at QT2
  "excluded_tasks": [],      // Tasks skipped at QT2
  "reduced_tasks": [],       // Tasks with reduced intensity at QT2
  "inspection_standard": {
    "distance": "6ft",
    "lighting": "ambient",
    "passes": 1
  },
  "defect_tolerance": {
    "acceptable": [],        // Defects OK at QT2
    "unacceptable": []       // Still fails at QT2
  },
  "disclaimers": [],
  "sheen_limit": "eggshell"
}
```

---

### 2. SOP Librarian - Task Classification Update

```
TASK: Update task classifications in sop_modules.json for QT2 support.

CONTEXT: Review each task and ensure classification correctly reflects QT2 behavior.
Use the qt2_scope_analysis from research.json as input.

CLASSIFICATION RULES:

BINARY (task_class: "binary") - Same at all tiers:
- Surface cleaning/dust removal
- Protection setup/teardown
- Basic coating application
- Tool cleaning
→ Single rate_per_hour, no qt_rates needed

QT_CONDITIONAL (task_class: "qt_conditional") - Skip at QT2:
- Formal inspection cycles
- Full surface sanding
- Interstage sanding
- Detailed repair/patch cycles
→ Add "appears_in_tiers": ["QT3", "QT4", "QT5"]

QT_SCALED (task_class: "qt_scaled") - Faster at QT2:
- Cut-in/edge work (less precision)
- Fill/caulk (major defects only)
- Quick inspection (visual check)
→ Add qt_rates with QT2 entry

OUTPUT: For each task in sop_modules.json, ensure:
- task_class is set (binary | qt_conditional | qt_scaled)
- appears_in_tiers excludes QT2 for conditional tasks
- qt2_notes explains the classification rationale
```

---

### 3. Estimation Engineer - QT2 Rate Validation

```
TASK: Validate QT2 production rates in production.json for [SPEC_NAME].

CONTEXT: QT2 rates were added mechanically (~25% faster than QT3). Validate these
rates make sense given the actual QT2 scope from research.json.

VALIDATION RULES:

1. QT2 time_modifier should be 0.8 in quality_tier_effects

2. For qt_scaled tasks:
   - QT2 rate should be 20-35% faster than QT3
   - Rate reflects SCOPE REDUCTION + faster pace
   - Add rate_basis_notes explaining QT2 derivation

3. For binary tasks:
   - Single rate_per_hour (no qt_rates)
   - Same work at all tiers

4. For qt_conditional tasks:
   - Task should NOT appear at QT2
   - No QT2 entry in qt_rates

5. Defect tolerance:
   - Add QT2 entry to defect_tolerance for each applicable task
   - QT2 tolerance is more lenient than QT3

OUTPUT: Update production.json with:
- Validated qt_rates for QT2
- defect_tolerance.QT2 descriptions
- rate_basis_notes for QT2 rates
```

---

### 4. Critic - QT2 Compliance Check

```
TASK: Validate QT2 compliance for [SPEC_NAME].

CHECKLIST:

CRITICAL (must pass):
[ ] QT2 listed in configuration_dimensions.quality_tier.values (spec.json)
[ ] QT2 entry in quality_tier_effects with time_modifier: 0.8 (production.json)
[ ] All qt_scaled tasks have QT2 in qt_rates
[ ] qt_conditional tasks exclude QT2 from appears_in_tiers
[ ] Binary tasks have single rate, not qt_rates
[ ] Sheen limited to eggshell for QT2

DOCUMENTATION (should have):
[ ] qt2_scope_analysis in research.json
[ ] QT2 defect_tolerance for applicable tasks
[ ] rate_basis_notes explain QT2 rates
[ ] qt2_notes on task classifications

DOCTRINE ALIGNMENT:
[ ] Putty knife test referenced
[ ] Profile tolerance 1/8" documented
[ ] Application quality NOT tiered (drips/sags fail all tiers)

OUTPUT:
{
  "qt2_compliance": "pass | pass_with_warnings | fail",
  "issues": [],
  "recommendations": []
}
```

---

## Execution Checklist

### Spec 1: SF_DRYWALL_WALL_NC_PRIME_v1
- [ ] Run Researcher with QT2 prompt
- [ ] Review qt2_scope_analysis output
- [ ] Run SOP Librarian with QT2 prompt
- [ ] Review task classifications
- [ ] Run Estimation Engineer with QT2 prompt
- [ ] Review rate adjustments
- [ ] Run Critic with QT2 prompt
- [ ] Address any issues
- [ ] Mark complete

### Spec 2: SF_DRYWALL_CEILING_NC_PRIME_v1
- [ ] Researcher → [ ] Librarian → [ ] Engineer → [ ] Critic

### Spec 3: SF_DRYWALL_CEILING_NC_FINISH_v1
- [ ] Researcher → [ ] Librarian → [ ] Engineer → [ ] Critic

### Spec 4: SF_DOOR_FRAME_NC_FINISH_v1
- [ ] Researcher → [ ] Librarian → [ ] Engineer → [ ] Critic

### Spec 5: SF_DOOR_SLAB_INT_NC_v1
- [ ] Researcher → [ ] Librarian → [ ] Engineer → [ ] Critic

---

## Expected Output Per Spec

After pipeline pass, each spec will have:

**research.json** - New section:
```json
"qt2_scope_analysis": {
  "included_tasks": ["dust_wipe", "single_coat_application", "quick_final_check"],
  "excluded_tasks": ["formal_inspection", "full_sand", "interstage_sand"],
  "reduced_tasks": ["fill_major_holes_only", "basic_caulk", "quick_cutin"],
  "inspection_standard": { "distance": "6ft", "lighting": "ambient", "passes": 1 },
  "defect_tolerance": {
    "acceptable": ["minor_texture_variation", "visible_edge_wobble_if_coverage_complete"],
    "unacceptable": ["drips", "sags", "holidays", "bare_spots"]
  },
  "disclaimers": ["Surface must pass putty knife test", "Profile tolerance 1/8 inch"],
  "sheen_limit": "eggshell"
}
```

**sop_modules.json** - Task classifications:
```json
{
  "task_id": "TSK_INSPECT",
  "task_class": "qt_conditional",
  "appears_in_tiers": ["QT3", "QT4"],
  "qt2_notes": "QT2 uses quick visual, not formal inspection"
}
```

**production.json** - Validated rates:
```json
{
  "task_id": "TSK_CUTIN",
  "qt_rates": {
    "QT2": { "rate_per_hour": 150, "notes": "Acceptable wobble, coverage priority" },
    "QT3": { "rate_per_hour": 120 },
    "QT4": { "rate_per_hour": 90 }
  },
  "defect_tolerance": {
    "QT2": "Visible wobble acceptable if coverage complete",
    "QT3": "Reasonably straight line",
    "QT4": "Clean line, no wobble at 3ft"
  }
}
```

---

## Estimated Time

| Batch | Specs | Time |
|-------|-------|------|
| Drywall Prime | 2 | 45-60 min |
| Drywall Finish | 1 | 20-30 min |
| Doors | 2 | 45-60 min |
| **Total** | **5** | **~2 hours** |

---

## Next Steps

1. Approve this plan
2. Start with SF_DRYWALL_WALL_NC_PRIME_v1
3. Run each agent with the QT2 prompt
4. Human review after each agent pass
5. Iterate until Critic passes
6. Move to next spec
