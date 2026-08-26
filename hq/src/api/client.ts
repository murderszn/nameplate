/**
 * Minimal fetch-based API client for Nameplate HQ — no heavy
 * data-fetching library per v0-scope.md scaffold intent. Points at the
 * NestJS backend (default http://localhost:3000, override via
 * VITE_API_URL). This is a V0 demo client: single-tenant, so it
 * bootstraps the (only) seeded Organization once and reuses its id for
 * every subsequent request.
 */

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

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
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  buildingId: string;
  label: string;
}

export interface AssetCategory {
  id: string;
  key: string;
  displayName: string;
}

export interface Asset {
  id: string;
  npid: string;
  categoryId: string;
  assetModelId: string | null;
  manufacturerRaw: string | null;
  modelRaw: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  currentPropertyId: string | null;
  currentUnitId: string | null;
  currentLocationConfirmedAt: string | null;
  installDate: string | null;
  purchaseCost: string | null;
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  propertyId: string;
  unitId: string | null;
  assetId: string | null;
  slaDueAt: string | null;
  completedAt: string | null;
  resolution: string | null;
}

let orgPromise: Promise<Organization> | null = null;

/** Bootstraps the demo org once (single-tenant V0: first org in the DB). */
export function getOrg(): Promise<Organization> {
  if (!orgPromise) {
    orgPromise = getJson<Organization>('/v1/org');
  }
  return orgPromise;
}

export const api = {
  getOrg,

  listProperties: (orgId: string) =>
    getJson<Property[]>(`/v1/properties?orgId=${encodeURIComponent(orgId)}`),

  listBuildings: (orgId: string) =>
    getJson<Building[]>(`/v1/buildings?orgId=${encodeURIComponent(orgId)}`),

  listUnits: (orgId: string) =>
    getJson<Unit[]>(`/v1/units?orgId=${encodeURIComponent(orgId)}`),

  listCategories: () => getJson<AssetCategory[]>(`/v1/asset-models/categories`),

  listAssets: (orgId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ orgId, ...params }).toString();
    return getJson<Asset[]>(`/v1/assets?${qs}`);
  },

  listWorkOrders: (orgId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ orgId, ...params }).toString();
    return getJson<WorkOrder[]>(`/v1/work-orders?${qs}`);
  },
};
