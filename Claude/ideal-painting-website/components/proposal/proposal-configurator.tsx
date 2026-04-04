'use client';

import { useState, useCallback } from 'react';
import type { ProposalBundle, ClientState, QualityTier } from '@/lib/proposal-types';
import {
  initClientState, computeTotal, buildChanges, groupByDomainAndRoom
} from '@/lib/proposal-helpers';
import { QTSelector } from './qt-selector';
import { CategoryGroup } from './category-group';
import { VerificationScreen } from './verification-screen';
import { createClient } from '@/lib/supabase/client';

type ProposalConfiguratorProps = {
  bundle: ProposalBundle;
  bundleId: string;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProposalConfigurator({ bundle, bundleId }: ProposalConfiguratorProps) {
  const [clientState, setClientState] = useState<ClientState>(() => initClientState(bundle));
  const [view, setView] = useState<'configure' | 'verify'>('configure');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentTotal = computeTotal(bundle, clientState);
  const changes = buildChanges(bundle, clientState);
  const tree = groupByDomainAndRoom(bundle.originalScope.items);

  const allTiers = new Set<QualityTier>();
  for (const opts of Object.values(bundle.qtOptions)) {
    opts.availableTiers.forEach(t => allTiers.add(t));
  }
  const projectTiers = [...allTiers].sort() as QualityTier[];

  const handleToggle = useCallback((lineId: string) => {
    setClientState(prev => ({
      ...prev,
      included: { ...prev.included, [lineId]: !prev.included[lineId] }
    }));
  }, []);

  const handleItemQTChange = useCallback((lineId: string, qt: QualityTier) => {
    setClientState(prev => ({
      ...prev,
      qualityTiers: { ...prev.qualityTiers, [lineId]: qt }
    }));
  }, []);

  const handleRoomQTChange = useCallback((roomIndex: number, qt: QualityTier) => {
    setClientState(prev => {
      const newQTs = { ...prev.qualityTiers };
      for (const item of bundle.originalScope.items) {
        if (item.roomIndex === roomIndex) {
          newQTs[item.id] = qt;
        }
      }
      return {
        ...prev,
        roomQTs: { ...prev.roomQTs, [roomIndex]: qt },
        qualityTiers: newQTs
      };
    });
  }, [bundle]);

  const handleProjectQTChange = useCallback((qt: QualityTier) => {
    setClientState(prev => {
      const newQTs: Record<string, QualityTier> = {};
      for (const item of bundle.originalScope.items) {
        newQTs[item.id] = qt;
      }
      return {
        ...prev,
        projectQT: qt,
        roomQTs: {},
        qualityTiers: newQTs
      };
    });
  }, [bundle]);

  const handleRevert = useCallback(() => {
    if (confirm('Reset all changes to the original proposal?')) {
      setClientState(initClientState(bundle));
    }
  }, [bundle]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from('proposal_submissions').insert({
        bundle_id: bundleId,
        original_total: bundle.originalScope.bidPrice,
        adjusted_total: currentTotal,
        changes,
        status: 'pending_review'
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="font-headline text-2xl font-bold mb-2">Scope Submitted</h2>
        <p className="text-on-surface-variant">
          We&apos;ve received your selections and will be in touch shortly to finalize your project.
        </p>
      </div>
    );
  }

  if (view === 'verify') {
    return (
      <VerificationScreen
        bundle={bundle}
        changes={changes}
        originalTotal={bundle.originalScope.bidPrice}
        adjustedTotal={currentTotal}
        onBack={() => setView('configure')}
        onConfirm={handleSubmit}
        submitting={submitting}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-surface-container-low">
        <div>
          <h1 className="font-headline text-xl font-bold">{bundle.project.name}</h1>
          <p className="text-sm text-on-surface-variant">{bundle.project.address}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">Project Quality Tier</div>
            <QTSelector
              value={clientState.projectQT}
              availableTiers={projectTiers}
              isOverride={clientState.projectQT !== bundle.project.defaultQT}
              onChange={handleProjectQTChange}
              size="md"
            />
          </div>
          <div className="text-right">
            <div className="text-xs text-on-surface-variant">Total</div>
            <div className="font-mono text-2xl font-bold">{formatCurrency(currentTotal)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        {changes.length > 0 ? (
          <button
            onClick={handleRevert}
            className="text-sm text-on-surface-variant hover:text-on-surface underline"
          >
            Revert to Standard
          </button>
        ) : (
          <span className="text-sm text-on-surface-variant">Original scope — no changes</span>
        )}
        {changes.length > 0 && (
          <span className="text-sm text-on-surface-variant">
            {changes.length} change{changes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {[...tree.entries()].map(([category, roomMap]) => (
        <CategoryGroup
          key={category}
          category={category}
          roomMap={roomMap}
          bundle={bundle}
          clientState={clientState}
          onToggle={handleToggle}
          onItemQTChange={handleItemQTChange}
          onRoomQTChange={handleRoomQTChange}
        />
      ))}

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setView('verify')}
          className="px-8 py-3 rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
        >
          Request This Scope
        </button>
      </div>
    </div>
  );
}
