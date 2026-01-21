---
name: deep-research-protocol
description: Structured research protocol for gathering authoritative domain knowledge with citations, source tiering, and explicit uncertainty handling.
---

# Deep Research Protocol

This protocol defines how the Spec Researcher conducts deep research when authoritative, citable knowledge is required. Deep research is more rigorous than lightweight research and produces findings that may inform canonical doctrine.

---

## Core Principle

**Research informs doctrine, not specs directly.**

Deep research findings flow to doctrine documents, which then guide spec generation. The researcher does NOT write specs, set production rates, or define labor times.

---

## Domain Scope

**Painting is the primary domain.**

Drywall, wood prep, and substrate work exist only to support:
- Surface preparation
- Priming compatibility
- Finish application

Research into supporting trades (drywall, carpentry, masonry prep) is permitted ONLY where it directly affects paint outcomes. Supporting trade research may NOT:
- Redefine painting scope
- Establish production rates for non-painting trades
- Create estimating models for supporting trades

---

## When to Use Deep Research

| Trigger | Use Deep Research |
|---------|-------------------|
| New spec family with unfamiliar substrate or coating system | Yes |
| Contradictory information in existing doctrine | Yes |
| Field notes conflict with current assumptions | Yes |
| Manufacturer claims need verification | Yes |
| Safety, compatibility, or failure mode investigation | Yes |
| Quick lookup of known fact | No — use lightweight research |
| Minor clarification within established doctrine | No — use lightweight research |

---

## Source Tier Hierarchy

All claims must cite sources. Sources are tiered by authority:

### Tier 1 — Authoritative (Highest Weight)

| Source Type | Examples | Trust Level |
|-------------|----------|-------------|
| Manufacturer Product Data Sheets (PDS) | Sherwin-Williams, Benjamin Moore, PPG technical bulletins | Definitive for that product |
| Manufacturer Technical Data Sheets (TDS) | Application guides, surface prep requirements | Definitive for that product |
| Industry Standards Organizations | PDCA, MPI, SSPC, ASTM | Definitive for industry practice |
| Government/Regulatory Bodies | EPA, OSHA, state VOC regulations | Definitive for compliance |

**Tier 1 sources are considered ground truth for their domain.**

#### Approved Paint & Coatings Manufacturers

| Manufacturer | Scope Notes |
|--------------|-------------|
| Sherwin-Williams | Full range — architectural and industrial |
| Benjamin Moore | Full range — architectural |
| PPG | Full range — architectural and industrial |
| Behr | Limited — residential only |
| Fine Paints of Europe | Premium finishes |
| Renner / ICA | Waterborne cabinet coatings |
| General Finishes | Interior wood systems |

Other manufacturers may be used when PDS/TDS is available, but the above are pre-approved for doctrine development.

### Tier 2 — Professional (High Weight)

| Source Type | Examples | Trust Level |
|-------------|----------|-------------|
| Trade Association Publications | PCA, NACE, AWCI guidance docs | High — represents professional consensus |
| Peer-Reviewed Trade Journals | Journal of Protective Coatings & Linings | High — vetted content |
| Established Training Programs | PDCA Craftsman certification materials | High — industry-validated |
| Manufacturer Application Specialists | Direct communication with tech reps | High — but may have product bias |

**Tier 2 sources inform best practices but may have commercial or regional bias.**

#### Trade Publications (Tier 2)

| Publication | Notes |
|-------------|-------|
| Paint Contractor Magazine | Professional audience, process-focused |
| Professional Painter Magazine | Industry news and techniques |
| Manufacturer training PDFs (non-PDS) | Application guidance, not product specs |
| Trade school materials | Foundational techniques |

#### Contractor Write-up Criteria

Tier 2 contractor content must be:
- Written by identifiable professionals
- Focused on process, not marketing
- Avoids DIY framing

### Tier 3 — Practitioner (Moderate Weight)

| Source Type | Examples | Trust Level |
|-------------|----------|-------------|
| Trade Forums | Paint Talk, Contractor Talk | Moderate — real-world experience, variable quality |
| Experienced Contractor Input | Field notes, interviews | Moderate — valuable but anecdotal |
| YouTube/Training Videos | Manufacturer demos, contractor tutorials | Moderate — verify against Tier 1/2 |
| Supply House Guidance | Local paint store recommendations | Moderate — may reflect regional practice |

