# SF_DECK_EXT_RP_v1 — Exterior Deck Repaint/Restain

## v0.1.0 — 2026-03-15

### Initial Draft

First RP spec for exterior deck surfaces. Sibling to SF_DECK_EXT (NC).

**Pipeline**: Research -> Resolution -> Materials -> SOP -> Production -> QA -> Spec -> CHANGELOG

**Key Design Decisions**:

1. **Assessment-first workflow** — Mandatory condition assessment, coating type ID, adhesion testing, moisture testing, and rot probe before committing to prep strategy. Follows SF_TRIM_EXT_RP_v1 assessment pattern adapted for deck.

2. **Coating_type as primary dimension** (not quality_tier) — Inherited from NC. Values: semi_transparent, semi_solid, solid_stain. Clear_sealer excluded from RP scope (maintenance-only reapplication).

3. **Existing_coating_condition replaces wood_condition** — RP-specific dimension: sound, worn, failing, peeling. Drives FAC_DKRP_EXISTING_CONDITION prep modifier (1.00x-2.00x).

4. **Existing_coating_type for compatibility** — penetrating_stain, solid_stain, paint, unknown. Enforces compatibility matrix (penetrating over film = FAIL, strip mandatory).

5. **Application rates identical to NC** — Once prepped, stain application is surface-history-independent. Prep is the RP cost driver.

6. **Chemical restoration reused from NC** — Same strip/brighten/rinse protocol, activated by existing_coating_condition (failing/peeling) instead of wood_condition (weathered).

7. **Bonding primer for incompatible existing** — SYS_EXT_DKRP_BONDING_PRIMER conditional on existing_coating_type = paint or unknown with solid_stain target.

8. **Solid stain delamination risk compounded on RP** — Each coat adds film thickness. Documented as major risk. >10 mil DFT = strip trigger (documentation-only, not engine-enforced in v0.1.0).

**Artifact Summary**:
- 9 modules, 43 tasks (all binary)
- 6 material systems (3 stain + 1 bonding primer + 2 prep chemical)
- 3 factor modifiers (coating_type, existing_condition, substrate_type)
- 2 round configurations
- 5 protection zones (reused from NC)
- 8 variants, 13 PaintScope inputs, 4 paintable items
- Max modifier stack: 2.88x (under 4.0x cap)

**QA Result**: pass_with_warnings (4 issues: 0 critical, 2 major, 2 minor)
- ISS_DKRP_001: DFT measurement not engine-enforced (documentation-only)
- ISS_DKRP_002: Multi-layer stripping rate uncertainty for 3+ coat decks
- ISS_DKRP_003: DKRP prefix compressed but unambiguous
- ISS_DKRP_004: Failed clear sealer edge case documented

**Registry Additions Proposed**: 5
- SF_DECK_EXT_RP (spec family)
- PS_EXT_META.ENUM.EXISTING_COATING_CONDITION
- PS_EXT_META.ENUM.EXISTING_COATING_TYPE
- IN_ENUM_EXISTING_COATING_CONDITION
- IN_ENUM_EXISTING_COATING_TYPE
- FAC_DKRP_EXISTING_CONDITION
