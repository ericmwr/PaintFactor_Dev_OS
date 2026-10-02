# Exterior Windows Painting Doctrine

> **Topic 13** — Round 3 (Extension of Window Systems Doctrine)
> Sources: NotebookLM deep research (76 web sources), imported references
> Generated: 2026-03-07

---

## 1. Glazing Compound Assessment and Repair

### Assessment Protocol
- Well-maintained glazing compound with proper paint film can last **up to 30 years**
- **Test**: Plunge utility knife or screwdriver into putty to locate soft spots or adhesion loss
- Minor failures: remove only loose sections, reglaze up to old compound
- Widespread failure: remove all compound to prevent cascading failure

### Removal Methods
- **Preferred**: Moderate heat (infrared heaters or heat guns with shields) to soften old compound
- **Avoid cold removal** with chisels — risks breaking up to 50% of original glass and damaging wood
- Remove sash entirely for safety and efficiency

### Reglazing Procedure
1. Scrape glazing bed clean
2. Apply 50/50 mixture of boiled linseed oil and denatured alcohol to seal dried wood (prevents wicking oils from new compound)
3. Back-bed glass using putty or caulk
4. Secure with metal glazier's points
5. Apply face glaze, tool to smooth triangular profile
6. Use whiting or pumice powder to absorb oily residue from glass

### Material Selection
- Avoid off-the-shelf "big box" putties (dry inconsistently, mildew easily)
- Recommended: Sarco Dual Glaze (field use), Sarco Multi-Glaze Type M (shop use)
- Traditional linseed oil putties must cure and skin (days to weeks via oxidation) before painting

---

## 2. Putty vs. Paintable Caulk

| Property | Putty/Wood Filler | Caulk (Sealant) |
|----------|-------------------|------------------|
| **Flexibility** | Rigid when cured | Highly flexible |
| **Sandable** | Yes | No |
| **Best for** | Stationary joints, nail holes, minor defects | Joints between disparate materials (frame-to-siding) |
| **Limitation** | Fails under high thermal expansion | Loses durability in horizontal/high-traffic areas |

### PCA P11 Painter's Caulk Standard
- Limited to paintable acrylic/latex or urethane-modified products
- Intended for aesthetic joints of **1/8" or less** — not for waterproofing
- Exterior perimeter joints requiring high movement: polyurethane sealants (ASTM C920, +/-25% to +/-50% movement)

### Structural Repairs
- Extensive decay (sill rot, lower sash rot): two-part structural epoxies or wood "Dutchman" repairs
- Standard fillers inadequate for structural damage

---

## 3. Wood Sash Painting Sequence (Preventing Blocking)

"Blocking" = paint acts as adhesive, sealing operable sashes shut.

### Step-by-Step Protocol
1. **Remove** all window hardware, locks, lifts
2. **Free stuck windows** using window zipper or utility knife if already painted shut
3. **Sash reversal**: Pull upper sash down, push lower sash up to expose top rail of upper and bottom rail of lower
4. **Paint sequence**: Horizontal rails first → vertical stiles (brush with grain)
5. **Glass lap**: Paint must overlap glass by exactly **1/16"** — encapsulates glazing putty and creates weather-tight seal
6. **Drying posture**: Return sashes to nearly closed, leaving **1" gap** top and bottom until dry
7. **Movement during drying**: Gently move sashes periodically to prevent bonding

### Never Paint
- Sliding channels (pulley stiles)
- Weatherstripping
- Sash cords
- Instead: lubricate unpainted contact points with light wax or linseed oil

---

## 4. Clad Window Repainting

### Aluminum-Clad Windows
- Nonporous, slick substrate
- **Prep**: Scrape flaking finishes, scuff-sand entire surface (180-220 grit) for mechanical bonding profile
- Remove oxidation/chalking with TSP or detergents
- **Primer**: Industrial-grade corrosion-inhibiting primer (e.g., Sherwin-Williams Pro-Cryl)
- **Topcoat**: Two coats flexible, high-performance exterior acrylic

### Vinyl-Clad Windows
- Low surface energy + high thermal sensitivity
- **Prep**: Clean with TSP substitute, apply specialized PVC bonding primer (e.g., INSL-X STIX)
- **LRV restriction**: Dark standard paints warp vinyl frames — use only **VinylSafe IR-reflective color palettes**
- **Topcoat**: 100% acrylic or urethane-modified acrylics (handle high thermal expansion/contraction)

