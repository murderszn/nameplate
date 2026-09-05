/**
 * Nameplate HQ API Client with Built-in Interactive Demo Store.
 * Supports offline demo functionality, live work order mutations,
 * Jira-style status updates, comments/notes, and full asset registry.
 */

import { mintNpid } from '../lib/qr';

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
  warrantyExtra?: string;
  compressorWarranty?: string;
  description?: string;
  serialLabel?: string;
  criticalParts?: CriticalPart[];
  [key: string]: any;
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
  correctedByEventId?: string | null;
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
  installDateConfidence?: string | null;
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

export interface MaintenanceUser {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  userStatus: string;
  role: string;
  employmentType: string | null;
  hourlyLaborRate: string | number | null;
  status: 'invited' | 'active' | 'revoked';
  lastSeenAt: string | null;
  invitedAt: string;
  properties: Array<Pick<Property, 'id' | 'name' | 'code'>>;
}

export interface InviteMaintenanceUserInput {
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  employmentType?: string;
  hourlyLaborRate?: number;
  propertyIds: string[];
}

export interface UpdateMaintenanceUserInput {
  role?: string;
  employmentType?: string;
  hourlyLaborRate?: number;
  status?: 'invited' | 'active' | 'revoked';
  propertyIds?: string[];
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
  {
    id: 'prop_scottsdale_vista',
    name: 'Scottsdale Vista Apartments',
    code: 'SVA',
    addressLine1: '7140 E Indian School Rd',
    city: 'Scottsdale',
    state: 'AZ',
    postalCode: '85251',
    status: 'active',
    unitCountDeclared: 195,
    latitude: 33.4942,
    longitude: -111.9261,
    yearBuilt: 2020,
    timezone: 'America/Phoenix',
  },
  {
    id: 'prop_biltmore_estate',
    name: 'Biltmore Estate Condominiums',
    code: 'BEC',
    addressLine1: '2400 E Missouri Ave',
    city: 'Phoenix',
    state: 'AZ',
    postalCode: '85016',
    status: 'active',
    unitCountDeclared: 160,
    latitude: 33.5178,
    longitude: -112.0289,
    yearBuilt: 2016,
    timezone: 'America/Phoenix',
  },
  {
    id: 'prop_tempe_lakeside',
    name: 'Tempe Lakeside Residences',
    code: 'TLR',
    addressLine1: '260 E Rio Salado Pkwy',
    city: 'Tempe',
    state: 'AZ',
    postalCode: '85281',
    status: 'active',
    unitCountDeclared: 220,
    latitude: 33.4305,
    longitude: -111.9372,
    yearBuilt: 2022,
    timezone: 'America/Phoenix',
  },
];

const DEMO_BUILDINGS: Building[] = [
  { id: 'bld_4', propertyId: 'prop_sonoran_ridge', name: 'Building 4', floors: 4, code: 'B4' },
  { id: 'bld_3', propertyId: 'prop_sonoran_ridge', name: 'Building 3', floors: 4, code: 'B3' },
  { id: 'bld_c1', propertyId: 'prop_camelback_vista', name: 'Building 1', floors: 3, code: 'B1' },
  { id: 'bld_da', propertyId: 'prop_desert_palm', name: 'Tower A', floors: 18, code: 'TA' },
  { id: 'bld_sv1', propertyId: 'prop_scottsdale_vista', name: 'West Wing', floors: 4, code: 'WW' },
  { id: 'bld_be1', propertyId: 'prop_biltmore_estate', name: 'Tower 1', floors: 6, code: 'T1' },
  { id: 'bld_tl1', propertyId: 'prop_tempe_lakeside', name: 'Lakeview Building', floors: 5, code: 'LV' },
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
  { id: 'unit_sv_204', propertyId: 'prop_scottsdale_vista', buildingId: 'bld_sv1', label: '204', floor: 2, bedrooms: 2, bathrooms: 2, squareFeet: 1050, occupancyStatus: 'occupied' },
  { id: 'unit_be_512', propertyId: 'prop_biltmore_estate', buildingId: 'bld_be1', label: '512', floor: 5, bedrooms: 3, bathrooms: 2, squareFeet: 1420, occupancyStatus: 'occupied' },
  { id: 'unit_tl_308', propertyId: 'prop_tempe_lakeside', buildingId: 'bld_tl1', label: '308', floor: 3, bedrooms: 2, bathrooms: 2, squareFeet: 1120, occupancyStatus: 'occupied' },
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
  {
    id: 'asset_hvac_sv204',
    npid: 'NP-5K9L2M83',
    categoryId: 'cat_hvac',
    assetModelId: 'mod_carrier_fe4',
    manufacturerRaw: 'Carrier',
    modelRaw: '24ACC636A003',
    serialNumber: 'CR8829014',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_scottsdale_vista',
    currentUnitId: 'unit_sv_204',
    currentLocationConfirmedAt: '2026-08-22T10:00:00Z',
    installDate: '2020-08-15',
    manufactureDate: '2020-07-10',
    warrantyExpiresOn: '2030-08-15',
    purchaseCost: 3600,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 45,
    serviceEventCount: 2,
    lastServiceAt: '2026-04-10T09:00:00Z',
    notes: '3-ton high efficiency condenser and air handler.',
    customFields: {
      schematicKey: 'hvac',
      specTag: 'HVAC & MECHANICAL · SPEC 01',
      room: 'Unit 204 · Utility Closet',
      gps: '33.4942° N, 111.9261° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr OEM Warranty',
      description: 'Carrier 3-ton split system at Scottsdale Vista.',
    },
    category: DEMO_CATEGORIES[0],
    currentProperty: DEMO_PROPERTIES[3],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_sv_204') ?? null,
  },
  {
    id: 'asset_fridge_sv204',
    npid: 'NP-3T7W9P41',
    categoryId: 'cat_refrigeration',
    assetModelId: 'mod_wp_wrf535',
    manufacturerRaw: 'Samsung',
    modelRaw: 'RF28R7351SG',
    serialNumber: 'SG9920148',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'good',
    currentPropertyId: 'prop_scottsdale_vista',
    currentUnitId: 'unit_sv_204',
    currentLocationConfirmedAt: '2026-08-20T15:30:00Z',
    installDate: '2020-09-01',
    manufactureDate: '2020-08-10',
    warrantyExpiresOn: '2025-09-01',
    purchaseCost: 1850,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 120,
    serviceEventCount: 3,
    lastServiceAt: '2026-02-14T11:00:00Z',
    notes: 'French Door with FlexZone drawer.',
    customFields: {
      schematicKey: 'fridge',
      specTag: 'KITCHEN SYSTEMS · SPEC 03',
      room: 'Unit 204 · Kitchen',
      gps: '33.4942° N, 111.9261° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr Inverter Compressor',
      description: 'Samsung French Door refrigerator.',
    },
    category: DEMO_CATEGORIES[1],
    currentProperty: DEMO_PROPERTIES[3],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_sv_204') ?? null,
  },
  {
    id: 'asset_hvac_be512',
    npid: 'NP-9B2X4K87',
    categoryId: 'cat_hvac',
    assetModelId: 'mod_carrier_fe4',
    manufacturerRaw: 'Lennox',
    modelRaw: 'EL16XC1-048',
    serialNumber: 'LX5120984',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_biltmore_estate',
    currentUnitId: 'unit_be_512',
    currentLocationConfirmedAt: '2026-08-19T14:00:00Z',
    installDate: '2022-03-10',
    manufactureDate: '2022-02-15',
    warrantyExpiresOn: '2032-03-10',
    purchaseCost: 4200,
    expectedLifeMonths: 144,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2026-03-10T10:00:00Z',
    notes: '4-ton high efficiency split condenser for penthouse layout.',
    customFields: {
      schematicKey: 'hvac',
      specTag: 'HVAC & MECHANICAL · SPEC 01',
      room: 'Unit 512 · Mechanical Closet',
      gps: '33.5178° N, 112.0289° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '10-Yr Parts & Compressor',
      description: 'Lennox Elite Series commercial split system.',
    },
    category: DEMO_CATEGORIES[0],
    currentProperty: DEMO_PROPERTIES[4],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_be_512') ?? null,
  },
  {
    id: 'asset_fridge_tl308',
    npid: 'NP-4C8V2M66',
    categoryId: 'cat_refrigeration',
    assetModelId: 'mod_wp_wrf535',
    manufacturerRaw: 'Bosch',
    modelRaw: 'B36CT80SNS',
    serialNumber: 'BS8003194',
    serialConfidence: 'verified',
    status: 'active',
    condition: 'excellent',
    currentPropertyId: 'prop_tempe_lakeside',
    currentUnitId: 'unit_tl_308',
    currentLocationConfirmedAt: '2026-08-25T11:00:00Z',
    installDate: '2022-11-15',
    manufactureDate: '2022-10-20',
    warrantyExpiresOn: '2027-11-15',
    purchaseCost: 2400,
    expectedLifeMonths: 120,
    lifetimeServiceCost: 0,
    serviceEventCount: 1,
    lastServiceAt: '2026-05-18T09:30:00Z',
    notes: '800 Series French Door with Dual Compressors.',
    customFields: {
      schematicKey: 'fridge',
      specTag: 'KITCHEN SYSTEMS · SPEC 03',
      room: 'Unit 308 · Kitchen',
      gps: '33.4305° N, 111.9372° W',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      warrantySub: '5-Yr Electronics & Sealed System',
      description: 'Bosch Dual Compressor luxury refrigeration unit.',
    },
    category: DEMO_CATEGORIES[1],
    currentProperty: DEMO_PROPERTIES[5],
    currentUnit: DEMO_UNITS.find((u) => u.id === 'unit_tl_308') ?? null,
  },
];

