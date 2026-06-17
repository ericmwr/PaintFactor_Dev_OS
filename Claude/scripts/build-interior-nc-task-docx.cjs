/**
 * Generate a docx report listing all 819 interior NC active tasks.
 * Reads Claude/_interior_nc_tasks_for_docx.json and writes Claude/Interior_NC_Tasks.docx
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, PageOrientation, BorderStyle, WidthType,
  ShadingType, LevelFormat,
} = require('docx');

const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '_interior_nc_tasks_for_docx.json'),
  'utf8'
));

// Define preferred bucket order — Universal Keepers first, then logical groupings
const BUCKET_ORDER = [
  'Universal Keepers',
  // Drywall (walls + ceilings)
  'Drywall - Wall',
  'Drywall - Ceiling',
  'Drywall Prep helpers',
  'Wall/Ceiling Apply',
  // Trim — paint side
  'Trim PAINT - Door Frame',
  'Trim - generic',
  // Trim — stain side
  'Trim STAIN - Baseboard',
  'Trim STAIN - Chair Rail',
  'Trim STAIN - Crown',
  'Trim STAIN - Door Casing',
  'Trim STAIN - Door Frame',
  'Trim STAIN - Panel Mold',
  'Trim STAIN - Picture Rail',
  'Trim STAIN - Shadow Box',
  'Trim STAIN - Shoe Mold',
  'Trim STAIN - Wainscot Cap',
  'Trim STAIN - Window Apron',
  'Trim STAIN - Window Casing',
  'Trim STAIN - Window Jamb',
  'Trim STAIN - Window Stool',
  // Doors / Windows
  'Door (DOOR)',
  'Door Slab Stain (DSST)',
  'Window (WIN)',
  'Window Stain (WNST)',
  // Wood substrates
  'Wood Wall PAINT (WDWL/WW)',
  'Wood Wall STAIN (WWST)',
  'Wood Ceiling PAINT (WDCL)',
  'Wood Ceiling STAIN (WCST)',
  'Wainscot PAINT (WNSC)',
  'Wainscot STAIN (WPST)',
  // Cabinet / Built-in / Closet
  'Cabinet (CABT)',
  'Built-in (BLT)',
  'Closet Shelf (CLSH)',
  // Stairway
  'Stairway',
  // Arch
  'Arch Element (ARCH)',
  'Arch Element STAIN (AEST)',
  // Systems / helpers
  'Caulk System',
  'Grain Filler System',
  'Tape Line',
  'Protection / Mask',
  'Prep Helpers (HVAC/Outlet)',
  'RRP Lead Containment',
  'Project Overhead / Setup',
];

// Append any unlisted buckets at the end
const orderedBuckets = [
  ...BUCKET_ORDER.filter(b => data[b]),
  ...Object.keys(data).filter(b => !BUCKET_ORDER.includes(b)).sort(),
];

const totalTasks = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

// Column widths in DXA (1440 = 1 inch). Landscape US Letter content width = 13680 (15840 - 2160 margins)
// Use total = 13680 split across 6 columns
const COLS = [3300, 3500, 800, 1200, 1700, 3180]; // task_id, name, uom, rate, skill, ps_key
const TOTAL_W = COLS.reduce((a, b) => a + b, 0);

function headerRow() {
  const cells = ['Task ID', 'Name', 'UOM', 'Rate', 'Skill', 'PS Key'].map((label, i) => new TableCell({
    borders,
    width: { size: COLS[i], type: WidthType.DXA },
    shading: { fill: 'D5E8F0', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
  }));
  return new TableRow({ children: cells, tableHeader: true });
}

function dataRow(task) {
  const rateStr = task.rate != null
    ? String(task.rate) + '/hr'
    : (task.fixed_minutes != null ? String(task.fixed_minutes) + ' min' : '-');
  const cellsText = [
    task.task_id,
    task.name || '',
    task.uom || '',
    rateStr,
    task.skill || '',
    task.ps_key || '',
  ];
  const cells = cellsText.map((text, i) => new TableCell({
    borders,
    width: { size: COLS[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 16, font: 'Consolas' })] })],
  }));
  return new TableRow({ children: cells });
}

function buildTable(tasks) {
  const rows = [headerRow(), ...tasks.map(dataRow)];
  return new Table({
    width: { size: TOTAL_W, type: WidthType.DXA },
    columnWidths: COLS,
    rows,
  });
}

function bucketSection(name, tasks) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun(`${name}  (${tasks.length})`)],
      spacing: { before: 360, after: 120 },
    }),
    buildTable(tasks),
    new Paragraph({ children: [new TextRun('')] }), // small spacer
  ];
}

const titlePara = new Paragraph({
  heading: HeadingLevel.TITLE,
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Interior New Construction — Active Task Catalog', bold: true, size: 36 })],
});
const subtitlePara = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({ text: `Generated 2026-05-05 from branch claude/cranky-saha — ${totalTasks} tasks across ${orderedBuckets.length} families`, italics: true, size: 20 })],
});
const introPara = new Paragraph({
  spacing: { after: 360 },
  children: [
    new TextRun({ text: 'Excludes: ', bold: true, size: 18 }),
    new TextRun({ text: 'exterior tasks (X-prefix and STCO/GRDR/METL/FNDN/MSRY/FNCE/DECK/ENSD/FCSD/SDNG namespaces), repaint (RP) tasks of any kind, and archived tasks. Reflects the post-consolidation state after rounds 24-32.', size: 18 }),
  ],
});

const allChildren = [titlePara, subtitlePara, introPara];
for (const bucket of orderedBuckets) {
  const tasks = data[bucket];
  if (!tasks || tasks.length === 0) continue;
  const section = bucketSection(bucket, tasks);
  for (const el of section) allChildren.push(el);
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20 } } },
    paragraphStyles: [
      {
        id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Calibri' },
        paragraph: { spacing: { before: 0, after: 120 } },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Calibri', color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: {
          width: 12240,    // US Letter SHORT edge as width per docx-js convention
          height: 15840,   // US Letter LONG edge
          orientation: PageOrientation.LANDSCAPE,
        },
        margin: { top: 720, right: 1080, bottom: 720, left: 1080 }, // 0.5"/0.75"
      },
    },
    children: allChildren,
  }],
});

const outPath = path.join(__dirname, '..', 'Interior_NC_Tasks.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Wrote', outPath, '(' + (buf.length / 1024).toFixed(1) + ' KB)');
});
