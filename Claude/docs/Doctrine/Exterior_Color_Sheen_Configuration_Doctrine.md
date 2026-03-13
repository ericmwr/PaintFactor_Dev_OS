# Exterior Color & Sheen Configuration Doctrine

> **Topic 22** — Tier 4 (Cross-Surface Systems)
> Sources: NotebookLM fast research (10 web sources), imported references
> Generated: 2026-03-07

---

## 1. Light Reflectance Value (LRV)

LRV is a percentage (0-100) indicating the amount of visible and usable light reflected from a surface. Higher LRV = lighter color = more light reflected.

### LRV Restrictions by Substrate

| Substrate | LRV Minimum | Consequence of Violation |
|-----------|------------|------------------------|
| Vinyl siding | 55+ (standard paint) | Warping, buckling — voids manufacturer warranty |
| Vinyl siding (VinylSafe) | 35-40+ (IR-reflective) | Approved with specialty pigments |
| PVC windows | 55+ | Warping, seal failure |
| PVC trim | 55+ (standard), lower with solar-reflective | Thermal distortion |
| Fiber cement | No hard LRV limit (but dark colors stress substrate) | Accelerated chalking, edge stress |
| Composite/carriage doors | 55+ | Thermal deformation risk |
| Steel doors | 30+ (IR-reflective recommended below 30) | Thermal expansion, joint separation |

---

## 2. IR-Reflective Cool Paint Technology

### How It Works
- Complex Inorganic Color Pigments (CICPs) absorb visible light to create desired color
- Simultaneously **reflect near-infrared radiation** (invisible heat energy)
- Result: dark visual appearance with significantly reduced heat retention and lower surface temperatures

### VinylSafe Color Palettes
- Sherwin-Williams VinylSafe Color Technology: **100 color options including dark colors (LRV < 55)**
- Formulated to resist buckling, warping, blistering, and peeling on vinyl substrates
- Enables homeowners to safely paint vinyl exteriors with dark colors that would otherwise void warranties

### Solar Reflectance Metrics
- **LRV**: Measures visible light only
- **SRV (Solar Reflectance Value)**: Measures total solar energy reflected (visible + near-infrared)
- **SRI (Solar Reflectance Index)**: Combines reflectance and emittance into single performance number
- IR-reflective pigments boost SRV without altering LRV (visual darkness unchanged)

---

## 3. Sheen Levels by Exterior Surface

| Surface | Common Sheen Options | Rationale |
|---------|---------------------|-----------|
| Body/field (siding) | Flat, satin | Hides surface imperfections; satin adds durability |
| Trim (fascia, rake, corner boards) | Satin, semi-gloss, gloss | Project-level selection — no locked-in default |
| Doors (entry, garage) | Satin, semi-gloss, gloss | Higher sheen adds durability on high-contact surfaces |
| Accent elements | Satin, semi-gloss | Distinguishes from body color; durable |
| Soffits | Flat, satin | Less visible; flat acceptable for protected surface |
| Shutters | Satin, semi-gloss | Weather exposure, visual contrast |

---

## 4. Sheen Performance Characteristics

| Property | Flat | Satin/Eggshell | Semi-Gloss | Gloss |
|----------|------|----------------|------------|-------|
| **Durability** | Low — easily marred | Good | Very good | Highest |
| **Dirt resistance** | Poor — shows fingerprints, hard to wash | Good — washable | Excellent — resists stains, moisture | Excellent |
| **UV fade resistance** | Lowest | Moderate | Good | Best |
| **Imperfection hiding** | Best — diffuses light | Good | Poor — highlights flaws | Worst — shows every defect |
| **Chalk resistance** | Lower | Moderate | Higher | Highest |

### Key Tradeoffs
- Higher sheen = more durable, cleanable, UV-resistant
- Higher sheen = reveals surface imperfections more (requires better prep)
- **100% acrylic paint** provides excellent resistance to fading, peeling, and chalking regardless of sheen

---

## 5. Color Change Complexity

| Scenario | Coat Count Impact | Notes |
|----------|------------------|-------|
| Same/similar color | Standard 2-coat system | No additional primer needed |
| Light to dark | Standard 2-coat + tinted primer | Primer tinted toward finish color for hide |
| Dark to light | 2-3 coats + dedicated primer | Most labor-intensive; may need 3 finish coats for complete hide |
| Multiple accent colors | +15-30% labor | Additional masking, cutting-in, color changes |

---

## PaintFactor Integration Notes

### Modifier Keys
- `LRV_CLASS`: [Standard_55+, IR_Reflective_35-55, Dark_Sub30]
- `SHEEN_BODY`: [Flat, Satin, Semi_Gloss]
- `SHEEN_TRIM`: [Satin, Semi_Gloss, Gloss]
- `SHEEN_DOOR`: [Semi_Gloss, Gloss]
- `COLOR_CHANGE`: [Same, Light_to_Dark, Dark_to_Light, Multi_Accent]

### Decision Logic

| Condition | Action |
|-----------|--------|
| Substrate = Vinyl AND LRV < 55 AND NOT VinylSafe | **Hard Stop**: Thermal distortion risk — reject color or require VinylSafe |
| Substrate = Vinyl AND LRV < 55 AND VinylSafe | Allow — IR-reflective technology approved |
| Substrate = PVC trim AND LRV < 55 | **Warning**: Require solar-reflective coating |
| Substrate = Steel door AND LRV < 30 | Mandatory IR-reflective coating upcharge |
| Color change = Dark to Light | Add dedicated tinted primer + potential 3rd finish coat |
| Color change = Multi_Accent | Apply +15-30% labor modifier for masking/cutting |
| Sheen = Gloss on body/siding | **Warning**: Will highlight surface imperfections — recommend higher prep level |

### Sheen Configuration Keys
- `SHEEN_EXT_BODY` = Flat or Satin (project selection — no locked-in default)
- `SHEEN_EXT_TRIM` = Satin, Semi-Gloss, or Gloss (project selection — no locked-in default)
- `SHEEN_EXT_DOOR` = Satin, Semi-Gloss, or Gloss (project selection — no locked-in default)
- `SHEEN_EXT_ACCENT` = Satin or Semi-Gloss (project selection — no locked-in default)
