// Generates a docx with editable tables for the Protection rollout's
// E1 (adjacent-item quantity emission) and E2 (project prep heuristics).
// User fills UOM where needed, heuristic counts, prep task rates.
//
// Run from Claude/tools/paintscope/:  node gen-protection-e1-e2-spec.cjs

const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, PageOrientation, BorderStyle, WidthType, ShadingType,
  PageBreak,
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 6, color: "B0B0B0" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerFill = { fill: "DEE7EE", type: ShadingType.CLEAR };
const cellMargins = { top: 80, bottom: 80, left: 100, right: 100 };

function cell(text, opts = {}) {
  const { width, header = false, italic = false } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: cellMargins,
    shading: header ? headerFill : undefined,
    children: [new Paragraph({
      alignment: header ? AlignmentType.CENTER : undefined,
      children: [new TextRun({ text, bold: header, italic, size: 18 })],
    })],
  });
}

function makeTable(columnWidths, headerRow, dataRows) {
  const totalWidth = columnWidths.reduce((s, w) => s + w, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerRow.map((h, i) => cell(h, { width: columnWidths[i], header: true })),
      }),
      ...dataRows.map(row => new TableRow({
        children: row.map((c, i) => cell(c, { width: columnWidths[i] })),
      })),
    ],
  });
}

