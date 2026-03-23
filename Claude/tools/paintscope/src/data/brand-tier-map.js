/**
 * Brand + product line → quality tier mapping.
 * Used by product resolver to match catalog products to project QT.
 * Primers are role-based (not tier-based) and skip this table.
 */
export const BRAND_TIER_MAP = [
  // ── Sherwin-Williams Finish ──
  { brand: 'Sherwin-Williams', product_line: 'ProMar 200',          qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'SuperPaint',          qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Cashmere',            qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Emerald',             qt: ['QT5'] },
  { brand: 'Sherwin-Williams', product_line: 'Duration',            qt: ['QT5'] },
  // ── Sherwin-Williams Trim ──
  { brand: 'Sherwin-Williams', product_line: 'ProClassic',          qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'ProClassic Alkyd',    qt: ['QT4'] },
  { brand: 'Sherwin-Williams', product_line: 'Emerald Urethane',    qt: ['QT5'] },
  // ── Benjamin Moore Finish ──
  { brand: 'Benjamin Moore',   product_line: 'ben',                 qt: ['QT3'] },
  { brand: 'Benjamin Moore',   product_line: 'Regal Select',        qt: ['QT4'] },
  { brand: 'Benjamin Moore',   product_line: 'Aura',                qt: ['QT5'] },
  // ── Benjamin Moore Trim ──
  { brand: 'Benjamin Moore',   product_line: 'Advance',             qt: ['QT4', 'QT5'] },
  // ── PPG Finish ──
  { brand: 'PPG',              product_line: 'Manor Hall',          qt: ['QT3', 'QT4'] },
  { brand: 'PPG',              product_line: 'Timeless',            qt: ['QT5'] },
  // ── PPG Pittsburgh Paints ──
  { brand: 'PPG Pittsburgh Paints', product_line: 'Ultra',          qt: ['QT3'] },
  // ── Ceiling ──
  { brand: 'Sherwin-Williams', product_line: 'ProMar Ceiling',      qt: ['QT3'] },
  { brand: 'Sherwin-Williams', product_line: 'CHB',                 qt: ['QT3'] },
  { brand: 'Benjamin Moore',   product_line: 'Waterborne Ceiling',  qt: ['QT3', 'QT4'] },
  // ── Gallery / Fine Finish Systems ──
  { brand: 'Sherwin-Williams', product_line: 'Gallery',             qt: ['QT5'] },
  { brand: 'Fine Paints of Europe', product_line: null,             qt: ['QT5'] },
];

/**
 * Find the QT range for a product.
 * Returns the qt array if found, null if no mapping (e.g., primers).
 */
export function getProductTier(brand, product_line) {
  if (!product_line) return null;
  const entry = BRAND_TIER_MAP.find(e =>
    e.brand === brand &&
    (e.product_line === null || product_line.toLowerCase().includes(e.product_line.toLowerCase()))
  );
  return entry ? entry.qt : null;
}
