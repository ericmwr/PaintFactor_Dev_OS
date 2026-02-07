# Materials and Consumables Doctrine

**Status:** Canonical
**Version:** 1.2
**Last Updated:** 2026-01-31

This document defines how consumable materials (tape, abrasives, rollers, brushes, spackle, caulk) are selected and quantified for painting operations. AI agents generating specs MUST follow this doctrine for consumable usage models.

---

## Core Principles

1. **Consumable selection is driven by function, not brand**
2. **Quantity estimation should be practical, not precise** — some items are contractor discretion
3. **Product Data Sheets (PDS) are authoritative** for material compatibility
4. **Quality tier affects process discipline, not necessarily consumable quantity**

---

## Tape Taxonomy

### Types and Primary Uses

| Tape Type | Primary Use | Surface Compatibility | Duration Guidance |
|-----------|-------------|----------------------|-------------------|
| **Regular Masking** (yellow/white) | Bulk seam taping, plastic attachment, multi-purpose | Bare wood, metal, glass | Short duration only — remove same day |
| **Blue Painter's Tape** | Standard masking, general purpose | Painted surfaces, wood, glass | Moderate duration — can remain 1-3 days |
| **Green Edge-Seal Tape** (Frog Tape) | Crisp paint lines, preventing bleed-through | Painted surfaces, smooth substrates | Moderate-long duration |
| **Yellow Delicate Surface** | Cabinets, veneers, fresh paint | Delicate finishes, lacquer, veneer | Long duration safe |
| **Extended Duration Tapes** | Multi-day projects, phased work | All surfaces | 7-14+ days |

### Tape Selection Rules

```
IF surface = 'cabinet_veneer' OR surface = 'fresh_coating'
  → Yellow Delicate Surface Tape

IF edge_quality_required = 'crisp' AND surface = 'smooth'
  → Green Edge-Seal Tape
  → NOTE: Seal edge with damp rag after application, before painting

IF task = 'seam_taping' OR task = 'plastic_attachment'
  → Regular Masking Tape (economy)

IF task = 'general_masking' AND surface NOT delicate
  → Blue Painter's Tape (default)

IF project_duration > 3 days AND tape remains installed
  → Extended Duration Tape
```

### Critical Technique: Green Tape Edge Seal

When using green edge-seal tape for crisp lines:
1. Apply tape to surface
2. Wipe tape edge with damp rag to activate seal
3. Allow to dry before painting
4. Paint turns out crisp at tape line

**Why:** The damp rag activates the paint-blocking gel in the tape edge, creating a micro-seal that prevents bleed-through.

### Surfaces to AVOID with Regular Masking Tape

- Fresh paint (under 24-48 hours cure)
- Delicate veneers
- Wallpaper
- Newly installed coatings

**Why:** High-tack adhesive can damage or pull these surfaces on removal.

---

## Tape and Masking Paper Yields

### Standard Roll Yields (All Sizes)

**Rule: All tape rolls yield 180 LF (60 yards) regardless of width.**

| Product | Roll Yield | Common Widths | Notes |
|---------|-----------|---------------|-------|
| Masking tape (all types) | 180 LF (60 yd) | 3/4", 1", 1.5", 2" | Width does not affect length per roll |
| Masking paper | 180 LF (60 yd) | 6", 9", 12", 18" | Width does not affect length per roll |

**Common error:** Agents have incorrectly listed tape at 60 LF/roll (confusing feet with yards) and masking paper at 500 LF/roll. Both are wrong.

**Source:** Standard manufacturer packaging, field contractor input (RC, 2026-01-31)

---

## Abrasives (Sandpaper and Applicators)

### Sanding Blocks — The Standard Tool

Painters primarily use **sanding blocks** rather than loose sandpaper sheets. Blocks come in grit RANGES, not specific grits.

| Block Type | Grit Range | Common Uses |
|------------|------------|-------------|
| Fine | 150-220 | Patches, trim, between-coat detail |
| Medium | 100-150 | General prep, scuff sanding |
| Coarse | 60-100 | Heavy prep, paint removal, rough surfaces |

**Default for most tasks:** Fine or Medium blocks for patch/trim work.

### Pole Sanders — Large Surface Work

Pole sanders accept sandpaper pads and attach to extension poles for wall/ceiling work.

| Grit | Application |
|------|-------------|
| 80 | First sand on repaint drywall BEFORE patching (aggressive) |
| 100 | Bare drywall, patches, standard prep |
| 220 | Between finish coats (light, smooth) |

**Rule:** Pole sanders are for large surfaces (walls, ceilings). Use blocks for trim and detail.

### Power Sanders

| Type | Primary Use |
|------|-------------|
| Orbital | Doors, woodwork, built-ins, large flat surfaces |
| Dremel | Detail edges, inside corners |
| Square Head | Tight spaces, corners |

