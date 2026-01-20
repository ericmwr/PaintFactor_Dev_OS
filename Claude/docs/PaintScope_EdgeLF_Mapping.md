# PaintScope → EdgeLF Mapping Doctrine

## 1. Why EdgeLF Exists

Edge work (cut lines) is not area-based labor.

It is:
- Skill-dependent
- Precision-dependent
- Driven by **linear boundaries**, not surface area

Therefore, edge work MUST be modeled in LF.

---

## 2. EdgeLF Sources in PaintScope

PaintScope captures room geometry that produces edge LF.

### A. Ceiling Line LF
- Source: Room perimeter
- Represents: Wall-to-ceiling cut line
- Included when:
  - Walls are painted after ceilings
  - Ceiling finish differs from wall finish

---

### B. Trim Line LF (Baseboard Top Edge)
- Source: Room perimeter minus door openings
- Represents: Wall-to-baseboard edge
- Included when:
  - Trim is contrasting color/material
  - Trim is sprayed separately (typical NC)

---

### C. Opening Casing LF
- Source: Door/window dimensions
- Represents: Wall-to-casing edge
- Included when:
  - Openings are present
  - Trim is contrasting finish

---

## 3. Edge Targets

Specs may declare edge targets:

- `to_ceiling`
- `to_trim`
- `to_both`

PaintScope determines which LF values are passed based on scope.

---

## 4. Edge Strategies

### Tape-Line Cut-to-Tape
Used when:
- Trim is sprayed enamel
- Crisp line is expected
- New construction or high-end finish

Includes:
- Tape apply (LF)
- Cut-to-tape stroke (LF)
- Tape removal (LF)

---

### Freehand Cut-In
Used when:
- Repaints
- Same color/sheen transitions
- Tape is inefficient or unnecessary

Includes:
- Skilled brush cut (LF)
- Higher labor rate per LF

---

## 5. Spec Consumption Rules

- Specs MUST declare whether they consume EdgeLF
- Specs MUST declare which edge strategy they require
- Specs MUST NOT compute LF internally

PaintScope is the single source of truth for LF.

---

## 6. Estimation Enforcement Rule

If a spec includes LF tasks:
- EdgeLF must be provided
- Or the spec is invalid and must not estimate

Silent assumptions are forbidden.

---
