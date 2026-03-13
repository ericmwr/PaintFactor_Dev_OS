# Exterior Doors Doctrine

> **Topic 12** — NC Priority
> Sources: NotebookLM deep research (60+ web sources), imported references
> Generated: 2026-03-07

---

## 1. Door Substrate Types and Construction

### Steel Doors (Hollow Metal)
- Fabricated from hot-rolled, cold-rolled, zinc-coated (galvanized/galvannealed), or stainless steel
- Internal stiffeners, honeycomb cardboard, or polyurethane foam cores
- Seams create expansion joints that stress coating systems

### Fiberglass Doors
- Composite polymers designed to mimic wood
- Two primary grades:
  - **Stain-grade**: Deep textured wood-grain surface
  - **Paint-grade**: Textured or smooth

### Wood Doors
- Solid timber with floating panels to accommodate natural expansion/contraction
- Hygroscopic — continuously exchanges moisture with environment
- Highly susceptible to warping without proper sealing

---

## 2. Surface Preparation Protocols by Condition

### Cleaning & Degreasing

| Substrate | Cleaning Method | Prohibited |
|-----------|----------------|-----------|
| Steel | Solvent cleaning (xylene or acetone) + TSP detergent wash | — |
| Fiberglass | Mild dish soap or denatured alcohol | **Never hydrocarbon-based solvents** (damages resin) |

### Mechanical Debridement (Steel)
- Active oxidation: remove to bare metal using power tool cleaning (SSPC-SP3) or commercial blast cleaning (SSPC-SP6)
- Scratches/rust spots: feather with 300-grit until transition is imperceptible
- Dents: sand with 80-grit, fill with 2-component body filler, finish-sand with 240/300-grit

### Fiberglass Prep
- **Do not sand textured fiberglass doors** — destroys wood-grain profile

---

## 3. Primer and Coating System Selection

### Primer by Substrate

| Substrate | Primer Type | Purpose |
|-----------|------------|---------|
| Carbon steel | Zinc-rich epoxy or alkyd | Sacrificial barrier protection |
| Galvanized/aluminum | Vinyl wash or acrylic etching | Chemical bond promotion |
| Stainless steel | Non-sanding epoxy | Adhesion on passive surface |
| Pre-primed/factory steel | Universal acrylic DTM | Compatibility with existing primer |

### Topcoat Selection

| Substrate | Topcoat | Notes |
|-----------|---------|-------|
| Steel | High-build polyurethanes, polysiloxanes, or exterior acrylic latex | Maximum UV and abrasion resistance |
| Fiberglass | **100% acrylic latex enamel (satin/low-lustre)** | Must be permeable — allows trapped manufacturing gases to escape without blistering |
| Wood | High-quality stains or clear coats with heavy UV inhibitors | Moisture management critical |

**Oil-based paints strictly not recommended on fiberglass.**

### LRV and IR-Reflective Coatings
- Colors with LRV < 30 on high-exposure doors: **Infrared Reflective (IR) "cool paint" pigments mandatory**
- Drops surface temperatures 20-30 degrees F
- Prevents wood joint failure, steel thermal warping, and fiberglass outgassing

---

## 4. Production Rates by Door Type and Method

Repaint projects add 30-100% more labor than new doors due to hardware removal, scraping, and feathering.

| Door Type | Hours per Unit |
|-----------|---------------|
| Single slab (new construction) | 1.0-2.0 |
| Single 6-panel (standard repaint) | 2.5-4.5 |
| Grand entry (sidelites/transom) | 5.0-10.0 |
| Historic restoration (full strip) | 12.0-20.0 |

---

## 5. Failure Modes Specific to Exterior Doors

| Failure Mode | Substrate | Mechanism |
|-------------|-----------|-----------|
| **Outgassing blisters** | Fiberglass | Trapped manufacturing vapors released over years; non-breathable oil coatings trap gas under sun heat |
| **Thermal expansion/warping** | All | Low-LRV dark paint without IR-reflective properties → excessive heat gain → expansion, joint separation, checking |
| **Underfilm corrosion** | Steel | Rust painted over continues electrolytic action beneath film; moisture travels via capillary action under primer |
| **Moisture wicking** | Wood | Rails (top/bottom ends) act as capillary networks; unsealed end-grain causes massive swelling |

---

## 6. Hardware and Weatherstrip Protection

### Hardware Protocol
- **Best practice**: Total removal of all locking hardware, strike plates, hinges, address numbers before painting
- Masking discouraged — areas beneath hardware must be sealed to prevent moisture infiltration

### Weatherstripping Protocol
- **Never paint weatherstripping** — paint destroys elasticity, causes brittleness and seal tearing
- Modern friction-fit stripping: gently pull out before painting, re-insert after finish is completely dry
- If removal impossible: push tape deep into gap between jamb and stripping with putty knife

---

## 7. Quality Standards for Door Finish

### Dry Film Thickness (DFT)
- Standard exterior door system: **3.0-5.0 mils total** (typically 1.5 mils primer + 1.5-2.0 mils finish)
- Verify with magnetic, eddy current, or ultrasonic gauges

### Six-Side Sealing Mandate
- All six sides of wood door must be finished within specified timeframes (2 weeks to 30 days)
- Failure to seal = warranty voidance

### Gloss Ratings (Steel/Hollow Metal)
- ANSI A250.8 (SDI 100): maximum paint gloss = 20% reflectance (60-degree gloss meter)
- High-gloss emphasizes factory welding marks and surface imperfections ("show-through")

### PCA Surface Prep Levels
- Level 1: Basic cleanliness/adhesion
- Level 2: Standard (default if unspecified)
- Level 3: Superior (premium residential)
- Level 4: Supreme (cosmetic perfection, defects > 1/32" filled)
- Level 5: Restoration (full stripping)

---

## PaintFactor Integration Notes

### Production Rate Keys
- `RATE_DOOR_NEW_SLAB` = 1.0-2.0 hrs/EA
- `RATE_DOOR_REPAINT_PANEL` = 2.5-4.5 hrs/EA
- `RATE_DOOR_GRAND_ENTRY` = 5.0-10.0 hrs/EA
- `RATE_DOOR_RESTORATION` = 12.0-20.0 hrs/EA

### Decision Logic

| Condition | Action |
|-----------|--------|
| Color LRV < 30 AND Exposure = High | Mandatory IR-reflective coating upcharge |
| Substrate = Fiberglass | Lock topcoat = 100% acrylic latex; prohibit oil-based |
| Substrate = Fiberglass AND Finish = Stain | Trigger gel stain + clear topcoat requirement |
| Door Configuration = Sidelites + Transom | Switch to Grand Entry module (5.0-10.0 hrs) |
| Damage Profile = Rust/Dents (Steel) | Add SSPC-SP3/SP6 debridement + body filler + feathering time |
| Condition = Repaint | Apply +30-100% labor modifier over new construction rate |
| Substrate = Wood | Auto-add six-side sealing task |

### Modifier Keys
- `MOD_DOOR_REPAINT` = 1.30-2.00 (repaint labor premium)
- `MOD_DOOR_DARK_COLOR` = IR-reflective coating upcharge (LRV < 30)
- `MOD_DOOR_COMPLEXITY` = grand entry vs. single slab multiplier

### Hardware/Protection Tasks
- Auto-add hardware removal task for all exterior door specs
- Auto-add weatherstrip protection task
- Six-side seal verification checkpoint for wood doors