**Workflow:** Orbital for field, dremel or block for edges and inside corners.

---

## Roller Taxonomy

### Roller Sizes

| Size | Name | Use Cases |
|------|------|-----------|
| 4" | Cigar Roller | Small surfaces, cut-in backroll, detail work |
| 4" | Barrel Roller | Small surfaces, higher paint capacity than cigar |
| 9" | Standard Roller | Walls, ceilings, large trim, flat panel doors |
| 18" | Production Roller | **Standard for spray+backroll systems** on walls and ceilings |
| 14-18" | Large Format | High-efficiency large surfaces, production work |

### Spray + Backroll Roller Standard

**Rule: Use 18-inch roller frame and nap for spray+backroll systems.**

| Aspect | Guidance |
|--------|----------|
| Roller size | 18-inch frame and cover |
| Why 18" | Larger roller width increases backroll production rate |
| Throughput impact | Since spray is coupled to backroll (spray ≤ backroll), faster backroll enables faster overall throughput |
| Application | Standard for production spray+backroll on walls and ceilings in new construction |

**Why This Matters:**

In a spray+backroll system, the backroller is the bottleneck (see Estimation_Modifiers_Doctrine.md — Spray/Backroll Throughput Coupling). By using an 18" roller instead of a 9" roller:
- Backroll coverage per stroke doubles
- Overall system throughput increases
- Spray can operate faster without outpacing backroll

**Consumable Update:**

When using spray+backroll application method, spec the following:
- 18" roller frame (1 per backroller)
- 18" roller covers (nap per surface texture)
- Replacement rate: same SF per cover as 9" covers (~5,000 SF)

### Nap Thickness Selection

| Surface Texture | Recommended Nap | Notes |
|-----------------|-----------------|-------|
| Smooth drywall | 3/8" to 1/2" | Range allows painter discretion |
| Orange peel drywall | 1/2" | Standard for light drywall texture |
| Knockdown drywall | 1/2" | Same as orange peel — drywall textures use 1/2" max |
| Heavy texture (stomp, popcorn) | 3/4" | Deep texture profiles only |
| Very porous (concrete block, CMU) | 3/4" to 1" | Fills voids in masonry substrates |

> **Key clarification (2026-02-04):** Knockdown on drywall uses 1/2" nap, NOT 3/4". The 3/4" nap is reserved for heavy/deep textures (stomp, popcorn) and porous masonry substrates. This correction aligns with field practice — 3/4" nap on knockdown drywall causes excessive stipple and material waste.

### Roller Material Selection

Roller material (lambskin, polyester, microfiber, foam) is determined by:
1. **Product Data Sheet (PDS)** requirements — authoritative
2. Painter discretion when PDS is silent

**Do not codify roller material in specs** — reference PDS instead.

### Roller Skin Replacement

**Proposed benchmark:** ~5,000 SF per roller skin replacement

**HOWEVER:** This is contractor discretion, not vital to the estimate.

**Quantity drivers:**
- Number of distinct products (primer, ceiling, wall, trim)
- Number of colors per product
- NOT quality tier multipliers — **deprecate roller quality tier multipliers**

**Why deprecate quality multipliers:** Field practice shows roller replacement is driven by product/color changes, not quality expectations. The multiplier adds false precision.

---

## Brushes

### Current Error in Pilot Specs

The pilot spec shows 500 LF lifespan per brush. This is **inaccurate**.

**Actual:** ~5,000 LF with minimal care. Painters maintain their brushes.

### Correct Brush Usage Model

**Rule 1:** 1 brush per material type used (primer brush, wall paint brush, trim paint brush)

**Rule 2 (Brush & Roll projects):** Add 1 brush per crew member per 40 gallons of related product

**Example:**
- 2-person crew
- 80 gallons total wall paint
- Brush calculation: 2 brushes (1 per 40 gal per person) + 1 (per material) = 3 brushes

### Brush Type Selection

**Reference PDS for brush type** (nylon, polyester, blend, natural bristle)

**Default:** Painter's discretion when PDS is silent

**Do not over-specify brush types in specs.**

---

## Spackle

### Usage Heuristics

| Scenario | Approximate Usage |
|----------|-------------------|
| Standard repaint (3,500 SF) | 1 large tub (32 oz) |
| Good condition | 0.5x standard |
| Fair condition | 1.5x standard |
| Poor condition | Hourly — do not estimate |

### Exception: New Construction Trim Fastener Filling

When filling fastener holes on new trim, wainscote, paneling, or shiplap:

**Method:** Overfill holes → sand flush = HIGH waste factor

**Usage increase:** Significantly higher than repaint — potentially 3-5x

**Rule:** Calculate new trim fastener fill as separate line item based on trim LF, not wall SF.

---

## Caulk

### Usage Depends on Project Type