function heading(text, level = 1) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: level === 1 ? 32 : 26 })],
    spacing: { before: level === 1 ? 240 : 200, after: 120 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, italic: opts.italic, bold: opts.bold })],
    spacing: { after: 120 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// =============================================================================
// TABLE 1 — E1: Adjacent-item quantity emission
// =============================================================================
// Columns: Item | Source field | Quantity formula | UOM | Default rate hint | Notes

const e1Cols = [1700, 2400, 2700, 600, 1100, 4260];   // sums to 12760 (landscape content)
const e1Header = ['Item', 'Source state field', 'Quantity formula', 'UOM', 'Default rate hint (units/hr)', 'Notes / questions'];

const e1Rows = [
  // Doors / windows — based on paint scope
  ['Door slab',           'doors.items where painting=false',                'count of unpainted doors',                       'EA', '10 install / 12 remove',  'mask door panel when door is in room but not in paint scope'],
  ['Window — full wrap (small)',  'windows.items where painting=false, size_bucket=S',  'count',                                          'EA', '8 / 30',                  'wraps whole window opening when window NOT being painted'],
  ['Window — full wrap (std)',    'windows.items where painting=false, size_bucket=M',  'count',                                          'EA', '7 / 30',                  ''],
  ['Window — full wrap (lg)',     'windows.items where painting=false, size_bucket=L',  'count',                                          'EA', '6 / 30',                  ''],
  ['Window — full wrap (xl)',     'windows.items where painting=false, size_bucket=XL', 'count',                                          'EA', '5 / 30',                  ''],
  ['Window glass (lites)',        'windows.items where painting=true · NEW lites_count field per window', 'sum of lites across painted windows', 'EA', '24 / 30',                 'NEW UI: per-window "lites count" input on Openings tab. Lites = individual glass panes (window divided into multiple panes by muntins) — must be masked before painting muntins/sash. French doors handled separately?'],
  // Trim adjacent (when not in paint scope) — already partially wired
  ['Door frame adjacent',         'door_frames where painting=false',                  'd.door_frame_lf',                                'LF', '170 install / 1000 remove', 'already wired ✓'],
  ['Door casing adjacent',        'door_casing where painting=false',                  'd.door_casing_lf',                               'LF', '170 / 1000',              'already wired ✓'],
  ['Window casing adjacent',      'window_casing where painting=false',                'd.window_casing_lf',                             'LF', '200 / 200',               'already wired ✓ — height modifier applies'],
  ['Window jamb adjacent',        'window_jamb where painting=false',                  'd.window_jamb_lf',                               'LF', '170 / 1000',              'already wired ✓'],
  ['Window stool adjacent',       'window_stool where painting=false',                 'd.window_stool_lf?',                             'LF', '200 / 1000',              'NOT wired yet. Does state currently track window_stool LF?'],
  ['Window apron adjacent',       'window_apron where painting=false',                 'd.window_apron_lf?',                             'LF', '200 / 1000',              'NOT wired yet. Same question.'],
  // Fixtures from room.fixtures
  ['Cabinets',                    'fixtures.cabinets.linear_ft + layout',              'linear_ft (× 2 if lower+upper?)',                'LF', '20 / 120',                'is the LF a singleton (one run measured) or do we double for lower+upper?'],
  ['Countertops',                 'fixtures.countertops.linear_ft? — currently using COUNTERTOP_EDGE key from quantity-lookups', 'linear_ft', 'LF', '120 / 400',               'rename existing PS_PROTECT_LF.COUNTERTOP_EDGE to .COUNTERTOP for consistency? Or rename task ref?'],
  ['Built-in shelving',           'fixtures.builtin_shelving.{width,height,count}',    'W × H × count',                                  'SF', '144 / 600',               'currently uses W×H×count formula in Protection tab UI. Carry that to qty-lookups.'],
  ['Fireplace mantel',            'fixtures.fireplace.{width,height,count}',           'W × H × count',                                  'SF', '? / ?',                   'user flagged earlier: should be SF (width × height) not EA. Width/height fields already exist on detail panel. Need rate.'],
  ['Stone fireplace',             'fixtures.stone_fireplace.{width,height,count}',     'W × H × count',                                  'SF', '? / ?',                   'separate from regular fireplace (different masking — irregular surface)?'],
  ['Feature wall',                'fixtures.feature_wall.items[*].length×height',      'sum of items SF, optionally minus baseboard LF', 'SF', '? / ?',                   'rich state already (multi-item). Need rate.'],
  ['Light fixtures',              'fixtures.light_fixtures.count',                     'count',                                          'EA', '12 / 24',                 ''],
  ['Ceiling fan',                 'fixtures.ceiling_fan.count — NEW fixture in catalog', 'count',                                        'EA', '6 / 12',                  'NEW: add ceiling_fan to fixture-catalog.js. Distinct from light_fixtures because larger/heavier mask.'],
  ['Vanity',                      'fixtures.vanity.{W,H,count}',                       'W × H × count',                                  'SF', '? / ?',                   'rate?'],
  ['Shower / enclosure',          'fixtures.shower.{W,H,count}',                       'W × H × count',                                  'SF', '? / ?',                   'rate?'],
  ['Bathtub',                     'fixtures.bathtub.count + size?',                    'count or W×H',                                   '?',  '? / ?',                   'EA or SF? Detail panel currently lacks dimension fields for bathtub'],
  ['Toilet',                      'fixtures.toilet.count',                             'count',                                          'EA', '? / ?',                   'small mask — rate?'],
  ['Appliances',                  'fixtures.appliances.count',                         'count',                                          'EA', '? / ?',                   'large mask each — kitchen has fridge/stove/dishwasher — count per appliance or per kitchen?'],
  ['Backsplash',                  'fixtures.backsplash.{LF or SF}',                    '?',                                              '?',  '? / ?',                   'measure as LF (run length) or SF? No dimension fields in detail panel currently'],
  ['',                            '',                                                  '',                                               '',   '',                        ''],
];

// =============================================================================
// TABLE 2 — E2: Project-level prep heuristics
// =============================================================================
// Outlets/switches and HVAC vents are NOT measured per-room — they're project-
// level heuristics applied as a rate per room. Two possible work-types each:
//   1. Mask the cover (during painting protection)
//   2. Remove + reinstall the cover (separate prep task — not protection)

const e2Cols = [2200, 1500, 1200, 1500, 1200, 1500, 3660];
const e2Header = ['Heuristic', 'Default per room', 'UOM', 'Computed quantity', 'Default rate hint', 'Phase', 'Notes'];

const e2Rows = [
  ['Outlets / switches — mask',     '4',    'EA',   'rooms × default',   '40 install / 40 remove',    'protect setup/teardown', 'per room. Override at room level if estimator wants to count actual.'],
  ['Outlets / switches — remove + reinstall cover',  '4',    'EA',   'rooms × default',   '? / ?',                     'prep',                   'SEPARATE prep task — happens before/after painting, not protection. Rate?'],
  ['HVAC vents — mask',             '0.7',  'EA',   'rooms × default',   '20 install / 30 remove',    'protect setup/teardown', '0.7/room because not every room has one. Closets excluded from "rooms" count.'],
  ['HVAC vents — remove + reinstall', '0.7',  'EA',   'rooms × default',   '? / ?',                     'prep',                   'SEPARATE prep task. Used when estimator opts to drop the vent rather than mask it.'],
  ['',                              '',     '',     '',                  '',                          '',                       ''],
];

// =============================================================================
// TABLE 3 — Open questions to flag
// =============================================================================

const e3Cols = [4000, 8760];
const e3Header = ['Question', 'Resolution / decision'];
const e3Rows = [
  ['Should Window glass (lites) be a single field on the room (sum across windows) or per-window?', ''],
  ['Cabinets LF — does the user enter the SUM across all runs (lower+upper combined), or just lower?', ''],
  ['Countertop key — rename `PS_PROTECT_LF.COUNTERTOP_EDGE` to `.COUNTERTOP` for consistency? Or rename the task to consume `_EDGE`?', ''],
  ['Fireplace mantel — confirm SF derivation (W × H) instead of EA? Mantel-only (no firebox)?', ''],
  ['Bathtub UOM — EA (one mask, fixed minutes) or SF (W×H)? Current detail panel has no W×H for bathtub.', ''],
  ['Appliances — count per appliance type (fridge, stove, dishwasher separate) or aggregate count?', ''],
  ['Backsplash — LF or SF? Detail panel currently lacks dimension input.', ''],
  ['Outlet/switch + HVAC remove-and-reinstall — is this a per-room toggle (estimator chooses mask vs remove), or default mask with optional remove?', ''],
  ['Closets — included or excluded from "rooms × heuristic" count for outlets/switches/HVAC?', ''],
];

// =============================================================================
// BUILD DOCUMENT
// =============================================================================

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 720, right: 1080, bottom: 720, left: 1080 },
      },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text: "Protection — E1 / E2 Specification Tables", bold: true, size: 36 })],
        spacing: { after: 120 },
      }),
      para("Fill in UOM where marked '?', confirm rates, edit any cells where my assumption is wrong. Add rows for items I missed.", { italic: true }),

      heading("Table 1 — E1: Adjacent-item quantity emission"),
      para("Each row maps a room-level item the user has marked present (Identity tab fixture checklist + paint-scope toggles) to a quantity that quantity-lookups.js needs to emit so that the corresponding protection task fires with non-zero hours."),
      makeTable(e1Cols, e1Header, e1Rows),

      pageBreak(),
      heading("Table 2 — E2: Project-level prep heuristics"),
      para("Outlets/switches + HVAC vents aren't per-room counted. Project default × room count drives the quantity. Two work types each — masking (during protection setup) and remove+reinstall (separate prep). Estimator can pick either or both."),
      makeTable(e2Cols, e2Header, e2Rows),

      heading("Table 3 — Open questions"),
      para("Decisions needed before authoring quantity-lookup logic. Mark Resolution column."),
      makeTable(e3Cols, e3Header, e3Rows),
    ],
  }],
});

const outPath = path.resolve(__dirname, "..", "..", "devos", "protection_e1_e2_spec.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, `(${(buf.length/1024).toFixed(1)} KB)`);
}).catch(err => { console.error(err); process.exit(1); });
