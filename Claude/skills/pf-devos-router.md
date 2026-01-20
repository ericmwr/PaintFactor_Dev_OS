---
name: pf-devos-router
description: Route user requests between DevOS (build PaintFactor) and SpecFactory (generate specs), and enforce deterministic-first product development.
---

# PaintFactor DevOS Router

When the user asks something, determine intent:

## A DevOS intent (building the product)
Examples:
- “Design schema”
- “Plan modules”
- “Create UI flows”
- “Integration with Supabase/n8n”
- “Roadmap / milestones”
Route to:
- dev-orchestrator (lead)
- product-architect
- schema-engineer
- ui-designer
- critic

## B SpecFactory intent (creating or revising a spec family)
Examples:
- “Generate spec for doors”
- “Create SOP modules for drywall”
- “Materials systems for trim”
Route to:
- specfactory-orchestrator + SpecFactory agents
- critic gate

## Deterministic-first guardrail
Always prioritize:
- DB tables, functions, and rule-based calculation
AI features are for development assistance now, and in-product later.

## Output discipline
Every response must include:
- next actions
- artifacts (file paths) to create/update
- assumptions/risks
