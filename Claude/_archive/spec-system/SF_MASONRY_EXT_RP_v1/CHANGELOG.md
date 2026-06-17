# SF_MASONRY_EXT_RP_v1 Changelog

## [1.0.0] - 2026-03-15

### Initial Release
First exterior masonry repaint spec. Combined assessment + prep + prime + finish in single mobilization.

**Key Features:**
- 48 tasks across 10 modules (7 owned MOD_MSRP_* + 1 shared MOD_RRP_EXT_CONTAINMENT + 2 finish modules)
- Context prefix: MSRP (MaSonry RePaint) — no collision with NC MSRY prefix
- 6 material systems (2 RP-specific primers + 1 reused NC primer + 3 reused NC finishes)
- 5 coverage profiles, 20 consumables, 10 compatibility rules
- 7 factor modifiers with stacking partition (prep pool vs coating pool)
- 4 round configurations, 8 protection zones
- 1 paintable item (ITM_MASONRY_WALL, SF-based) reused from NC
- 7 configuration dimensions (quality_tier, substrate_state, condition_scale, masonry_type, coating_system, application_method, sheen)

**Task Breakdown:**
- 10 DIRECT transfers from NC (re-keyed TSK_MSRY_ to TSK_MSRP_)
- 8 MODIFIED transfers from NC (adjusted rates/scope for RP context)
- 19 RP_NEW tasks (assessment, condition-driven prep, state-driven primers)
- 5 SHARED_RRP tasks (lead-safe containment module)
- 6 NC tasks NOT_APPLICABLE (cure verify, form-release, block filler, NC moisture test, NC efflorescence)

**Masonry RP-Specific Departures from NC:**
- Power washing IS allowed (1500-3000 PSI) — major RP prep tool, dual cleaning + paint removal
- Block filler NOT applicable (already filled during NC)
- Efflorescence treatment adapted for RP (acid on existing paint vs bare masonry)
- 7-point assessment module (condition, chalk, adhesion, efflorescence, moisture, mortar, crack)
- State-driven primer selection (chalk-binding, alkali-resistant spot, acrylic stain-block)
- Condition scale GOOD/FAIR/POOR drives prep intensity modifier
- RRP higher activation probability than FC siding (masonry buildings commonly pre-1978)
- Caulk scope limited to masonry-to-trim junctions (no butt joints like siding)

**Masonry RP vs Siding RP Key Differences:**
- Power washing allowed (masonry) vs prohibited (FC siding) vs lower pressure (wood siding)
- spray_backroll in both NC and RP (masonry) vs method change NC-to-RP (FC siding)
- Efflorescence as primary failure mode (masonry-specific)
- Mortar joint assessment (masonry-specific, outside painting scope)
- Elastomeric coating option on CMU/concrete (not on brick/limestone)
- No siding profile/texture modifiers — replaced by masonry_type + texture modifiers
- Less caulking scope (no butt joints on masonry)

**QA Result:** PASS (2 minor issues acknowledged — worst-case stacking exceeds 4.0x cap for extreme combination, new PS keys need registry formalization)
