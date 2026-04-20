// One-shot: extract all modifier tables from run-estimate-scenario.js
// into individual Claude/modifiers/FAC_*.json files. Run once, then the
// engine reads from the bundle.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'modifiers');

// Static (per-module-eligibility) modifiers. Keyed to modifier_eligibility
// flags on the module record (qt, height, texture, complexity, condition).
const STATIC = {
  FAC_QT: {
    name: 'Quality Tier',
    kind: 'static',
    eligibility_key: 'qt',
    ctx_key: 'quality_tier',
    default: 'QT3',
    description: 'Scales rates by target quality tier. QT3 is baseline.',
    factors: { QT1: 0.80, QT2: 0.80, QT3: 1.00, QT4: 1.30, QT5: 1.50 },
  },
  FAC_HEIGHT: {
    name: 'Interior Height Band',
    kind: 'static',
    eligibility_key: 'height',
    ctx_key: 'height_band',
    default: 'STD',
    description: 'Interior ceiling height scale. Applies when interior spec uses height_band. Exterior uses FAC_EXT_ACCESS instead.',
    factors: { STD: 1.00, STEP: 1.30, EXT: 1.50, SCAFFOLD: 2.00 },
  },
  FAC_TEXTURE: {
    name: 'Surface Texture',
    kind: 'static',
    eligibility_key: 'texture',
    ctx_key: 'surface_texture',
    default: 'smooth',
    description: 'Spray/roll penalty for textured drywall.',
    factors: { smooth: 1.00, orange_peel: 1.15, knockdown: 1.25 },
  },
  FAC_COMPLEXITY: {
    name: 'Room Complexity',
    kind: 'static',
    eligibility_key: 'complexity',
    ctx_key: 'complexity',
    default: 'STD',
    description: 'Cut-in / taped edge burden. Applied per-task only for cut-in classifications.',
    factors: { OPEN: 0.85, STD: 1.00, MOD: 1.20, COMPLEX: 1.20, VCOMPLEX: 1.50 },
  },
  FAC_CONDITION: {
    name: 'Interior Substrate Condition',
    kind: 'static',
    eligibility_key: 'condition',
    ctx_key: 'substrate_condition',
    default: 'fair',
    description: 'Interior condition scale (lowercase). Good < fair < poor. Separate from the exterior FAC_CONDITION_SCALE (uppercase GOOD/FAIR/POOR).',
    factors: { good: 0.70, fair: 1.00, poor: 1.50 },
  },
};

