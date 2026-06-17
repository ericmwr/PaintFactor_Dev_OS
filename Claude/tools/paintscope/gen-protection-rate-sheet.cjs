// Generates a .docx with three empty rate-sheet tables for the protection
// system. User fills in rate cells and returns it; we then author tasks.
//
// Run from Claude/tools/paintscope/ (where docx is installed):
//   node gen-protection-rate-sheet.cjs

const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, PageOrientation, BorderStyle, WidthType, ShadingType,
  HeadingLevel,
} = require('docx');

const border = { style: BorderStyle.SINGLE, size: 6, color: "B0B0B0" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerFill = { fill: "DEE7EE", type: ShadingType.CLEAR };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function cell(text, opts = {}) {
  const { width, header = false, bold = false, italic = false } = opts;
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    margins: cellMargins,
    shading: header ? headerFill : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: header || bold, italic, size: 20 })],
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
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: level === 1 ? 32 : 26 })],
    spacing: { before: level === 1 ? 360 : 240, after: 120 },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, italic: opts.italic, bold: opts.bold })],
    spacing: { after: 120 },
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 120 } });
}

// === Table 1: Surface Protection ===
const t1Cols = [1200, 1200, 800, 1500, 1500, 1200, 5560]; // sums to 12960
const t1Header = ["Surface", "Level", "UOM", "Install rate", "Remove rate", "Skill", "Notes"];
const t1Rows = [
  ["Floor", "edge",        "LF", "", "", "", "tape strip only along trim edge"],
  ["Floor", "partial",     "SF", "", "", "", "drop cloth perimeter (~3 ft strip)"],
  ["Floor", "full",        "SF", "", "", "", "full-coverage drape, untaped"],
  ["Floor", "encapsulate", "SF", "", "", "", "full-coverage, taped/sealed"],
  ["Wall",  "edge",        "LF", "", "", "", "tape line only"],
  ["Wall",  "partial",     "SF", "", "", "", "partial drape (e.g., upper half)"],
  ["Wall",  "full",        "SF", "", "", "", "full wall drape"],
  ["Wall",  "encapsulate", "SF", "", "", "", "full wall, taped/sealed"],
  ["Ceiling", "edge",        "LF", "", "", "", "tape line only"],
  ["Ceiling", "partial",     "SF", "", "", "", "partial drape"],
  ["Ceiling", "full",        "SF", "", "", "", "full ceiling drape"],
  ["Ceiling", "encapsulate", "SF", "", "", "", "full, taped/sealed"],
];

// === Table 2: Adjacent-Surface Masks ===
const t2Cols = [2200, 800, 1500, 1500, 1200, 5760]; // sums to 12960
const t2Header = ["Item", "UOM", "Install rate", "Remove rate", "Skill", "Notes"];
const t2Rows = [
  ["Door slab",       "EA", "", "", "", "mask door panel when door not in scope"],
  ["Window glass",    "EA", "", "", "", "mask window glass + sash"],
  ["Door frame",      "LF", "", "", "", "when not in paint/stain scope"],
  ["Door casing",     "LF", "", "", "", ""],
  ["Window casing",   "LF", "", "", "", ""],
  ["Window jamb",     "LF", "", "", "", ""],
  ["Window stool",    "LF", "", "", "", ""],
  ["Window apron",    "LF", "", "", "", ""],
  ["Built-in",        "SF", "", "", "", "shelving / bookcase covers"],
  ["Cabinet",         "LF", "", "", "", "uppers + lowers, run length"],
  ["Countertop",      "LF", "", "", "", "counter run length"],
  ["Fireplace mantel","EA", "", "", "", ""],
  ["Light fixture",   "EA", "", "", "", ""],
  ["Ceiling fan",     "EA", "", "", "", ""],
  ["Outlet/switch",   "EA", "", "", "", "quick mask each"],
  ["HVAC vent",       "EA", "", "", "", ""],
  ["",                "",   "", "", "", ""],
  ["",                "",   "", "", "", ""],
];

// === Table 3: Tape Line, Containment, Cleanup ===
const t3Cols = [3500, 1200, 1500, 1200, 5560]; // sums to 12960
const t3Header = ["Task", "UOM", "Rate", "Skill", "Notes"];
const t3Rows = [
  ["Trim tape line — install",       "LF",        "", "", "crisp finished edge AFTER trim paint cures, BEFORE wall paint"],
  ["Trim tape line — remove",        "LF",        "", "", "pull tape after wall paint dries"],
  ["Containment setup",              "FIXED min", "", "", "zip-wall poles + visqueen, per room"],
  ["Containment teardown",           "FIXED min", "", "", ""],
  ["Containment seal/door zipper",   "FIXED min", "", "", "optional add-on for sealed entry"],
  ["Protection debris cleanup",      "FIXED min", "", "", "per room post-teardown — tape scraps, plastic bag-up"],
  ["",                               "",          "", "", ""],
  ["",                               "",          "", "", ""],
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 1080, right: 1440, bottom: 1080, left: 1440 },
      },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text: "Protection Tasks — Rate Sheet", bold: true, size: 36 })],
        spacing: { after: 120 },
      }),
      para("Fill in rates and skill per row. Add rows where structure doesn't match how you actually price. Add columns (e.g., \"Floor type\") if a dimension is missing.", { italic: true }),

      heading("Table 1 — Surface Protection (Floor / Wall / Ceiling × 4 levels)"),
      para("If floor type (subfloor vs hardwood vs tile vs carpet) changes the rate at the same level, split the row or add a Floor type column."),
      makeTable(t1Cols, t1Header, t1Rows),

      heading("Table 2 — Adjacent-Surface Masks (per non-painted neighbor)"),
      para("Item types you mask when they're present in a room but NOT in the paint/stain scope. Add anything missing (appliances, plumbing fixtures, hardware, etc.)."),
      makeTable(t2Cols, t2Header, t2Rows),

      heading("Table 3 — Tape Line, Containment, Cleanup"),
      para("Tape line = crisp finished edge. Separate from masking. Containment = zip-wall room enclosure."),
      makeTable(t3Cols, t3Header, t3Rows),

      heading("Legend"),
      para("Skill — \"general\" or \"experienced\" (drives labor cost). Default \"general\" if blank."),
      para("UOM — units the rate is expressed in. Swap if your shop prices differently (e.g., minutes per opening vs EA/hr)."),
      para("Rate — units per hour for variable work. \"FIXED min\" tasks: enter total minutes for one occurrence."),
    ],
  }],
});

const outPath = path.resolve(__dirname, "..", "..", "devos", "protection_rate_sheet.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, `(${(buf.length/1024).toFixed(1)} KB)`);
}).catch(err => { console.error(err); process.exit(1); });
