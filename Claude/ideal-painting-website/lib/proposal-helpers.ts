import type {
  ProposalBundle, ClientState, ClientChange, QualityTier, LineItem
} from './proposal-types';

export function initClientState(bundle: ProposalBundle): ClientState {
  const included: Record<string, boolean> = {};
  const qualityTiers: Record<string, QualityTier> = {};

  for (const item of bundle.originalScope.items) {
    included[item.id] = item.included;
    qualityTiers[item.id] = item.qualityTier;
  }

  return {
    included,
    qualityTiers,
    roomQTs: {},
    projectQT: bundle.project.defaultQT
  };
}

export function resolveQT(
  lineId: string,
  roomIndex: number,
  clientState: ClientState
): QualityTier {
  if (clientState.qualityTiers[lineId]) return clientState.qualityTiers[lineId];
  if (clientState.roomQTs[roomIndex]) return clientState.roomQTs[roomIndex];
  return clientState.projectQT;
}

export function getItemPrice(
  lineId: string,
  roomIndex: number,
  bundle: ProposalBundle,
  clientState: ClientState
): number {
  const qt = resolveQT(lineId, roomIndex, clientState);
  const option = bundle.qtOptions[lineId]?.options[qt];
  return option?.price ?? 0;
}

export function getItemDescription(
  lineId: string,
  roomIndex: number,
  bundle: ProposalBundle,
  clientState: ClientState
): string {
  const qt = resolveQT(lineId, roomIndex, clientState);
  const option = bundle.qtOptions[lineId]?.options[qt];
  return option?.description ?? '';
}

export function computeTotal(
  bundle: ProposalBundle,
  clientState: ClientState
): number {
  let total = 0;
  for (const item of bundle.originalScope.items) {
    if (!clientState.included[item.id]) continue;
    total += getItemPrice(item.id, item.roomIndex, bundle, clientState);
  }
  total += bundle.projectCharges.mobilization + bundle.projectCharges.travelCost;
  return Math.round(total * 100) / 100;
}

export function buildChanges(
  bundle: ProposalBundle,
  clientState: ClientState
): ClientChange[] {
  const changes: ClientChange[] = [];

  for (const item of bundle.originalScope.items) {
    const isIncluded = clientState.included[item.id];
    const currentQT = resolveQT(item.id, item.roomIndex, clientState);
    const currentPrice = getItemPrice(item.id, item.roomIndex, bundle, clientState);

    if (item.included && !isIncluded) {
      changes.push({
        lineId: item.id,
        type: 'removed',
        originalPrice: item.price,
        priceDelta: -item.price
      });
      continue;
    }

    if (!item.included && isIncluded) {
      changes.push({
        lineId: item.id,
        type: 'added',
        priceDelta: currentPrice
      });
      continue;
    }

    if (isIncluded && currentQT !== item.qualityTier) {
      changes.push({
        lineId: item.id,
        type: 'qt_change',
        from: item.qualityTier,
        to: currentQT,
        priceDelta: currentPrice - item.price
      });
    }
  }

  return changes;
}

export function groupByDomainAndRoom(items: LineItem[]): Map<string, Map<string, LineItem[]>> {
  const tree = new Map<string, Map<string, LineItem[]>>();

  for (const item of items) {
    const domain = item.domain === 'exterior' ? 'Exterior' : 'Interior';
    if (!tree.has(domain)) tree.set(domain, new Map());
    const rooms = tree.get(domain)!;
    if (!rooms.has(item.room)) rooms.set(item.room, []);
    rooms.get(item.room)!.push(item);
  }

  return tree;
}
