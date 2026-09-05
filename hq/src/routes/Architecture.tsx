import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

type Column = { name: string; type: string; key?: 'pk' | 'fk'; desc?: string };
type Table = { name: string; group: string; columns: Column[]; x: number; y: number };

type Subsystem = {
  id: string;
  name: string;
  tier: 'client' | 'api' | 'storage' | 'worker';
  role: string;
  tech: string;
  network: string;
  guarantees: string;
  details: string[];
};

// Canonical 15-table relational schema matching docs/architecture.md & docs/data-model.md
// Aligned 5-column grid (x: 40, 380, 720, 1060, 1400), 4 row bands (y: 48, 480, 920, 1260).
// Canvas size: 1760 × 1640
const tables: Table[] = [
  // ROW 0: Foundation, Tag physical anchor, Asset hub, Asset Model, Membership
  {
    name: 'organization',
    group: 'Identity',
    x: 40,
    y: 48,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Unique portfolio tenant identifier' },
      { name: 'name', type: 'text', desc: 'Legal entity name' },
      { name: 'slug', type: 'text', desc: 'URL slug, immutable root scope' },
      { name: 'plan', type: 'text', desc: 'Subscription license tier' },
      { name: 'timezone', type: 'text', desc: 'Default portfolio timezone' },
    ],
  },
  {
    name: 'asset_tag',
    group: 'Asset registry',
    x: 380,
    y: 48,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Tag asset record id' },
      { name: 'npid', type: 'text', desc: 'Human-readable plate string (e.g. NP-9824-HVAC)' },
      { name: 'qr_payload', type: 'text', desc: 'Cryptographically signed QR payload URL' },
      { name: 'crypto_salt', type: 'text', desc: 'Hardware tamper-evident signature salt' },
      { name: 'status', type: 'tag_status_t', desc: 'minted, assigned, voided, replaced' },
      { name: 'assigned_asset_id', type: 'uuid', key: 'fk', desc: 'Assigned appliance record' },
      { name: 'minted_at', type: 'timestamp', desc: 'Factory engraving timestamp' },
      { name: 'batch_number', type: 'text', desc: 'Physical anodized aluminum tag batch' },
    ],
  },
  {
    name: 'asset',
    group: 'Asset registry',
    x: 720,
    y: 48,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Primary asset UUID' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Owning organization' },
      { name: 'npid', type: 'text', desc: 'Physical plate identifier' },
      { name: 'category_id', type: 'uuid', key: 'fk', desc: 'Appliance category classification' },
      { name: 'asset_model_id', type: 'uuid', key: 'fk', desc: 'OEM manufacturer catalog link' },
      { name: 'serial_number', type: 'text', desc: 'Manufacturer serial plate number' },
      { name: 'status', type: 'asset_status_t', desc: 'in_service, needs_repair, retired, missing' },
      { name: 'condition', type: 'asset_condition_t', desc: 'excellent, good, fair, poor' },
      { name: 'current_unit_id', type: 'uuid', key: 'fk', desc: 'Current installed unit location' },
      { name: 'purchase_cost', type: 'numeric', desc: 'Acquisition / capitalization cost' },
      { name: 'last_service_at', type: 'timestamp', desc: 'Most recent service event timestamp' },
      { name: 'change_seq', type: 'int8', desc: 'Monotonic sync cursor sequence number' },
    ],
  },
  {
    name: 'asset_model',
    group: 'Asset registry',
    x: 1060,
    y: 48,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Model catalog id' },
      { name: 'manufacturer', type: 'text', desc: 'Carrier, GE, Rheem, Whirlpool, Bosch' },
      { name: 'model_number', type: 'text', desc: 'OEM engineering model code' },
      { name: 'category_id', type: 'uuid', key: 'fk', desc: 'Equipment category' },
      { name: 'display_name', type: 'text', desc: 'Commercial marketing appliance title' },
      { name: 'msrp', type: 'numeric', desc: 'Baseline replacement cost' },
      { name: 'expected_life_months', type: 'int4', desc: 'Useful lifecycle expected amortization' },
      { name: 'verification_status', type: 'text', desc: 'oem_verified, community_crowdsourced' },
    ],
  },
  {
    name: 'membership',
    group: 'Identity',
    x: 1400,
    y: 48,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'User organization membership link' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Tenant scope' },
      { name: 'user_id', type: 'uuid', key: 'fk', desc: 'GoTrue / Supabase auth user' },
      { name: 'role', type: 'role_t', desc: 'portfolio_director, tech_lead, field_tech, viewer' },
      { name: 'status', type: 'membership_status_t', desc: 'active, invited, revoked' },
    ],
  },

  // ROW 1: Custody history, Service Event (The Hub), Work Orders
  {
    name: 'custody_ledger',
    group: 'Asset registry',
    x: 380,
    y: 480,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Custody transfer record' },
      { name: 'asset_id', type: 'uuid', key: 'fk', desc: 'Transferred appliance' },
      { name: 'from_unit_id', type: 'uuid', key: 'fk', desc: 'Origin unit or warehouse' },
      { name: 'to_unit_id', type: 'uuid', key: 'fk', desc: 'Destination unit or turnover staging' },
      { name: 'transferred_by', type: 'uuid', key: 'fk', desc: 'Technician author' },
      { name: 'reason', type: 'text', desc: 'Turnover swap, warranty replacement, staging' },
      { name: 'recorded_at', type: 'timestamp', desc: 'Append-only timestamp' },
    ],
  },
  {
    name: 'service_event',
    group: 'Operations',
    x: 720,
    y: 520,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Canonical service intervention id' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Owning organization' },
      { name: 'asset_id', type: 'uuid', key: 'fk', desc: 'Target appliance' },
      { name: 'work_order_id', type: 'uuid', key: 'fk', desc: 'Parent ticket' },
      { name: 'unit_id', type: 'uuid', key: 'fk', desc: 'Apartment unit location' },
      { name: 'property_id', type: 'uuid', key: 'fk', desc: 'Community property id' },
      { name: 'technician_id', type: 'uuid', key: 'fk', desc: 'Field technician member' },
      { name: 'event_type', type: 'service_event_type_t', desc: 'repair, inspect, install, replace, turn' },
      { name: 'findings', type: 'text', desc: 'Diagnostic observations and remediation' },
      { name: 'total_cost', type: 'numeric', desc: 'Total loaded expense' },
      { name: 'occurred_at', type: 'timestamp', desc: 'Physical execution timestamp' },
      { name: 'change_seq', type: 'int8', desc: 'Sync cursor monotonic sequence' },
    ],
  },
  {
    name: 'work_order',
    group: 'Operations',
    x: 1060,
    y: 460,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Work order ticket id' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Tenant scope' },
      { name: 'property_id', type: 'uuid', key: 'fk', desc: 'Property community' },
      { name: 'number', type: 'int4', desc: 'Sequenced WO ticket number' },
      { name: 'unit_id', type: 'uuid', key: 'fk', desc: 'Unit residence' },
      { name: 'asset_id', type: 'uuid', key: 'fk', desc: 'Attached appliance' },
      { name: 'title', type: 'text', desc: 'Dispatch ticket title' },
      { name: 'priority', type: 'work_order_priority_t', desc: 'emergency, urgent, standard, low' },
      { name: 'status', type: 'work_order_status_t', desc: 'intake, dispatch, in_progress, completed' },
      { name: 'assigned_to', type: 'uuid', key: 'fk', desc: 'Assigned maintenance tech' },
      { name: 'actual_cost', type: 'numeric', desc: 'Cumulative logged expenditure' },
      { name: 'change_seq', type: 'int8', desc: 'Sync cursor' },
    ],
  },
  {
    name: 'turn',
    group: 'Operations',
    x: 1400,
    y: 460,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Unit turnover cycle id' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Tenant scope' },
      { name: 'property_id', type: 'uuid', key: 'fk', desc: 'Community property' },
      { name: 'unit_id', type: 'uuid', key: 'fk', desc: 'Apartment unit being prepared' },
      { name: 'status', type: 'turn_status_t', desc: 'scheduled, walkthrough, punch_list, ready' },
      { name: 'completed_at', type: 'timestamp', desc: 'Ready-to-lease sign-off timestamp' },
    ],
  },

  // ROW 2: Property, Building, Unit, Parts
  {
    name: 'property',
    group: 'Locations',
    x: 40,
    y: 900,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Multi-family community property UUID' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Tenant scope' },
      { name: 'name', type: 'text', desc: 'Sonoran Ridge, Desert Palm, Camelback Vista' },
      { name: 'city', type: 'text', desc: 'City municipality' },
      { name: 'status', type: 'property_status_t', desc: 'active, onboarding, archived' },
      { name: 'unit_count_declared', type: 'int4', desc: 'Declared residential unit capacity' },
      { name: 'change_seq', type: 'int8', desc: 'Sync monotonic sequence' },
    ],
  },
  {
    name: 'building',
    group: 'Locations',
    x: 380,
    y: 900,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Physical building structure' },
      { name: 'property_id', type: 'uuid', key: 'fk', desc: 'Parent property community' },
      { name: 'name', type: 'text', desc: 'Building A, North Tower, Phase 2' },
      { name: 'building_number', type: 'text', desc: 'Architectural building number' },
      { name: 'floors_count', type: 'int4', desc: 'Elevation levels' },
      { name: 'change_seq', type: 'int8', desc: 'Sync cursor' },
    ],
  },
  {
    name: 'unit',
    group: 'Locations',
    x: 720,
    y: 1040,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Individual apartment residence' },
      { name: 'property_id', type: 'uuid', key: 'fk', desc: 'Parent property community' },
      { name: 'building_id', type: 'uuid', key: 'fk', desc: 'Building structure' },
      { name: 'label', type: 'text', desc: 'Door number / unit label (e.g. Unit 304)' },
      { name: 'occupancy_status', type: 'text', desc: 'occupied, vacant_ready, vacant_turn' },
      { name: 'current_turn_id', type: 'uuid', key: 'fk', desc: 'Active turnover cycle' },
      { name: 'change_seq', type: 'int8', desc: 'Sync cursor' },
    ],
  },
  {
    name: 'part',
    group: 'Parts & lineage',
    x: 1060,
    y: 960,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Serialized component item' },
      { name: 'org_id', type: 'uuid', key: 'fk', desc: 'Tenant scope' },
      { name: 'part_catalog_id', type: 'uuid', key: 'fk', desc: 'Part catalog taxonomy' },
      { name: 'source_asset_id', type: 'uuid', key: 'fk', desc: 'Donor appliance if harvested' },
      { name: 'component_type', type: 'component_type_t', desc: 'compressor, motor, control_board, pump' },
      { name: 'status', type: 'part_status_t', desc: 'in_stock, installed, failed, harvested' },
      { name: 'installed_in_asset_id', type: 'uuid', key: 'fk', desc: 'Host appliance where part currently lives' },
    ],
  },

  // ROW 3: Part Usage & Turn Checklist Items
  {
    name: 'part_usage',
    group: 'Parts & lineage',
    x: 1060,
    y: 1280,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Installed part record' },
      { name: 'service_event_id', type: 'uuid', key: 'fk', desc: 'Repair event where part was used' },
      { name: 'asset_id', type: 'uuid', key: 'fk', desc: 'Recipient appliance' },
      { name: 'part_id', type: 'uuid', key: 'fk', desc: 'Part item used' },
      { name: 'action', type: 'text', desc: 'installed, replaced, calibrated' },
      { name: 'total_cost', type: 'numeric', desc: 'Part invoice or inventory value' },
    ],
  },
  {
    name: 'turn_item',
    group: 'Operations',
    x: 1400,
    y: 960,
    columns: [
      { name: 'id', type: 'uuid', key: 'pk', desc: 'Turnover inspection item checklist record' },
      { name: 'turn_id', type: 'uuid', key: 'fk', desc: 'Parent turnover event' },
      { name: 'category_id', type: 'uuid', key: 'fk', desc: 'Appliance category inspected' },
      { name: 'asset_id', type: 'uuid', key: 'fk', desc: 'Scanned appliance' },
      { name: 'condition', type: 'text', desc: 'Operational condition rating' },
      { name: 'action_needed', type: 'text', desc: 'clean, minor_repair, replace' },
      { name: 'passed', type: 'boolean', desc: 'Walkthrough ready checklist approval' },
    ],
  },
];

