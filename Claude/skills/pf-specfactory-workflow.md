---
name: pf-specfactory-workflow
description: End-to-end SpecFactory pipeline: structure → research → materials → LEGO SOP → production → critic gate → artifacts.
---

# SpecFactory Workflow

When generating/revising a spec family, produce a complete artifact set.

## Required artifacts
Create folder: `specs/<family_id>/`
- `spec.json`
- `materials.json`
- `sop_modules.json`
- `production.json`
- `qa_report.json`
- `CHANGELOG.md`

## Pipeline steps
1) Structure:
   - Use product-architect input or explicit domain brief.
2) Research:
   - Call spec-researcher for structured findings + risks.
3) Materials:
   - Call materials-manager for systems + coverage + consumables + compatibility.
4) SOP:
   - Call sop-librarian to create LEGO modules/tasks/rounds using materials systems.
5) Production:
   - Call estimation-engineer for task rates + factors + quality effects.
6) QA:
   - Call critic for pass/fail. Iterate until pass or user stops.

## Rules
- Default status = draft + review_required = true
- Quality tiers expressed via rounds + systems; multipliers only where justified
- Doors counted per side when applicable
- Explicit uncertainty flags are mandatory

---

## Fine Finish Spec Families

When the spec family covers trim, built-ins, doors, millwork, or fine finish surfaces:

### Agent Requirements

1. **Researcher** must reference `Fine_Finish_Doctrine.md` for workflow patterns
2. **SOP Librarian** must use Fine Finish module structure (MOD_FF_*)
3. **Materials Manager** must align material systems with doctrine tiers
4. **Estimation Engineer** must use scrutiny-based rate scaling
5. **Critic** must verify Fine Finish compliance

### Required Module Pattern

```
Setup → Initial Prep → [Prime if needed] → Finish Coat 1 → Interstage → Finish Coat 2 → [Interstage → Additional Coats...] → Final Inspect → Cleanup
```

### Interstage Run Rule

**Critical:** Interstage runs AFTER each coat EXCEPT the final coat.

| Coat System | Interstage Runs |
|-------------|-----------------|
| Prime + 1 Finish | 1 |
| Prime + 2 Finish | 2 |
| 2 Finish (no prime) | 1 |
| Prime + 2 Finish + Clear | 3 |

### Material System Alignment

| Quality Tier | Material System | Product Type |
|--------------|-----------------|--------------|
| QT3 | SYS_FF_STANDARD_ACRYLIC | 100% acrylic enamel |
| QT4 | SYS_FF_MODIFIED_URETHANE | Urethane-modified alkyd |
| QT5 | SYS_FF_PREMIUM / SYS_FF_GALLERY | Premium urethane/conversion |

### Sheen Restrictions

- **Satin:** QT3+ minimum
- **Semi-gloss:** QT4+ minimum
- **Gloss:** QT5 only

Reference `docs/Fine_Finish_Doctrine.md` for complete guidance.
