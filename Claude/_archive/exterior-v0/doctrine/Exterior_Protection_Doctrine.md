# Exterior Protection Doctrine

**Spec Family ID:** SF_EXT_PROTECTION
**Status:** DRAFT
**Version:** 0.1.0
**Effective Date:** 2026-02-20
**Source:** Protection_and_Masking_Doctrine.md, PaintFactor_OS.md

This document defines how painting professionals protect landscape, hardscape, equipment, glass, hardware, and grade-level surfaces during exterior painting operations. AI agents generating exterior specs MUST follow this doctrine when defining protection zones, protection levels, and protection tasks.

**Related:** See `Protection_and_Masking_Doctrine.md` for shared masking principles (mask level definitions, masking paper/film sizes, plastic sheeting types). See `Interior_Protection_Doctrine.md` for interior scopes — interior zone IDs do not apply here.

---

## 1. Scope

### 1.1 What This Doctrine Covers

This doctrine governs protection requirements for exterior painting operations, including:

- Landscape: plants, garden beds, lawn areas within overspray radius
- Hardscape: patios, walkways, driveways, steps
- Decks and porch floors when adjacent to spray zones
- HVAC equipment: condensers, heat pumps, AC units
- Utility panels: electrical panels, gas meters, water shutoffs, hose bibs
- Glass: exterior faces of windows, door glass panels, sidelites, french door lites
- Hardware: exterior locksets, knockers, kick plates, hinges, address numbers
- Light fixtures: exterior sconces, lanterns, carriage lights
- Vehicles and stored property within overspray radius
- Grade-level surfaces below spray elevations

### 1.2 What Is Excluded

| Excluded Scope | Correct Doctrine |
|----------------|-----------------|
| Interior floor, furniture, fixture protection | `Interior_Protection_Doctrine.md` |
| Commercial exterior | Commercial Exterior Protection Doctrine (future) |
| Shop/booth work (cabinets, doors off-site) | Shop Protection protocols |

> **Note:** Interior zone IDs `floor_perimeter`, `wall_adjacent`, and `fixture_covers` are interior constructs. They do NOT apply to exterior scopes and must NOT appear in exterior spec protection zone declarations.

### 1.3 Key Principles

- Protection is project-level: zones are resolved across all active exterior specs, deduplicated, and the highest protection level wins when multiple specs claim the same zone.
- Exterior overspray reaches farther than interior: airless spray outdoors has a 10–20 ft drift radius in calm conditions; 30+ ft in a light breeze. All items within the overspray radius must be protected or cleared before spraying begins.
- Grade vs. elevation distinction: grade-level protection (landscape, hardscape, vehicles) differs operationally from elevation masking (glass, hardware, fixtures) and must be planned separately.

---

## 2. Protection Philosophy (Exterior)

### 2.1 Project-Level Zone Resolution

Protection zones are collected across all active exterior specs for a project. Zones are deduplicated by `zone_id`; when multiple specs claim the same zone, the highest `protection_level` wins.

Per `Protection_and_Masking_Doctrine.md`: protection is established once per zone, not once per spec. Setup and teardown are calculated at project level, not repeated per spec.

### 2.2 Grade vs. Elevation

| Category | Description | Planning Approach |
|----------|-------------|-------------------|
| Grade-level | Landscape, hardscape, vehicles, stored property | Set up before elevation work begins; cleared or covered at grade |
| Elevation | Glass, hardware, fixtures, utility panels | Masked at the surface being protected; masking applied per elevation face |

Grade-level protection is typically established once per project or per major elevation run. Elevation masking is applied per face before spraying that face.

### 2.3 Overspray Radius by Application Method

| Application Method | Calm Conditions | Light Breeze |
|-------------------|-----------------|--------------|
| Airless spray | 10–20 ft drift radius | 30+ ft |
| HVLP spray | 5–10 ft drift radius | 15–20 ft |
| Brush/roll | Drip zone only (1–2 ft) | Not materially affected |

All items within the applicable radius must be protected at the appropriate level or physically moved/cleared before application begins.

### 2.4 Weather Interaction

Wind is the primary material hazard for exterior masking:

- Wind lifts masking tape from glass, trim, and fixtures.
- Plastic sheeting on landscape can be displaced overnight.
- Masking integrity must be verified at the start of each spray day.
- Re-secure or replace lifted masking before any spray application begins.
- Do not spray in sustained winds above 15 mph regardless of masking status.

### 2.5 Temporal Planning

