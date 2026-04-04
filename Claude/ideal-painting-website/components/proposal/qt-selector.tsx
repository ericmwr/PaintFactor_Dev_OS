'use client';

import type { QualityTier } from '@/lib/proposal-types';

type QTSelectorProps = {
  value: QualityTier;
  availableTiers: QualityTier[];
  isOverride: boolean;
  onChange: (qt: QualityTier) => void;
  size?: 'sm' | 'md';
};

const TIER_LABELS: Record<string, string> = {
  QT2: 'QT2 — Economy',
  QT3: 'QT3 — Standard',
  QT4: 'QT4 — Premium',
  QT5: 'QT5 — Showroom'
};

export function QTSelector({ value, availableTiers, isOverride, onChange, size = 'sm' }: QTSelectorProps) {
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1'
    : 'text-sm px-3 py-1.5';

  return (
    <div className="relative inline-flex items-center gap-1">
      {isOverride && (
        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" title="Overrides parent tier" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QualityTier)}
        className={`${sizeClasses} rounded border border-outline-variant bg-surface text-on-surface cursor-pointer`}
      >
        {availableTiers.map(qt => (
          <option key={qt} value={qt}>
            {TIER_LABELS[qt] ?? qt}
          </option>
        ))}
      </select>
    </div>
  );
}
