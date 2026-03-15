# SF_FOUNDATION_EXT_RP_v1 Changelog

## [1.0.0] - 2026-03-15

### Initial Release
First exterior foundation repaint spec. Combined assessment + prep + prime + finish in single mobilization. Simplest exterior RP spec in the system.

**Key Features:**
- 28 tasks across 6 modules (all owned MOD_FNRP_*)
- Context prefix: FNRP (FouNdation RePaint) — no collision with NC FNDN prefix
- 5 material systems (2 RP-specific primers + 3 reused NC systems)
- 5 coverage profiles, 14 consumables, 6 compatibility rules
- 2 factor modifiers (foundation_type + condition_scale), max stack 1.84x
- 4 round configurations, 3 protection zones
- 1 paintable item (ITM_FOUNDATION_WALL, SF-based) reused from NC
- 6 configuration dimensions (quality_tier, substrate_state, condition_scale, foundation_type, coating_type, application_method)

**Task Breakdown:**
- 9 DIRECT transfers from NC (re-keyed TSK_FNDN_ to TSK_FNRP_)
- 3 MODIFIED transfers from NC (rate adjustments for RP context)
- 16 RP_NEW tasks (assessment, condition-driven prep, state-driven primers, RP cleanup)
- 8 NC tasks NOT_APPLICABLE (form-release, bug hole, surface profile, block filler x2, primer x3)

**Foundation RP-Specific Departures from NC:**
- 4 substrate states (vs 1 NC state SS_EXT_BARE_MASONRY)
- State-driven primer selection (chalk-binding, alkali-resistant spot, acrylic stain-block)
- Condition scale GOOD/FAIR/POOR drives prep intensity (1.0x/1.3x/1.6x)
- Pressure wash serves dual purpose: cleaning + paint removal (NC was cleaning only)
- Scraping/feathering failing paint (RP-specific, not present in NC)
- Grade-line gap assessment for incorrect previous caulking (RP-specific)
- No block filler (NC-only, already applied)
- No form-release agent removal (NC-only, not present in RP)
- No bug hole patching (NC-only, not recurring)
- No surface profile preparation (NC-only, already established)
- Customer walkthrough (RP occupied home context)
- Site debris cleanup (more debris from scraping)

**Foundation RP vs Masonry Wall RP Key Differences:**
- QT2-QT3 only (foundation) vs QT2-QT4 (masonry wall)
- No RRP (foundation modern practice) vs RRP high probability (masonry wall)
- No access modifier (ground-level) vs full access modifier set (masonry wall)
- MC 4% hard stop (foundation) vs MC 12% (masonry wall)
- 2 factor modifiers (foundation) vs 7 factor modifiers (masonry wall)
- 28 tasks (foundation) vs 48 tasks (masonry wall)
- 3 protection zones (foundation) vs 8 protection zones (masonry wall)
- No caulking scope (foundation) vs masonry-to-trim caulking (masonry wall)
- brush_roll primary (foundation) vs spray_backroll primary (masonry wall)
- No interstage module (foundation) vs interstage module (masonry wall)

**QA Result:** PASS (1 minor issue — condition scale modifiers need field calibration)