**Tier 3 sources provide practical insight but require corroboration.**

#### Tier 3 Explicitly Forbidden Uses

Tier 3 sources may NEVER be used for:
- Production benchmarks or rates
- "Fastest way" claims
- Cost comparisons
- Estimating advice or heuristics
- Pricing guidance

#### Corroboration Rule

> **Tier 3 insights MUST be corroborated by Tier 1 or Tier 2 before inclusion in doctrine.**

### Tier 4 — General (Low Weight)

| Source Type | Examples | Trust Level |
|-------------|----------|-------------|
| General Web Content | Blog posts, DIY sites | Low — verify everything |
| AI-Generated Summaries | ChatGPT, Claude responses without citations | Low — use only as starting point |
| Social Media | Facebook groups, Reddit threads | Low — high noise, occasional signal |

**Tier 4 sources may identify topics to research but are never cited as authority.**

---

## Drywall & Substrate Sources (Supporting Only)

Drywall research is allowed only where it affects paint outcomes.

### Approved Drywall Sources (Tier 1 for their domain)

| Source | Use For |
|--------|---------|
| USG | Surface readiness, joint compound behavior, sanding compatibility |
| CertainTeed | Board types, moisture considerations |
| National Gypsum | Surface prep, primer compatibility |
| AWCI | Industry standards for wall/ceiling finish levels |

### Explicit Exclusions — NOT for Research

- Framing methods or productivity
- Drywall hanging productivity
- Taping labor rates
- Drywall estimating models
- Drywall scope definitions

### Rule

> **Drywall sources may NOT redefine painting scope.**
> They only explain what painters may encounter.

---

## Citation Requirements

### Every Claim Must Have a Citation

Format: `[Source Name, Source Type, Date if known]`

**Good:**
> "Latex paint should not be applied below 50°F" [Sherwin-Williams Duration PDS, Tier 1, 2024]

**Bad:**
> "Latex paint should not be applied below 50°F" (no citation)

### Multiple Sources Strengthen Claims

When Tier 2 or Tier 3 sources align with Tier 1, note the corroboration:

> "Minimum 4 hours recoat time for Duration in normal conditions"
> [SW Duration PDS, Tier 1] — corroborated by [Paint Talk forum consensus, Tier 3]

### Conflicting Sources Must Be Surfaced

When sources disagree, document the conflict explicitly:

```
CONFLICT DETECTED:
- Claim A: "24-hour cure before tape removal" [Benjamin Moore TDS, Tier 1]
- Claim B: "Remove tape while paint is tacky" [PDCA Best Practices, Tier 2]
- Resolution: Context-dependent — BM guidance is for delicate surfaces;
  PDCA guidance is for standard tape on cured adjacent surfaces
- Confidence: Medium — needs field validation
```

### Manufacturer vs. Trade Practice Conflicts

When manufacturer guidance conflicts with common trade practice:

1. **Document both** — do not suppress trade practice
2. **Manufacturer guidance controls** — unless overridden by explicit human doctrine
3. **Flag for human review** — if trade practice is widespread and manufacturer guidance seems impractical

```
CONFLICT EXAMPLE:
- Manufacturer: "Allow 4 hours between coats" [SW Duration PDS, Tier 1]
- Trade Practice: "Most painters recoat in 2 hours in good conditions" [Paint Talk, Tier 3]
- Resolution: Manufacturer controls for spec defaults; trade practice noted as common deviation
- Human Override: None — use manufacturer guidance
```

---

## Forbidden Conclusions

The Spec Researcher MUST NOT conclude or recommend:

| Forbidden Area | Why | Who Owns It |
|----------------|-----|-------------|
| Production rates (SF/hr, LF/hr) | Requires field calibration | Estimation Engineer |
| Labor time estimates | Requires field calibration | Estimation Engineer |
| Estimating heuristics | Requires field calibration + human doctrine | Estimation Engineer + Human |
| Crew sizing | Operational decision | Estimation Engineer |
| Material pricing | Market-dependent | Runtime/Business Logic |
| Specific product selection | Project-dependent | Materials Manager + Runtime |
| Task sequencing | SOP design | SOP Librarian |

### What the Researcher CAN Conclude