const relations: [string, string][] = [
  // Physical anchor & asset
  ['asset_tag', 'asset'],
  ['asset', 'organization'],
  ['asset', 'asset_model'],
  ['asset', 'unit'],
  ['custody_ledger', 'asset'],
  ['custody_ledger', 'unit'],
  ['asset_model', 'organization'],

  // Locations hierarchy
  ['property', 'organization'],
  ['building', 'property'],
  ['unit', 'building'],
  ['unit', 'property'],

  // Operations & tickets
  ['work_order', 'property'],
  ['work_order', 'membership'],
  ['work_order', 'unit'],
  ['work_order', 'asset'],
  ['service_event', 'asset'],
  ['service_event', 'work_order'],
  ['service_event', 'unit'],
  ['service_event', 'property'],
  ['service_event', 'membership'],
  ['service_event', 'part_usage'],
  ['turn', 'unit'],
  ['turn', 'property'],
  ['turn_item', 'turn'],
  ['turn_item', 'asset'],

  // Parts lineage
  ['part', 'asset'],
  ['part', 'part_usage'],
];

// Helper to infer FK target table
function getTargetTable(columnName: string): string | null {
  if (columnName === 'org_id') return 'organization';
  if (columnName === 'property_id') return 'property';
  if (columnName === 'building_id') return 'building';
  if (columnName === 'unit_id' || columnName === 'from_unit_id' || columnName === 'to_unit_id' || columnName === 'current_unit_id') return 'unit';
  if (columnName === 'asset_id' || columnName === 'source_asset_id' || columnName === 'installed_in_asset_id' || columnName === 'assigned_asset_id') return 'asset';
  if (columnName === 'asset_model_id') return 'asset_model';
  if (columnName === 'work_order_id') return 'work_order';
  if (columnName === 'service_event_id') return 'service_event';
  if (columnName === 'turn_id' || columnName === 'current_turn_id') return 'turn';
  if (columnName === 'part_id') return 'part';
  if (['technician_id', 'assigned_to', 'transferred_by', 'user_id'].includes(columnName)) return 'membership';
  return null;
}

