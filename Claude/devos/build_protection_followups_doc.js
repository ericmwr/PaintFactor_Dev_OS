// Build: Protection_Followups.docx
// Captures decisions Eric needs to make for:
//   1. New protection scenarios (cabinet + closet shelf, 4 new mask levels each)
//   2. Protection Heuristics UI panel for Project Setup tab

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak,
} = require('docx');

// ── Style helpers ────────────────────────────────────────────────────────
const NPMP = path.dirname(require.resolve('docx'));
console.error('docx package at:', NPMP);

const ARIAL = 'Arial';
const border = { style: BorderStyle.SINGLE, size: 4, color: 'B8B8B8' };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

// Shading
const HEADER_SHADE = { fill: 'D5E8F0', type: ShadingType.CLEAR };
const BLANK_SHADE  = { fill: 'FFFBE6', type: ShadingType.CLEAR };
const REF_SHADE    = { fill: 'F5F5F5', type: ShadingType.CLEAR };

// Paragraph helpers
const para = (text, opts = {}) => new Paragraph({
  spacing: { before: 60, after: 60 },
  ...opts,
  children: [new TextRun({ text, font: ARIAL, size: 22, ...(opts.run || {}) })],
});
const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { before: 30, after: 30 },
  children: [new TextRun({ text, font: ARIAL, size: 22 })],
});
const fillIn = () => new Paragraph({
  spacing: { before: 30, after: 30 },
  children: [new TextRun({ text: '____________________________', font: ARIAL, size: 22, color: '999999' })],
});

// Table helpers
function cell(text, { shade, bold = false, width, align } = {}) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shade,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, font: ARIAL, size: 20, bold })],
    })],
  });
}
function blankCell(width) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: BLANK_SHADE,
    children: [new Paragraph({ children: [new TextRun({ text: ' ', font: ARIAL, size: 20 })] })],
  });
}
function tbl(columnWidths, rows) {
  return new Table({
    width: { size: columnWidths.reduce((s, w) => s + w, 0), type: WidthType.DXA },
    columnWidths,
    rows,
  });
}

// ── Section 1: New Protection Scenarios ──────────────────────────────────

