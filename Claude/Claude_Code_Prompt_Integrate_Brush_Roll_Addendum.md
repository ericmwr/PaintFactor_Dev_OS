# Claude Code Prompt: Integrate Brush and Roll Addendum into Fine Finish Doctrine

## Task Overview

Integrate the Brush and Roll Application Method addendum (Section 15) into the existing Fine Finish Doctrine document. This addendum adds brush and roll as a formally documented application method alongside spray, with research-validated technique guidance.

## Source Files

- **Addendum to integrate:** `Fine_Finish_Doctrine_Addendum_Brush_Roll.md`
- **Target doctrine:** `Claude/docs/Doctrine/Fine_Finish_Doctrine.md`

## Integration Instructions

### 1. Add Section 15 to Fine Finish Doctrine

Append the entire contents of `Fine_Finish_Doctrine_Addendum_Brush_Roll.md` as Section 15 after the existing Section 14 (or after Section 13 if Section 14 doesn't exist). The addendum is already formatted with proper section numbering (15.x.x).

### 2. Update Table of Contents (if present)

If the Fine Finish Doctrine has a table of contents, add:

```
## 15. Brush and Roll Application Method
  - 15.1 Scope and Method Selection
  - 15.2 Coating Chemistry and Open Time
  - 15.3 Core Principle: The Sanding Strategy
  - 15.4 Sanding Tools and Technique
  - 15.5 Tool Selection by Coating Chemistry
  - 15.6 The Roll and Tip Methodology
  - 15.7 Waterborne / Zero-VOC Technique
  - 15.8 Oil-Based / Alkyd Technique
  - 15.9 Regulatory Constraints
  - 15.10 Quality Tier Mapping to AWI Grades
  - 15.11 Surface-Specific Technique
  - 15.12 Environmental Management
  - 15.13 Troubleshooting and Defect Mitigation
  - 15.14 Cross-References
  - 15.15 Change Log
```

### 3. Update Section 1.1 (Surfaces Covered) — Add Application Method Note

In Section 1.1 or nearby, add a note clarifying that surfaces can be finished via spray OR brush/roll:

```markdown
> **Application Method Note:** All surfaces in this doctrine can be finished via spray or brush/roll application. Method selection is a configuration dimension (see § 15). Both methods must achieve the selected quality tier's standards.
```

### 4. Update Section 3.1 (Material Systems) — Add Compatibility Note

After the Material Systems table, add:

```markdown
> **Brush/Roll Compatibility:** All material systems listed above are compatible with brush and roll application. Waterborne alkyds (Advance, Emerald Urethane) are preferred for brush/roll due to longer open time. See § 15 for technique guidance specific to each coating chemistry.
```

### 5. Update Section 10 (Substrate-Specific Considerations)

In each substrate subsection (10.1 Trim, 10.2 Doors, 10.3 Built-Ins), add an application method note. Example for 10.2 Doors:

```markdown
| Consideration | Guidance |
|---------------|----------|
| Application method | Spray preferred for production; brush/roll viable using Roll and Tip methodology (§ 15.6). Lay doors flat when possible to eliminate runs. |
```

### 6. Update Section 12 (Cross-References) — Add Industry Standards

In Section 12.2 (Industry Standards), add:

```markdown
- AWI/ANSI 0400 — Architectural Woodwork Standards (quality grades)
- AWI/ANSI 0622 — Finish Carpentry/Installation Standards
- SCAQMD Rule 1113 — Architectural Coatings VOC Limits
```

### 7. Update Change Log

Add entry to the Change Log at the end of the document:

```markdown
| 1.3.0 | 2026-02-03 | Eric | Added Section 15: Brush and Roll Application Method. Documents Roll and Tip methodology, sanding strategy, tool selection by coating chemistry, AWI quality grade mapping, and environmental management for non-spray application. Research-validated. |
```

### 8. Update Version Number in Header

Change version from `1.2.0` to `1.3.0` in the document header.

## Key Content Summary

The addendum provides:

1. **Coating Chemistry Comparison** — Open time differences between oil-based (4-8 hrs), waterborne alkyd (30 mins), and acrylic-urethane (5-15 mins)

2. **The Sanding Strategy** — "Sand is your friend" philosophy for waterborne finishes; build the finish through multiple sanded coats

3. **Rigid Block Sanding** — Mandatory doctrine for defect removal; "sand the profile, not the contour"

4. **Brush Filament Engineering** — Specific recommendations: Nylox for tipping Zero-VOC, Chinex for heavy-bodied Low-VOC, natural bristle for oil-based

5. **Roll and Tip Methodology** — Lay-on (roller deposits) → Lay-off (brush tips) professional technique

6. **The 2-Minute Window** — Critical constraint for Zero-VOC paints; "Apply. Tip once. Walk away."

7. **AWI Quality Grade Mapping** — Premium=QT5, Custom=QT4, Economy=QT3

8. **Cabinet Blocking Resistance** — 5-7 day cure minimum before reinstalling doors

## Validation Checklist

After integration, verify:

- [ ] Section 15 appears after existing sections with proper formatting
- [ ] All 15.x subsections are present and properly numbered
- [ ] Tables render correctly (especially the Coating System Comparison table in 15.2.2)
- [ ] Cross-references to other sections (§ 2, § 3, § 8, § 9) are accurate
- [ ] Change log includes the new entry
- [ ] Version number updated to 1.3.0
- [ ] No duplicate section numbers exist
- [ ] AWI grade references are consistent with existing quality tier language

## Notes

- Production rates for brush/roll are intentionally NOT included in this doctrine — they belong in the Production Rate Reference document.
- This addendum does NOT cover substrate conversion (stained/cleared to painted) — that will be a separate doctrine document.
- The addendum is marked CANONICAL and research-validated. Source: NotebookLM research report "Fine Architectural Finishing: A Comprehensive Technical Analysis of Hand-Applied Trim and Millwork Systems"