const cardWidth = 260;
const cardHeight = (table: Table) => 46 + table.columns.length * 24;

// System Topology Subsystems
const SUBSYSTEMS: Subsystem[] = [
  {
    id: 'field',
    name: 'Nameplate Field (Technician Mobile)',
    tier: 'client',
    role: 'Sub-second hardware plate scan, offline walkthrough inspections, outbox mutations',
    tech: 'Flutter (Dart) · iOS & Android Native · Drift (SQLite) Local Mirror',
    network: 'Offline-First · Zero Signal Assumed · Background Opportunistic Drain',
    guarantees: 'Deterministic local commit via UUIDv7 op IDs. Local photos cached on disk until online.',
    details: [
      'Sub-second QR tag scanning via camera pipeline',
      'Drift SQLite database mirroring assigned property assets',
      'Append-only mutation outbox with monotonic sequence verification',
      'Encrypted offline photo queue uploaded via presigned S3 URLs on reconnect',
    ],
  },
  {
    id: 'hq',
    name: 'Nameplate HQ (Command Console)',
    tier: 'client',
    role: 'Portfolio fleet command, SLA ticket dispatch, capital replacement planning, analytics',
    tech: 'React 19 + TypeScript + Vite · REST / JSON Client',
    network: 'Always Online · Per-request REST with JWT GoTrue Auth',
    guarantees: 'Real-time property health scorecards, cross-property cost rollups, interactive architecture visualizer.',
    details: [
      'Live Dispatch Kanban swimlanes with stage advance controls',
      'Cross-property asset registry with CSV roster import/export',
      'Capital repair-vs-replace decision engine based on cumulative maintenance spend',
      'Portfolio SLA compliance countdown timers and notification triggers',
    ],
  },
  {
    id: 'portal',
    name: 'Nameplate Resident (Renter Portal)',
    tier: 'client',
    role: 'Resident QR code scanner, appliance manual & warranty lookup, maintenance ticket intake',
    tech: 'React 19 + Vite · Mobile-Web PWA · QR Camera Stream',
    network: 'Always Online · Mobile Web First',
    guarantees: 'Frictionless tenant ticket intake with immediate NPID appliance linkage.',
    details: [
      'Resident scans Nameplate Tag directly with phone camera',
      'Instant appliance warranty and digital manual access without app install',
      '1-click ticket intake automatically bound to appliance NPID and unit',
    ],
  },
  {
    id: 'api',
    name: 'Nameplate Core API Gateway',
    tier: 'api',
    role: 'Stateless REST gateway, sync delta cursor reconciler, org tenancy GUC enforcement',
    tech: 'NestJS (Node 22, TypeScript) · Fastify HTTP Adapter · Prisma ORM',
    network: 'High-throughput stateless API · JWT Auth Guards · RBAC Scopes',
    guarantees: 'Transactional multi-row consistency. RLS session GUCs (`app.current_org_id`) prevent cross-tenant leaks.',
    details: [
      'Monotonic `/v1/sync/pull` and `/v1/sync/push` delta cursor replication engine',
      'Direct S3 presigned PUT URL generator for diagnostic high-res photos',
      'Strict class-validator DTOs powering auto-generated OpenAPI contracts',
      'Prisma ORM for CRUD; raw SQL CTEs for financial rollups and lifecycle curves',
    ],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL 16 (Relational Engine)',
    tier: 'storage',
    role: 'Canonical system of record, referential integrity, monotonic sequences, append-only ledger',
    tech: 'PostgreSQL 16 Hosted on Supabase · PITR Backups · Row-Level Security',
    network: 'Protected VPC · Connection Pooling via pgBouncer',
    guarantees: 'ACID transactional integrity. Append-only custody ledger and service events prevent historical data rot.',
    details: [
      'Monotonic change_seq sequence for conflict-free cursor delta replication',
      'Row-Level Security (RLS) policies enforcing multi-tenant isolation at engine level',
      'Partial unique indexes enforcing serial number uniqueness per OEM manufacturer',
      'Optimized GROUP BY window functions for portfolio fleet metrics',
    ],
  },
  {
    id: 'storage',
    name: 'Object Storage (S3-Compatible)',
    tier: 'storage',
    role: 'High-resolution repair photography, macro serial plates, turnover condition proof',
    tech: 'Supabase Storage (S3-Compatible) · Global Edge CDN',
    network: 'Signed URL direct PUT from mobile client · Public CDN GET',
    guarantees: 'Encrypted at rest. Eliminates large blob traffic from the core API gateway.',
    details: [
      'Technician photos upload directly from device to S3 via signed token',
      'Macro photographs of model/serial plates stored as unalterable inspection proof',
      'Automatic image optimization and thumbnail delivery for HQ console and mobile feeds',
    ],
  },
  {
    id: 'worker',
    name: 'Async Worker (BullMQ + Redis)',
    tier: 'worker',
    role: 'Overnight shrinkage scans, asset depreciation amortization, webhook dispatch, rollups',
    tech: 'BullMQ · Redis · TypeScript Queue Workers',
    network: 'Internal cluster queue runner · Scheduled cron & event triggers',
    guarantees: 'Guaranteed at-least-once job delivery. Decouples heavy financial rollups from REST API latency.',
    details: [
      'Nightly scan audits flagging unconfirmed asset locations older than 180 days',
      'Automated depreciation calculator updating current asset book value monthly',
      'Linear and Jira two-way ticket synchronization webhook processor',
      'Portfolio SLA escalation alerts dispatched to on-duty field leads',
    ],
  },
];