| Project Type | Heuristic |
|--------------|-----------|
| New Construction | ~72 LF per tube (more consistent gaps, higher volume) |
| Repaint (touch-up) | ~200-300 LF per tube (assuming 50% of trim needs caulk) |

### Joint Size Reference Chart

When detailed estimation is required, use this chart (LF per tube):

|           | **1/8" width** | **1/4" width** | **3/8" width** | **1/2" width** |
|-----------|---------------|---------------|---------------|---------------|
| **1/8" depth** | 96 | 48 | 36 | 24 |
| **1/4" depth** | 48 | 24 | 18 | 12 |
| **3/8" depth** | 32 | 16 | 12 | 8 |
| **1/2" depth** | 24 | 12 | 9 | 6 |

### Standard vs. Large Gap Handling

**Standard gaps (1/64" to 1/8"):** Use heuristic averages with waste factor

**Large gaps (1/8" to 1/2"+):**
- Flag for labor compensation (more time required)
- May require second coat of caulk to flush
- Do NOT record individual gap sizes (overkill)
- Note as exception in scope, estimate labor adder

**Why not measure gaps:** Recording individual gap sizes is impractical. Use heuristics unless project is notably worse than average.

---

## Consumables NOT to Over-Engineer

Some consumables are trivial to track and should be left to contractor discretion:

| Item | Guidance |
|------|----------|
| Rags | Include nominal amount; don't calculate |
| Stir sticks | Bundle with paint purchase |
| Painter's pyramids | Include if doors in scope |
| Bucket liners | Include nominal amount |
| Spray filters | Per job day (if spray) |

---

## Summary: What Goes in materials.json

For consumable_usage_models, include:

| Consumable | Driven By | Notes |
|------------|-----------|-------|
| Tape | LF of masked edges | Type selected per surface |
| Sandpaper/blocks | SF or LF by task | Grit per application |
| Roller covers | Product count × color count | Not quality tier |
| Brushes | Material count + gallons ÷ 40 per crew | Deprecate LF model |
| Spackle | SF with condition modifier | Exception for NC trim |
| Caulk | LF of trim (NC: 72, Repaint: 200-300) | Flag large gaps |

---

## Primer Product Classification

### Drywall Sealers vs. Stain Blockers

**MANDATORY DOCTRINE:** PVA primers and acrylic latex drywall primers are SEALERS, not stain blockers. They have ZERO stain blocking capability. Agents must not claim or imply stain blocking properties for these products.

| Product Category | Purpose | Stain Blocking | Examples |
|-----------------|---------|----------------|----------|
| PVA drywall primer | Seal porous drywall surface | NONE | SW PVA Primer, BM Fresh Start PVA |
| Acrylic latex drywall primer | Seal drywall with better adhesion/build | NONE | SW ProMar 200 Acrylic Latex |
| Shellac-based stain blocker | Block stains, odors, tannin bleed | YES — high | Zinsser BIN, Kilz Original |
| Water-based stain blocker | Block light stains | LIMITED | Zinsser 1-2-3, Kilz 2 |

**Agent rule:** When writing materials.json for drywall primer specs, do not reference stain blocking in product descriptions, advantages, or selection rationale. If a project requires stain blocking, a separate stain blocking product must be specified as an additional step.

**Source:** Research correction RC-002 (SF_DRYWALL_CEILINGS_NC_PRIME pipeline, 2026-01-31)

### New Construction Drywall Fasteners — No Spot-Priming

**Rule:** New construction drywall fasteners do NOT require spot-priming. Fasteners are covered with joint compound by the drywall contractor and modern drywall screws are rust-resistant.

Agents must not include spot-priming of fasteners as a task in new construction drywall specs (wall or ceiling, prime or paint).

**When spot-priming IS needed:**
- Repaint work where nail heads are exposed or rusting
- NC work where fasteners are visibly exposed (drywall contractor deficiency — flag for correction, not painter responsibility)

**Source:** Research correction RC-001 (SF_DRYWALL_CEILINGS_NC_PRIME pipeline, 2026-01-31)

---

## Dry Time Specifications

**Rule:** Do not specify product dry times in spec artifacts.

Dry time depends on too many variables to pin down in a spec:
- Ambient temperature
- Humidity
- Ventilation / air movement
- How sealed off the space is (masking reduces airflow)
- Product formulation
- Film thickness

**Agent rule:** When writing research.json or materials.json, do not list dry times as product properties. If dry time is relevant to workflow (e.g., recoat window), reference the Product Data Sheet (PDS) and note that actual conditions may vary.

**Source:** Research correction RC-004 (SF_DRYWALL_CEILINGS_NC_PRIME pipeline, 2026-01-31)

---

## References

- Field notes from professional painting contractor (2026-01-20, 2026-01-31)
- PaintFactor DevOS architecture
