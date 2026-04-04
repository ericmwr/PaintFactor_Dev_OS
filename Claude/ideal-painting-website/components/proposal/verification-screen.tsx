'use client';

import type { ProposalBundle, ClientChange } from '@/lib/proposal-types';

type VerificationScreenProps = {
  bundle: ProposalBundle;
  changes: ClientChange[];
  originalTotal: number;
  adjustedTotal: number;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
};

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getItemLabel(bundle: ProposalBundle, lineId: string): string {
  const item = bundle.originalScope.items.find(i => i.id === lineId);
  if (!item) return lineId;
  return `${item.room} — ${item.substrate.replace(/_/g, ' ')}`;
}

function getChangeIcon(type: string): string {
  if (type === 'removed') return '✕';
  if (type === 'added') return '+';
  return '▲';
}

export function VerificationScreen({
  bundle, changes, originalTotal, adjustedTotal,
  onBack, onConfirm, submitting
}: VerificationScreenProps) {
  const netAdjustment = adjustedTotal - originalTotal;
  const hasChanges = changes.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">Review Your Selections</h2>

      <div className="flex justify-between items-center mb-6 p-4 rounded-lg bg-surface-container-low">
        <span className="text-on-surface-variant">Original Proposal</span>
        <span className="font-mono text-lg">{formatCurrency(originalTotal)}</span>
      </div>

      {hasChanges ? (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-3">Changes</h3>
          <div className="rounded-lg border border-outline-variant overflow-hidden">
            {changes.map((change, i) => {
              const label = getItemLabel(bundle, change.lineId);
              const icon = getChangeIcon(change.type);
              const isPositive = change.priceDelta > 0;

              return (
                <div key={i} className="flex items-start gap-3 p-3 border-b border-outline-variant last:border-b-0">
                  <span className={`text-sm font-bold mt-0.5 ${change.type === 'removed' ? 'text-red-600' : change.type === 'added' ? 'text-green-600' : 'text-blue-600'}`}>
                    {icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{label}</div>
                    {change.type === 'qt_change' && (
                      <div className="text-xs text-on-surface-variant">
                        {change.from} → {change.to}
                      </div>
                    )}
                    {change.type === 'removed' && (
                      <div className="text-xs text-on-surface-variant">Removed from scope</div>
                    )}
                  </div>
                  <span className={`font-mono text-sm ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                    {isPositive ? '+' : '\u2212'}{formatCurrency(change.priceDelta)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-surface-container-low text-center text-on-surface-variant">
          No changes from original proposal
        </div>
      )}

      <div className="space-y-2 mb-8 p-4 rounded-lg bg-surface-container-low">
        {hasChanges && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Net adjustment</span>
            <span className={`font-mono ${netAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {netAdjustment > 0 ? '+' : '\u2212'}{formatCurrency(netAdjustment)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Your Total</span>
          <span className="font-mono">{formatCurrency(adjustedTotal)}</span>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors"
        >
          ← Back to Edit
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-6 py-2 rounded bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Confirm & Submit'}
        </button>
      </div>
    </div>
  );
}