export function Architecture() {
  const [mode, setMode] = useState<'schema' | 'topology'>('schema');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('service_event');
  const [selectedSubsystem, setSelectedSubsystem] = useState<Subsystem | null>(SUBSYSTEMS[0]);
  const [group, setGroup] = useState('All domains');
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(tables.map((table) => [table.name, { x: table.x, y: table.y }])),
  );
  const [zoom, setZoom] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{ name: string; dx: number; dy: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number; moved: boolean } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const panStateRef = useRef(pan);
  panStateRef.current = pan;
  const zoomStateRef = useRef(zoom);
  zoomStateRef.current = zoom;

  const groups = ['All domains', ...Array.from(new Set(tables.map((table) => table.group)))];

  const visible = useMemo(
    () =>
      tables.filter(
        (table) =>
          (group === 'All domains' || table.group === group) &&
          (!query ||
            table.name.includes(query.toLowerCase()) ||
            table.columns.some((column) => column.name.includes(query.toLowerCase()))),
      ),
    [group, query],
  );

  const visibleNames = useMemo(() => new Set(visible.map((table) => table.name)), [visible]);
  const byName = useMemo(() => new Map(tables.map((table) => [table.name, table])), []);
  const selectedTable = byName.get(selected);

  const clampPan = (x: number, y: number) => ({
    x: Math.min(800, Math.max(-2000, x)),
    y: Math.min(600, Math.max(-2000, y)),
  });

  const centerOnWorldPoint = (worldX: number, worldY: number, nextZoom?: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const z = nextZoom ?? zoomStateRef.current;
    const rect = el.getBoundingClientRect();
    setPan(clampPan(rect.width / 2 - worldX * z, rect.height / 2 - worldY * z));
  };

  const zoomAroundCenter = (nextZoom: number) => {
    const el = canvasRef.current;
    const prevZoom = zoomStateRef.current;
    const clamped = Math.min(1.5, Math.max(0.55, nextZoom));
    if (!el || clamped === prevZoom) {
      setZoom(clamped);
      return;
    }
    const rect = el.getBoundingClientRect();
    const centerWorldX = (rect.width / 2 - panStateRef.current.x) / prevZoom;
    const centerWorldY = (rect.height / 2 - panStateRef.current.y) / prevZoom;
    setZoom(clamped);
    setPan(clampPan(rect.width / 2 - centerWorldX * clamped, rect.height / 2 - centerWorldY * clamped));
  };

  // Smooth jump-to-table navigation (pan the world so the table lands centered)
  const jumpToTable = (targetName: string) => {
    if (!byName.has(targetName)) return;
    setSelected(targetName);
    setDrawerOpen(true);
    const table = byName.get(targetName);
    const pos = positions[targetName];
    if (pos && table) {
      centerOnWorldPoint(pos.x + cardWidth / 2, pos.y + cardHeight(table) / 2);
    }
  };

  // --- Node dragging (per-table, via header handle) ---
  const toWorld = (clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const p = panStateRef.current;
    const z = zoomStateRef.current;
    return { x: (clientX - bounds.left - p.x) / z, y: (clientY - bounds.top - p.y) / z, bounds };
  };

  const moveTable = (event: PointerEvent, name: string) => {
    event.stopPropagation();
    const current = positions[name];
    if (!current) return;
    const w = toWorld(event.clientX, event.clientY);
    if (!w) return;
    dragRef.current = { name, dx: w.x - current.x, dy: w.y - current.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const dragTable = (event: PointerEvent) => {
    if (!dragRef.current) return;
    const w = toWorld(event.clientX, event.clientY);
    if (!w) return;
    const { name, dx, dy } = dragRef.current;
    setPositions((current) => ({
      ...current,
      [name]: { x: Math.max(0, w.x - dx), y: Math.max(0, w.y - dy) },
    }));
  };

  const stopDragging = () => {
    dragRef.current = null;
  };

  // --- Background grab-to-pan (node-tool style) ---
  const startPan = (event: PointerEvent) => {
    if (dragRef.current) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.np-schema-table, .np-schema-zoom, .np-schema-dictionary, .np-schema-legend, .np-schema-minimap, button, input, select, a')) {
      return;
    }
    panRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: panStateRef.current.x,
      panY: panStateRef.current.y,
      moved: false,
    };
    setIsPanning(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePanMove = (event: PointerEvent) => {
    if (dragRef.current) return;
    const ref = panRef.current;
    if (!ref) return;
    const dx = event.clientX - ref.startX;
    const dy = event.clientY - ref.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) ref.moved = true;
    setPan(clampPan(ref.panX + dx, ref.panY + dy));
  };

  const endPan = () => {
    panRef.current = null;
    setIsPanning(false);
  };

  const handleWheelNative = (event: globalThis.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const z = zoomStateRef.current;
      zoomAroundCenter(z - event.deltaY * 0.0015);
    } else {
      event.preventDefault();
      const p = panStateRef.current;
      setPan(clampPan(p.x - event.deltaX, p.y - event.deltaY));
    }
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  const autoLayout = () => {
    const next: Record<string, { x: number; y: number }> = Object.fromEntries(
      tables.map((table) => [table.name, { x: table.x, y: table.y }]),
    );
    setPositions(next);
    setSelected('service_event');
    setDrawerOpen(false);
    setZoom(1);
    zoomStateRef.current = 1;
    requestAnimationFrame(() => {
      const table = byName.get('service_event');
      const pos = next['service_event'];
      if (table && pos) centerOnWorldPoint(pos.x + cardWidth / 2, pos.y + cardHeight(table) / 2, 1);
      else centerOnWorldPoint(880, 820, 1);
    });
  };

  const resetView = () => {
    setZoom(1);
    zoomStateRef.current = 1;
    requestAnimationFrame(() => centerOnWorldPoint(880, 820, 1));
  };

  // Cubic Bezier curve path generator connecting table edges
  const renderBezierCurve = (from: string, to: string) => {
    const a = byName.get(from);
    const b = byName.get(to);
    if (!a || !b || !visibleNames.has(from) || !visibleNames.has(to)) return null;

    const ap = positions[from];
    const bp = positions[to];
    if (!ap || !bp) return null;

    let x1: number;
    let y1: number;
    let x2: number;
    let y2: number;

    const aMidY = ap.y + Math.min(cardHeight(a) / 2, 70);
    const bMidY = bp.y + Math.min(cardHeight(b) / 2, 70);

    if (ap.x + cardWidth + 20 <= bp.x) {
      // a is to the left of b
      x1 = ap.x + cardWidth;
      y1 = aMidY;
      x2 = bp.x;
      y2 = bMidY;
      const dx = Math.max(40, (x2 - x1) * 0.5);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      return d;
    } else if (bp.x + cardWidth + 20 <= ap.x) {
      // b is to the left of a
      x1 = ap.x;
      y1 = aMidY;
      x2 = bp.x + cardWidth;
      y2 = bMidY;
      const dx = Math.max(40, (x1 - x2) * 0.5);
      const d = `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`;
      return d;
    } else {
      // roughly stacked vertically
      x1 = ap.x + cardWidth / 2;
      y1 = ap.y < bp.y ? ap.y + cardHeight(a) : ap.y;
      x2 = bp.x + cardWidth / 2;
      y2 = ap.y < bp.y ? bp.y : bp.y + cardHeight(b);
      const dy = Math.max(40, Math.abs(y2 - y1) * 0.4);
      const d = `M ${x1} ${y1} C ${x1} ${y1 + (ap.y < bp.y ? dy : -dy)}, ${x2} ${y2 - (ap.y < bp.y ? dy : -dy)}, ${x2} ${y2}`;
      return d;
    }
  };

  return (
    <div className="np-architecture-page">
      {/* Top Navigation & Workspace Controls */}
      <div className="np-architecture-toolbar">
        <div className="np-architecture-title">
          <h2>Technical Architecture</h2>
          <div className="np-architecture-modes">
            <button
              type="button"
              className={`np-architecture-mode-btn ${mode === 'schema' ? 'active' : ''}`}
              onClick={() => setMode('schema')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              Data Schema (ERD)
            </button>
            <button
              type="button"
              className={`np-architecture-mode-btn ${mode === 'topology' ? 'active' : ''}`}
              onClick={() => setMode('topology')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v7M12 15v7M2 12h7M15 12h7" />
              </svg>
              System Topology & Sync Flow
            </button>
          </div>
          <span className="np-muted">
            {mode === 'schema'
              ? `${tables.length} tables · ${relations.length} relationships`
              : '4 product surfaces · Offline sync lifecycle'}
          </span>
        </div>

        {mode === 'schema' ? (
          <div className="np-architecture-actions">
            <label className="np-architecture-search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find table or column…"
                aria-label="Search schema"
              />
            </label>
            <select
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              aria-label="Filter domain"
            >
              {groups.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button type="button" className="np-topbar-btn" onClick={autoLayout}>
              Auto layout
            </button>
            <button type="button" className="np-topbar-btn" onClick={resetView}>
              Reset view
            </button>
            <button
              type="button"
              className="np-topbar-btn"
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? 'Hide dictionary' : 'Show dictionary'}
            </button>
          </div>
        ) : (
          <div className="np-architecture-actions">
            <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 700 }}>
              ● Monotonic Sync v1.4 Active
            </span>
          </div>
        )}
      </div>

      {/* VIEW 1: RELATIONAL SCHEMA CANVAS (ERD) */}
      {mode === 'schema' && (
        <div
          className={`np-architecture-canvas${isPanning ? ' is-panning' : ''}`}
          ref={canvasRef}
          onPointerDown={startPan}
          onPointerMove={handlePanMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          style={{ backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px` }}
        >
          <div
            className="np-architecture-world"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
          <svg
            className="np-architecture-lines"
            viewBox="0 0 1760 1640"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {relations.map(([from, to]) => {
              const d = renderBezierCurve(from, to);
              if (!d) return null;
              const isConnected = from === selected || to === selected;
              const isAnySelected = Boolean(selected);
              return (
                <path
                  key={`${from}-${to}`}
                  d={d}
                  className={`${isConnected ? 'is-active' : isAnySelected ? 'is-dimmed' : ''}`}
                />
              );
            })}
          </svg>

          {visible.map((table) => (
            <button
              type="button"
              key={table.name}
              className={`np-schema-table ${selected === table.name ? 'is-selected' : ''} ${table.name === 'service_event' ? 'is-hub' : ''}`}
              style={{
                left: positions[table.name]?.x ?? 40,
                top: positions[table.name]?.y ?? 48,
              }}
              onClick={() => {
                setSelected(table.name);
                setDrawerOpen(true);
              }}
              onPointerMove={dragTable}
              onPointerUp={stopDragging}
            >
              <span
                className="np-schema-table__head"
                onPointerDown={(event) => moveTable(event, table.name)}
              >
                <span className="np-schema-icon">▦</span>
                <strong>{table.name}</strong>
                <small>{table.group}</small>
                <span>⋮</span>
              </span>
              <span className="np-schema-table__columns">
                {table.columns.map((column) => {
                  const fkTarget = column.key === 'fk' ? getTargetTable(column.name) : null;
                  return (
                    <span
                      className={`np-schema-column ${fkTarget ? 'is-clickable-fk' : ''}`}
                      key={column.name}
                      title={fkTarget ? `Foreign key → click to jump to ${fkTarget}` : column.desc}
                      onClick={(e) => {
                        if (fkTarget) {
                          e.stopPropagation();
                          jumpToTable(fkTarget);
                        }
                      }}
                    >
                      <i className={column.key ? `key-${column.key}` : ''}>
                        {column.key === 'pk' ? '◆' : column.key === 'fk' ? '◇' : ''}
                      </i>
                      <b>{column.name}</b>
                      <em>{column.type}</em>
                    </span>
                  );
                })}
              </span>
            </button>
          ))}

          </div>

          <div className="np-schema-pan-hint">
            <span>✥ Drag background to pan · Scroll to move · Ctrl + scroll to zoom · Drag a table header to move it</span>
          </div>

          {/* Canvas Zoom Controls */}
          <div className="np-schema-zoom">
            <button type="button" onClick={() => zoomAroundCenter(zoom + 0.1)}>
              +
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => zoomAroundCenter(zoom - 0.1)}>
              −
            </button>
            <button type="button" onClick={resetView}>
              Reset
            </button>
          </div>

          {/* Data Dictionary Flyout Drawer */}
          {drawerOpen && selectedTable && (
            <aside className="np-schema-dictionary">
              <div className="np-schema-dictionary__head">
                <div>
                  <span className="np-kicker">Data dictionary</span>
                  <h3>{selectedTable.name}</h3>
                  <small>
                    {selectedTable.group} · {selectedTable.columns.length} columns
                  </small>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close drawer">
                  ×
                </button>
              </div>
              <p>Canonical PostgreSQL table contract and referential integrity constraints.</p>
              <div className="np-dictionary-list">
                {selectedTable.columns.map((column) => {
                  const fkTarget = column.key === 'fk' ? getTargetTable(column.name) : null;
                  return (
                    <div
                      className={`np-dictionary-row ${fkTarget ? 'is-clickable-fk' : ''}`}
                      key={column.name}
                      onClick={() => {
                        if (fkTarget) jumpToTable(fkTarget);
                      }}
                      title={fkTarget ? `Jump to table ${fkTarget}` : undefined}
                    >
                      <div>
                        <strong>{column.name}</strong>
                        {column.desc && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--gray-400)', marginTop: 2 }}>
                            {column.desc}
                          </div>
                        )}
                      </div>
                      <span className="mono">{column.type}</span>
                      <small>
                        {column.key === 'pk'
                          ? 'PRIMARY KEY (UUIDv7)'
                          : column.key === 'fk'
                          ? `FOREIGN KEY → ${fkTarget ?? 'table'} (click to jump)`
                          : 'FIELD'}
                      </small>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Legend */}
          <div className="np-schema-legend">
            <span>
              <i className="legend-dot legend-hub" />
              Service Event Hub
            </span>
            <span>
              <i className="legend-dot legend-key" />
              Foreign Key (Click to jump)
            </span>
            <span>
              <i className="legend-line" />
              Bezier Relationship Wire
            </span>
          </div>

          {/* Schema Minimap */}
          <div className="np-schema-minimap">
            <b>SCHEMA MAP</b>
            <span>● {visible.length} of 15 tables visible</span>
            <div className="np-minimap-bars">
              {visible.slice(0, 9).map((table) => (
                <i
                  key={table.name}
                  style={{ width: `${Math.min(92, table.columns.length * 5 + 20)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SYSTEM TOPOLOGY & OFFLINE SYNC BLUEPRINT */}
      {mode === 'topology' && (
        <div className="np-topology-canvas">
          {/* TIER 1: CLIENT SURFACES */}
          <section className="np-topology-tier">
            <div className="np-topology-tier__head">
              <span className="np-topology-tier__title">Tier 1 · Client Surfaces (Technician, Director & Resident)</span>
              <span className="np-topology-tier__sub">Zero-Signal Mobile · React Command Console · Resident QR</span>
            </div>
            <div className="np-topology-cards">
              {SUBSYSTEMS.filter((s) => s.tier === 'client').map((sub) => (
                <div
                  key={sub.id}
                  className={`np-topology-card ${selectedSubsystem?.id === sub.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSubsystem(sub)}
                >
                  <div className="np-topology-card__head">
                    <span className="np-topology-card__icon">
                      {sub.id === 'field' ? '📱' : sub.id === 'hq' ? '🖥️' : '🏠'}
                    </span>
                    <span className="np-topology-card__badge">{sub.network}</span>
                  </div>
                  <h4 className="np-topology-card__title">{sub.name}</h4>
                  <p className="np-topology-card__desc">{sub.role}</p>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
                    {sub.tech}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SYNC BRIDGE 1 */}
          <div className="np-topology-connector">
            <span>▼ UUIDv7 Outbox Replication · /v1/sync/push · Direct S3 Presigned Uploads ▼</span>
          </div>

          {/* TIER 2: EDGE & API GATEWAY */}
          <section className="np-topology-tier">
            <div className="np-topology-tier__head">
              <span className="np-topology-tier__title">Tier 2 · Edge & Application Gateway (NestJS Fastify)</span>
              <span className="np-topology-tier__sub">Stateless REST · JWT GoTrue Auth · Monotonic Sequence Engine</span>
            </div>
            <div className="np-topology-cards">
              {SUBSYSTEMS.filter((s) => s.tier === 'api').map((sub) => (
                <div
                  key={sub.id}
                  className={`np-topology-card ${selectedSubsystem?.id === sub.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSubsystem(sub)}
                >
                  <div className="np-topology-card__head">
                    <span className="np-topology-card__icon">⚡</span>
                    <span className="np-topology-card__badge">{sub.network}</span>
                  </div>
                  <h4 className="np-topology-card__title">{sub.name}</h4>
                  <p className="np-topology-card__desc">{sub.role}</p>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
                    {sub.tech}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SYNC BRIDGE 2 */}
          <div className="np-topology-connector">
            <span>▼ Prisma ORM & Raw SQL CTEs · Monotonic change_seq Cursors · S3 Blob Pointers ▼</span>
          </div>

          {/* TIER 3: STORAGE & DATABASE */}
          <section className="np-topology-tier">
            <div className="np-topology-tier__head">
              <span className="np-topology-tier__title">Tier 3 · Relational Core & Photo Storage</span>
              <span className="np-topology-tier__sub">PostgreSQL 16 on Supabase · RLS Multi-Tenant Isolation</span>
            </div>
            <div className="np-topology-cards">
              {SUBSYSTEMS.filter((s) => s.tier === 'storage').map((sub) => (
                <div
                  key={sub.id}
                  className={`np-topology-card ${selectedSubsystem?.id === sub.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSubsystem(sub)}
                >
                  <div className="np-topology-card__head">
                    <span className="np-topology-card__icon">{sub.id === 'postgres' ? '🐘' : '🗄️'}</span>
                    <span className="np-topology-card__badge">{sub.network}</span>
                  </div>
                  <h4 className="np-topology-card__title">{sub.name}</h4>
                  <p className="np-topology-card__desc">{sub.role}</p>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
                    {sub.tech}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SYNC BRIDGE 3 */}
          <div className="np-topology-connector">
            <span>▼ Redis Queue Triggers · Scheduled Asset Useful Life Amortization ▼</span>
          </div>

          {/* TIER 4: ASYNC WORKERS */}
          <section className="np-topology-tier">
            <div className="np-topology-tier__head">
              <span className="np-topology-tier__title">Tier 4 · Background Async Workers & Analytics Engine</span>
              <span className="np-topology-tier__sub">BullMQ + Redis · Nightly Shrinkage Scans & Capital Amortization</span>
            </div>
            <div className="np-topology-cards">
              {SUBSYSTEMS.filter((s) => s.tier === 'worker').map((sub) => (
                <div
                  key={sub.id}
                  className={`np-topology-card ${selectedSubsystem?.id === sub.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedSubsystem(sub)}
                >
                  <div className="np-topology-card__head">
                    <span className="np-topology-card__icon">⚙️</span>
                    <span className="np-topology-card__badge">{sub.network}</span>
                  </div>
                  <h4 className="np-topology-card__title">{sub.name}</h4>
                  <p className="np-topology-card__desc">{sub.role}</p>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
                    {sub.tech}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Subsystem Details Modal / Drawer */}
          {selectedSubsystem && (
            <div className="np-container-card" style={{ marginTop: 12 }}>
              <div className="np-container-toolbar np-container-toolbar--row">
                <div className="np-container-toolbar__meta">
                  <h3 className="np-container-toolbar__title">{selectedSubsystem.name}</h3>
                  <span className="np-container-toolbar__count">{selectedSubsystem.tier.toUpperCase()} TIER</span>
                </div>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--red)', fontWeight: 700 }}>
                  {selectedSubsystem.tech}
                </span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--white)', lineHeight: 1.5 }}>
                  {selectedSubsystem.role}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 12,
                    background: 'var(--bg-subtle)',
                    padding: 14,
                    borderRadius: 2,
                    border: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--gray-500)', display: 'block' }}>
                      NETWORK CONTRACT
                    </span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--white)' }}>
                      {selectedSubsystem.network}
                    </strong>
                  </div>
                  <div>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--gray-500)', display: 'block' }}>
                      INTEGRITY GUARANTEE
                    </span>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--white)' }}>
                      {selectedSubsystem.guarantees}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--gray-400)', textTransform: 'uppercase' }}>
                    Key Architectural Capabilities
                  </span>
                  <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--gray-300)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    {selectedSubsystem.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