// Dynamic (scenario-declared) modifiers. Scenarios list these in `modifiers[]`.
// They are applied to every task in every module unless specifically gated (e.g.
// FAC_EXT_ACCESS gates on modifier_eligibility.height).
const DYNAMIC = {
  FAC_EXT_ACCESS: {
    name: 'Exterior Access',
    kind: 'dynamic',
    ctx_key: 'access_type',
    default: 'ground',
    gated_by_eligibility: 'height',
    description: 'Exterior access method. Gated by modifier_eligibility.height (height-eligible modules scale with access).',
    factors: { ground: 1.00, ladder: 1.35, scaffold: 1.60, lift: 1.50 },
  },
  FAC_MSRY_SUBSTRATE_TYPE: {
    name: 'Masonry Substrate Type',
    kind: 'dynamic',
    ctx_key: 'substrate_type',
    default: 'brick',
    description: 'Scales masonry rates by material type.',
    factors: { brick: 1.00, CMU: 1.15, concrete: 1.05, limestone: 1.10 },
  },
  FAC_MSRY_COATING_SYSTEM: {
    name: 'Masonry Coating System',
    kind: 'dynamic',
    ctx_key: 'coating_system',
    default: 'acrylic',
    description: 'Elastomeric coatings cover slower than standard acrylic.',
    factors: { acrylic: 1.00, elastomeric: 1.50 },
  },
  FAC_FNDN_FOUNDATION_TYPE: {
    name: 'Foundation Type',
    kind: 'dynamic',
    ctx_key: 'foundation_type',
    default: 'poured',
    description: 'Poured concrete vs CMU block.',
    factors: { poured: 1.00, CMU: 1.15 },
  },
  FAC_FNDN_CONDITION_SCALE: {
    name: 'Foundation Condition',
    kind: 'dynamic',
    ctx_key: 'condition_scale',
    default: 'GOOD',
    description: 'Foundation RP condition scale.',
    factors: { GOOD: 1.00, FAIR: 1.30, POOR: 1.60 },
  },
  FAC_STCO_TEXTURE_PROFILE: {
    name: 'Stucco Texture Profile',
    kind: 'dynamic',
    ctx_key: 'texture_profile',
    default: 'smooth',
    description: 'Stucco finish texture — deeper profiles cover slower.',
    factors: { smooth: 1.00, sand: 1.25, lace: 1.50, dash: 2.00 },
  },
  FAC_ENSD_SIDING_PROFILE: {
    name: 'Engineered Siding Profile',
    kind: 'dynamic',
    ctx_key: 'siding_profile',
    default: 'lap',
    description: 'Profile shape of engineered siding.',
    factors: { lap: 1.00, panel: 1.10, t1_11: 1.80 },
  },
  FAC_ENSD_SURFACE_TEXTURE: {
    name: 'Engineered Siding Texture',
    kind: 'dynamic',
    ctx_key: 'surface_texture',
    default: 'smooth',
    description: 'Face texture of engineered siding.',
    factors: { smooth: 1.00, cedarmill: 1.20, roughsawn: 1.30 },
  },
  FAC_FCSD_SIDING_PROFILE: {
    name: 'Fiber Cement Siding Profile',
    kind: 'dynamic',
    ctx_key: 'siding_profile',
    default: 'lap',
    description: 'Profile shape of fiber cement siding.',
    factors: { lap: 1.00, panel: 1.10, shingle: 2.00 },
  },
  FAC_FCSD_SURFACE_TEXTURE: {
    name: 'Fiber Cement Siding Texture',
    kind: 'dynamic',
    ctx_key: 'surface_texture',
    default: 'smooth',
    description: 'Face texture of fiber cement siding.',
    factors: { smooth: 1.00, cedarmill: 1.20, roughsawn: 1.30 },
  },
  FAC_SFIT_FACE_TYPE: {
    name: 'Soffit Face Type',
    kind: 'dynamic',
    ctx_key: 'soffit_face_type',
    default: 'closed_face',
    description: 'Open-face soffits double cover area (inside + outside of each rafter bay).',
    factors: { closed_face: 1.00, open_face: 2.00 },
  },
  FAC_METAL_PROFILE_COMPLEXITY: {
    name: 'Metal Railing Complexity',
    kind: 'dynamic',
    ctx_key: 'metal_profile_complexity',
    default: 'simple',
    description: 'Ornate metal railings require more brush detail.',
    factors: { simple: 1.00, moderate: 1.50, ornate: 2.50 },
  },
  FAC_GRDR_DOOR_SIZE: {
    name: 'Garage Door Size',
    kind: 'dynamic',
    ctx_key: 'door_size',
    default: 'single',
    description: 'Double garage doors are nearly 2x single.',
    factors: { single: 1.00, double: 1.80 },
  },
  FAC_GRDR_PANEL_COMPLEXITY: {
    name: 'Garage Door Panel Complexity',
    kind: 'dynamic',
    ctx_key: 'panel_complexity',
    default: 'flush',
    description: 'Flush vs raised panel vs carriage-style.',
    factors: { flush: 1.00, raised_panel: 1.10, carriage: 1.30 },
  },
  FAC_FENCE_STYLE: {
    name: 'Fence Style',
    kind: 'dynamic',
    ctx_key: 'fence_style',
    default: 'privacy',
    description: 'Picket is slower (more edges); rail is faster (less surface).',
    factors: { privacy: 1.00, picket: 1.30, rail: 0.80 },
  },
  FAC_ALRP_CHALK_SEVERITY: {
    name: 'Aluminum RP Chalking',
    kind: 'dynamic',
    ctx_key: 'chalk_severity',
    default: 'none',
    description: 'Oxidation/chalk burden on aluminum siding RP.',
    factors: { none: 1.00, light: 1.25, heavy: 1.75 },
  },
  FAC_SURFACE_PROFILE: {
    name: 'Grain Fill Surface Profile',
    kind: 'dynamic',
    ctx_key: 'surface_profile',
    default: 'flat',
    description: 'Depth of surface grain/profile to fill.',
    factors: { flat: 1.00, light_profile: 1.30, medium_profile: 2.00, heavy_profile: 2.80 },
  },
  FAC_WOOD_SPECIES: {
    name: 'Wood Species Grain',
    kind: 'dynamic',
    ctx_key: 'wood_species_group',
    default: 'closed_grain',
    description: 'Grain openness by species group. Open-grain woods (oak, ash) drink more stain.',
    factors: { closed_grain: 1.00, moderate_grain: 1.20, deep_grain: 1.40, open_grain: 1.30 },
  },
  FAC_CONDITION_SCALE: {
    name: 'Exterior Substrate Condition',
    kind: 'dynamic',
    ctx_key: 'substrate_condition',
    default: 'fair',
    description: 'Universal condition scale — accepts both lowercase (interior) and uppercase (exterior) keys.',
    factors: { good: 0.70, fair: 1.00, poor: 1.50, GOOD: 1.00, FAIR: 1.50, POOR: 2.00 },
  },
};

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let count = 0;
  for (const [id, def] of Object.entries({ ...STATIC, ...DYNAMIC })) {
    const record = { modifier_id: id, ...def };
    const file = path.join(OUT_DIR, `${id}.json`);
    await fs.writeFile(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
    count++;
  }
  console.log(`Wrote ${count} modifier files to ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
