// Generates a docx with three mask-level decision matrices (floor/wall/ceiling)
// for the user to fill in. Each row = painting scope × application method
// combination. User assigns the mask level per cell.
//
// Run from Claude/tools/paintscope/:
//   node gen-mask-level-matrix.cjs

const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, PageOrientation, BorderStyle, WidthType, ShadingType,
  HeadingLevel, PageBreak,
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 6, color: "B0B0B0" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerFill = { fill: "DEE7EE", type: ShadingType.CLEAR };
const cellMargins = { top: 80, bottom: 80, left: 100, right: 100 };

function cell(text, opts = {}) {
  const { width, header = false, bold = false, italic = false, align } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: cellMargins,
    shading: header ? headerFill : undefined,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: header || bold, italic, size: 18 })],
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
        children: headerRow.map((h, i) => cell(h, { width: columnWidths[i], header: true, align: AlignmentType.CENTER })),
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

// ============================================================================
// TABLE 1: FLOOR MASK LEVEL
// ============================================================================
// Rows: painting scope × application method combinations
// Columns: each floor type (level filled per cell)
// Levels: none / edge / partial / full / encapsulate

const floorCols = [400, 1900, 1800, 1500, 1500, 1500, 1500, 1500, 1500];
// total = 13100 (fits landscape with 1in margins = 12960... close. Let me trim)
const floorColsTrim = [400, 1850, 1750, 1450, 1450, 1450, 1450, 1450, 1410];
// total = 12660
const floorHeader = [
  '#',
  'Painting Scope',
  'Method',
  'Subfloor',
  'Concrete',
  'Hardwood',
  'Tile',
  'Carpet',
  'LVP',
];

const floorRows = [
  // Single-scope rows
  ['1',  'Ceiling only',          'Brush/Roll',                           '', '', '', '', '', ''],
  ['2',  'Ceiling only',          'Spray',                                '', '', '', '', '', ''],
  ['3',  'Walls only',            'Brush/Roll',                           '', '', '', '', '', ''],
  ['4',  'Walls only',            'Spray',                                '', '', '', '', '', ''],
  ['5',  'Trim only',             'Brush',                                '', '', '', '', '', ''],
  ['6',  'Trim only',             'Spray',                                '', '', '', '', '', ''],
  // Ceiling + Walls
  ['7',  'Ceiling + Walls',       'All brush/roll',                       '', '', '', '', '', ''],
  ['8',  'Ceiling + Walls',       'All spray',                            '', '', '', '', '', ''],
  ['9',  'Ceiling + Walls',       'Ceiling spray, walls brush',           '', '', '', '', '', ''],
  ['10', 'Ceiling + Walls',       'Walls spray, ceiling brush (rare)',    '', '', '', '', '', ''],
  // Walls + Trim
  ['11', 'Walls + Trim',          'All brush',                            '', '', '', '', '', ''],
  ['12', 'Walls + Trim',          'All spray',                            '', '', '', '', '', ''],
  ['13', 'Walls + Trim',          'Trim brush, walls spray',              '', '', '', '', '', ''],
  ['14', 'Walls + Trim',          'Trim spray, walls brush',              '', '', '', '', '', ''],
  // Ceiling + Trim
  ['15', 'Ceiling + Trim',        'All brush',                            '', '', '', '', '', ''],
  ['16', 'Ceiling + Trim',        'All spray',                            '', '', '', '', '', ''],
  // Ceiling + Walls + Trim (full residential interior)
  ['17', 'Ceiling + Walls + Trim','All brush',                            '', '', '', '', '', ''],
  ['18', 'Ceiling + Walls + Trim','All spray',                            '', '', '', '', '', ''],
  ['19', 'Ceiling + Walls + Trim','Trim brush, walls + ceiling spray',    '', '', '', '', '', ''],
  ['20', 'Ceiling + Walls + Trim','Trim spray, walls + ceiling brush',    '', '', '', '', '', ''],
  // Full (above + doors + windows)
  ['21', 'Full (CWT + doors + windows)','All brush',                      '', '', '', '', '', ''],
  ['22', 'Full',                  'All spray',                            '', '', '', '', '', ''],
  ['23', 'Custom — see notes',    '',                                     '', '', '', '', '', ''],
];

// ============================================================================
// TABLE 2: WALL MASK LEVEL
// ============================================================================
// Rows: cases where walls are NOT in paint scope
// Columns: result level + notes
// Levels: none / edge / partial / full / encapsulate

const wallCols = [400, 3200, 3500, 1800, 3760];
// total = 12660
const wallHeader = [
  '#',
  'What IS being painted (walls NOT in scope)',
  'Method',
  'Wall mask',
  'Notes',
];

const wallRows = [
  ['1',  'Ceiling only',                          'Brush/Roll',                            '', ''],
  ['2',  'Ceiling only',                          'Spray',                                 '', ''],
  ['3',  'Trim only',                             'Brush',                                 '', ''],
  ['4',  'Trim only (no crown)',                  'Spray',                                 '', ''],
  ['5',  'Trim only (incl crown)',                'Spray',                                 '', ''],
  ['6',  'Ceiling + Trim',                        'All brush',                             '', ''],
  ['7',  'Ceiling + Trim',                        'All spray',                             '', ''],
  ['8',  'Ceiling + Trim',                        'Ceiling spray, trim brush',             '', ''],
  ['9',  'Doors + windows only',                  'Brush',                                 '', ''],
  ['10', 'Doors + windows only',                  'Spray',                                 '', ''],
  ['11', 'Custom — see notes',                    '',                                      '', ''],
];