| Allowed Area | Example |
|--------------|---------|
| Physical properties | "Alkyd requires longer cure than latex" |
| Compatibility rules | "Do not apply latex directly over fresh alkyd" |
| Failure modes | "Insufficient flash time causes solvent pop" |
| Prep requirements | "Glossy surfaces require scuff sanding for adhesion" |
| Quality indicators | "QL-5 typically requires sanding between coats" |
| Environmental constraints | "Low-VOC required in occupied spaces per EPA" |

---

## Uncertainty Handling

### Confidence Levels

Every finding must declare confidence:

| Level | Meaning | Source Requirement |
|-------|---------|-------------------|
| High | Well-established, multiple Tier 1/2 sources agree | 2+ Tier 1, or 1 Tier 1 + 2 Tier 2 |
| Medium | Generally accepted, some variation | 1 Tier 1, or 2+ Tier 2 |
| Low | Practitioner knowledge, limited documentation | Tier 3 only, or conflicting sources |
| Unknown | Insufficient data to conclude | Flag for future research |

### Surfacing Contradictions

Contradictions are VALUABLE. Do not hide them.

```
UNCERTAINTY FLAG:
- Topic: Recoat window for waterborne alkyd
- Finding: Sources disagree (2-4 hours vs 4-8 hours)
- Likely cause: Temperature/humidity sensitivity
- Recommendation: Document as variable, defer to PDS for specific product
- Confidence: Low
```

### Assumptions Must Be Explicit

When making assumptions to bridge gaps:

```
ASSUMPTION:
- Statement: "Assume 350 SF/gal spread rate for flat latex on smooth drywall"
- Basis: Mid-point of manufacturer range (300-400 SF/gal)
- Risk: Actual coverage varies by application method and painter technique
- Recommendation: Use conservative end (300 SF/gal) for estimation
```

---

## Research Output Format

Deep research produces a structured output:

```json
{
  "research_id": "RSH_<topic>_<date>",
  "topic": "Description of research question",
  "scope": "What was investigated",
  "sources_consulted": [
    { "name": "...", "tier": 1, "type": "PDS", "date": "...", "url": "..." }
  ],
  "findings": [
    {
      "claim": "...",
      "citations": ["..."],
      "confidence": "high|medium|low",
      "notes": "What multiple reliable sources agree on"
    }
  ],
  "constraints": [
    {
      "constraint": "...",
      "source": "...",
      "type": "manufacturer|regulatory|industry_standard",
      "notes": "Non-negotiable requirements"
    }
  ],
  "variations": [
    {
      "topic": "...",
      "how_practice_differs": "...",
      "sources": ["..."],
      "notes": "Where professional practice differs from official guidance"
    }
  ],
  "contradictions": [
    {
      "topic": "...",
      "conflicting_claims": ["...", "..."],
      "sources": ["...", "..."],
      "resolution": "..." | null,
      "recommendation": "..."
    }
  ],
  "uncertainties": [
    {
      "topic": "...",
      "gap": "...",
      "impact": "...",
      "recommendation": "..."
    }
  ],
  "assumptions_made": [
    {
      "statement": "...",
      "basis": "...",
      "risk": "..."
    }
  ],
  "explicit_exclusions": [
    "What this research explicitly does NOT define or conclude..."
  ],
  "doctrine_recommendations": [
    "Recommendation for updating doctrine docs..."
  ],
  "notes_for_other_agents": {
    "materials_manager": ["..."],
    "sop_librarian": ["..."],
    "estimation_engineer": ["..."]
  },
  "follow_up_research_needed": ["..."]
}
```

---

## Research Flow

```
1. Define research question clearly
2. Identify source types needed (Tier 1 required for authoritative claims)
3. Gather sources, noting tier for each
4. Extract findings with citations
5. Identify contradictions — do not resolve prematurely
6. Document uncertainties explicitly
7. State assumptions made
8. Recommend doctrine updates (NOT spec changes)
9. Flag items for other agents
10. Identify follow-up research if gaps remain
```

---

## What Deep Research Does NOT Do

- Does NOT write or modify specs
- Does NOT set production rates or labor times
- Does NOT make pricing decisions
- Does NOT override field-validated contractor input
- Does NOT conclude without citation
- Does NOT hide contradictions or uncertainties

---

## References

- PaintFactor DevOS architecture
- PDCA Industry Standards
- MPI (Master Painters Institute) classification system
