/**
 * Nameplate HQ API Client with Built-in Interactive Demo Store.
 * Supports offline demo functionality, live work order mutations,
 * Jira-style status updates, comments/notes, and full asset registry.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface Property {
  id: string;
  name: string;
  code: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  status: string;
  unitCountDeclared: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  yearBuilt?: number | null;
  timezone?: string | null;
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;
  code?: string | null;
  floors?: number | null;
}

export interface Unit {
  id: string;
  propertyId: string;
  buildingId: string;
  label: string;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  occupancyStatus?: string | null;
  building?: Building | null;
}

export interface AssetCategory {
  id: string;
  key: string;
  displayName: string;
  defaultUsefulLifeMonths?: number;
  defaultReplacementCost?: string | number | null;
}

export interface AssetModel {
  id: string;
  manufacturer: string;
  modelNumber: string;
  displayName: string | null;
  typicalReplacementCost: string | number | null;
  expectedLifeMonths: number | null;
}

export interface CriticalPart {
  type: 'red' | 'white' | string;
  title: string;
  text: string;
}

export interface AssetCustomFields {
  schematicKey?: string;
  specTag?: string;
  room?: string;
  gps?: string;
  owner?: string;
  warrantySub?: string;
  description?: string;
  serialLabel?: string;
  criticalParts?: CriticalPart[];
}

export interface PartRecord {
  id: string;
  label: string | null;
  componentType: string | null;
  origin: string | null;
  status: string;
  imputedValue: string | number | null;
  installedInAssetId: string | null;
  sourceAssetId: string | null;
}

export interface ServiceEvent {
  id: string;
  assetId: string;
  workOrderId: string | null;
  propertyId: string | null;
  unitId: string | null;
  technicianId: string;
  eventType: string;
  findings: string | null;
  symptomCodes: string[];
  resolutionCode: string | null;
  laborMinutes: number | null;
  laborRate: string | number | null;
  laborCost: string | number | null;
  partsCost: string | number | null;
  otherCost: string | number | null;
  totalCost: string | number | null;
  costBorneBy: string | null;
  isWarrantyClaim: boolean;
  occurredAt: string;
  technician?: { id: string; user?: { fullName: string } };
  workOrder?: { id: string; number: number; title: string } | null;
  partUsages?: { oemPartNumber?: string | null; action?: string }[];
}

export interface Asset {
  id: string;
  npid: string;
  categoryId: string;
  assetModelId: string | null;
  manufacturerRaw: string | null;
  modelRaw: string | null;
  serialNumber: string | null;
  serialConfidence: string | null;
  status: string;
  condition: string | null;
  currentPropertyId: string | null;
  currentUnitId: string | null;
  currentLocationConfirmedAt: string | null;
  installDate: string | null;
  manufactureDate: string | null;
  warrantyExpiresOn: string | null;
  purchaseCost: string | number | null;
  expectedLifeMonths: number | null;
  lifetimeServiceCost: string | number | null;
  serviceEventCount: number | null;
  lastServiceAt: string | null;
  notes: string | null;
  customFields?: AssetCustomFields | null;
  category?: AssetCategory | null;
  assetModel?: AssetModel | null;
  currentProperty?: Property | null;
  currentUnit?: Unit | null;
  serviceEvents?: ServiceEvent[];
  partsInstalled?: PartRecord[];
  partsSourced?: PartRecord[];
}

export interface WorkOrderNote {
  id: string;
  author: string;
  avatar?: string;
  createdAt: string;
  text: string;
  type?: 'note' | 'status_change' | 'part_ordered';
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category?: string;
  propertyId: string;
  propertyName?: string;
  unitId: string | null;
  unitLabel?: string;
  assetId: string | null;
  assetNpid?: string;
  assetName?: string;
  assignee?: string;
  slaDueAt: string | null;
  completedAt: string | null;
  resolution: string | null;
  actualCost?: string | number | null;
  partsRequired?: string[];
  notesList?: WorkOrderNote[];
}

// ================= Mock Seed Data =================
const DEMO_ORG: Organization = {
  id: 'org_sonoran',
  name: 'Sonoran Portfolio Partners LLC',
  slug: 'sonoran-partners',
  plan: 'Enterprise Portfolio Tier',
};

const DEMO_PROPERTIES: Property[] = [
  {
    id: 'prop_sonoran_ridge',
    name: 'Sonoran Ridge Residences',
    code: 'SRR',
    addressLine1: '4820 E Camelback Rd',
    city: 'Phoenix',
    state: 'AZ',
    postalCode: '85018',
    status: 'active',
    unitCountDeclared: 240,
    latitude: 33.5092,
    longitude: -111.9783,
    yearBuilt: 2018,
    timezone: 'America/Phoenix',
  },
  {
    id: 'prop_camelback_vista',
    name: 'Camelback Vista Commons',
    code: 'CVC',
    addressLine1: '5102 N 44th St',
    city: 'Phoenix',
    state: 'AZ',
    postalCode: '85018',
    status: 'active',
    unitCountDeclared: 180,
    latitude: 33.5124,
    longitude: -111.9841,
    yearBuilt: 2014,
    timezone: 'America/Phoenix',
  },
  {
    id: 'prop_desert_palm',
    name: 'Desert Palm Towers',
    code: 'DPT',
    addressLine1: '3200 E Lincoln Dr',
    city: 'Scottsdale',
    state: 'AZ',
    postalCode: '85253',
    status: 'active',
    unitCountDeclared: 310,
    latitude: 33.5312,
    longitude: -111.9614,
    yearBuilt: 2009,
    timezone: 'America/Phoenix',
  },
];

const DEMO_BUILDINGS: Building[] = [
  { id: 'bld_4', propertyId: 'prop_sonoran_ridge', name: 'Building 4', floors: 4, code: 'B4' },
  { id: 'bld_3', propertyId: 'prop_sonoran_ridge', name: 'Building 3', floors: 4, code: 'B3' },
  { id: 'bld_c1', propertyId: 'prop_camelback_vista', name: 'Building 1', floors: 3, code: 'B1' },
  { id: 'bld_da', propertyId: 'prop_desert_palm', name: 'Tower A', floors: 18, code: 'TA' },
];

const DEMO_UNITS: Unit[] = [
  { id: 'unit_402', propertyId: 'prop_sonoran_ridge', buildingId: 'bld_4', label: '402', floor: 4, bedrooms: 2, bathrooms: 2, squareFeet: 1180, occupancyStatus: 'occupied' },
  { id: 'unit_401', propertyId: 'prop_sonoran_ridge', buildingId: 'bld_4', label: '401', floor: 4, bedrooms: 1, bathrooms: 1, squareFeet: 780, occupancyStatus: 'occupied' },
  { id: 'unit_403', propertyId: 'prop_sonoran_ridge', buildingId: 'bld_4', label: '403', floor: 4, bedrooms: 2, bathrooms: 2, squareFeet: 1180, occupancyStatus: 'vacant' },
  { id: 'unit_301', propertyId: 'prop_sonoran_ridge', buildingId: 'bld_3', label: '301', floor: 3, bedrooms: 1, bathrooms: 1, squareFeet: 740, occupancyStatus: 'occupied' },
  { id: 'unit_302', propertyId: 'prop_sonoran_ridge', buildingId: 'bld_3', label: '302', floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1100, occupancyStatus: 'turning' },
  { id: 'unit_101', propertyId: 'prop_camelback_vista', buildingId: 'bld_c1', label: '101', floor: 1, bedrooms: 2, bathrooms: 2, squareFeet: 980, occupancyStatus: 'occupied' },
  { id: 'unit_102', propertyId: 'prop_camelback_vista', buildingId: 'bld_c1', label: '102', floor: 1, bedrooms: 1, bathrooms: 1, squareFeet: 720, occupancyStatus: 'occupied' },
  { id: 'unit_1204', propertyId: 'prop_desert_palm', buildingId: 'bld_da', label: '1204', floor: 12, bedrooms: 2, bathrooms: 2, squareFeet: 1240, occupancyStatus: 'occupied' },
  { id: 'unit_1205', propertyId: 'prop_desert_palm', buildingId: 'bld_da', label: '1205', floor: 12, bedrooms: 1, bathrooms: 1, squareFeet: 810, occupancyStatus: 'vacant' },
];

function hydrateUnit(unit: Unit): Unit {
  return { ...unit, building: DEMO_BUILDINGS.find((b) => b.id === unit.buildingId) ?? null };
}

const DEMO_CATEGORIES: AssetCategory[] = [
  { id: 'cat_hvac', key: 'hvac', displayName: 'HVAC & Heating', defaultUsefulLifeMonths: 120, defaultReplacementCost: 3800 },
  { id: 'cat_refrigeration', key: 'refrigeration', displayName: 'Major Refrigeration', defaultUsefulLifeMonths: 120, defaultReplacementCost: 1450 },
  { id: 'cat_laundry_wash', key: 'laundry_wash', displayName: 'Commercial Laundry (Wash)', defaultUsefulLifeMonths: 96, defaultReplacementCost: 1320 },
  { id: 'cat_laundry_dry', key: 'laundry_dry', displayName: 'Commercial Laundry (Dry)', defaultUsefulLifeMonths: 96, defaultReplacementCost: 1250 },
  { id: 'cat_dishwasher', key: 'dishwasher', displayName: 'Kitchen Dishwashing', defaultUsefulLifeMonths: 84, defaultReplacementCost: 899 },
  { id: 'cat_climate', key: 'climate', displayName: 'Smart Climate & Controls', defaultUsefulLifeMonths: 60, defaultReplacementCost: 180 },
  { id: 'cat_cooking', key: 'cooking', displayName: 'Range & Cooking', defaultUsefulLifeMonths: 108, defaultReplacementCost: 950 },
];

const DEMO_ASSETS: Asset[] = [
  {
    id: 'asset_hvac_402',
    npid: 'NP-1M4K9X23',
    categoryId: 'cat_hvac',
    assetModelId: 'mod_carrier_fe4',
    manufacturerRaw: 'Carrier',
    modelRaw: 'FE4ANF002',
    serialNumber: '4821A90124',
    serialConfidence: 'verified',
    status: 'needs_repair',
    condition: 'fair',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-20T14:30:00Z',
    installDate: '2021-11-05',
    manufactureDate: '2021-10-18',
    warrantyExpiresOn: '2031-11-05',
    purchaseCost: 3800,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 38,
    serviceEventCount: 2,
    lastServiceAt: '2026-03-20T10:15:00Z',
    notes: '2.5-ton variable speed air handler in utility closet. Annual maintenance certified.',
    customFields: {
      schematicKey: 'hvac',
      specTag: 'HVAC & MECHANICAL · SPEC 01',
      room: 'Unit 402 · Utility / Mechanical Closet',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr Sealed Compressor Warranty',
      description: 'Dual-stage forced-air heating and split condenser system.',
      serialLabel: 'Carrier OCR Stamped',
      criticalParts: [
        { type: 'red', title: 'Heating Element & Sensors', text: 'Critical thermal safety control, monitored for burnout cycles.' },
        { type: 'red', title: 'Compressor & Thermostat Bus', text: 'High-CapEx failure risk; captures OEM warranty eligibility.' },
        { type: 'white', title: 'Blower & Condenser Fan', text: 'Mechanical airflow system logged during semi-annual PM audits.' },
      ],
    },
    category: DEMO_CATEGORIES[0],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_fridge_402',
    npid: 'NP-7K2M4QX9',
    categoryId: 'cat_refrigeration',
    assetModelId: 'mod_wp_wrf535',
    manufacturerRaw: 'Whirlpool',
    modelRaw: 'WRF535SWHZ',
    serialNumber: 'W10874291',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-18T09:12:00Z',
    installDate: '2023-04-10',
    manufactureDate: '2023-03-15',
    warrantyExpiresOn: '2028-04-10',
    purchaseCost: 1450,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 64.2,
    serviceEventCount: 3,
    lastServiceAt: '2026-06-12T11:00:00Z',
    notes: '36" French Door with dual evaporator cold-wall system.',
    customFields: {
      schematicKey: 'fridge',
      specTag: 'KITCHEN SYSTEMS · SPEC 03',
      room: 'Unit 402 · Gourmet Kitchen (North Alcove)',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr Sealed System Warranty',
      description: 'Multi-zone refrigeration system with hermetic compressor and dual evaporator coils.',
      serialLabel: 'Whirlpool OCR Verified',
      criticalParts: [
        { type: 'red', title: 'Hermetic Sealed Compressor', text: 'Primary refrigeration power; core warranty recovery asset.' },
        { type: 'red', title: 'Evaporator Coils & Defrost Loop', text: 'Cold-wall freeze risk; tracked for refrigerant efficiency.' },
        { type: 'white', title: 'Thermostat & Door Seals', text: 'Air-tight envelope monitoring preventing frost buildup.' },
      ],
    },
    category: DEMO_CATEGORIES[1],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_washer_402',
    npid: 'NP-3W9Q5R71',
    categoryId: 'cat_laundry_wash',
    assetModelId: 'mod_sq_ff7',
    manufacturerRaw: 'Speed Queen',
    modelRaw: 'FF7005WN',
    serialNumber: '250608914',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-15T16:45:00Z',
    installDate: '2025-06-22',
    manufactureDate: '2025-06-10',
    warrantyExpiresOn: '2030-06-22',
    purchaseCost: 1320,
    expectedLifeMonths: 96,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2026-05-14T08:30:00Z',
    notes: 'Commercial direct-drive washer with dynamic spin balancing.',
    customFields: {
      schematicKey: 'washer',
      specTag: 'LAUNDRY SYSTEMS · SPEC 02',
      room: 'Unit 402 · Laundry Closet',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '5-Yr Commercial Warranty',
      description: 'High-efficiency direct-drive commercial washing unit.',
      serialLabel: 'Speed Queen Laser OCR',
      criticalParts: [
        { type: 'red', title: 'Water Inlet & Drain Pump', text: 'High flood-risk points; tracked for solenoid wear.' },
        { type: 'red', title: 'Internal Water Heater & Logic', text: 'Monitored for power surges and electronic logic faults.' },
        { type: 'white', title: 'Drive Motor & Outer Drum', text: 'Structural balance and bearing integrity verification.' },
      ],
    },
    category: DEMO_CATEGORIES[2],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_dryer_402',
    npid: 'NP-6K8L2P44',
    categoryId: 'cat_laundry_dry',
    assetModelId: 'mod_sq_df7',
    manufacturerRaw: 'Speed Queen',
    modelRaw: 'DF7000WE',
    serialNumber: '250609318',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-15T16:45:00Z',
    installDate: '2025-06-22',
    manufactureDate: '2025-06-10',
    warrantyExpiresOn: '2030-06-22',
    purchaseCost: 1250,
    expectedLifeMonths: 96,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2026-05-14T08:45:00Z',
    notes: 'Electric heavy duty commercial dryer.',
    customFields: {
      schematicKey: 'dryer',
      specTag: 'LAUNDRY SYSTEMS · SPEC 04',
      room: 'Unit 402 · Laundry Closet',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '5-Yr Commercial Warranty',
      description: 'Commercial electric drying unit with high-density heating element.',
      serialLabel: 'Speed Queen OCR Stamped',
      criticalParts: [
        { type: 'red', title: 'High-Density Heating Element', text: 'Critical fire-safety checkpoint; resistance certified at turns.' },
        { type: 'white', title: 'Centrifugal Blower & Lint Barrier', text: 'Airflow backpressure tested to prevent lint accumulation.' },
        { type: 'white', title: 'Drum Drive Belt & Pulley', text: 'Mechanical rotation verified during make-ready turns.' },
      ],
    },
    category: DEMO_CATEGORIES[3],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_dw_402',
    npid: 'NP-8V3Z6K19',
    categoryId: 'cat_dishwasher',
    assetModelId: 'mod_ge_pdt7',
    manufacturerRaw: 'GE Profile',
    modelRaw: 'PDT715SYNFS',
    serialNumber: '340918471',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'good',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-10T12:00:00Z',
    installDate: '2023-04-10',
    manufactureDate: '2023-03-15',
    warrantyExpiresOn: '2028-04-10',
    purchaseCost: 899,
    expectedLifeMonths: 84,
    lifetimeServiceCost: 24,
    serviceEventCount: 2,
    lastServiceAt: '2026-01-09T14:20:00Z',
    notes: 'Top control dishwasher with sanitize cycle and leak detection.',
    customFields: {
      schematicKey: 'dishwasher',
      specTag: 'KITCHEN SYSTEMS · SPEC 05',
      room: 'Unit 402 · Gourmet Kitchen',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '5-Yr Tub & Electronics Warranty',
      description: 'High-pressure wash system with heating boost element.',
      serialLabel: 'GE Profile Laser Barcode',
      criticalParts: [
        { type: 'red', title: 'Water Booster Heater', text: 'High-temperature sanitation verification.' },
        { type: 'white', title: 'Float Switch & Pump', text: 'Sub-floor leak mitigation sensors tested annually.' },
        { type: 'white', title: 'Spray Arms & Filter', text: 'Mechanical wash integrity checked during turnover audits.' },
      ],
    },
    category: DEMO_CATEGORIES[4],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_wh_402',
    npid: 'NP-9T5L3R18',
    categoryId: 'cat_hvac',
    assetModelId: 'mod_rheem_pro',
    manufacturerRaw: 'Rheem',
    modelRaw: 'PROG50-38N',
    serialNumber: 'RH5029184',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'good',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_402',
    currentLocationConfirmedAt: '2026-08-01T11:00:00Z',
    installDate: '2022-09-14',
    manufactureDate: '2022-08-20',
    warrantyExpiresOn: '2032-09-14',
    purchaseCost: 1650,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2025-09-10T10:00:00Z',
    notes: '50-gallon hybrid heat pump water heater.',
    customFields: {
      schematicKey: 'thermostat',
      specTag: 'CLIMATE & CONTROLS · SPEC 06',
      room: 'Unit 402 · Utility / Mechanical Closet',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr Tank & Parts Warranty',
      description: 'High-efficiency heat pump water heater with digital temperature bus.',
      serialLabel: 'Rheem Certified OCR',
      criticalParts: [
        { type: 'red', title: 'Upper/Lower Heating Elements', text: 'Dual resistance coils tested during turnover.' },
        { type: 'white', title: 'Magnesium Anode Rod', text: 'Cathodic protection preventing tank corrosion.' },
        { type: 'white', title: 'Digital Thermostat Board', text: 'Safety temperature limiter & pressure valve.' },
      ],
    },
    category: DEMO_CATEGORIES[0],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[0],
  },
  {
    id: 'asset_range_401',
    npid: 'NP-4R8H2C17',
    categoryId: 'cat_cooking',
    assetModelId: 'mod_ge_jbs',
    manufacturerRaw: 'GE',
    modelRaw: 'JBS360RMSS',
    serialNumber: 'GE4018821',
    serialConfidence: 'scanned',
    status: 'needs_repair',
    condition: 'fair',
    currentPropertyId: 'prop_sonoran_ridge',
    currentUnitId: 'unit_401',
    currentLocationConfirmedAt: '2026-08-12T09:00:00Z',
    installDate: '2019-03-02',
    manufactureDate: '2019-01-15',
    warrantyExpiresOn: '2024-03-02',
    purchaseCost: 680,
    expectedLifeMonths: 108,
    lifetimeServiceCost: 210,
    serviceEventCount: 4,
    lastServiceAt: '2026-07-02T13:00:00Z',
    notes: '30" free-standing electric range. Left burner open circuit.',
    customFields: {
      specTag: 'KITCHEN APPLIANCES · SPEC 08',
      room: 'Unit 401 · Kitchen',
      gps: '33.5092° N, 111.9783° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: 'Warranty expired',
      description: 'Standard electric range tracked for element and igniter failures.',
    },
    category: DEMO_CATEGORIES[6],
    currentProperty: DEMO_PROPERTIES[0],
    currentUnit: DEMO_UNITS[1],
  },
  {
    id: 'asset_fridge_101',
    npid: 'NP-2F6C9L55',
    categoryId: 'cat_refrigeration',
    assetModelId: 'mod_frig_fftr',
    manufacturerRaw: 'Frigidaire',
    modelRaw: 'FFTR1835VW',
    serialNumber: 'FF1014492',
    serialConfidence: 'scanned',
    status: 'active',
    condition: 'good',
    currentPropertyId: 'prop_camelback_vista',
    currentUnitId: 'unit_101',
    currentLocationConfirmedAt: '2026-08-16T11:20:00Z',
    installDate: '2024-01-20',
    manufactureDate: '2023-12-02',
    warrantyExpiresOn: '2029-01-20',
    purchaseCost: 810,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2026-01-20T10:00:00Z',
    notes: '18.3 cu ft top-freezer. Make-ready confirmed.',
    customFields: {
      schematicKey: 'fridge',
      specTag: 'KITCHEN SYSTEMS · SPEC 03',
      room: 'Unit 101 · Kitchen',
      gps: '33.5124° N, 111.9841° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '5-Yr Sealed System Warranty',
      description: 'Top-freezer refrigerator at Camelback Vista Commons.',
    },
    category: DEMO_CATEGORIES[1],
    currentProperty: DEMO_PROPERTIES[1],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_101') ?? null,
  },
  {
    id: 'asset_hvac_1204',
    npid: 'NP-8H1P4Q70',
    categoryId: 'cat_hvac',
    assetModelId: 'mod_trane_tam9',
    manufacturerRaw: 'Trane',
    modelRaw: 'TAM9A0C48H31',
    serialNumber: 'TR1204881',
    serialConfidence: 'ocr',
    status: 'unaccounted_for',
    condition: 'fair',
    currentPropertyId: 'prop_desert_palm',
    currentUnitId: 'unit_1204',
    currentLocationConfirmedAt: '2025-12-01T00:00:00Z',
    installDate: '2016-06-11',
    manufactureDate: '2016-04-02',
    warrantyExpiresOn: '2026-06-11',
    purchaseCost: 3550,
    expectedLifeMonths: 216,
    lifetimeServiceCost: 890,
    serviceEventCount: 7,
    lastServiceAt: '2025-11-02T15:00:00Z',
    notes: '4-ton air handler. Location unconfirmed since last turn.',
    customFields: {
      schematicKey: 'hvac',
      specTag: 'HVAC & MECHANICAL · SPEC 01',
      room: 'Unit 1204 · Mechanical Closet',
      gps: '33.5312° N, 111.9614° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: 'OEM expired 2026',
      description: 'Tower A air handler. Chain of custody incomplete after last turn.',
    },
    category: DEMO_CATEGORIES[0],
    currentProperty: DEMO_PROPERTIES[2],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_1204') ?? null,
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'wo_1048',
    number: 1048,
    title: 'HVAC Air Handler — High-Heat Sensor Sweep & Filter Replacement',
    description: 'Tenant reported reduced airflow in living room. Tech needs to verify 2.5-ton Carrier blower static pressure and inspect 45/5 uF run capacitor.',
    status: 'in_progress',
    priority: 'urgent',
    category: 'HVAC',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_hvac_402',
    assetNpid: 'NP-1M4K9X23',
    assetName: 'Carrier 2.5-Ton Variable Speed Air Handler',
    assignee: 'J. Morales (Lead Tech)',
    slaDueAt: '2026-08-28T18:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 38.00,
    partsRequired: ['MERV 11 Filter (20x25x4)', '45/5 uF Run Capacitor'],
    notesList: [
      { id: 'n1', author: 'System Dispatch', createdAt: '2026-08-26T08:00:00Z', text: 'Work order auto-generated from scheduled PM trigger.' },
      { id: 'n2', author: 'J. Morales', createdAt: '2026-08-26T10:15:00Z', text: 'Arrived at Unit 402. Air handler static pressure is 0.65 in. w.g. Replacing filter and testing capacitor.' },
    ],
  },
  {
    id: 'wo_1045',
    number: 1045,
    title: 'Refrigerator — Ice Maker Water Inlet Solenoid Audit',
    description: 'Inspect dual water inlet solenoid valve (#W10498990) for calcium buildup. Confirm no moisture in sub-tray.',
    status: 'assigned',
    priority: 'high',
    category: 'Appliance',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_fridge_402',
    assetNpid: 'NP-7K2M4QX9',
    assetName: 'Whirlpool 36" French Door Refrigerator',
    assignee: 'D. Vance',
    slaDueAt: '2026-08-29T17:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 0,
    partsRequired: ['Dual Inlet Solenoid #W10498990'],
    notesList: [
      { id: 'n3', author: 'HQ PM Scheduler', createdAt: '2026-08-25T14:20:00Z', text: 'Assigned to D. Vance for make-ready audit.' },
    ],
  },
  {
    id: 'wo_1042',
    number: 1042,
    title: 'Dishwasher — Float Switch Flood Mitigation Testing',
    description: 'Verify sub-floor float switch contacts and clear drain filtration basin.',
    status: 'open',
    priority: 'normal',
    category: 'Plumbing',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_dw_402',
    assetNpid: 'NP-8V3Z6K19',
    assetName: 'GE Profile Top Control Dishwasher',
    assignee: 'Unassigned',
    slaDueAt: '2026-09-02T12:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: null,
    partsRequired: ['GE Drain Sump Gasket'],
    notesList: [
      { id: 'n4', author: 'Tenant Portal', createdAt: '2026-08-24T09:00:00Z', text: 'Routine semi-annual appliance inspection.' },
    ],
  },
  {
    id: 'wo_1039',
    number: 1039,
    title: 'Water Heater — Anode Rod Cathodic Protection Inspection',
    description: 'Inspect magnesium anode rod in Rheem 50-gallon hybrid heat pump. Measure electrical potential.',
    status: 'awaiting_parts',
    priority: 'normal',
    category: 'Plumbing',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_wh_402',
    assetNpid: 'NP-9T5L3R18',
    assetName: 'Rheem 50-Gal Hybrid Heat Pump Water Heater',
    assignee: 'J. Morales',
    slaDueAt: '2026-09-05T15:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 45.00,
    partsRequired: ['Rheem Magnesium Anode Rod #SP11526C (On Order)'],
    notesList: [
      { id: 'n5', author: 'J. Morales', createdAt: '2026-08-22T11:00:00Z', text: 'Anode rod at 70% depletion. Ordered OEM replacement rod from supply house.' },
    ],
  },
  {
    id: 'wo_1034',
    number: 1034,
    title: 'Commercial Dryer — 480 CFM Exhaust Airflow Certification',
    description: 'Certified exhaust duct airflow at make-ready turn. Cleared lint barrier and verified 240V ceramic heating coil resistance.',
    status: 'completed',
    priority: 'low',
    category: 'Electrical',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_dryer_402',
    assetNpid: 'NP-6K8L2P44',
    assetName: 'Speed Queen Electric Heavy Duty Dryer',
    assignee: 'D. Vance',
    slaDueAt: '2026-08-20T12:00:00Z',
    completedAt: '2026-08-19T14:30:00Z',
    resolution: 'Passed 480 CFM airflow velocity test. All safety sensors active.',
    actualCost: 0,
    partsRequired: [],
    notesList: [
      { id: 'n6', author: 'D. Vance', createdAt: '2026-08-19T14:30:00Z', text: 'Turnover inspection passed. Ready for next resident.' },
    ],
  },
  {
    id: 'wo_1030',
    number: 1030,
    title: 'Washer — Direct-Drive Spin Drum Dynamic Balancing Test',
    description: 'Dynamic load test completed at 1200 RPM. Water inlet solenoids verified without leakage.',
    status: 'completed',
    priority: 'low',
    category: 'Appliance',
    propertyId: 'prop_sonoran_ridge',
    propertyName: 'Sonoran Ridge Residences',
    unitId: 'unit_402',
    unitLabel: 'Unit 402',
    assetId: 'asset_washer_402',
    assetNpid: 'NP-3W9Q5R71',
    assetName: 'Speed Queen Commercial Front-Load Washer',
    assignee: 'D. Vance',
    slaDueAt: '2026-08-18T12:00:00Z',
    completedAt: '2026-08-17T16:00:00Z',
    resolution: 'Vibration dampeners certified within OEM tolerance.',
    actualCost: 0,
    partsRequired: [],
    notesList: [
      { id: 'n7', author: 'D. Vance', createdAt: '2026-08-17T16:00:00Z', text: 'Sanitization cycle executed. NPID hardware confirmed present.' },
    ],
  },
];

// Persistent state storage for Demo
const STORAGE_KEY = 'nameplate_hq_workorders_v1';

function getStoredWorkOrders(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback to initial */
  }
  return [...INITIAL_WORK_ORDERS];
}

