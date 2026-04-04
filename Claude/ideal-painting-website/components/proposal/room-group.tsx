'use client';

import { useState } from 'react';
import type { LineItem, QualityTier, ProposalBundle, ClientState } from '@/lib/proposal-types';
import { getItemPrice, getItemDescription, resolveQT } from '@/lib/proposal-helpers';
import { QTSelector } from './qt-selector';
import { SubstrateRow } from './substrate-row';

type RoomGroupProps = {
  roomName: string;
  roomIndex: number;
  items: LineItem[];
  bundle: ProposalBundle;
  clientState: ClientState;
  parentQT: QualityTier;
  onToggle: (lineId: string) => void;
  onItemQTChange: (lineId: string, qt: QualityTier) => void;
  onRoomQTChange: (roomIndex: number, qt: QualityTier) => void;
};

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RoomGroup({
  roomName, roomIndex, items, bundle, clientState,
  parentQT, onToggle, onItemQTChange, onRoomQTChange
}: RoomGroupProps) {
  const [expanded, setExpanded] = useState(false);

  let roomTotal = 0;
  for (const item of items) {
    if (clientState.included[item.id]) {
      roomTotal += getItemPrice(item.id, item.roomIndex, bundle, clientState);
    }
  }

  const roomQT = clientState.roomQTs[roomIndex] ?? parentQT;
  const isRoomQTOverride = clientState.roomQTs[roomIndex] !== undefined;

  const allTiers = new Set<QualityTier>();
  for (const item of items) {
    const opts = bundle.qtOptions[item.id];
    if (opts) opts.availableTiers.forEach(t => allTiers.add(t));
  }
  const availableTiers = [...allTiers].sort() as QualityTier[];

  return (
    <div className="border-b border-outline-variant last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-4 hover:bg-surface-container-low transition-colors"
      >
        <span className="text-xs text-on-surface-variant">{expanded ? '▾' : '▸'}</span>
        <span className="font-medium text-sm flex-1 text-left">{roomName}</span>

        {availableTiers.length > 1 && (
          <div onClick={(e) => e.stopPropagation()}>
            <QTSelector
              value={roomQT}
              availableTiers={availableTiers}
              isOverride={isRoomQTOverride}
              onChange={(qt) => onRoomQTChange(roomIndex, qt)}
            />
          </div>
        )}

        <span className="text-sm font-mono text-on-surface">{formatCurrency(roomTotal)}</span>
      </button>

      {expanded && (
        <div className="pl-6 pb-2">
          {items.map(item => {
            const effectiveQT = resolveQT(item.id, item.roomIndex, clientState);
            const opts = bundle.qtOptions[item.id];
            return (
              <SubstrateRow
                key={item.id}
                lineId={item.id}
                substrate={item.substrate}
                description={getItemDescription(item.id, item.roomIndex, bundle, clientState)}
                price={getItemPrice(item.id, item.roomIndex, bundle, clientState)}
                included={clientState.included[item.id] ?? true}
                effectiveQT={effectiveQT}
                parentQT={roomQT}
                availableTiers={opts?.availableTiers ?? []}
                onToggle={onToggle}
                onQTChange={onItemQTChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