const INITIAL_WORK_ORDERS: WorkOrder[] = [
{
    "id": "wo_1054",
    "number": 1054,
    "title": "French Door Freezer Evaporator Defrost Bi-Metal Clip",
    "description": "Defrost thermistor sensor intermittent; parts shipment scheduled from supplier.",
    "status": "awaiting_parts",
    "priority": "normal",
    "category": "Appliance",
    "propertyId": "prop_scottsdale_vista",
    "propertyName": "Scottsdale Vista Apartments",
    "unitId": "unit_sv_204",
    "unitLabel": "Unit 204",
    "assetId": "asset_fridge_sv204",
    "assetNpid": "NP-3T7W9P41",
    "assetName": "Samsung French Door Refrigerator",
    "assignee": "M. Nguyen",
    "slaDueAt": "2026-09-07T14:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 32.5,
    "partsRequired": [
      "Samsung Defrost Sensor #DA32-00006W"
    ],
    "notesList": [
      {
        "id": "n1054",
        "author": "M. Nguyen",
        "createdAt": "2026-08-28T13:30:00Z",
        "text": "Part ordered from distributor; delivery ETA Sep 6."
      }
    ]
  },
  {
    "id": "wo_1053",
    "number": 1053,
    "title": "Chiller Variable Frequency Inverter Drive Board",
    "description": "Inverter drive board offline; awaiting delivery of manufacturer circuit module.",
    "status": "awaiting_parts",
    "priority": "urgent",
    "category": "HVAC",
    "propertyId": "prop_biltmore_estate",
    "propertyName": "Biltmore Estate Condominiums",
    "unitId": "unit_be_512",
    "unitLabel": "Unit 512",
    "assetId": "asset_hvac_be512",
    "assetNpid": "NP-9B2X4K87",
    "assetName": "Lennox EL16XC1 4-Ton Split System",
    "assignee": "R. Patel",
    "slaDueAt": "2026-09-06T12:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 180.0,
    "partsRequired": [
      "Lennox Inverter Drive Module #619574-01 (In Transit)"
    ],
    "notesList": [
      {
        "id": "n1053",
        "author": "R. Patel",
        "createdAt": "2026-08-27T16:00:00Z",
        "text": "OEM board tracking number active. Rooftop staging planned."
      }
    ]
  },
  {
    "id": "wo_1052",
    "number": 1052,
    "title": "Commercial Washing Machine \u2014 Vibration Damper Shock Bushing Check",
    "description": "Dynamic drum vibration detected during spin cycle; inspect front shock struts and counterweights.",
    "status": "in_progress",
    "priority": "normal",
    "category": "Appliance",
    "propertyId": "prop_sonoran_ridge",
    "propertyName": "Sonoran Ridge Residences",
    "unitId": "unit_402",
    "unitLabel": "Unit 402",
    "assetId": "asset_washer_402",
    "assetNpid": "NP-3W9Q5R71",
    "assetName": "Speed Queen Commercial Front-Load Washer",
    "assignee": "D. Vance",
    "slaDueAt": "2026-09-03T18:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 0,
    "partsRequired": [],
    "notesList": [
      {
        "id": "n1052",
        "author": "D. Vance",
        "createdAt": "2026-08-29T11:15:00Z",
        "text": "Balancing weights inspected; testing damper friction."
      }
    ]
  },
  {
    "id": "wo_1051",
    "number": 1051,
    "title": "Main Condensate Drain Line High-Pressure Nitrogen Flush",
    "description": "Condensate primary drain sluggish; clear line with 80 PSI dry nitrogen and tablet treatment.",
    "status": "in_progress",
    "priority": "high",
    "category": "HVAC",
    "propertyId": "prop_desert_palm",
    "propertyName": "Desert Palm Towers",
    "unitId": "unit_1204",
    "unitLabel": "Unit 1204",
    "assetId": "asset_hvac_1204",
    "assetNpid": "NP-8H1P4Q70",
    "assetName": "Trane TAM9 4-Ton Air Handler",
    "assignee": "M. Nguyen",
    "slaDueAt": "2026-09-01T15:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 45.0,
    "partsRequired": [
      "Bio-Clean Drain Tablets (6-pack)"
    ],
    "notesList": [
      {
        "id": "n1051",
        "author": "M. Nguyen",
        "createdAt": "2026-08-28T14:00:00Z",
        "text": "Flushing 3/4-inch PVC condensate line with nitrogen purge."
      }
    ]
  },
  {
    "id": "wo_1050",
    "number": 1050,
    "title": "Range Cooktop \u2014 Right Front Infinite Switch Continuity Audit",
    "description": "Burner switch fails continuity sweep; replace switch harness and certify ground wire.",
    "status": "assigned",
    "priority": "normal",
    "category": "Appliance",
    "propertyId": "prop_sonoran_ridge",
    "propertyName": "Sonoran Ridge Residences",
    "unitId": "unit_401",
    "unitLabel": "Unit 401",
    "assetId": "asset_range_401",
    "assetNpid": "NP-4R8H2C17",
    "assetName": "GE 30\" Free-Standing Electric Range",
    "assignee": "M. Nguyen",
    "slaDueAt": "2026-09-04T16:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 0,
    "partsRequired": [
      "Infinite Switch #WB24X24991"
    ],
    "notesList": [
      {
        "id": "n1050",
        "author": "HQ Dispatch",
        "createdAt": "2026-08-29T10:30:00Z",
        "text": "Dispatched to M. Nguyen for switch replacement."
      }
    ]
  },
  {
    "id": "wo_1049",
    "number": 1049,
    "title": "Water Heater \u2014 Lower Heating Element Resistance Diagnostic",
    "description": "Check lower resistance coil for open circuit and measure voltage draw at terminal.",
    "status": "open",
    "priority": "urgent",
    "category": "Plumbing",
    "propertyId": "prop_camelback_vista",
    "propertyName": "Camelback Vista Commons",
    "unitId": "unit_101",
    "unitLabel": "Unit 101",
    "assetId": "asset_fridge_101",
    "assetNpid": "NP-2F6C9L55",
    "assetName": "Frigidaire Top-Freezer Refrigerator",
    "assignee": "J. Morales (Lead Tech)",
    "slaDueAt": "2026-08-31T17:00:00Z",
    "completedAt": null,
    "resolution": null,
    "actualCost": 0,
    "partsRequired": [
      "240V 4500W Screw-In Heating Element"
    ],
    "notesList": [
      {
        "id": "n1049",
        "author": "Tenant Portal",
        "createdAt": "2026-08-28T09:00:00Z",
        "text": "Resident reported lukewarm water during morning peak."
      }
    ]
  },
  {
    "id": "wo_1028",
    "number": 1028,
    "title": "Disposal Jam Recovery & Electrical Reset",
    "description": "Cleared mechanical coin jam from 3/4 HP disposal flywheel; reset overload relay.",
    "status": "completed",
    "priority": "normal",
    "category": "Plumbing",
    "propertyId": "prop_sonoran_ridge",
    "propertyName": "Sonoran Ridge Residences",
    "unitId": "unit_401",
    "unitLabel": "Unit 401",
    "assetId": "asset_range_401",
    "assetNpid": "NP-4R8H2C17",
    "assetName": "GE 30\" Free-Standing Electric Range",
    "assignee": "J. Morales",
    "slaDueAt": "2026-08-14T14:00:00Z",
    "completedAt": "2026-08-14T11:00:00Z",
    "resolution": "De-jammed flywheel, verified amperage draw 4.2A under load.",
    "actualCost": 42.0,
    "partsRequired": [],
    "notesList": [
      {
        "id": "n1028",
        "author": "J. Morales",
        "createdAt": "2026-08-14T11:00:00Z",
        "text": "Tested disposal with cold water flush. Operating normally."
      }
    ]
  },
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
    propertyId: 'prop_scottsdale_vista',
    propertyName: 'Scottsdale Vista Apartments',
    unitId: 'unit_sv_204',
    unitLabel: 'Unit 204',
    assetId: 'asset_dw_402',
    assetNpid: 'NP-8V3Z6K19',
    assetName: 'GE Profile Top Control Dishwasher',
    assignee: 'Unassigned',
    slaDueAt: '2026-09-02T12:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 0,
    partsRequired: ['Float Switch Seal Kit'],
    notesList: [],
  },
  {
    id: 'wo_1039',
    number: 1039,
    title: 'Commercial Chiller — Routine Semi-Annual Diagnostic',
    description: 'Check refrigerant loop suction pressure and oil separator level.',
    status: 'completed',
    priority: 'normal',
    category: 'HVAC',
    propertyId: 'prop_desert_palm',
    propertyName: 'Desert Palm Towers',
    unitId: 'unit_1204',
    unitLabel: 'Unit 1204',
    assetId: 'asset_hvac_1204',
    assetNpid: 'NP-8H1P4Q70',
    assetName: 'Trane TAM9 4-Ton Air Handler',
    assignee: 'K. Tanaka',
    slaDueAt: '2026-08-15T16:00:00Z',
    completedAt: '2026-08-15T15:10:00Z',
    resolution: 'Verified all motor amperages and replaced primary contactor.',
    actualCost: 142.50,
    partsRequired: ['Contactor 2-Pole 30A'],
    notesList: [],
  },
  {
    id: 'wo_1037',
    number: 1037,
    title: 'Smart Climate & Sensor Hub Calibration',
    description: 'Calibrate digital sub-meter temperature sensor bus and update firmware.',
    status: 'assigned',
    priority: 'low',
    category: 'Controls',
    propertyId: 'prop_biltmore_estate',
    propertyName: 'Biltmore Estate Condominiums',
    unitId: 'unit_be_512',
    unitLabel: 'Unit 512',
    assetId: 'asset_hvac_be512',
    assetNpid: 'NP-9B2X4K87',
    assetName: 'Lennox EL16XC1 4-Ton Split System',
    assignee: 'D. Vance',
    slaDueAt: '2026-09-05T18:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 0,
    partsRequired: [],
    notesList: [],
  },
  {
    id: 'wo_1035',
    number: 1035,
    title: 'Dual Evaporator Cold-Wall Sensor Inspection',
    description: 'Verify evaporator thermistor resistance and defrost cycle completion.',
    status: 'open',
    priority: 'high',
    category: 'Appliance',
    propertyId: 'prop_tempe_lakeside',
    propertyName: 'Tempe Lakeside Residences',
    unitId: 'unit_tl_308',
    unitLabel: 'Unit 308',
    assetId: 'asset_fridge_tl308',
    assetNpid: 'NP-4C8V2M66',
    assetName: 'Bosch 800 Series French Door Refrigerator',
    assignee: 'Unassigned',
    slaDueAt: '2026-08-30T14:00:00Z',
    completedAt: null,
    resolution: null,
    actualCost: 0,
    partsRequired: ['Thermistor Sensor Assembly'],
    notesList: [],
  },
  {
    id: 'wo_1038',
    number: 1038,
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

// Persistent state storage for Demo — bump to v2 to flush duplicate wo_1039
const STORAGE_KEY = 'nameplate_hq_workorders_v2';

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

const USER_STORAGE_KEY = 'nameplate_hq_users_v1';
const INITIAL_USERS: MaintenanceUser[] = [
  {
    id: 'mem_morales', userId: 'user_morales', email: 'j.morales@sonoran.example',
    fullName: 'Javier Morales', phone: '(602) 555-0148', userStatus: 'active',
    role: 'lead_tech', employmentType: 'employee', hourlyLaborRate: 68,
    status: 'active', lastSeenAt: '2026-08-29T21:42:00Z', invitedAt: '2026-05-08T14:00:00Z',
    properties: DEMO_PROPERTIES.slice(0, 3).map(({ id, name, code }) => ({ id, name, code })),
  },
  {
    id: 'mem_vance', userId: 'user_vance', email: 'd.vance@sonoran.example',
    fullName: 'Danielle Vance', phone: '(480) 555-0196', userStatus: 'active',
    role: 'technician', employmentType: 'employee', hourlyLaborRate: 58,
    status: 'active', lastSeenAt: '2026-08-29T19:18:00Z', invitedAt: '2026-05-12T15:20:00Z',
    properties: DEMO_PROPERTIES.slice(0, 2).map(({ id, name, code }) => ({ id, name, code })),
  },
  {
    id: 'mem_nguyen', userId: 'user_nguyen', email: 'm.nguyen@sonoran.example',
    fullName: 'Minh Nguyen', phone: '(602) 555-0171', userStatus: 'active',
    role: 'technician', employmentType: 'contractor', hourlyLaborRate: 72,
    status: 'active', lastSeenAt: '2026-08-28T23:06:00Z', invitedAt: '2026-06-03T16:10:00Z',
    properties: DEMO_PROPERTIES.slice(2, 5).map(({ id, name, code }) => ({ id, name, code })),
  },
  {
    id: 'mem_patel', userId: 'user_patel', email: 'r.patel@sonoran.example',
    fullName: 'Rina Patel', phone: null, userStatus: 'invited',
    role: 'technician', employmentType: 'employee', hourlyLaborRate: 56,
    status: 'invited', lastSeenAt: null, invitedAt: '2026-08-29T17:30:00Z',
    properties: DEMO_PROPERTIES.slice(4, 6).map(({ id, name, code }) => ({ id, name, code })),
  },
  {
    id: 'mem_ortiz', userId: 'user_ortiz', email: 'l.ortiz@sonoran.example',
    fullName: 'Luis Ortiz', phone: '(480) 555-0114', userStatus: 'active',
    role: 'viewer', employmentType: 'vendor', hourlyLaborRate: null,
    status: 'revoked', lastSeenAt: '2026-08-12T15:02:00Z', invitedAt: '2026-04-18T13:00:00Z',
    properties: DEMO_PROPERTIES.slice(0, 1).map(({ id, name, code }) => ({ id, name, code })),
  },
];

function getStoredUsers(): MaintenanceUser[] {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    /* use deterministic demo users */
  }
  return [...INITIAL_USERS];
}