function saveStoredWorkOrders(rows: WorkOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

let inMemoryWorkOrders = getStoredWorkOrders();

// ================= API Interface =================
export const api = {
  getOrg: async (): Promise<Organization> => DEMO_ORG,

  listProperties: async (_orgId?: string): Promise<Property[]> => DEMO_PROPERTIES,

  getProperty: async (id: string): Promise<Property> => {
    const found = DEMO_PROPERTIES.find((p) => p.id === id);
    if (!found) throw new Error('Property not found: ' + id);
    return found;
  },

  listBuildings: async (propId?: string): Promise<Building[]> =>
    DEMO_BUILDINGS.filter((b) => !propId || b.propertyId === propId),

  listUnits: async (propId?: string, buildingId?: string): Promise<Unit[]> =>
    DEMO_UNITS.filter(
      (u) => (!propId || u.propertyId === propId) && (!buildingId || u.buildingId === buildingId),
    ).map(hydrateUnit),

  getUnit: async (id: string): Promise<Unit> => {
    const found = DEMO_UNITS.find((u) => u.id === id);
    if (!found) throw new Error('Unit not found: ' + id);
    return hydrateUnit(found);
  },

  listCategories: async (): Promise<AssetCategory[]> => DEMO_CATEGORIES,

  listAssets: async (_orgId?: string, params: Record<string, string> = {}): Promise<Asset[]> => {
    let list = [...DEMO_ASSETS];
    if (params.propertyId) {
      list = list.filter((a) => a.currentPropertyId === params.propertyId);
    }
    if (params.unitId) {
      list = list.filter((a) => a.currentUnitId === params.unitId);
    }
    if (params.status) {
      list = list.filter((a) => a.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((a) => 
        a.npid.toLowerCase().includes(q) ||
        (a.manufacturerRaw ?? '').toLowerCase().includes(q) ||
        (a.modelRaw ?? '').toLowerCase().includes(q) ||
        (a.serialNumber ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  },

  getAsset: async (id: string, _orgId?: string): Promise<Asset> => {
    const found = DEMO_ASSETS.find((a) => a.id === id || a.npid === id);
    if (!found) throw new Error('Asset not found: ' + id);
    return found;
  },

  lookupAsset: async (code: string, _orgId?: string): Promise<Asset> => {
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const found = DEMO_ASSETS.find((a) => a.npid.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);
    if (!found) throw new Error('Asset not found with code: ' + code);
    return found;
  },

  listWorkOrders: async (_orgId?: string, _params: Record<string, string> = {}): Promise<WorkOrder[]> => {
    return [...inMemoryWorkOrders];
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    const found = inMemoryWorkOrders.find((w) => w.id === id || String(w.number) === id);
    if (!found) throw new Error('Work order not found: ' + id);
    return found;
  },

  updateWorkOrder: async (id: string, patch: Partial<WorkOrder>): Promise<WorkOrder> => {
    const idx = inMemoryWorkOrders.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Work order not found: ' + id);
    const updated = { ...inMemoryWorkOrders[idx], ...patch };
    inMemoryWorkOrders[idx] = updated;
    saveStoredWorkOrders(inMemoryWorkOrders);
    return updated;
  },

  createWorkOrder: async (newWo: Omit<WorkOrder, 'id' | 'number'>): Promise<WorkOrder> => {
    const nextNum = Math.max(...inMemoryWorkOrders.map((w) => w.number), 1050) + 1;
    const item: WorkOrder = {
      ...newWo,
      id: 'wo_' + nextNum,
      number: nextNum,
      status: newWo.status || 'open',
      priority: newWo.priority || 'normal',
      notesList: newWo.notesList || [
        { id: 'note_' + Date.now(), author: 'HQ Dispatch', createdAt: new Date().toISOString(), text: 'Work order created.' },
      ],
    };
    inMemoryWorkOrders = [item, ...inMemoryWorkOrders];
    saveStoredWorkOrders(inMemoryWorkOrders);
    return item;
  },

  addWorkOrderNote: async (id: string, noteText: string, author = 'Tech Morales'): Promise<WorkOrder> => {
    const idx = inMemoryWorkOrders.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Work order not found: ' + id);
    const note: WorkOrderNote = {
      id: 'note_' + Date.now(),
      author,
      createdAt: new Date().toISOString(),
      text: noteText,
      type: 'note',
    };
    const updated = {
      ...inMemoryWorkOrders[idx],
      notesList: [...(inMemoryWorkOrders[idx].notesList || []), note],
    };
    inMemoryWorkOrders[idx] = updated;
    saveStoredWorkOrders(inMemoryWorkOrders);
    return updated;
  },

  listServiceEvents: async (_orgId?: string): Promise<ServiceEvent[]> => [
    {
      id: 'evt_1',
      assetId: 'asset_hvac_402',
      workOrderId: 'wo_1048',
      propertyId: 'prop_sonoran_ridge',
      unitId: 'unit_402',
      technicianId: 'tech_morales',
      eventType: 'maintenance',
      findings: 'Run capacitor tested 41 uF on 45 uF spec. Blower amperage 2.8A.',
      symptomCodes: ['AIRFLOW_LOW'],
      resolutionCode: 'PM_PASSED',
      laborMinutes: 45,
      laborRate: 65,
      laborCost: 48.75,
      partsCost: 38.00,
      otherCost: 0,
      totalCost: 86.75,
      costBorneBy: 'owner',
      isWarrantyClaim: false,
      occurredAt: '2026-08-20T10:15:00Z',
      technician: { id: 'tech_morales', user: { fullName: 'J. Morales' } },
      workOrder: { id: 'wo_1048', number: 1048, title: 'HVAC Air Handler — High-Heat Sensor Sweep' },
      partUsages: [{ oemPartNumber: 'CAP-45-5-370V', action: 'replaced' }],
    },
    {
      id: 'evt_2',
      assetId: 'asset_fridge_402',
      workOrderId: 'wo_1045',
      propertyId: 'prop_sonoran_ridge',
      unitId: 'unit_402',
      technicianId: 'tech_morales',
      eventType: 'repair',
      findings: 'Defrost bi-metal thermostat open circuit. Replaced under manufacturer warranty.',
      symptomCodes: ['FROST_BUILDUP'],
      resolutionCode: 'PART_REPLACED',
      laborMinutes: 30,
      laborRate: 65,
      laborCost: 32.50,
      partsCost: 64.20,
      otherCost: 0,
      totalCost: 96.70,
      costBorneBy: 'warranty',
      isWarrantyClaim: true,
      occurredAt: '2026-06-12T11:00:00Z',
      technician: { id: 'tech_morales', user: { fullName: 'J. Morales' } },
      workOrder: { id: 'wo_1045', number: 1045, title: 'Refrigerator — Defrost Sensor Replacement' },
      partUsages: [{ oemPartNumber: 'WPW10225581', action: 'warranty_replacement' }],
    },
  ],
};
