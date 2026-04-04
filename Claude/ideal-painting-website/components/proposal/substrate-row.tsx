'use client';

import type { QualityTier } from '@/lib/proposal-types';
import { QTSelector } from './qt-selector';

type SubstrateRowProps = {
  lineId: string;
  substrate: string;
  description: string;
  price: number;
  included: boolean;
  effectiveQT: QualityTier;
  parentQT: QualityTier;
  availableTiers: QualityTier[];
  onToggle: (lineId: string) => void;
  onQTChange: (lineId: string, qt: QualityTier) => void;
};

const SUBSTRATE_LABELS: Record<string, string> = {
  walls: 'Walls',
  walls_prime: 'Walls (Prime)',
  ceiling: 'Ceiling',
  ceiling_prime: 'Ceiling (Prime)',
  trim: 'Trim',
  trim_prime: 'Trim (Prime)',
  doors: 'Doors',
  door_frames: 'Door Frames',
  windows: 'Windows',
  baseboard: 'Baseboard',
  stair_risers: 'Stair Risers',
  stair_railing: 'Stair Railing',
  wainscot: 'Wainscot',
  wood_walls: 'Wood Walls',
  wood_ceiling: 'Wood Ceiling',
  arch_elements: 'Architectural Elements',
  builtins: 'Built-Ins',
  cabinets: 'Cabinets',
  closet_shelves: 'Closet Shelves'
};

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function SubstrateRow({
  lineId, substrate, description, price, included,
  effectiveQT, parentQT, availableTiers,
  onToggle, onQTChange
}: SubstrateRowProps) {
  const label = SUBSTRATE_LABELS[substrate] ?? substrate;
  const isQTOverride = effectiveQT !== parentQT;
  const deltaPrefix = included ? '\u2212' : '+';

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded ${included ? '' : 'opacity-50'}`}>
      <input
        type="checkbox"
        checked={included}
        onChange={() => onToggle(lineId)}
        className="w-4 h-4 accent-primary shrink-0"
      />

      <div className={`flex-1 min-w-0 ${included ? '' : 'line-through text-on-surface-variant'}`}>
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-on-surface-variant ml-2">{description}</span>
      </div>

      {included && availableTiers.length > 1 && (
        <QTSelector
          value={effectiveQT}
          availableTiers={availableTiers}
          isOverride={isQTOverride}
          onChange={(qt) => onQTChange(lineId, qt)}
        />
      )}

      <span className={`text-sm font-mono whitespace-nowrap ${included ? 'text-red-600' : 'text-green-600'}`}>
        {deltaPrefix}{formatCurrency(price)}
      </span>
    </div>
  );
}