Exterior protection is typically set up once per elevation face, not per room as in interior work. A full-house exterior project proceeds by elevation:

1. Establish all grade-level protection (landscape, hardscape) for the elevation face being worked.
2. Mask elevation targets (glass, hardware, fixtures) on that face.
3. Spray the face.
4. Remove elevation masking while paint is slightly tacky (clean glass edge).
5. Remove grade-level tarps after tack-dry to prevent wind damage to fresh paint.
6. Move to the next elevation face and repeat.

---

## 3. Exterior Protection Zone Definitions

Each zone below specifies: zone ID, description, typical trigger condition, valid protection levels, and notes. All zone IDs use the `ext_*` prefix or are unambiguously exterior-only plain names.

### 3.1 Landscape Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_landscape_adjacent` | Plants, garden beds, and lawn within 4 ft of the structure | Any spray application; any drip risk from brush/roll above grade | `edge_only`, `light_mask`, `full_cover` |
| `ext_landscape_full` | Larger landscape areas within overspray radius when spraying large elevation runs | Airless spray on large wall field; broad siding spray passes | `full_cover` |

**Notes:**
- `ext_landscape_adjacent` covers the immediate perimeter zone that receives direct drip risk regardless of application method.
- `ext_landscape_full` is activated when spray is the application method and elevation runs are large enough for overspray to reach beyond the 4 ft immediate perimeter.
- Canvas tarps are preferred over plastic for plants (allows air circulation; reduces heat buildup under cover).

### 3.2 Hardscape Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_hardscape_patio` | Concrete or brick patio below or adjacent to spray zone | Spray application above patio; drip risk from overhead brush/roll | `edge_only`, `light_mask`, `full_cover` |
| `ext_hardscape_walk` | Walkway or sidewalk at grade adjacent to the structure | Spray or drip risk from above | `edge_only` |
| `ext_driveway` | Driveway surface adjacent to the structure | Spray drip; overspray from adjacent elevation | `edge_only`, `full_cover` |

**Notes:**
- `ext_hardscape_walk` is typically `edge_only` (canvas runner or rosin paper strip along the foundation edge) because walkways are hard, cleanable surfaces with minimal drip risk beyond the immediate edge.
- `ext_driveway` may require `full_cover` tarp when spraying adjacent garage elevation or when airless spray is used near the driveway edge.

### 3.3 Glass and Opening Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_glass_window` | Window glass (exterior face) — protection target, not painted | Any application method near windows; spray always triggers | `light_mask`, `heavy_mask`, `full_mask` |
| `ext_glass_door` | Door glass panels — french door lites, storm door glass, sidelites | Any application near doors with glass panels | `light_mask`, `heavy_mask`, `full_mask` |

**Notes:**
- These zones correspond to surface IDs `window_glass_ext` and `door_slab_ext` glass areas in `Surface_Vocabulary_Reference.md §Exterior Surfaces`.
- Airless spray always requires at minimum `heavy_mask`; `full_mask` is the standard for spray passes across the glass plane.
- Tape must be removed while paint is still slightly tacky to achieve a clean glass-to-frame edge. Waiting until full cure risks paint film tearing at the tape line.

### 3.4 Hardware and Fixture Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_door_hardware` | Exterior locksets, deadbolts, knockers, kick plates, hinges | Any application near exterior doors | `light_mask`, `full_mask` |
| `ext_light_fixture` | Exterior light fixtures, sconces, lanterns, carriage lights | Spray application on adjacent wall or soffit surface | `light_mask`, `full_mask` |
| `ext_house_numbers` | Exterior address numbers and mailbox face | Spray application | `light_mask` |

**Notes:**
- `ext_door_hardware` corresponds to protection targets adjacent to `door_slab_ext` and `door_frame_ext` surfaces.
- Hardware bags (small plastic bags secured with tape) are the standard material for locksets; kick plates receive tape-only coverage.
- Exterior fixtures that cannot be removed (hardwired) must be masked; removal is preferred when easily accomplished without electrical work.
- `ext_house_numbers` are typically small enough for tape-only `light_mask`; individual number masking with painters tape is standard.

### 3.5 Mechanical and Utility Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_hvac_unit` | Exterior HVAC condenser, AC unit, or heat pump | Spray application within 20 ft of unit | `heavy_mask`, `full_cover` |
| `ext_utility_panel` | Electrical panel, gas meter, water shutoff, hose bibs | Any application near panels or meters | `light_mask` |
| `ext_satellite_dish` | Satellite dish, antenna, or exterior communication mount | Spray application | `light_mask`, `full_cover` |

