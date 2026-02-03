# Resene Production Rate Reference for PaintFactor

## Unit Standard: UOM per Hour

All rates express **how much work gets done in one hour** at Standard quality tier.

---

## Quick Reference: System Production Rates

### Interior Walls (ft²/hr)

| Scope | System Rate | Notes |
|-------|-------------|-------|
| New construction (seal + 2 coats) | **44.8** | Baseline 3-coat system |
| Repaint good condition | **49.0** | Spot prime + 2 coats |
| Single coat only | **224.0** | Derived from system |

### Interior Ceilings (ft²/hr)

| Scope | Brush/Roll | Spray |
|-------|------------|-------|
| New (seal + 2 coats) | **49.0** | **63.3** |
| Repaint (2 coats) | **59.9** | - |
| Repaint (1 coat) | **90.1** | - |

### Interior Trim (LF/hr)

| Width | Full System (P+2) | Single Coat |
|-------|-------------------|-------------|
| 0-6" | **29.9** | **119.6** |
| 6-12" | **27.3** | **109.2** |

### Interior Doors (doors/hr)

| Scope | Rate | Hrs/Door |
|-------|------|----------|
| New full system (in-situ) | **0.28** | 3.6 |
| New spray method | **0.33** | 3.0 |
| Repaint good condition | **0.34** | 2.9 |
| Fire door | **0.20** | 4.9 |

### Prep Tasks (ft²/hr)

| Task | Rate |
|------|------|
| General wash | **107.5** |
| Degrease/smoke wash | **90.1** |
| Prep varnish for adhesion | **76.9** |
| Strip wallpaper (standard) | **76.9** |
| Strip wallpaper (vinyl) | **67.1** |
| Skim coat | **59.9** |

---

## Atomic Task Decomposition

### Drywall Wall - New (3-Coat System)

**System Rate: 44.8 ft²/hr**

| Atomic Task | % of Time | Production Rate (ft²/hr) |
|-------------|-----------|--------------------------|
| Protection/Masking | 12% | 373 |
| Surface Prep | 18% | 249 |
| Prime/Seal Coat | 22% | 204 |
| Topcoat 1 | 20% | 224 |
| Topcoat 2 | 20% | 224 |
| Touch-up/Detail | 5% | 896 |
| Cleanup/Demask | 3% | 1,493 |

**Key Insight:** Individual coat application runs ~**204-224 ft²/hr**. Protection and prep are faster per-ft² but consume 30% of total time.

---

### Drywall Wall - Repaint (Good Condition)

**System Rate: 49.0 ft²/hr**

| Atomic Task | % of Time | Production Rate (ft²/hr) |
|-------------|-----------|--------------------------|
| Protection/Masking | 12% | 408 |
| Surface Prep (clean/sand/fill) | 22% | 223 |
| Spot Priming | 8% | 613 |
| Topcoat 1 | 22% | 223 |
| Topcoat 2 | 22% | 223 |
| Touch-up/Detail | 8% | 613 |
| Cleanup/Demask | 6% | 817 |

**Key Insight:** Repaint shifts time from full prime → prep and touch-up. Per-coat rate drops slightly (~223 vs 224) due to working over existing finish.

---

### Interior Trim 6" - Full System

**System Rate: 29.9 LF/hr**

| Atomic Task | % of Time | Production Rate (LF/hr) |
|-------------|-----------|-------------------------|
| Adjacent Protection | 10% | 299 |
| Surface Prep | 20% | 150 |
| Prime Coat | 25% | 120 |
| Topcoat 1 | 20% | 150 |
| Topcoat 2 | 20% | 150 |
| Touch-up | 5% | 598 |

**Key Insight:** Prime coat is slower than topcoats on trim (120 vs 150 LF/hr) due to absorption/penetration on raw wood.

---

### Interior Door - Full System (In-Situ)

**System Rate: 0.28 doors/hr (3.6 hrs/door)**

| Atomic Task | % of Time | Production Rate (doors/hr) |
|-------------|-----------|----------------------------|
| Protection/Hardware Removal | 8% | 3.45 |
| Surface Prep | 15% | 1.85 |
| Prime Coat | 20% | 1.39 |
| Topcoat 1 | 20% | 1.39 |
| Topcoat 2 | 20% | 1.39 |
| Hardware Reinstall | 10% | 2.78 |
| Touch-up/Detail | 7% | 4.00 |