---

## 5. Window Integration with Siding and Trim Sequencing

### PCA P7 Sequencing Standard
- Siding installation precedes exterior painting (provides clean structural foundation)
- Window/door trims installed after siding, before final coating
- Continuous polyurethane sealant bead at window perimeter after flashing, before final trim
- Final paint film laps onto sealant for UV protection of joint

---

## 6. Production Rates by Type and Condition

### Hours Per Coat

| Window Type | Hours/Coat | Notes |
|-------------|-----------|-------|
| Awning | 0.4-0.8 | Simplest profile |
| Casement | 0.5-1.0 | Single sash |
| Double-hung | 1.0-1.5 | Most common; two operable sashes |
| Bay window | 1.5-2.5 | Multiple sashes + structural frame |
| Bow window | 2.0-3.0 | Most complex profile |

### Modifiers
- 2nd/3rd story access: increased labor hours (ladder/lift time)
- Failed existing paint: massive prep increase vs. light scuff-sand
- Reglazing: add **0.27 labor hours per linear meter**

---

## 7. Failure Modes

### Moisture Infiltration (Leading Cause)
- Unpainted bottom sash edges wick water via capillary action → rot and blistering
- Missing vapor barriers allow interior humidity to migrate outward → exterior paint peeling
- Failed glazing putty allows rain to pool in wood rebate → peeling around glass perimeter

### Temperature Blisters
- Direct sunlight heats fresh paint → surface skins prematurely → trapped vaporizing solvents expand into blisters
- **Prevention**: "Follow the sun" — paint in shade

### Intercoat Peeling
- Inadequate cleaning of chalky residues
- Waiting > 2 weeks between primer and topcoat

### Cross-Grain Cracking
- Historically over-painted surfaces where combined film thickness loses elasticity
- **Cure**: Total paint removal to bare wood required

---

## 8. Masking for Spray Operations

### Tape and Film Method
- Medium-adhesion blue painter's tape for frames/glass
- Delicate-surface orange tape over fresh paint
- HDPE plastic film across glass + secondary tape line to prevent "film flutter" from wind
- Score tape with utility knife before removal for razor-sharp paint line

### Liquid Masking Technology
- Complex divided-lite windows (muntins): liquid maskers (e.g., Jasco Mask & Peel)
- Brush heavily over glass, cure into protective membrane
- Score trim line and peel away in continuous sheet post-spraying
- **Warning**: Do NOT use liquid masking on Low-E coated glass — damages specialized coating during scoring

---

## PaintFactor Integration Notes

### Modifier Keys
- `WINDOW_TYPE`: [Awning, Casement, Double_Hung, Bay, Bow, Fixed, Specialty]
- `CLADDING_TYPE`: [Wood, Aluminum_Clad, Vinyl_Clad]
- `GLAZING_CONDITION`: [Sound, Minor_Failure, Widespread_Failure]
- `PAINT_CONDITION`: [Sound, Light_Chalk, Failing, Cross_Grain_Cracked]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Cladding = Vinyl AND Color LRV < 55 | **Alert**: VinylSafe IR-reflective coating required |
| Cladding = Aluminum | Auto-add corrosion-inhibiting primer task |
| Glazing = Widespread_Failure | Add full reglaze task (+0.27 hrs/LM) |
| Paint_Condition = Cross_Grain_Cracked | Full paint removal to bare wood required |
| Application = Spray | Auto-add masking task (tape + film or liquid mask) |
| Window has Low-E glass | Prohibit liquid masking method |
| Intercoat interval > 14 days | Flag: intercoat adhesion risk |

### Production Rate Keys
- `RATE_WINDOW_AWNING` = 0.4-0.8 hrs/coat
- `RATE_WINDOW_CASEMENT` = 0.5-1.0 hrs/coat
- `RATE_WINDOW_DOUBLE_HUNG` = 1.0-1.5 hrs/coat
- `RATE_WINDOW_BAY` = 1.5-2.5 hrs/coat
- `RATE_WINDOW_BOW` = 2.0-3.0 hrs/coat
- `MOD_WINDOW_HEIGHT` = per height tier from Access Doctrine (Topic 4)
- `MOD_WINDOW_REGLAZE` = +0.27 hrs/LM