// ============================================================================
// TABLE 3: CEILING MASK LEVEL
// ============================================================================
// Rows: cases where ceiling is NOT in paint scope
// Columns: result level + notes
// Levels: none / edge / partial / encapsulate (no full — gravity)

const ceilingCols = [400, 3200, 3500, 1800, 3760];
const ceilingHeader = [
  '#',
  'What IS being painted (ceiling NOT in scope)',
  'Method',
  'Ceiling mask',
  'Notes',
];

const ceilingRows = [
  ['1',  'Walls only',                            'Brush/Roll',                            '', ''],
  ['2',  'Walls only',                            'Spray',                                 '', ''],
  ['3',  'Trim only — no crown',                  'Brush',                                 '', ''],
  ['4',  'Trim only — no crown',                  'Spray',                                 '', ''],
  ['5',  'Trim only — incl crown',                'Brush',                                 '', ''],
  ['6',  'Trim only — incl crown',                'Spray',                                 '', ''],
  ['7',  'Walls + Trim',                          'All brush',                             '', ''],
  ['8',  'Walls + Trim',                          'All spray',                             '', ''],
  ['9',  'Walls + Trim',                          'Trim brush, walls spray',               '', ''],
  ['10', 'Walls + Trim',                          'Trim spray, walls brush',               '', ''],
  ['11', 'Doors + windows only',                  'Brush',                                 '', ''],
  ['12', 'Doors + windows only',                  'Spray',                                 '', ''],
  ['13', 'Custom — see notes',                    '',                                      '', ''],
];

// ============================================================================
// LEGEND
// ============================================================================

const levelLegend = [
  ['none',         'No protection — surface is in scope or doesn\'t need it'],
  ['edge',         'Tape line only — perimeter strip / trim line tape'],
  ['partial',      'Drop cloth or plastic extending out from edge (~3 ft strip for floors; perimeter for ceilings)'],
  ['full',         'Loose drape covering full surface (untaped). N/A for ceilings (gravity).'],
  ['encapsulate',  'Taped + sealed tight — full coverage with edges sealed'],
];

const legendCols = [2400, 10260];
const legendHeader = ['Mask Level', 'Definition'];

// ============================================================================
// BUILD DOCUMENT
// ============================================================================

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
        children: [new TextRun({ text: "Mask Level Decision Matrix", bold: true, size: 40 })],
        spacing: { after: 120 },
      }),
      para("Fill in each cell with one of: none / edge / partial / full / encapsulate. Add notes per row where the answer depends on something not captured by the columns. Add rows wherever a real-world scenario doesn't fit.", { italic: true }),

      heading("Mask Level Legend"),
      makeTable(legendCols, legendHeader, levelLegend),

      pageBreak(),
      heading("Table 1 — Floor Mask Level"),
      para("Rows = painting scope × application method. Columns = floor type. Each cell = mask level when those conditions match. Subfloor + Concrete columns included for completeness (likely 'none' or 'edge' in most cases — confirm)."),
      makeTable(floorColsTrim, floorHeader, floorRows),

      pageBreak(),
      heading("Table 2 — Wall Mask Level"),
      para("Only applies when walls are NOT in paint scope. When walls ARE in scope, mask level is always 'none' (you paint them, no overspray-on-self concern). Wall material is assumed to be finished drywall — flag in notes if a row should differ for bare drywall, masonry, or wood paneling."),
      makeTable(wallCols, wallHeader, wallRows),

      pageBreak(),
      heading("Table 3 — Ceiling Mask Level"),
      para("Only applies when ceiling is NOT in paint scope. When ceiling IS in scope, mask level is always 'none'. Ceiling has no 'full' option — gravity prevents draping. Available levels: none / edge / partial / encapsulate."),
      makeTable(ceilingCols, ceilingHeader, ceilingRows),

      pageBreak(),
      heading("Notes / Edge Cases"),
      para("Capture anything that doesn't fit cleanly in the matrix above:"),
      para(""),
      para("•"),
      para("•"),
      para("•"),
      para(""),
      heading("Open questions to flag", 2),
      para("•  Does floor type override painting scope (e.g., spraying anything on hardwood always = encapsulate, regardless of scope)?"),
      para("•  When trim is sprayed, does the spray pattern reach all 3 surfaces (floor + wall + ceiling), or only floor + wall?"),
      para("•  Are there 'minimum' protections that always apply regardless of scope (e.g., always edge-tape floor at trim line)?"),
      para("•  Does \"Custom\" painting scope use the strictest level across all active substrates, or pick a default?"),
    ],
  }],
});

const outPath = path.resolve(__dirname, "..", "..", "devos", "mask_level_matrix.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, `(${(buf.length/1024).toFixed(1)} KB)`);
}).catch(err => { console.error(err); process.exit(1); });
