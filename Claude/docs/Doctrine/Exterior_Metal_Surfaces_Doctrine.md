# Exterior Metal Surfaces Doctrine

> **Topic 17** — Later Tier
> Sources: NotebookLM deep research (85 web sources), imported references
> Generated: 2026-03-07

---

## 1. Metal Substrate Types

### Carbon Steel and Wrought Iron
- Highly susceptible to atmospheric oxidation (rust)
- Distinguish between treatable **surface rust** (thin, flaky layer) and **structural rot** (deep pitting, crumbling — may require replacement or welding)

### Aluminum (Gutters, Downspouts, Railings)
- Forms dense, transparent Al2O3 oxide layer that protects but resists paint adhesion
- New oxide layer forms in just **15 minutes** after cleaning — must prime immediately
- Subject to **high thermal expansion** — a 50-foot aluminum gutter can move over 0.75" during a 100 degree F temperature swing
- Requires highly flexible coatings

### Galvanized Steel
- Sacrificial zinc layer ages through three states:
  - **Newly galvanized**: Passivation oils requiring solvent removal
  - **Partially weathered**: Loose zinc oxides ("white rust")
  - **Fully weathered**: Stable zinc carbonate patina

---

## 2. Surface Preparation Standards (SSPC)

Surface preparation accounts for **60-80% of a coating's longevity**.

| Standard | Name | Description |
|----------|------|-------------|
| SSPC-SP 1 | Solvent Cleaning | Mandatory first step — removes oil, grease, dirt. If skipped, sanding smears oils deeper |
| SSPC-SP 2 | Hand Tool Cleaning | Scrapers, wire brushes — removes loose rust and peeling paint |
| SSPC-SP 3 | Power Tool Cleaning | Power grinders, wire wheels — removes loose rust and paint; tightly adherent material may remain |
| SSPC-SP 7 | Brush-Off Blast | Leaves tightly adherent materials |
| SSPC-SP 6 | Commercial Blast | Removes most contaminants |
| SSPC-SP 10 | Near-White Metal | 95% of surface free of contaminants |
| SSPC-SP 5 | White Metal Blast | 100% removal of all visible contaminants |
| SSPC-SP 11 | Power Tool to Bare Metal | All rust/paint removed; minimum 1.0 mil anchor pattern |

---

## 3. Primer Systems

### DTM (Direct-to-Metal) Primers
- **Acrylic DTM**: Excellent UV stability, flexibility, flash-rust resistance
- **Alkyd DTM**: Superior wetting/penetration of surface imperfections; becomes brittle and chalks over time

### Zinc-Rich Primers
- High concentration of zinc dust provides **galvanic (sacrificial) protection** to underlying steel

### Epoxy Primers
- Highly surface-tolerant, excellent adhesion, high-build moisture barrier
- **Lack UV resistance** — must be topcoated

### Specialized Non-Ferrous/Galvanized Primers
- **Etch (Wash) Primers**: Phosphoric acid microscopically etches slick surfaces
- **T-Wash treatments**: Copper salts turn zinc black to indicate proper etching
- **Acrylic Bonding Primers**: For slick or factory-finished surfaces

---

## 4. Rust Conversion vs. Mechanical Removal

| Approach | Method | Pros | Cons |
|----------|--------|------|------|
| **Rust conversion** | Phosphoric/tannic acid transforms iron oxide into stable ferric phosphate/tannate | Efficient, less labor; ideal for intricate structures where blasting impossible | Rough finish; only treats top layer; 1-3 year life; active rust encapsulated underneath |
| **Mechanical removal** | Abrasives, grinders, sandblasting to bare metal | Smooth, stable surface; uniform coating thickness; extends protection 4-5x vs conversion | Extremely labor-intensive and costly |

---

## 5. Production Rates

| Surface Type | Rate | Unit | Notes |
|-------------|------|------|-------|
| Exterior trim (simple) | 100-150 | LF/hr | Standard profiles |
| Simple picket railing | 15-25 | LF/hr | Basic metalwork |
| Ornate scrollwork | 5-10 | LF/hr | Historic ironwork |

### Complexity Multipliers

| Complexity | Multiplier | Examples |
|-----------|-----------|----------|
| Standard | 1.0x | Simple pickets |
| Moderate | 1.5x | Multi-story, minor decorative |
| High | 2.0-3.0x | Historic ironwork, hand-forged scrolls |

---

## 6. Galvanic Corrosion and Saponification

- **Galvanic action**: Dissimilar metals in contact cause accelerated corrosion of the more reactive metal
- **Saponification on galvanized**: Alkyd/oil-based primers react with zinc → soap-like substance → coating peels in large sheets
- **Only specialized acrylics or epoxy primers** on galvanized surfaces

---

## 7. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Adhesion loss (contamination)** | Skipping SSPC-SP 1 — oils, grease remain | Solvent clean before all mechanical prep |
| **Thermal cracking/buckling** | Brittle coating + high thermal expansion (especially aluminum) | Flexible acrylic coatings; light LRV colors |
| **Saponification** | Oil-based paint on galvanized metal | Specialized acrylic or epoxy primers only |
| **Application defects** | Brush marks, holidays, poor rivet/crevice coverage | Proper technique; inspection at edges and fasteners |
| **Encapsulated rust** | Rust converter over deep pitting without mechanical prep | Full mechanical removal for structural rust |

---

## PaintFactor Integration Notes

### Modifier Keys
- `METAL_SUBSTRATE`: [Carbon_Steel, Wrought_Iron, Aluminum, Galvanized, Stainless]
- `RUST_SEVERITY`: [None, Surface_Rust, Structural_Rot]
- `PROFILE_COMPLEXITY`: [Standard_1x, Moderate_1.5x, High_2x, Ornate_3x]
- `SSPC_PREP_LEVEL`: [SP1, SP2, SP3, SP7, SP6, SP10, SP5, SP11]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Galvanized | **Block** oil/alkyd primers — saponification risk; require acrylic or epoxy primer |
| Substrate = Aluminum | Auto-add flexible acrylic topcoat; flag 15-minute prime window after cleaning |
| Rust = Structural_Rot | **Hard Stop**: Outside painting scope — structural repair/welding required |
| Complexity = Ornate | Apply 2.0-3.0x labor multiplier |
| Any metal surface | Require SSPC-SP 1 (solvent clean) as mandatory first step |

### Production Rate Keys
- `RATE_METAL_TRIM` = 100-150 LF/hr
- `RATE_METAL_RAILING_SIMPLE` = 15-25 LF/hr
- `RATE_METAL_SCROLLWORK` = 5-10 LF/hr