**Key Insight:** Each coat application = ~1.4 doors/hr (~43 min/door/coat). Hardware handling adds ~18% to total time.

---

## Quality Tier Adjustments

**Apply to production rate (multiply):**

| Tier | Factor | Example: Wall 44.8 → |
|------|--------|---------------------|
| Economy | 1.18 | 52.9 ft²/hr |
| Standard | 1.00 | 44.8 ft²/hr |
| Premium | 0.83 | 37.2 ft²/hr |
| Fine Finish | 0.71 | 31.8 ft²/hr |

---

## Complexity Modifiers

**Apply to production rate (multiply):**

| Condition | Factor | Effect |
|-----------|--------|--------|
| Dark color (LRV <40%) | 0.91 | 9% slower |
| Multi-color/contrast | 0.80 | 20% slower |
| Colonial windows | 0.83 | 17% slower |
| Hardware-intensive | 0.80 | 20% slower |
| Overheight 9' | 0.85 | 15% slower |
| Overheight 10' | 0.80 | 20% slower |
| Louvre/panelled | 0.91 | 9% slower |
| Medium texture | 0.89 | 11% slower |
| Coarse texture | 0.82 | 18% slower |

---

## Application Method Factors

**Spray vs Brush/Roll (multiply brush rate by):**

| Surface | Spray Factor |
|---------|--------------|
| Flat sealer | 1.80 |
| Ceiling full system | 1.29 |
| Concrete repaint | 1.44 |

**Example:** Ceiling brush/roll 49.0 × 1.29 = **63.2 ft²/hr spray**

---

## Validation Process

### Step 1: Calculate PaintFactor System Rate

Sum the time for all atomic tasks, then invert:

```
PF_System_Rate = 1 / Σ(1/atomic_task_rate × task_qty)
```

Or more simply, if tasks are sequential:
```
Total_hrs = Σ(area / task_production_rate)
PF_System_Rate = area / Total_hrs
```

### Step 2: Compare to Resene Baseline

```
Target = Resene_Rate × Quality_Factor × Complexity_Factors
Variance = (PF_Rate - Target) / Target × 100%
```

### Step 3: Evaluate

| Variance | Status |
|----------|--------|
| < ±10% | ✅ Excellent |
| ±10-15% | ⚠️ Acceptable |
| > ±15% | ❌ Investigate |

---

## Example Validation

**Scenario:** Standard tier drywall wall repaint, 1000 ft²

**Resene baseline:** 49.0 ft²/hr → 20.4 hours for 1000 ft²

**PaintFactor atomic tasks (hypothetical):**
- Protection: 1000 ft² ÷ 400 ft²/hr = 2.5 hrs
- Prep: 1000 ft² ÷ 220 ft²/hr = 4.5 hrs  
- Spot prime: 1000 ft² ÷ 600 ft²/hr = 1.7 hrs
- Topcoat 1: 1000 ft² ÷ 220 ft²/hr = 4.5 hrs
- Topcoat 2: 1000 ft² ÷ 220 ft²/hr = 4.5 hrs
- Touch-up: 1000 ft² ÷ 600 ft²/hr = 1.7 hrs
- Cleanup: 1000 ft² ÷ 800 ft²/hr = 1.3 hrs

**PF Total:** 20.7 hrs → **48.3 ft²/hr**

**Variance:** (48.3 - 49.0) / 49.0 = **-1.4%** ✅

---

## Key Benchmarks for Atomic Tasks

| Task Type | Typical Range (ft²/hr) |
|-----------|------------------------|
| Protection/masking | 300-500 |
| Light prep (good condition) | 200-300 |
| Heavy prep (poor condition) | 75-150 |
| Single coat - walls | 200-250 |
| Single coat - ceilings | 200-250 |
| Single coat - trim (per LF) | 100-150 |
| Touch-up/detail | 500-900 |
| Cleanup/demask | 800-1500 |
| Wash (general) | 100-120 |
| Skim coat | 55-65 |

---

*Source: Resene Productivity Tables (Oct 2012), converted to imperial and UOM/hr*