let inMemoryUsers = getStoredUsers();

function saveStoredUsers(rows: MaintenanceUser[]) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* demo persistence is best effort */
  }
}

const USER_API_BASE = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function userApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nameplate_access_token');
  const response = await fetch(`${USER_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? `User API request failed (${response.status})`);
  }
  return response.json();
}

const FASTAPI_BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

export type DataSourceStatus = 'checking' | 'live' | 'demo' | 'unavailable';
let dataSourceStatus: DataSourceStatus = 'checking';
let sourceOrganization: Organization | null = null;
let sourceReady: Promise<void> | null = null;
const sourceListeners = new Set<() => void>();

export const getDataSourceStatus = (): DataSourceStatus => dataSourceStatus;
export function subscribeDataSource(listener: () => void): () => void {
  sourceListeners.add(listener);
  return () => { sourceListeners.delete(listener); };
}

function setDataSourceStatus(status: DataSourceStatus) {
  if (dataSourceStatus === status) return;
  dataSourceStatus = status;
  sourceListeners.forEach((listener) => listener());
}

// Select a single source for this session. Never blend sample rows into a
// connected portfolio, or turn a failed server write into a local success.
function resolveDataSource(): Promise<void> {
  if (sourceReady) return sourceReady;
  sourceReady = (async () => {
    try {
      const response = await fetch(`${FASTAPI_BASE}/org`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Portfolio connection failed (${response.status}).`);
      const organization: Organization = await response.json();
      if (!organization?.id || !organization?.name) throw new Error('The portfolio API returned an invalid organization.');
      sourceOrganization = organization;
      setDataSourceStatus('live');
    } catch (error) {
      if (import.meta.env.VITE_API_URL) {
        setDataSourceStatus('unavailable');
        throw error instanceof Error ? error : new Error('Unable to connect to the portfolio API.');
      }
      setDataSourceStatus('demo');
    }
  })().catch((error) => {
    sourceReady = null;
    throw error;
  });
  return sourceReady;
}

