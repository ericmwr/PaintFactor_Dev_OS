# Exterior Garage Doors Painting Doctrine

> **Topic 14** — Round 3
> Sources: NotebookLM deep research (82 web sources), imported references
> Generated: 2026-03-07

---

## 1. Door Substrate Types and Construction

### Sectional Steel
- Industry standard for modern construction
- Factory-applied high-performance polyester or fluorocarbon (Kynar) finish
- Susceptible to rust if substrate exposed or in coastal environments
- Internal construction: foam-core insulated or hollow

### Wood Panel
- Premium, highly hygroscopic — constantly exchanges moisture with environment
- Requires tannin management (Cedar, Redwood species)
- Designated as "stain-grade" or "paint-grade"
- DASMA TDS #162 governs finishing guidelines

### Carriage-Style
- High-complexity architectural doors with decorative overlays, crossbucks, window lites
- Often mix materials (steel base + wood/composite overlays)
- High risk of differential expansion and lamination failure

---

## 2. Factory Finish Considerations

### Factory Wax Removal
- Primary obstacle: residual wax layer from fabrication/transit protection
- **Protocol**: Scuff with gray 3M synthetic steel wool pad (#000 equivalent) saturated with biodegradable cleaning solution

### Deglossing
- Factory fluorocarbon/silicone-polyester finishes require mechanical tooth for adhesion
- Methods:
  - Mechanical: 120-150 grit sandpaper
  - Chemical: liquid deglossers

### Adhesion Verification
- ASTM D3359 tape test before repainting
- Poor adhesion: more aggressive removal or Brush-Off Blast Cleaning (SSPC-SP7)

---

## 3. Surface Preparation by Substrate

### Steel Doors
1. Remove factory wax (3M pad + cleaner)
2. Degloss factory finish (120-150 grit or liquid deglosser)
3. Verify adhesion (ASTM D3359)
4. Apply DTM primer

### Wood Doors
1. Sand to clean profile
2. Treat tannin-rich species (Cedar/Redwood) with alkyd stain-blocking primer
3. Six-side sealing mandatory (DASMA TDS #162)

### PCA P14 Preparation Levels
- Level 1 (Basic) through Level 4 (Supreme) apply per quality tier
- Default if unspecified: Level 2

---

## 4. DTM Primers and Coating Systems

### DTM (Direct-to-Metal) Primers
- Formulated with rust-inhibitive pigments and high volume solids (~46%)
- Flash-rust resistance (prevents oxidation while waterborne coating is wet)
- Flexible enough for thermal expansion of steel panels

### Topcoats
- **Standard**: 100% exterior acrylic latex (steel and wood)
- Superior flexibility, UV screening, breathability

### Six-Side Sealing (Wood)
- DASMA TDS #162: All six sides must be primed and finished
- Failure to seal hidden edges = primary cause of rot and warranty voidance

### LRV Restrictions
- Carriage-style, composite, or vinyl doors: LRV must be **> 55**
- Dark colors (LRV < 55) absorb excessive solar energy → warping, shrinkage, voided warranties

---

## 5. Production Rates by Door Type and Complexity

### Base Application Rates

| Method | Rate (SF/hr) | Notes |
|--------|-------------|-------|
| Airless spray | 150-300 | Requires extensive masking; factory-smooth finish |
| Roller | 100-150 | Standard residential |
| Brush | 50-75 | Detail work, panels |

### Complexity Multipliers

| Door Type | Labor Multiplier | Notes |
|-----------|-----------------|-------|
| Standard flush panel | 1.00 (baseline) | Continuous roller/spray |
| Raised/recessed panel | 1.10 | Manual brush work in recesses |
| Carriage-style overlay | 1.25-1.40 | Meticulous masking, multi-tone cutting |
| Integrated windows | +0.5-1.5 hours | Masking individual divided lites |

---

## 6. Spring Tension Constraints

### Mechanical Limitations
- High-tension counterbalance systems (torsion or extension springs) create severe constraints
- Properly balanced door lifts with < 10 lbs force
- Paint adds weight — contractor must perform **balance test**
- Heavy coatings on out-of-balance door can destroy opener or snap springs

### The "Leapfrog" Technique
- Door manually articulated so each joint is opened, painted, and dried "tack-free" before moving to next section
- Prevents paint bridging across articulation joints
- Painting in closed position → paint bridges joints → opening rips paint off or snaps opener motor

---

## 7. Bottom Seal and Exclusion Zones

### Bottom Seal (Astragal) Avoidance
- Highly compressible seal bonds easily to wet paint and driveway thresholds

| Method | Description |
|--------|-------------|
| Mechanical spacing | Prop door 2-4" above threshold during full 24-48 hour cure |
| Seal removal | Remove seal and retainer entirely for clean six-side finish |
| Threshold protection | Wax paper or paraffin wax on driveway as emergency release |

### Other Exclusion Zones
- Weatherstripping contact surfaces
- Spring mechanism hardware
- Track and roller contact points

---

## 8. Failure Modes

| Failure Mode | Cause | Prevention |
|-------------|-------|-----------|
| **Catastrophic peeling** | New acrylic over residual factory wax or Kynar without bonding primer | Proper wax removal + DTM primer |
| **Thermal deformation** | Dark colors (LRV < 55) on composite/vinyl/carriage doors | LRV restriction; IR-reflective coatings |
| **Gluing door shut** | Painting in closed position; paint bridges articulation joints | Leapfrog technique |
| **Tannin bleed** | No alkyd stain-blocker on Cedar/Redwood | Species-appropriate primer |
| **Wood rot** | Missing end-grain seal; incomplete six-side sealing | DASMA TDS #162 compliance |

---

## PaintFactor Integration Notes

### Modifier Keys
- `DOOR_SUBSTRATE`: [Steel_Sectional, Wood_Panel, Carriage_Style, Composite]
- `DOOR_SIZE`: [Single_8x7, Double_16x7, Custom]
- `PANEL_COMPLEXITY`: [Flush, Raised_Recessed, Carriage_Overlay, Windows]
- `FACTORY_FINISH`: [Polyester, Fluorocarbon_Kynar, None_Bare, Previously_Painted]

### Complexity Multipliers
- `MOD_GARAGE_FLUSH` = 1.00
- `MOD_GARAGE_RAISED_PANEL` = 1.10
- `MOD_GARAGE_CARRIAGE` = 1.25-1.40
- `MOD_GARAGE_WINDOWS` = +0.5-1.5 hrs

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Steel with factory finish | Auto-add wax removal + degloss + DTM primer tasks |
| Substrate = Steel + ASTM D3359 fails | Escalate to SSPC-SP7 blast cleaning |
| Substrate = Wood | Auto-add six-side sealing task (DASMA TDS #162) |
| Wood species = Cedar/Redwood | Lock primer = alkyd stain-blocker |
| Color LRV < 55 AND Door = Carriage/Composite | **Alert**: Thermal deformation risk — recommend IR-reflective or lighter color |
| Any garage door | Auto-add balance test checkpoint |
| Any garage door | Auto-add bottom seal protection/removal task |
| Application = Spray | Auto-add driveway/siding masking task |

### Production Rate Keys
- `RATE_GARAGE_SPRAY` = 150-300 SF/hr
- `RATE_GARAGE_ROLL` = 100-150 SF/hr
- `RATE_GARAGE_BRUSH` = 50-75 SF/hr