**Notes:**
- `ext_hvac_unit` corresponds to surface ID `ext_hvac_unit` in `Surface_Vocabulary_Reference.md §Protection Targets`.
- HVAC units must not have their intake sealed. Cover the unit body and condenser coils with 6-mil plastic sheeting; leave adequate airflow clearance and do not operate HVAC while adjacent surfaces are being painted. See Section 7.4 for HVAC safety protocol.
- `ext_utility_panel` corresponds to surface ID `ext_utility_panel` in `Surface_Vocabulary_Reference.md §Protection Targets`. Do NOT fully enclose utility panels with plastic — fire and emergency access must be maintained at all times. Tape-only masking of the panel face is the maximum allowed coverage.
- `ext_satellite_dish` may require `full_cover` tarp when located directly on an elevation face being spray-painted; `light_mask` tape-out is adequate when dish is located at the edge of the overspray zone.

### 3.6 Vehicle and Property Zones

| Zone ID | Description | Trigger | Valid Protection Levels |
|---------|-------------|---------|------------------------|
| `ext_vehicle_adjacent` | Vehicles parked within overspray radius | Any spray application | `full_cover` (if cannot be moved; moving is strongly preferred) |
| `ext_stored_property` | Outdoor furniture, grills, equipment, potted plants within spray radius | Spray application | `full_cover` (move preferred; cover if cannot move) |

**Notes:**
- Vehicles should be moved out of the overspray radius before spray begins. If a vehicle cannot be moved, it must receive a large plastic tarp (9×12 or 12×15) and be noted in scope documentation. Vehicle coverage is not included in standard pricing if the vehicle is the owner's responsibility to move; note this in the scope agreement.
- `ext_stored_property` items are always preferably moved to a protected area. If they cannot be moved (e.g., large built-in BBQ, heavy planter), they require `full_cover` tarp.

---

## 4. Protection Level Definitions (Exterior Application)

These protection levels are drawn from the canonical `protection_level` enum. Exterior-specific application guidance is added for each level.

| Level | Definition | Exterior Application |
|-------|------------|---------------------|
| `none` | No protection required | Items confirmed outside the overspray radius; brush/roll drip zone only with hard cleanable surfaces below |
| `edge_only` | Drop cloth at grade or drip barrier | Canvas runner or rosin paper strip against foundation; rosin paper strip on patio edge; no taping required |
| `light_mask` | Tape plus minimal paper or plastic coverage | Window frame tape-out without masking the full glass pane; hardware bags on locksets; fixture trim tape; address number tape |
| `heavy_mask` | Tape plus large paper or plastic sheet | Full window masked including glass pane; HVAC unit covered with 6-mil plastic; satellite dish covered |
| `full_cover` | Full tarp coverage | Landscape tarps over plants and beds; vehicle tarps; patio furniture covered completely; driveway covered when spraying adjacent elevation |
| `full_mask` | Complete tape-out with no gaps; edge-to-edge coverage | Glass fully masked edge-to-edge with pre-taped film; utility panels tape-outlined on all sides (but not enclosed) |

> **Note:** The relationship between these exterior protection levels and the three canonical mask levels from `Protection_and_Masking_Doctrine.md` is: `light_mask` = edge protection, `heavy_mask` = buffer coverage, `full_mask` = encapsulation. `edge_only` and `full_cover` are grade-level tarp concepts without a direct interior equivalent.

---

## 5. Trigger Matrix by Application Method

### 5.1 Brush and Roll Only

| Zone ID | Required Level | Notes |
|---------|---------------|-------|
| `ext_landscape_adjacent` | `edge_only` | Drip risk from brush work above grade |
| `ext_hardscape_patio` | `edge_only` | Canvas runner at foundation edge |
| `ext_hardscape_walk` | `none` | Hard surface, cleanable; no significant drip reach |
| `ext_glass_window` | `light_mask` | Tape out window frame when cutting in adjacent siding or trim |
| `ext_glass_door` | `light_mask` | Tape out door glass when cutting in adjacent trim or door face |
| `ext_door_hardware` | `light_mask` | Tape or bag hardware when painting door or frame |
| `ext_light_fixture` | `light_mask` | Tape fixture base when painting adjacent wall |
| `ext_hvac_unit` | `none` | Brush/roll drip does not reach HVAC at standard setback |
| `ext_vehicle_adjacent` | `none` | Move vehicle; brush/roll drip radius does not require covering |
| `ext_stored_property` | `none` | Move items or confirm outside drip zone |

