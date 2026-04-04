export type QualityTier = 'QT2' | 'QT3' | 'QT4' | 'QT5';

export type LineItem = {
  id: string;
  roomIndex: number;
  room: string;
  areaGroup: string;
  domain: 'interior' | 'exterior';
  substrate: string;
  included: boolean;
  qualityTier: QualityTier;
  description: string;
  price: number;
};

export type QTOption = {
  product: string;
  coats: number;
  method: string;
  description: string;
  price: number;
};

export type LineQTOptions = {
  availableTiers: QualityTier[];
  options: Partial<Record<QualityTier, QTOption>>;
};

export type ColorAssumption = {
  colorName: string | null;
  colorCode: string | null;
  hex: string | null;
};

export type ProposalBundle = {
  meta: {
    exportVersion: string;
    exportedAt: string;
    projectId: string;
    source: string;
  };
  company: {
    name: string;
    phone: string;
    website: string;
  };
  project: {
    name: string;
    address: string;
    clientName: string;
    defaultQT: QualityTier;
    domain: 'interior' | 'exterior' | 'both';
    newConstruction: boolean;
  };
  originalScope: {
    bidPrice: number;
    items: LineItem[];
  };
  qtOptions: Record<string, LineQTOptions>;
  colorAssumptions: {
    ceilings: ColorAssumption;
    doors: ColorAssumption;
    trim: ColorAssumption;
    builtins: ColorAssumption;
    other: ColorAssumption;
  };
  projectCharges: {
    mobilization: number;
    travelCost: number;
  };
};

export type ChangeType = 'removed' | 'added' | 'qt_change';

export type ClientChange = {
  lineId: string;
  type: ChangeType;
  originalPrice?: number;
  from?: QualityTier;
  to?: QualityTier;
  priceDelta: number;
};

export type ClientState = {
  included: Record<string, boolean>;
  qualityTiers: Record<string, QualityTier>;
  roomQTs: Record<number, QualityTier>;
  projectQT: QualityTier;
};

export type ProposalSubmission = {
  bundleId: string;
  originalTotal: number;
  adjustedTotal: number;
  changes: ClientChange[];
  notes?: string;
};
