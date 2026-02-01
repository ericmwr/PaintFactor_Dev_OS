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

**Default Edge Strategy For Wall-to-Ceiling:** Freehand cut-in.

**Exceptions requiring tape-line:**
- Ceiling substrate is NOT standard drywall (wood planks, metal, tile, beadboard, etc.)
- High color contrast between wall and ceiling
- Ceiling surface is sensitive to touch-up or has specialty finish
- Client/spec explicitly requires tape-line

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

## 4. Sequencing Doctrine (Interior Repaint)

### Default Sequence

When BOTH trim and walls are included in an interior repaint scope:

- **If ceilings are included:** Ceilings → Trim → Walls (typical sequence)
- **If trim and walls only:** Trim → Walls (default ~80% of jobs)
- **Walls-first:** Allowed as an exception, but NOT the default

### Why Trim-First is Default

1. **Easier coating:** Trim can be coated cleanly without wall protection concerns
2. **Natural edge formation:** Wall paint cuts or rolls into the dried trim edge
3. **Protection efficiency:** Wall field protection is simpler than protecting all trim edges
4. **Production flow:** Trim work is often faster to complete before wall field work

### When Walls-First Applies (Exceptions)

- Trim will be sprayed after walls are complete (common in new construction)
- Trim is a different trade/schedule
- Specific client requirement or project phasing

### Impact on Edge Strategy and Protection

Sequencing affects which surface requires protection:

| Sequence | What Gets Protected | Edge Strategy Driver |
|----------|---------------------|----------------------|
| Trim-first (default) | Trim edges protected from wall roller splatter | Tape for protection; freehand acceptable for edge quality |
| Walls-first | Wall field protected from trim overspray/brush | Trim masking or careful brush technique |

**Key principle:** Protection tasks follow from adjacency + sequencing, not from edge strategy alone. A spec must declare its sequencing assumption so protection logic is correct.

---

## 5. Edge Strategies (Revised – Canonical)

Edge strategies define how linear paint boundaries are executed and/or protected.
They are configuration choices, not quality-tier mandates.

PaintScope provides the EdgeLF.
Specs select the strategy.

### 5.1 Edge Strategy vs. Protection Intent

These are distinct concepts:

- **Edge strategy:** How the paint line is physically executed (tape-line or freehand)
- **Protection intent:** What adjacent surface is being protected from paint transfer

A tape-line strategy may serve edge quality, protection, or both. Freehand may be chosen for speed while separate protection (masking film, paper) handles adjacent surface safety.

---

### 5.2 Tape-Line Cut-to-Tape

**Definition:**
A method where tape is applied along the edge to both:
- Control the paint boundary, and/or
- Protect adjacent horizontal or vertical surfaces

**Primary Drivers (any may apply):**
- Presence of adjacent finished surfaces requiring protection (e.g., dried trim edges after trim-first sequence, cabinets, tile)
- Multiple finish coats where repeatable edge alignment is beneficial
- High color contrast or sheen change
- Long uninterrupted linear runs where tape is more efficient overall
- Situations where roller splatter protection is required
- Trim-first sequencing where dried trim needs protection from wall roller splatter (default repaint scenario)

**Not determined by:**
- Quality tier alone
- New construction vs repaint alone

**Includes (LF-based):**
- Tape application (LF)
- Cut-to-tape stroke or roll-to-tape edge (LF)
- Tape maintenance and removal (LF)

**Notes:**
- Tape-line may be selected purely for protection, even when freehand edge quality would be acceptable
- In the default trim-first sequence, tape protects dried trim surfaces from wall roller splatter
- In walls-first exceptions (e.g., NC spray), trim overspray protection is handled separately during trim application

---

### 5.3 Freehand Cut-In

**Definition:**
A skilled brush technique used to form a clean edge without tape.

**Primary Drivers:**
- Vertical-only edges with no horizontal protection requirement
- Same color or low-contrast transitions
- Situations where tape would slow production or introduce unnecessary handling
- Areas with frequent interruptions where taping is inefficient

**Includes (LF-based):**
- Skilled brush cut-in stroke (LF)

**Notes:**
- Freehand cut-in typically carries a higher skill requirement per LF
- Does not provide protection from roller splatter
- May still require separate protection strategies if adjacent surfaces demand it

---

### 5.4 Strategy Selection Rules (System-Level)

Edge strategy is a configurable selection, not a tier rule.

**Quality Tier affects:**
- Inspection rigor
- Tolerance
- Number of rounds
- NOT the physical method chosen

**Adjacency + sequencing determine whether protection is required.**

Protection needs may necessitate tape even when freehand edge quality is acceptable.

Production differences between strategies are handled in estimation logic, not doctrine.

---

### 5.5 Enforcement Implications

**Specs must:**
- Declare which edge strategy is selected
- Require appropriate EdgeLF inputs
- Declare sequencing assumption (trim-first default, or walls-first exception)

**Specs must not:**
- Forbid tape or freehand based solely on Quality Tier
- Assume protection without measurable inputs
- Assume walls-first sequencing without explicit declaration

**The System Critic must FAIL specs that:**
- Hard-code edge strategy to QT alone
- Include edge work without EdgeLF
- Ignore protection needs implied by adjacency + sequencing
- Assume walls-first when trim-first is the default

---

## 6. Spec Consumption Rules

- Specs MUST declare whether they consume EdgeLF
- Specs MUST declare which edge strategy they require
- Specs MUST NOT compute LF internally

PaintScope is the single source of truth for LF.

---

## 7. Estimation Enforcement Rule

If a spec includes LF tasks:
- EdgeLF must be provided
- Or the spec is invalid and must not estimate

Silent assumptions are forbidden.

---