### 5.2 Airless Spray

| Zone ID | Required Level | Notes |
|---------|---------------|-------|
| `ext_landscape_adjacent` | `full_cover` within 10 ft; `edge_only` at 10–20 ft | Canvas or plastic tarp; cover before any spray pass |
| `ext_landscape_full` | `full_cover` | When spraying large elevation runs |
| `ext_hardscape_patio` | `full_cover` | Rosin paper or canvas over full patio surface |
| `ext_hardscape_walk` | `edge_only` | Canvas runner at foundation edge |
| `ext_driveway` | `edge_only` to `full_cover` | `full_cover` when spraying adjacent garage elevation |
| `ext_glass_window` | `full_mask` | All glass in spray path; pre-taped plastic film edge-to-edge |
| `ext_glass_door` | `full_mask` | Full mask all door glass in spray path |
| `ext_door_hardware` | `full_mask` | Bag locksets; tape plates and hinges |
| `ext_light_fixture` | `full_mask` | Tape and bag full fixture in spray path |
| `ext_house_numbers` | `light_mask` | Tape out individual numbers |
| `ext_hvac_unit` | `full_cover` | If within 20 ft of spray zone; 6-mil plastic, do not seal intake |
| `ext_utility_panel` | `light_mask` | Tape face only; do not enclose |
| `ext_satellite_dish` | `full_cover` | If on elevation face being sprayed |
| `ext_vehicle_adjacent` | `full_cover` or move | Move strongly preferred; cover if cannot move |
| `ext_stored_property` | `full_cover` or move | Move preferred; full tarp if cannot move |

### 5.3 HVLP Spray

HVLP spray uses the same zone set as airless but with a reduced drift radius (5–10 ft typical in calm conditions):

| Zone ID | Required Level | Notes |
|---------|---------------|-------|
| `ext_landscape_adjacent` | `light_mask` within 5 ft; `none` beyond 10 ft | Lighter overspray than airless |
| `ext_landscape_full` | `full_cover` only when spraying at close range in large passes | Assess per job |
| `ext_glass_window` | `heavy_mask` | Full pane covered; pre-taped film |
| `ext_glass_door` | `heavy_mask` | Full glass covered |
| `ext_door_hardware` | `full_mask` | Same as airless |
| `ext_light_fixture` | `light_mask` to `full_mask` | Assess proximity to spray pass |
| `ext_hvac_unit` | `heavy_mask` if within 10 ft | Reduced radius vs. airless |
| `ext_vehicle_adjacent` | `full_cover` or move | HVLP overspray still reaches vehicles within 10 ft |
| `ext_stored_property` | `full_cover` or move | Same as airless within HVLP radius |

---

## 6. Protection Materials

| Zone | Material | Notes |
|------|----------|-------|
| `ext_landscape_adjacent` | Canvas drop cloth or plastic tarp | Reusable canvas preferred for plants (air circulation); plastic for `full_cover` of large areas |
| `ext_landscape_full` | Plastic tarps (6-mil) or canvas drop cloths | Large area; canvas reusable across project |
| `ext_glass_window` | Pre-taped plastic film + blue masking tape | 18" or 24" rolls for full pane coverage; remove slightly tacky for clean edge |
| `ext_glass_door` | Pre-taped plastic film + blue masking tape | Size per door glass panel |
| `ext_door_hardware` | Blue masking tape + small plastic bags | Bag over handle and lockset body; tape kick plate and hinges |
| `ext_light_fixture` | Blue masking tape + small plastic bag | Cover globe or lens; tape trim base |
| `ext_house_numbers` | Blue masking tape | Individual number tape-out |
| `ext_hvac_unit` | 6-mil plastic sheeting + masking tape | Tape edges to prevent wind displacement; do not seal intake; do not operate HVAC while covered |
| `ext_utility_panel` | Blue masking tape only | Tape face outline; do NOT fully enclose — fire and emergency access required at all times |
| `ext_satellite_dish` | Plastic tarp or masking tape + plastic bag | Tarp for `full_cover`; tape-bag for `light_mask` |
| `ext_hardscape_patio` | Rosin paper or canvas drop cloth | Rosin paper absorbs drips; canvas is reusable and preferred for multi-day projects |
| `ext_hardscape_walk` | Canvas runner | Foundation-edge runner; reusable |
| `ext_driveway` | Canvas drop cloth or plastic tarp (9×12 or 12×15) | Canvas preferred for driveway edge runners |
| `ext_vehicle_adjacent` | Large plastic tarps (9×12 or 12×15) | Move vehicle if at all possible; tarp only as last resort |
| `ext_stored_property` | Plastic tarps | Move preferred; cover only if cannot be relocated |