const section1 = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
    new TextRun({ text: '1. New Protection Scenarios', font: ARIAL, size: 32, bold: true }),
  ]}),

  para('The Detail Panel enum cleanup landed canonical mask levels (edge / partial / full / encapsulate / edge_partial / edge_full / edge_encapsulate) in the UI for cabinets and closet shelving. The engine still has only 3 scenarios per fixture family, so the new tiers (encapsulate + 3 edge+ variants) currently fall through to the closest existing scenario via boundary translation in context-adapter.js. Result: the UI shows differentiated labels but the estimate produces identical hours for any tier that collapses to the same scenario.'),

  para('This section captures the data needed to build dedicated scenarios for the missing tiers, OR define a multiplier/surcharge model so existing scenarios can scale.', { run: { italics: true } }),

  // ── 1.1 Existing baseline ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.1 Existing baseline (reference)', font: ARIAL, size: 28, bold: true }),
  ]}),

  para('Cabinet protection — current scenarios. UI dropdown will offer 7 levels; the 4 not in this table are the gap.'),

  tbl([2400, 2200, 4760], [
    new TableRow({ tableHeader: true, children: [
      cell('Existing scenario', { shade: HEADER_SHADE, bold: true, width: 2400 }),
      cell('UI level (canonical)', { shade: HEADER_SHADE, bold: true, width: 2200 }),
      cell('Tasks', { shade: HEADER_SHADE, bold: true, width: 4760 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_LIGHT', { shade: REF_SHADE, width: 2400 }),
      cell('edge', { shade: REF_SHADE, width: 2200 }),
      cell('Face cover (1 task, 20 EA/hr)', { shade: REF_SHADE, width: 4760 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_STANDARD', { shade: REF_SHADE, width: 2400 }),
      cell('partial', { shade: REF_SHADE, width: 2200 }),
      cell('Face cover · Hardware · Countertop edge · Teardown (4 tasks)', { shade: REF_SHADE, width: 4760 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_HEAVY', { shade: REF_SHADE, width: 2400 }),
      cell('full', { shade: REF_SHADE, width: 2200 }),
      cell('Face · Hardware · Countertop · Floor · Backsplash · Appliances · Teardown (7 tasks)', { shade: REF_SHADE, width: 4760 }),
    ]}),
  ]),

  para(' '),

  para('Closet shelving — current scenarios. UI dropdown will offer 7 levels; the 4 not in this table are the gap. Note: closet protection uses a multiplier model (per-shelving-type baseline rate × level multiplier) rather than per-tier task lists.'),

  tbl([3200, 2200, 3960], [
    new TableRow({ tableHeader: true, children: [
      cell('Existing scenario', { shade: HEADER_SHADE, bold: true, width: 3200 }),
      cell('UI level (canonical)', { shade: HEADER_SHADE, bold: true, width: 2200 }),
      cell('Multiplier', { shade: HEADER_SHADE, bold: true, width: 3960 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CLOSET_SHELF_PROTECT_ITEM_MASK', { shade: REF_SHADE, width: 3200 }),
      cell('edge', { shade: REF_SHADE, width: 2200 }),
      cell('0.5× (lightest wrap)', { shade: REF_SHADE, width: 3960 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CLOSET_SHELF_PROTECT_PARTIAL_COVER', { shade: REF_SHADE, width: 3200 }),
      cell('partial', { shade: REF_SHADE, width: 2200 }),
      cell('1.0× (baseline)', { shade: REF_SHADE, width: 3960 }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CLOSET_SHELF_PROTECT_FULL_COVER', { shade: REF_SHADE, width: 3200 }),
      cell('full', { shade: REF_SHADE, width: 2200 }),
      cell('1.5× (heavy wrap + extras)', { shade: REF_SHADE, width: 3960 }),
    ]}),
  ]),

  // ── 1.2 Two design options ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.2 Pick a design model', font: ARIAL, size: 28, bold: true }),
  ]}),

  para('Two viable approaches. They are not exclusive — cabinets could use one and closets the other.'),

  para('Option A — Dedicated scenarios per tier. Most flexible: each tier carries its own task list and rates. Highest data-entry effort.', { run: { bold: true } }),
  bullet('Use when the work content really differs at each tier (encapsulate adds sealing tape passes; edge+ adds an edge tape line task that the base tier doesn\'t have).'),
  bullet('Build 4 new scenarios per family (cabinet + closet shelf = 8 total).'),

  para('Option B — Surcharge / multiplier model. Existing 3 scenarios stay; add a flat-rate or percentage surcharge for the encapsulate prefix and the edge+ prefix.', { run: { bold: true } }),
  bullet('Surcharge fires on top of the base scenario\'s hours.'),
  bullet('Cleaner data entry — one number per surcharge type instead of full task lists.'),
  bullet('Less precise if the work content actually differs structurally (e.g., encapsulate requires double-tape passes that aren\'t in the heavy scenario).'),

  para('My recommendation: Option B for closet shelving (already a multiplier model — extending it is natural). Option A for cabinets (the existing scenarios already have substantively different task lists).', { run: { italics: true } }),

  para('DECISIONS so far:', { run: { bold: true } }),
  tbl([3000, 6000], [
    new TableRow({ children: [
      cell('Family / scope', { shade: HEADER_SHADE, bold: true, width: 3000 }),
      cell('Approach', { shade: HEADER_SHADE, bold: true, width: 6000 }),
    ]}),
    new TableRow({ children: [
      cell('Cabinet — Path 1 (non-paint masking)', { width: 3000 }),
      cell('Option A — one task per scenario, applied to whole cabinet, scaled by linear_ft × stack_multiplier. SEE 1.3.', { width: 6000, bold: true }),
    ]}),
    new TableRow({ children: [
      cell('Cabinet — Path 2 (paint-mode masking)', { width: 3000 }),
      cell('PARKED. Will use 7-level canonical vocab. Existing per-zone tasks (face_cover, hardware, countertop, floor, backsplash, appliances) are reserved for this path. Open question: do the 4 new levels need new multi-zone task variants? — to be discussed.', { width: 6000 }),
    ]}),
    new TableRow({ children: [
      cell('Closet shelving', { width: 3000 }),
      cell('PARKED. Earlier multiplier-model proposal (Option B) is walked back per Eric — too opaque. Will redo as straight LF rate per scenario in a later pass.', { width: 6000 }),
    ]}),
  ]),

  // ── 1.3 Cabinet — non-paint masking (Path 1, paint_cabinets=false) ──
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.3 Cabinet — Path 1: non-paint masking', font: ARIAL, size: 28, bold: true }),
  ]}),
  para('SCOPE: This section covers ONLY the case where cabinets are present in a room being painted but the cabinets themselves are NOT being painted (paint_cabinets=false). The cabinet runs get wrapped as a unit so room paint doesn\'t land on them.', { run: { bold: true } }),
  para('Path 2 (paint_cabinets=true — masking everything AROUND the cabinets while painting the cabinets themselves) is parked. The existing detailed task IDs and PS keys (face_cover, hardware, countertop_edge, floor_full_kitchen, backsplash_mask, appliances) are preserved for that path and addressed in a later pass — see 1.4 below.', { run: { italics: true, color: '888888' } }),
  para('Quantity = linear_ft × stack_multiplier, where stack_multiplier = 1 for "Lower Only" layout and 2 for "Lower + Upper" layout. (A 12-LF Lower+Upper run produces 24 LF of mask quantity.) All 7 scenarios feed off the same new PS key.', { run: { bold: true } }),
  para('Rates are LF/hr — set them so the total time on a typical 12-LF lower-only kitchen lands where you want it for that mask level.', { run: { italics: true } }),

  // Reference: stack multiplier
  para('Stack multiplier:', { run: { bold: true } }),
  tbl([3000, 2000, 4000], [
    new TableRow({ children: [
      cell('Cabinet layout', { shade: HEADER_SHADE, bold: true, width: 3000 }),
      cell('Multiplier', { shade: HEADER_SHADE, bold: true, width: 2000, align: AlignmentType.CENTER }),
      cell('Reasoning', { shade: HEADER_SHADE, bold: true, width: 4000 }),
    ]}),
    new TableRow({ children: [
      cell('Lower Only', { shade: REF_SHADE, width: 3000 }),
      cell('1×', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('Single run of cabinet to mask', { shade: REF_SHADE, width: 4000 }),
    ]}),
    new TableRow({ children: [
      cell('Lower + Upper', { shade: REF_SHADE, width: 3000 }),
      cell('2×', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('Two stacked runs (lower + upper) to mask separately', { shade: REF_SHADE, width: 4000 }),
    ]}),
  ]),

  para(' '),

  // ── Single consolidated 7-row scenario table ──
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [
    new TextRun({ text: 'Cabinet protection scenarios — one task per mask level', font: ARIAL, size: 24, bold: true }),
  ]}),
  para('All 7 scenarios share the same PS key (PS_PROTECT_LF.CABINET) and UOM (LF). Quantity = linear_ft × stack_multiplier. The only thing that varies between scenarios is the rate.'),
  para('All 7 are NEW scenarios on the non-paint code path. The existing LIGHT/STANDARD/HEAVY scenarios are not retired — they keep their definitions and will be repurposed for Path 2 (paint-mode masking) when we get there.', { run: { italics: true } }),

  tbl([3800, 2400, 2360, 1400], [
    new TableRow({ tableHeader: true, children: [
      cell('Scenario ID (NEW)', { shade: HEADER_SHADE, bold: true, width: 3800 }),
      cell('Task ID (NEW)', { shade: HEADER_SHADE, bold: true, width: 2400 }),
      cell('UI label', { shade: HEADER_SHADE, bold: true, width: 2360 }),
      cell('Rate (LF/hr)', { shade: HEADER_SHADE, bold: true, width: 1400, align: AlignmentType.CENTER }),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_EDGE', { width: 3800 }),
      cell('TSK_CABT_PROT_EDGE', { width: 2400 }),
      cell('Edge tape only', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_PARTIAL', { width: 3800 }),
      cell('TSK_CABT_PROT_PARTIAL', { width: 2400 }),
      cell('Partial (perimeter)', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_FULL', { width: 3800 }),
      cell('TSK_CABT_PROT_FULL', { width: 2400 }),
      cell('Full drape', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_ENCAPSULATE', { width: 3800 }),
      cell('TSK_CABT_PROT_ENCAP', { width: 2400 }),
      cell('Encapsulate (taped/sealed)', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_EDGE_PARTIAL', { width: 3800 }),
      cell('TSK_CABT_PROT_EDGE_PRT', { width: 2400 }),
      cell('Edge+ Partial', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_EDGE_FULL', { width: 3800 }),
      cell('TSK_CABT_PROT_EDGE_FULL', { width: 2400 }),
      cell('Edge+ Full', { width: 2360 }),
      blankCell(1400),
    ]}),
    new TableRow({ children: [
      cell('SCN_CABINET_PROTECT_EDGE_ENCAPSULATE', { width: 3800 }),
      cell('TSK_CABT_PROT_EDGE_ENCAP', { width: 2400 }),
      cell('Edge+ Encapsulate', { width: 2360 }),
      blankCell(1400),
    ]}),
  ]),

  // ── 1.4 NEW PS key + retiring old keys ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.4 PS keys — new + reserved', font: ARIAL, size: 28, bold: true }),
  ]}),
  para('Path 1 introduces ONE new PS key. The existing per-zone keys stay defined and are RESERVED for Path 2 (paint-mode masking) — they\'ll be wired off the paint_cabinets=true branch when Path 2 is designed. They are no longer fired off the paint_cabinets=false branch.'),

  tbl([3500, 1000, 5000], [
    new TableRow({ tableHeader: true, children: [
      cell('PS key', { shade: HEADER_SHADE, bold: true, width: 3500 }),
      cell('UOM', { shade: HEADER_SHADE, bold: true, width: 1000, align: AlignmentType.CENTER }),
      cell('Status / notes', { shade: HEADER_SHADE, bold: true, width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_LF.CABINET', { width: 3500, bold: true }),
      cell('LF', { width: 1000, align: AlignmentType.CENTER }),
      cell('NEW. Path 1 (non-paint). Quantity = cabinets.linear_ft × stack_multiplier (1 or 2). Fed by all 7 scenarios above.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_EA.CABINET_FACE_COVERS', { width: 3500 }),
      cell('EA', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2. Stops emitting from the paint_cabinets=false branch.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_LF.COUNTERTOP_EDGE (cabinet branch)', { width: 3500 }),
      cell('LF', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2. NOTE: same key may also be fed by a standalone "Countertops" fixture — leave that path alone.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_SF.FLOOR_FULL_KITCHEN', { width: 3500 }),
      cell('SF', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_SF.BACKSPLASH_MASK', { width: 3500 }),
      cell('SF', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_EA.ASSET.HARDWARE', { width: 3500 }),
      cell('EA', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2.', { width: 5000 }),
    ]}),
    new TableRow({ children: [
      cell('PS_PROTECT_EA.ASSET.APPLIANCES', { width: 3500 }),
      cell('EA', { width: 1000, align: AlignmentType.CENTER }),
      cell('RESERVED for Path 2 (was hardcoded as 2 EA in heavy tier).', { width: 5000 }),
    ]}),
  ]),

  para(' '),
  para('Notes / questions:', { run: { bold: true } }),
  bullet('Q1. Confirm: is teardown time included in the per-scenario LF/hr rate, or should each scenario produce a separate teardown task?'),
  fillIn(),
  bullet('Q2. Confirm the stack multiplier rule (1 for lower_only, 2 for lower_upper) — is there ever a case where it\'d be 3 (e.g., island + lower + upper) or fractional?'),
  fillIn(),
  bullet('Q3. Anything different about the layout vs. linear_ft fields the engine should pick up? (Currently only those two are used to compute mask quantity.)'),
  fillIn(),

  // ── 1.5 Closet shelving — PARKED ──
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.5 Closet shelving — PARKED', font: ARIAL, size: 28, bold: true, color: '888888' }),
  ]}),
  para('PARKED. Earlier draft used a multiplier model (per-shelving-type baseline rate × level multiplier). Eric flagged it as too opaque — the multipliers had no clear baseline and the model was overkill for closet shelving. Walking it back.', { run: { bold: true } }),
  para('Plan: redo as the same straight LF rate × scenario tier model used for cabinets in 1.3 — one task per mask level, one rate per scenario, no multipliers. Open question on whether per-shelving-type variation (wire / wood / built-in) stays as a rate scalar or drops out entirely. Will be designed in a separate pass.', { run: { italics: true, color: '888888' } }),

  // Original closet shelving multiplier review (kept for now but de-emphasized)
  new Paragraph({ heading: HeadingLevel.HEADING_3, children: [
    new TextRun({ text: 'Reference: original multiplier proposal (no longer in play)', font: ARIAL, size: 24, bold: true, color: '888888' }),
  ]}),
  para('Kept here for context only. The values below are no longer being asked for.', { run: { italics: true, color: '888888' } }),

  tbl([2400, 2200, 1800, 2960], [
    new TableRow({ tableHeader: true, children: [
      cell('Mask level (canonical)', { shade: HEADER_SHADE, bold: true, width: 2400 }),
      cell('Draft multiplier', { shade: HEADER_SHADE, bold: true, width: 2200, align: AlignmentType.CENTER }),
      cell('— (parked)', { shade: HEADER_SHADE, bold: true, width: 1800, align: AlignmentType.CENTER }),
      cell('Notes / rationale', { shade: HEADER_SHADE, bold: true, width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('edge', { shade: REF_SHADE, width: 2400 }),
      cell('0.5×', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2200 }),
      cell('—', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 1800 }),
      cell('existing item_mask', { shade: REF_SHADE, width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('partial', { shade: REF_SHADE, width: 2400 }),
      cell('1.0×', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2200 }),
      cell('—', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 1800 }),
      cell('existing baseline', { shade: REF_SHADE, width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('full', { shade: REF_SHADE, width: 2400 }),
      cell('1.5×', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2200 }),
      cell('—', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 1800 }),
      cell('existing full_cover', { shade: REF_SHADE, width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('encapsulate', { width: 2400, bold: true }),
      cell('2.0×', { align: AlignmentType.CENTER, width: 2200 }),
      blankCell(1800),
      cell('NEW — sealed tape on top of full', { width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('edge_partial', { width: 2400, bold: true }),
      cell('1.2×', { align: AlignmentType.CENTER, width: 2200 }),
      blankCell(1800),
      cell('NEW — partial + edge tape line', { width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('edge_full', { width: 2400, bold: true }),
      cell('1.7×', { align: AlignmentType.CENTER, width: 2200 }),
      blankCell(1800),
      cell('NEW — full + edge tape line', { width: 2960 }),
    ]}),
    new TableRow({ children: [
      cell('edge_encapsulate', { width: 2400, bold: true }),
      cell('2.2×', { align: AlignmentType.CENTER, width: 2200 }),
      blankCell(1800),
      cell('NEW — encapsulate + edge tape line', { width: 2960 }),
    ]}),
  ]),

  para(' '),
  para('Per-shelving-type baseline rates (for reference — these are not changing):', { run: { italics: true } }),
  tbl([3360, 2000, 2000, 2000], [
    new TableRow({ tableHeader: true, children: [
      cell('Shelving type', { shade: HEADER_SHADE, bold: true, width: 3360 }),
      cell('Setup (min/LF)', { shade: HEADER_SHADE, bold: true, width: 2000, align: AlignmentType.CENTER }),
      cell('Teardown (min/LF)', { shade: HEADER_SHADE, bold: true, width: 2000, align: AlignmentType.CENTER }),
      cell('Obstruction (min/LF)', { shade: HEADER_SHADE, bold: true, width: 2000, align: AlignmentType.CENTER }),
    ]}),
    new TableRow({ children: [
      cell('Wire shelving', { shade: REF_SHADE, width: 3360 }),
      cell('0.5', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('0.25', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('0.3', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      cell('Wood / melamine shelving', { shade: REF_SHADE, width: 3360 }),
      cell('1.5', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('0.5', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('1.0', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
    ]}),
    new TableRow({ children: [
      cell('Built-in system', { shade: REF_SHADE, width: 3360 }),
      cell('2.5', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('1.0', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
      cell('2.0', { shade: REF_SHADE, align: AlignmentType.CENTER, width: 2000 }),
    ]}),
  ]),

  // ── 1.6 Open questions ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '1.6 Open questions / notes', font: ARIAL, size: 28, bold: true }),
  ]}),
  bullet('Q1. Should "encapsulate" mean "double-pass tape + sealed perimeter" or something else operationally? Write your definition: ____'),
  fillIn(),
  bullet('Q2. The edge+ prefix means a dedicated tape line ON TOP of the base level — used when a crisp cut edge is required. Confirm or correct: ____'),
  fillIn(),
  bullet('Q3. Anything specific to the kitchen-cabinet vs. closet-shelving context that should make their surcharges differ?'),
  fillIn(),
];

// ── Section 2: Protection Heuristics UI Panel ────────────────────────────

const section2 = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [
    new TextRun({ text: '2. Protection Heuristics — Project Setup UI Panel', font: ARIAL, size: 32, bold: true }),
  ]}),

  para('The state already carries project.protection_heuristics with hardcoded defaults; the engine consumes them in quantity-lookups.js. The missing piece is a UI panel on the Project Setup tab so the estimator can override per project. This section captures the panel design.'),

  // ── 2.1 Already wired ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '2.1 Already wired (no changes needed)', font: ARIAL, size: 28, bold: true }),
  ]}),
  bullet('State path: project.protection_heuristics — initialized in src/state/initial-state.js with defaults below.'),
  bullet('Engine reads: src/engine/quantity-lookups.js — gates outlet mask, HVAC mask vs remove, and per-room counts.'),
  bullet('Per-room override fields (room.protection.outlets_count_override / hvac_vents_count_override) already exist in state and are consumed by the engine. UI for those is Priority 3 (Protection tab — separate work item).'),

  // ── 2.2 Field spec ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '2.2 Field spec — what to render', font: ARIAL, size: 28, bold: true }),
  ]}),

  para('Below are the four fields. Fill in any cells you want to change from the proposal.'),

  tbl([2200, 2000, 1500, 1300, 1700, 660], [
    new TableRow({ tableHeader: true, children: [
      cell('State key', { shade: HEADER_SHADE, bold: true, width: 2200 }),
      cell('Display label', { shade: HEADER_SHADE, bold: true, width: 2000 }),
      cell('Input type', { shade: HEADER_SHADE, bold: true, width: 1500 }),
      cell('Default', { shade: HEADER_SHADE, bold: true, width: 1300, align: AlignmentType.CENTER }),
      cell('Help text', { shade: HEADER_SHADE, bold: true, width: 1700 }),
      cell('OK?', { shade: HEADER_SHADE, bold: true, width: 660, align: AlignmentType.CENTER }),
    ]}),
    new TableRow({ children: [
      cell('outlets_per_room', { shade: REF_SHADE, width: 2200 }),
      cell('Outlets per room', { width: 2000 }),
      cell('number', { width: 1500 }),
      cell('4', { align: AlignmentType.CENTER, width: 1300 }),
      cell('Mask qty per non-closet room when spraying', { width: 1700 }),
      blankCell(660),
    ]}),
    new TableRow({ children: [
      cell('hvac_vents_per_room', { shade: REF_SHADE, width: 2200 }),
      cell('HVAC vents per room', { width: 2000 }),
      cell('number (decimal)', { width: 1500 }),
      cell('0.7', { align: AlignmentType.CENTER, width: 1300 }),
      cell('Closets excluded — fractional avg across rooms', { width: 1700 }),
      blankCell(660),
    ]}),
    new TableRow({ children: [
      cell('outlet_remove_reinstall', { shade: REF_SHADE, width: 2200 }),
      cell('Outlet remove + reinstall', { width: 2000 }),
      cell('toggle', { width: 1500 }),
      cell('off', { align: AlignmentType.CENTER, width: 1300 }),
      cell('Adds prep tasks (additive to mask, not replacement)', { width: 1700 }),
      blankCell(660),
    ]}),
    new TableRow({ children: [
      cell('hvac_action', { shade: REF_SHADE, width: 2200 }),
      cell('HVAC action', { width: 2000 }),
      cell('radio: Mask | Remove', { width: 1500 }),
      cell('Mask', { align: AlignmentType.CENTER, width: 1300 }),
      cell('Mutually exclusive — Remove fires remove + reinstall prep tasks', { width: 1700 }),
      blankCell(660),
    ]}),
  ]),

  // ── 2.3 Layout / position ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '2.3 Layout / position', font: ARIAL, size: 28, bold: true }),
  ]}),

  para('YOUR CHOICE — circle one:'),

  tbl([1000, 4000, 4000], [
    new TableRow({ tableHeader: true, children: [
      cell('Pick', { shade: HEADER_SHADE, bold: true, width: 1000, align: AlignmentType.CENTER }),
      cell('Position', { shade: HEADER_SHADE, bold: true, width: 4000 }),
      cell('Notes', { shade: HEADER_SHADE, bold: true, width: 4000 }),
    ]}),
    new TableRow({ children: [
      blankCell(1000),
      cell('A. Below "Interior Defaults" as a sibling section', { width: 4000 }),
      cell('Recommended — matches existing visual weight of other defaults sections', { width: 4000 }),
    ]}),
    new TableRow({ children: [
      blankCell(1000),
      cell('B. New collapsible "Protection" section near top', { width: 4000 }),
      cell('More prominent — but project setup is already long', { width: 4000 }),
    ]}),
    new TableRow({ children: [
      blankCell(1000),
      cell('C. Tucked at bottom of Project Setup', { width: 4000 }),
      cell('Lowest visibility — only relevant for users tuning defaults', { width: 4000 }),
    ]}),
    new TableRow({ children: [
      blankCell(1000),
      cell('D. Other (write below)', { width: 4000 }),
      blankCell(4000),
    ]}),
  ]),

  fillIn(),

  // ── 2.4 Open questions ──
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [
    new TextRun({ text: '2.4 Open questions / notes', font: ARIAL, size: 28, bold: true }),
  ]}),
  bullet('Q1. Should there be a "reset to defaults" link/button on the panel? (yes/no): ____'),
  fillIn(),
  bullet('Q2. Should bathroom/kitchen rooms have different default vent counts than 0.7? Or do per-room overrides handle that?'),
  fillIn(),
  bullet('Q3. Any additional heuristic fields you want at the project level that aren\'t in the four above? (e.g., default tape line per door/window, default appliance count assumption)'),
  fillIn(),
  bullet('Q4. Should the help text on each row be a tooltip (?), inline subtitle, or omitted entirely?'),
  fillIn(),
];

// ── Build document ────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'Eric Mowrer + Claude',
  title: 'Protection Cleanup — Outstanding Decisions',
  styles: {
    default: { document: { run: { font: ARIAL, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: ARIAL, color: '1F3A5F' },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: ARIAL, color: '2E5C8A' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: ARIAL, color: '4A4A4A' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } },
      }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }, // 0.75" margins for more table room
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'Protection Cleanup — Outstanding Decisions', font: ARIAL, size: 36, bold: true, color: '1F3A5F' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 360 },
        children: [new TextRun({ text: 'Detail-panel enum cleanup landed; this captures the two follow-up decisions Eric needs to weigh in on.', font: ARIAL, size: 22, italics: true, color: '666666' })],
      }),
      ...section1,
      ...section2,
    ],
  }],
});

// Write to a fallback filename if the primary is locked (open in Word).
const primaryPath = path.join(__dirname, 'Protection_Followups.docx');
const fallbackPath = path.join(__dirname, 'Protection_Followups_v2.docx');
Packer.toBuffer(doc).then(buf => {
  let outPath = primaryPath;
  try {
    fs.writeFileSync(primaryPath, buf);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EACCES') {
      outPath = fallbackPath;
      fs.writeFileSync(fallbackPath, buf);
    } else {
      throw err;
    }
  }
  console.log('Wrote', outPath, '(' + buf.length + ' bytes)');
}).catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