async function fastApiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  await resolveDataSource();
  if (dataSourceStatus === 'demo') return null;
  if (endpoint === '/org') return sourceOrganization as T;
  try {
    const res = await fetch(`${FASTAPI_BASE}${endpoint}`, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (res.ok) {
      const result = (await res.json()) as T;
      if (result === null) throw new Error('The portfolio API returned an empty response.');
      setDataSourceStatus('live');
      return result;
    }
    throw new Error(`Unable to ${options?.method && options.method !== 'GET' ? 'save' : 'load'} this record (${res.status}). Please try again.`);
  } catch (error) {
    setDataSourceStatus('unavailable');
    throw error instanceof Error ? error : new Error('Unable to reach the portfolio API. Please try again.');
  }
}

// ================= API Interface =================
export const api = {
  getOrg: async (): Promise<Organization> => {
    const remote = await fastApiFetch<Organization>('/org');
    return remote || DEMO_ORG;
  },

  listProperties: async (_orgId?: string): Promise<Property[]> => {
    const remote = await fastApiFetch<Property[]>('/properties');
    return remote ?? DEMO_PROPERTIES;
  },

  listUsers: async (): Promise<MaintenanceUser[]> => {
    const remote = await fastApiFetch<MaintenanceUser[]>('/users');
    if (remote !== null) return remote;
    if (USER_API_BASE) return userApiRequest<MaintenanceUser[]>('/v1/users');
    return [...inMemoryUsers];
  },

  inviteUser: async (input: InviteMaintenanceUserInput): Promise<MaintenanceUser> => {
    const remote = await fastApiFetch<MaintenanceUser>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (remote) return remote;

    if (USER_API_BASE) {
      return userApiRequest<MaintenanceUser>('/v1/users/invite', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    }
    if (inMemoryUsers.some((row) => row.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('A user with that email already exists.');
    }
    const properties = DEMO_PROPERTIES
      .filter((property) => input.propertyIds.includes(property.id))
      .map(({ id, name, code }) => ({ id, name, code }));
    const created: MaintenanceUser = {
      id: `mem_${Date.now()}`,
      userId: `user_${Date.now()}`,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      userStatus: 'invited',
      role: input.role,
      employmentType: input.employmentType ?? null,
      hourlyLaborRate: input.hourlyLaborRate ?? null,
      status: 'invited',
      lastSeenAt: null,
      invitedAt: new Date().toISOString(),
      properties,
    };
    inMemoryUsers = [created, ...inMemoryUsers];
    saveStoredUsers(inMemoryUsers);
    return created;
  },

  updateUser: async (id: string, input: UpdateMaintenanceUserInput): Promise<MaintenanceUser> => {
    const remote = await fastApiFetch<MaintenanceUser>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (remote) return remote;

    if (USER_API_BASE) {
      return userApiRequest<MaintenanceUser>(`/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    }
    const index = inMemoryUsers.findIndex((row) => row.id === id);
    if (index < 0) throw new Error('Maintenance user not found.');
    const properties = input.propertyIds
      ? DEMO_PROPERTIES
          .filter((property) => input.propertyIds?.includes(property.id))
          .map(({ id, name, code }) => ({ id, name, code }))
      : inMemoryUsers[index].properties;
    const updated = { ...inMemoryUsers[index], ...input, properties };
    inMemoryUsers[index] = updated;
    saveStoredUsers(inMemoryUsers);
    return updated;
  },

  getProperty: async (id: string): Promise<Property> => {
    const remote = await fastApiFetch<Property>(`/properties/${id}`);
    if (remote) return remote;
    const found = DEMO_PROPERTIES.find((p) => p.id === id);
    if (!found) throw new Error('Property not found: ' + id);
    return found;
  },

  listBuildings: async (propId?: string): Promise<Building[]> => {
    const remote = await fastApiFetch<Building[]>(`/buildings${propId ? `?propertyId=${encodeURIComponent(propId)}` : ''}`);
    if (remote !== null) return remote;
    return DEMO_BUILDINGS.filter((b) => !propId || b.propertyId === propId);
  },

  listUnits: async (propId?: string, buildingId?: string): Promise<Unit[]> => {
    if (propId) {
      const remote = await fastApiFetch<Unit[]>(`/properties/${propId}/units`);
      if (remote !== null) {
        return remote.filter((u) => !buildingId || u.buildingId === buildingId);
      }
    }
    return DEMO_UNITS.filter(
      (u) => (!propId || u.propertyId === propId) && (!buildingId || u.buildingId === buildingId),
    ).map(hydrateUnit);
  },

  getUnit: async (id: string): Promise<Unit> => {
    const remote = await fastApiFetch<Unit>(`/units/${encodeURIComponent(id)}`);
    if (remote) return remote;
    const found = DEMO_UNITS.find((u) => u.id === id);
    if (!found) throw new Error('Unit not found: ' + id);
    return hydrateUnit(found);
  },

  listCategories: async (): Promise<AssetCategory[]> => {
    const remote = await fastApiFetch<AssetCategory[]>('/categories');
    return remote ?? DEMO_CATEGORIES;
  },

  listAssets: async (_orgId?: string, params: Record<string, string> = {}): Promise<Asset[]> => {
    const qs = new URLSearchParams(params).toString();
    const remote = await fastApiFetch<Asset[]>(`/assets${qs ? '?' + qs : ''}`);
    if (remote !== null) return remote;

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
    const remote = await fastApiFetch<Asset>(`/assets/${id}`);
    if (remote) return remote;
    const found = DEMO_ASSETS.find((a) => a.id === id || a.npid === id);
    if (!found) throw new Error('Asset not found: ' + id);
    return found;
  },

  lookupAsset: async (code: string, _orgId?: string): Promise<Asset> => {
    const remote = await fastApiFetch<Asset>(`/assets/lookup/${encodeURIComponent(code)}`);
    if (remote) return remote;
    const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const found = DEMO_ASSETS.find((a) => a.npid.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);
    if (!found) throw new Error('Asset not found with code: ' + code);
    return found;
  },

  createAsset: async (newAsset: Partial<Asset>): Promise<Asset> => {
    const remote = await fastApiFetch<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(newAsset),
    });
    if (remote) {
      DEMO_ASSETS.unshift(remote);
      return remote;
    }

    const npid = newAsset.npid || mintNpid();
    const id = newAsset.id || `asset_${npid.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const category = DEMO_CATEGORIES.find((c) => c.id === newAsset.categoryId) || {
      id: newAsset.categoryId || 'cat_hvac',
      key: 'hvac',
      displayName: 'HVAC Equipment',
      defaultUsefulLifeMonths: 120,
      defaultReplacementCost: 4500,
    };
    const prop = DEMO_PROPERTIES.find((p) => p.id === newAsset.currentPropertyId) || null;
    const rawUnit = DEMO_UNITS.find((u) => u.id === newAsset.currentUnitId);
    const unit = rawUnit ? hydrateUnit(rawUnit) : null;

    const item: Asset = {
      id,
      npid,
      categoryId: newAsset.categoryId || 'cat_hvac',
      assetModelId: newAsset.assetModelId || null,
      manufacturerRaw: newAsset.manufacturerRaw || null,
      modelRaw: newAsset.modelRaw || null,
      serialNumber: newAsset.serialNumber || null,
      serialConfidence: newAsset.serialConfidence || 'verified',
      status: newAsset.status || 'active',
      condition: newAsset.condition || 'good',
      currentPropertyId: newAsset.currentPropertyId || null,
      currentUnitId: newAsset.currentUnitId || null,
      currentLocationConfirmedAt: new Date().toISOString(),
      installDate: newAsset.installDate || null,
      manufactureDate: newAsset.manufactureDate || null,
      warrantyExpiresOn: newAsset.warrantyExpiresOn || null,
      purchaseCost: Number(newAsset.purchaseCost || 0),
      expectedLifeMonths: Number(newAsset.expectedLifeMonths || 120),
      lifetimeServiceCost: 0,
      serviceEventCount: 0,
      lastServiceAt: null,
      notes: newAsset.notes || null,
      customFields: newAsset.customFields || {},
      category,
      currentProperty: prop,
      currentUnit: unit,
      partsInstalled: [],
      serviceEvents: [],
    };
    DEMO_ASSETS.unshift(item);
    return item;
  },

  listWorkOrders: async (_orgId?: string, params: Record<string, string> = {}): Promise<WorkOrder[]> => {
    const qs = new URLSearchParams(params).toString();
    const remote = await fastApiFetch<WorkOrder[]>(`/work-orders${qs ? '?' + qs : ''}`);
    if (remote !== null) return remote;
    return [...inMemoryWorkOrders];
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    const remote = await fastApiFetch<WorkOrder>(`/work-orders/${id}`);
    if (remote) return remote;
    const found = inMemoryWorkOrders.find((w) => w.id === id || String(w.number) === id);
    if (!found) throw new Error('Work order not found: ' + id);
    return found;
  },

  updateWorkOrder: async (id: string, patch: Partial<WorkOrder>): Promise<WorkOrder> => {
    const remote = await fastApiFetch<WorkOrder>(`/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    if (remote) return remote;

    const idx = inMemoryWorkOrders.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Work order not found: ' + id);
    const updated = { ...inMemoryWorkOrders[idx], ...patch };
    inMemoryWorkOrders[idx] = updated;
    saveStoredWorkOrders(inMemoryWorkOrders);
    return updated;
  },

  createWorkOrder: async (newWo: Omit<WorkOrder, 'id' | 'number'>): Promise<WorkOrder> => {
    const remote = await fastApiFetch<WorkOrder>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(newWo),
    });
    if (remote) return remote;

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
    const remote = await fastApiFetch<WorkOrder>(`/work-orders/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ author, text: noteText }),
    });
    if (remote) return remote;

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

  listServiceEvents: async (_orgId?: string): Promise<ServiceEvent[]> => {
    const remote = await fastApiFetch<ServiceEvent[]>('/service-events');
    if (remote !== null) return remote;
    return [
    {
        "id": "evt_101",
        "assetId": "asset_hvac_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "maintenance",
        "findings": "Run capacitor tested 41 uF on 45 uF spec. Replaced dual run capacitor.",
        "symptomCodes": [
            "AIRFLOW_LOW"
        ],
        "resolutionCode": "PM_PASSED",
        "laborMinutes": 45,
        "laborRate": 68.0,
        "laborCost": 51.0,
        "partsCost": 38.0,
        "otherCost": 0.0,
        "totalCost": 89.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-10-12T10:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "HK44EA124",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_102",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Contactor points pitted; high resistance causing blower stall.",
        "symptomCodes": [
            "COMPRESSOR_TRIP"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 72.0,
        "laborCost": 108.0,
        "partsCost": 142.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-10-18T14:30:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "HN51KC024",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_103",
        "assetId": "asset_hvac_1204",
        "workOrderId": null,
        "propertyId": "prop_desert_palm",
        "unitId": "unit_1204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Blower motor bearing worn. Replaced 1/2 HP ECM blower motor assembly.",
        "symptomCodes": [
            "MOTOR_NOISE"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 180,
        "laborRate": 72.0,
        "laborCost": 216.0,
        "partsCost": 580.0,
        "otherCost": 0.0,
        "totalCost": 796.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-10-24T11:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "MOT18924",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_104",
        "assetId": "asset_hvac_be512",
        "workOrderId": null,
        "propertyId": "prop_biltmore_estate",
        "unitId": "unit_be_512",
        "technicianId": "mem_patel",
        "eventType": "replacement",
        "findings": "Compressor short to ground after thermal fault. Complete rooftop condenser replacement.",
        "symptomCodes": [
            "HIGH_HEAD_PRESSURE",
            "ELECTRICAL_SHORT"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 300,
        "laborRate": 68.0,
        "laborCost": 340.0,
        "partsCost": 3945.0,
        "otherCost": 0.0,
        "totalCost": 4285.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-10-29T16:00:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "EL16XC1-048",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_105",
        "assetId": "asset_wh_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Upper heating element open circuit. Flushed sediment and installed high-watt element.",
        "symptomCodes": [
            "WATER_HEAT_LOW"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 68.0,
        "laborCost": 136.0,
        "partsCost": 184.0,
        "otherCost": 0.0,
        "totalCost": 320.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-11-06T09:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "SP10868GL",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_106",
        "assetId": "asset_fridge_101",
        "workOrderId": null,
        "propertyId": "prop_camelback_vista",
        "unitId": "unit_101",
        "technicianId": "mem_vance",
        "eventType": "repair",
        "findings": "Evaporator fan motor seized; fresh food compartment warm at 52F.",
        "symptomCodes": [
            "HIGH_TEMP_CABINET"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 58.0,
        "laborCost": 87.0,
        "partsCost": 183.0,
        "otherCost": 0.0,
        "totalCost": 270.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-11-14T13:15:00Z",
        "technician": {
            "id": "tech_vance",
            "user": {
                "fullName": "D. Vance"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "5304523363",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_107",
        "assetId": "asset_hvac_1204",
        "workOrderId": null,
        "propertyId": "prop_desert_palm",
        "unitId": "unit_1204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "Rooftop commercial heat pump compressor burn out. Replaced hermetic scroll compressor and drier.",
        "symptomCodes": [
            "COMPRESSOR_FAIL"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 360,
        "laborRate": 72.0,
        "laborCost": 432.0,
        "partsCost": 3868.0,
        "otherCost": 0.0,
        "totalCost": 4300.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-11-22T15:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "COM11284",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_108",
        "assetId": "asset_dw_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Circulation pump impeller clogged with glass shards and calcification. Replaced pump & seal kit.",
        "symptomCodes": [
            "DRAIN_FAILURE",
            "NOISE_EXCESSIVE"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 68.0,
        "laborCost": 102.0,
        "partsCost": 178.0,
        "otherCost": 0.0,
        "totalCost": 280.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-12-04T11:45:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WD26X23258",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_109",
        "assetId": "asset_range_401",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_401",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Surface infinite switch faulty; right front 8in burner not heating.",
        "symptomCodes": [
            "BURNER_INOPERATIVE"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 92.0,
        "otherCost": 0.0,
        "totalCost": 160.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-12-15T14:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WB24X24991",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_110",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "Complete evaporator coil replacement due to micro-fracture formicary corrosion.",
        "symptomCodes": [
            "REFRIGERANT_LEAK"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 300,
        "laborRate": 72.0,
        "laborCost": 360.0,
        "partsCost": 3850.0,
        "otherCost": 0.0,
        "totalCost": 4210.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2025-12-20T16:30:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "CNPVP3617ALA",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_111",
        "assetId": "asset_washer_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Drain pump drain valve motor intermittent; E03 drain timeout error.",
        "symptomCodes": [
            "DRAIN_RESTRICTED"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 75,
        "laborRate": 68.0,
        "laborCost": 85.0,
        "partsCost": 165.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-01-08T10:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "204313P",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_112",
        "assetId": "asset_dryer_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "maintenance",
        "findings": "Cleaned internal duct lint passage; tested high-limit safety thermostat at 205F.",
        "symptomCodes": [
            "AIRFLOW_RESTRICTED"
        ],
        "resolutionCode": "PM_PASSED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 42.0,
        "otherCost": 0.0,
        "totalCost": 110.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-01-14T11:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "D510708P",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_113",
        "assetId": "asset_fridge_tl308",
        "workOrderId": null,
        "propertyId": "prop_tempe_lakeside",
        "unitId": "unit_tl_308",
        "technicianId": "mem_patel",
        "eventType": "repair",
        "findings": "Inverter control power module failed following voltage spike. Replaced main board.",
        "symptomCodes": [
            "CABINET_WARM",
            "BOARD_FAULT"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 68.0,
        "laborCost": 136.0,
        "partsCost": 374.0,
        "otherCost": 0.0,
        "totalCost": 510.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-01-19T15:20:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "12028514",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_114",
        "assetId": "asset_hvac_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "replacement",
        "findings": "Replaced secondary heat exchanger and variable-speed inducer motor assembly.",
        "symptomCodes": [
            "EXCHANGER_FAULT",
            "INDUCER_SEIZED"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 300,
        "laborRate": 68.0,
        "laborCost": 340.0,
        "partsCost": 3910.0,
        "otherCost": 0.0,
        "totalCost": 4250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-01-26T14:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "343993-701",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_115",
        "assetId": "asset_fridge_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Defrost drain tube frozen solid; water leaking into vegetable crisper drawer.",
        "symptomCodes": [
            "WATER_LEAK_CABINET"
        ],
        "resolutionCode": "CLEARED_RESTORED",
        "laborMinutes": 90,
        "laborRate": 72.0,
        "laborCost": 108.0,
        "partsCost": 72.0,
        "otherCost": 0.0,
        "totalCost": 180.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-02-05T13:40:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "DA61-06796A",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_116",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Thermostat wire severed inside conduit during sheetrock repair. Pulled new 18/8 shielded cable.",
        "symptomCodes": [
            "COMMUNICATION_FAULT"
        ],
        "resolutionCode": "RESOLVED",
        "laborMinutes": 150,
        "laborRate": 72.0,
        "laborCost": 180.0,
        "partsCost": 120.0,
        "otherCost": 0.0,
        "totalCost": 300.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-02-14T11:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "CBL-18-8",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_117",
        "assetId": "asset_hvac_be512",
        "workOrderId": null,
        "propertyId": "prop_biltmore_estate",
        "unitId": "unit_be_512",
        "technicianId": "mem_patel",
        "eventType": "replacement",
        "findings": "Multi-stage digital air handler fan motor and control board replacement.",
        "symptomCodes": [
            "BLOWER_COMM_ERROR"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 300,
        "laborRate": 68.0,
        "laborCost": 340.0,
        "partsCost": 4160.0,
        "otherCost": 0.0,
        "totalCost": 4500.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-02-23T16:00:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "619574-01",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_118",
        "assetId": "asset_wh_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Temperature and pressure relief valve dripping 1.5 gal/hr. Replaced 150 PSI relief valve.",
        "symptomCodes": [
            "TP_VALVE_LEAK"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 82.0,
        "otherCost": 0.0,
        "totalCost": 150.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-03-04T09:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "SP8310",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_119",
        "assetId": "asset_range_401",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_401",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Bake element burnt through at support bracket; no oven heat.",
        "symptomCodes": [
            "NO_BAKE_HEAT"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 112.0,
        "otherCost": 0.0,
        "totalCost": 180.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-03-12T14:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WB44T10010",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_120",
        "assetId": "asset_fridge_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Pantry door gasket torn allowing warm humid air infiltration; ice build-up.",
        "symptomCodes": [
            "DOOR_GASKET_LEAK"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 182.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-03-21T10:45:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "W10830162",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_121",
        "assetId": "asset_hvac_1204",
        "workOrderId": null,
        "propertyId": "prop_desert_palm",
        "unitId": "unit_1204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "Outdoor multi-split condenser fan assembly and inverter drive board replacement.",
        "symptomCodes": [
            "FAN_MOTOR_FAIL"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 360,
        "laborRate": 72.0,
        "laborCost": 432.0,
        "partsCost": 4768.0,
        "otherCost": 0.0,
        "totalCost": 5200.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-03-28T17:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "FAN11482",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_122",
        "assetId": "asset_dw_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Bi-metal thermal fuse blown. Cleaned heating element harness and replaced fuse.",
        "symptomCodes": [
            "NO_POWER_DISPLAY"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 72.0,
        "otherCost": 0.0,
        "totalCost": 140.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-04-03T11:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WD21X10519",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_123",
        "assetId": "asset_fridge_101",
        "workOrderId": null,
        "propertyId": "prop_camelback_vista",
        "unitId": "unit_101",
        "technicianId": "mem_vance",
        "eventType": "repair",
        "findings": "Defrost bi-metal thermostat failed open; coils iced over solid. Steamed coils & replaced thermostat.",
        "symptomCodes": [
            "EVAPORATOR_FROST"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 58.0,
        "laborCost": 116.0,
        "partsCost": 134.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-04-11T13:30:00Z",
        "technician": {
            "id": "tech_vance",
            "user": {
                "fullName": "D. Vance"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "5303918202",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_124",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "maintenance",
        "findings": "Pre-summer 24-point HVAC tune-up; cleaned condenser coils and flushed condensate line.",
        "symptomCodes": [
            "ANNUAL_PM"
        ],
        "resolutionCode": "PM_PASSED",
        "laborMinutes": 90,
        "laborRate": 72.0,
        "laborCost": 108.0,
        "partsCost": 42.0,
        "otherCost": 0.0,
        "totalCost": 150.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-04-18T10:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "CLN-COIL-01",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_125",
        "assetId": "asset_hvac_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "replacement",
        "findings": "Replaced cracked secondary drain pan and auxiliary condensate flood safety float switch.",
        "symptomCodes": [
            "CONDENSATE_OVERFLOW"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 360,
        "laborRate": 68.0,
        "laborCost": 408.0,
        "partsCost": 5392.0,
        "otherCost": 0.0,
        "totalCost": 5800.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-04-26T15:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "PAN-SEC-402",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_126",
        "assetId": "asset_washer_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Door latch lock assembly solenoid failed; door remained locked after cycle end.",
        "symptomCodes": [
            "DOOR_LOCK_JAMMED"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 132.0,
        "otherCost": 0.0,
        "totalCost": 200.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-05-05T09:45:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "805624P",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_127",
        "assetId": "asset_range_401",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_401",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Electronic oven control clock/timer display erratic; buttons unresponsive.",
        "symptomCodes": [
            "CONTROL_BOARD_ERROR"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 68.0,
        "laborCost": 102.0,
        "partsCost": 248.0,
        "otherCost": 0.0,
        "totalCost": 350.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-05-12T14:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WB27X29057",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_128",
        "assetId": "asset_fridge_tl308",
        "workOrderId": null,
        "propertyId": "prop_tempe_lakeside",
        "unitId": "unit_tl_308",
        "technicianId": "mem_patel",
        "eventType": "repair",
        "findings": "Dual evaporator defrost heater element burnt out; freezer compartment frosting.",
        "symptomCodes": [
            "FREEZER_FROST"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 68.0,
        "laborCost": 136.0,
        "partsCost": 264.0,
        "otherCost": 0.0,
        "totalCost": 400.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-05-19T11:00:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "12032049",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_129",
        "assetId": "asset_hvac_be512",
        "workOrderId": null,
        "propertyId": "prop_biltmore_estate",
        "unitId": "unit_be_512",
        "technicianId": "mem_patel",
        "eventType": "replacement",
        "findings": "Full rooftop package dual compressor coil replacement and TXV metering valve overhaul.",
        "symptomCodes": [
            "TXV_RESTRICTION",
            "COIL_LEAK"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 420,
        "laborRate": 68.0,
        "laborCost": 476.0,
        "partsCost": 6424.0,
        "otherCost": 0.0,
        "totalCost": 6900.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-05-27T16:45:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "TXV-LNX-048",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_130",
        "assetId": "asset_hvac_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Phoenix 112F ambient heat: run capacitor expanded. Replaced dual capacitor & hard start kit.",
        "symptomCodes": [
            "AC_BLOWING_WARM"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 75,
        "laborRate": 68.0,
        "laborCost": 85.0,
        "partsCost": 125.0,
        "otherCost": 0.0,
        "totalCost": 210.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-06-03T12:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "CAP-45-5-HS",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_131",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Condenser fan motor seized during afternoon peak. Replaced 1/3 HP motor & blade.",
        "symptomCodes": [
            "CONDENSER_FAN_SEIZED"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 72.0,
        "laborCost": 144.0,
        "partsCost": 286.0,
        "otherCost": 0.0,
        "totalCost": 430.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-06-10T14:30:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "HC39GE237",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_132",
        "assetId": "asset_fridge_402",
        "workOrderId": "wo_1045",
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Dual water inlet solenoid valve cracked at compression fitting; water spraying in tray.",
        "symptomCodes": [
            "WATER_LEAK_SUPPLY"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 68.0,
        "laborCost": 102.0,
        "partsCost": 148.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-06-16T10:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "W10498990",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_133",
        "assetId": "asset_wh_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Lower thermostat tripped high limit. Replaced lower thermostat and heating element.",
        "symptomCodes": [
            "WATER_HEAT_FAULT"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 68.0,
        "laborCost": 102.0,
        "partsCost": 148.0,
        "otherCost": 0.0,
        "totalCost": 250.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-06-22T15:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "SP10869GL",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_134",
        "assetId": "asset_hvac_1204",
        "workOrderId": null,
        "propertyId": "prop_desert_palm",
        "unitId": "unit_1204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "4-ton compressor burned out in 115F heat wave. Emergency crane lift compressor replacement.",
        "symptomCodes": [
            "COMPRESSOR_BURNOUT"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 480,
        "laborRate": 72.0,
        "laborCost": 576.0,
        "partsCost": 8524.0,
        "otherCost": 0.0,
        "totalCost": 9100.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-06-28T18:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "CRANE-COM-4T",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_135",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Condensate trap clogged with biofilm; float switch tripped AC in 114F weather. Cleared & treated.",
        "symptomCodes": [
            "AC_OFFLINE_FLOAT"
        ],
        "resolutionCode": "DRAIN_CLEARED",
        "laborMinutes": 60,
        "laborRate": 72.0,
        "laborCost": 72.0,
        "partsCost": 38.0,
        "otherCost": 0.0,
        "totalCost": 110.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-04T11:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "TRAP-CLR-01",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_136",
        "assetId": "asset_fridge_101",
        "workOrderId": null,
        "propertyId": "prop_camelback_vista",
        "unitId": "unit_101",
        "technicianId": "mem_vance",
        "eventType": "repair",
        "findings": "Start relay and PTC capacitor burnt out. Replaced compressor start device.",
        "symptomCodes": [
            "COMPRESSOR_NOT_STARTING"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 58.0,
        "laborCost": 58.0,
        "partsCost": 92.0,
        "otherCost": 0.0,
        "totalCost": 150.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-10T13:45:00Z",
        "technician": {
            "id": "tech_vance",
            "user": {
                "fullName": "D. Vance"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "241941003",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_137",
        "assetId": "asset_dw_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Water inlet valve solenoid leaking into pan. Replaced water valve assembly.",
        "symptomCodes": [
            "SLOW_FILL_ERROR"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 75,
        "laborRate": 68.0,
        "laborCost": 85.0,
        "partsCost": 115.0,
        "otherCost": 0.0,
        "totalCost": 200.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-16T15:20:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WD15X26140",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_138",
        "assetId": "asset_range_401",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_401",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Right rear 6-inch surface element open circuit; replaced element.",
        "symptomCodes": [
            "ELEMENT_NO_HEAT"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 45,
        "laborRate": 68.0,
        "laborCost": 51.0,
        "partsCost": 69.0,
        "otherCost": 0.0,
        "totalCost": 120.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-21T09:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WB30X24110",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_139",
        "assetId": "asset_washer_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Cold water inlet solenoid valve clogged with hard water deposits. Replaced dual water valve.",
        "symptomCodes": [
            "WATER_FILL_SLOW"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 60,
        "laborRate": 68.0,
        "laborCost": 68.0,
        "partsCost": 112.0,
        "otherCost": 0.0,
        "totalCost": 180.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-25T11:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "204212P",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_140",
        "assetId": "asset_hvac_be512",
        "workOrderId": null,
        "propertyId": "prop_biltmore_estate",
        "unitId": "unit_be_512",
        "technicianId": "mem_patel",
        "eventType": "replacement",
        "findings": "Catastrophic lightning surge hit commercial chiller transformer and variable drive.",
        "symptomCodes": [
            "LIGHTNING_SURGE"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 480,
        "laborRate": 68.0,
        "laborCost": 544.0,
        "partsCost": 10556.0,
        "otherCost": 0.0,
        "totalCost": 11100.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-07-29T17:30:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "VFD-LNX-048",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_1",
        "assetId": "asset_hvac_402",
        "workOrderId": "wo_1048",
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "maintenance",
        "findings": "Run capacitor tested 41 uF on 45 uF spec. Blower amperage 2.8A.",
        "symptomCodes": [
            "AIRFLOW_LOW"
        ],
        "resolutionCode": "PM_PASSED",
        "laborMinutes": 45,
        "laborRate": 65.0,
        "laborCost": 48.75,
        "partsCost": 38.00,
        "otherCost": 0.0,
        "totalCost": 86.75,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-08-20T10:15:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "HK44EA124",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_142",
        "assetId": "asset_fridge_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "repair",
        "findings": "Ice maker ejector arm broken; ice jam in dispenser chute. Replaced complete ice maker.",
        "symptomCodes": [
            "ICE_DISPENSER_JAM"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 72.0,
        "laborCost": 108.0,
        "partsCost": 195.25,
        "otherCost": 0.0,
        "totalCost": 303.25,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-08-11T14:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "DA97-15217D",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_143",
        "assetId": "asset_dryer_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Thermal cut-off fuse blown due to restricted exterior vent hood. Replaced fuse and cleared hood flapper.",
        "symptomCodes": [
            "DRYER_NO_HEAT"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 75,
        "laborRate": 68.0,
        "laborCost": 85.0,
        "partsCost": 75.0,
        "otherCost": 0.0,
        "totalCost": 160.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-08-15T11:30:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "D510708P",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_144",
        "assetId": "asset_wh_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Magnesium sacrificial anode rod completely depleted; replaced with curved aluminum anode.",
        "symptomCodes": [
            "ANODE_DEPLETED"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 120,
        "laborRate": 68.0,
        "laborCost": 136.0,
        "partsCost": 164.0,
        "otherCost": 0.0,
        "totalCost": 300.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-08-22T13:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "SP11526C",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_145",
        "assetId": "asset_hvac_1204",
        "workOrderId": null,
        "propertyId": "prop_desert_palm",
        "unitId": "unit_1204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "Condenser coil fin corrosion resulting in total head pressure overload and coil rupture.",
        "symptomCodes": [
            "COIL_RUPTURE"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 480,
        "laborRate": 72.0,
        "laborCost": 576.0,
        "partsCost": 10024.0,
        "otherCost": 0.0,
        "totalCost": 10600.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-08-27T16:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "COL18920",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_146",
        "assetId": "asset_dw_402",
        "workOrderId": null,
        "propertyId": "prop_sonoran_ridge",
        "unitId": "unit_402",
        "technicianId": "mem_morales",
        "eventType": "repair",
        "findings": "Electronic wash control board relay contact burned; cycle paused mid-wash.",
        "symptomCodes": [
            "CYCLE_STALL"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 90,
        "laborRate": 68.0,
        "laborCost": 102.0,
        "partsCost": 188.0,
        "otherCost": 0.0,
        "totalCost": 290.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-09-01T10:00:00Z",
        "technician": {
            "id": "tech_morales",
            "user": {
                "fullName": "J. Morales"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "WD21X24900",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_147",
        "assetId": "asset_fridge_tl308",
        "workOrderId": null,
        "propertyId": "prop_tempe_lakeside",
        "unitId": "unit_tl_308",
        "technicianId": "mem_patel",
        "eventType": "repair",
        "findings": "Fresh food temperature sensor resistance shifted out of spec; overcooling lettuce drawer.",
        "symptomCodes": [
            "OVERCOOLING_CABINET"
        ],
        "resolutionCode": "PART_REPLACED",
        "laborMinutes": 75,
        "laborRate": 68.0,
        "laborCost": 85.0,
        "partsCost": 95.0,
        "otherCost": 0.0,
        "totalCost": 180.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-09-02T13:30:00Z",
        "technician": {
            "id": "tech_patel",
            "user": {
                "fullName": "R. Patel"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "00611323",
                "action": "replaced"
            }
        ]
    },
    {
        "id": "evt_148",
        "assetId": "asset_hvac_sv204",
        "workOrderId": null,
        "propertyId": "prop_scottsdale_vista",
        "unitId": "unit_sv_204",
        "technicianId": "mem_nguyen",
        "eventType": "replacement",
        "findings": "Outdoor multi-stage heat pump electronic expansion valve and control motherboard overhaul.",
        "symptomCodes": [
            "EEV_STEP_FAIL"
        ],
        "resolutionCode": "ASSET_REPLACED",
        "laborMinutes": 360,
        "laborRate": 72.0,
        "laborCost": 432.0,
        "partsCost": 4768.0,
        "otherCost": 0.0,
        "totalCost": 5200.0,
        "costBorneBy": "owner",
        "isWarrantyClaim": false,
        "occurredAt": "2026-09-03T15:00:00Z",
        "technician": {
            "id": "tech_nguyen",
            "user": {
                "fullName": "M. Nguyen"
            }
        },
        "partUsages": [
            {
                "oemPartNumber": "EEV-CAR-36",
                "action": "replaced"
            }
        ]
    }
  ];
  },
};