---

## 7. Sequence Rules

### 7.1 Setup Sequence

Protection is established in this order before any spray application begins on an elevation face:

1. **Grade cover first**: Lay canvas or plastic tarps over landscape and hardscape within overspray radius.
2. **Glass mask**: Apply pre-taped plastic film to all window and door glass on the elevation face.
3. **Hardware covers**: Bag locksets; tape kick plates, hinges, and address numbers.
4. **Fixture covers**: Tape and bag exterior light fixtures and any visible sconces on the face.
5. **Overhead tarp** (if applicable): Secure tarps or drop cloths over patio or deck furniture below the elevation.
6. **HVAC and utility last**: Cover HVAC condenser with 6-mil plastic (verify intake is not sealed); tape utility panel face. Confirm no conflicts with equipment access before beginning spray.

### 7.2 Teardown Sequence

1. **Remove tape and film from glass while coat is slightly tacky**: This achieves a clean edge at the glass-to-frame boundary. Waiting until full cure risks tearing the paint film.
2. **Remove hardware bags and fixture covers** after the coat has flashed but before full cure.
3. **Remove grade-level tarps after tack-dry**: Removing tarps too soon risks wind displacement damaging fresh paint; removing too late risks paint bonding tarp edge to the tarp material.
4. **Remove HVAC and utility masking** after the adjacent surface has tack-dried; restore HVAC to normal operation.

### 7.3 Daily Protocol (Multi-Day Projects)

| Task | Timing | Purpose |
|------|--------|---------|
| Inspect all glass masking for lifted tape or film | Start of each spray day | Prevent overspray on glass through masking gaps |
| Re-secure or replace lifted tape and masking film | Before any spray pass | Ensure protection integrity |
| Inspect and re-secure landscape and hardscape tarps | Start of each spray day | Overnight wind can displace tarps |
| Document any overnight wind damage to fresh paint | Start of each spray day | Inform touch-up requirements |
| Verify HVAC is off before spraying adjacent surfaces | Before each spray session near HVAC | Equipment protection and safety |

### 7.4 HVAC Safety Protocol

- Do not operate HVAC while painting surfaces adjacent to or above the condenser unit.
- Cover the condenser unit body and coil fins with 6-mil plastic sheeting.
- Tape plastic edges to prevent wind displacement during spray passes.
- Do NOT seal the top intake or fully wrap the unit; adequate ventilation clearance must be maintained.
- Document HVAC unit location in scope notes so that the work schedule can account for a shutdown window.
- After painting is complete on the adjacent elevation face and paint has tack-dried, remove plastic covering and restore HVAC to normal operation.

---

## 8. Cross-References

### 8.1 Related Doctrine Documents

- `docs/Doctrine/Interior_Protection_Doctrine.md` — Interior protection zones and patterns. NOT applicable to exterior scopes. Interior zone IDs (`floor_perimeter`, `wall_adjacent`, `fixture_covers`) must not appear in exterior spec protection declarations.
- `docs/Doctrine/Protection_and_Masking_Doctrine.md` — Shared masking principles: mask level definitions (`light_mask`, `heavy_mask`, `full_mask`), masking paper and film sizes, plastic sheeting types, application method guidance. This exterior doctrine inherits those principles and extends them to exterior zones.

### 8.2 Reference Files

- `docs/Reference/Surface_Vocabulary_Reference.md §Exterior Surfaces` — Exterior surface IDs used as protection targets in this doctrine: `window_glass_ext`, `ext_hvac_unit`, `ext_utility_panel`, `landscape_adjacent`, `hardscape_patio`, and all paintable exterior surfaces whose adjacent zones define protection trigger conditions.
- `docs/Reference/Site_Condition_Vocabulary_Reference.md §wind_condition` — Wind-triggered protection upgrades: elevated wind conditions escalate required protection levels and may require deferral of spray application.

### 8.3 Future References (Phase 3)

- `docs/PaintScope/PaintScope_Exterior_Key_Catalog.md` — `PS_PROTECT_*` exterior keys for spec-level protection zone declarations (not yet authored as of 2026-02-20).

---

## 9. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-02-20 | Claude | Initial draft — exterior protection zones, trigger matrix, materials, sequence rules |
