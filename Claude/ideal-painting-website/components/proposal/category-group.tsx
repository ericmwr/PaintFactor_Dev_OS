'use client';

import { useState } from 'react';
import type { LineItem, QualityTier, ProposalBundle, ClientState } from '@/lib/proposal-types';
import { getItemPrice } from '@/lib/proposal-helpers';
import { RoomGroup } from './room-group';

type CategoryGroupProps = {
  category: string;
  roomMap: Map<string, LineItem[]>;
  bundle: ProposalBundle;
  clientState: ClientState;
  onToggle: (lineId: string) => void;
  onItemQTChange: (lineId: string, qt: QualityTier) => void;
  onRoomQTChange: (roomIndex: number, qt: QualityTier) => void;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CategoryGroup({
  category, roomMap, bundle, clientState,
  onToggle, onItemQTChange, onRoomQTChange
}: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true);

  let categoryTotal = 0;
  for (const [, items] of roomMap) {
    for (const item of items) {
      if (clientState.included[item.id]) {
        categoryTotal += getItemPrice(item.id, item.roomIndex, bundle, clientState);
      }
    }
  }

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container transition-colors"
      >
        <span className="text-sm text-on-surface-variant">{expanded ? '▾' : '▸'}</span>
        <span className="font-headline font-semibold text-base flex-1 text-left">{category}</span>
        <span className="font-mono text-base text-on-surface">{formatCurrency(categoryTotal)}</span>
      </button>

      {expanded && (
        <div>
          {[...roomMap.entries()].map(([roomName, items]) => {
            const roomIndex = items[0]?.roomIndex ?? 0;
            return (
              <RoomGroup
                key={roomName}
                roomName={roomName}
                roomIndex={roomIndex}
                items={items}
                bundle={bundle}
                clientState={clientState}
                parentQT={clientState.projectQT}
                onToggle={onToggle}
                onItemQTChange={onItemQTChange}
                onRoomQTChange={onRoomQTChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
