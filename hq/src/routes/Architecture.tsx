import { useMemo, useRef, useState, type PointerEvent } from 'react';

type Column = { name: string; type: string; key?: 'pk' | 'fk' };
type Table = { name: string; group: string; columns: Column[]; x: number; y: number };

// Aligned grid — 5 columns (320px pitch), 4 rows with generous vertical gaps to prevent overlap.
// Canvas 1680×1480. Row 0 y 48, Row 1 (hub) y 480, Row 2 y 900, Row 3 y 1200.
const tables: Table[] = [
  { name: 'organization', group: 'Identity', x: 40, y: 48, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'name', type: 'text' }, { name: 'slug', type: 'text' }, { name: 'plan', type: 'text' }, { name: 'timezone', type: 'text' },
  ] },
  { name: 'asset', group: 'Asset registry', x: 360, y: 48, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'npid', type: 'text' }, { name: 'category_id', type: 'uuid', key: 'fk' }, { name: 'asset_model_id', type: 'uuid', key: 'fk' }, { name: 'serial_number', type: 'text' }, { name: 'status', type: 'asset_status_t' }, { name: 'condition', type: 'asset_condition_t' }, { name: 'current_unit_id', type: 'uuid', key: 'fk' }, { name: 'purchase_cost', type: 'numeric' }, { name: 'last_service_at', type: 'timestamp' }, { name: 'change_seq', type: 'int8' },
  ] },
  { name: 'asset_model', group: 'Asset registry', x: 680, y: 48, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'manufacturer', type: 'text' }, { name: 'model_number', type: 'text' }, { name: 'category_id', type: 'uuid', key: 'fk' }, { name: 'display_name', type: 'text' }, { name: 'msrp', type: 'numeric' }, { name: 'expected_life_months', type: 'int4' }, { name: 'verification_status', type: 'text' },
  ] },
  { name: 'work_order', group: 'Operations', x: 1000, y: 48, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'property_id', type: 'uuid', key: 'fk' }, { name: 'number', type: 'int4' }, { name: 'unit_id', type: 'uuid', key: 'fk' }, { name: 'asset_id', type: 'uuid', key: 'fk' }, { name: 'title', type: 'text' }, { name: 'priority', type: 'work_order_priority_t' }, { name: 'status', type: 'work_order_status_t' }, { name: 'assigned_to', type: 'uuid', key: 'fk' }, { name: 'actual_cost', type: 'numeric' }, { name: 'change_seq', type: 'int8' },
  ] },
  { name: 'membership', group: 'Identity', x: 1320, y: 48, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'user_id', type: 'uuid', key: 'fk' }, { name: 'role', type: 'role_t' }, { name: 'status', type: 'membership_status_t' },
  ] },
  { name: 'service_event', group: 'Operations', x: 680, y: 480, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'asset_id', type: 'uuid', key: 'fk' }, { name: 'work_order_id', type: 'uuid', key: 'fk' }, { name: 'unit_id', type: 'uuid', key: 'fk' }, { name: 'property_id', type: 'uuid', key: 'fk' }, { name: 'technician_id', type: 'uuid', key: 'fk' }, { name: 'event_type', type: 'service_event_type_t' }, { name: 'findings', type: 'text' }, { name: 'total_cost', type: 'numeric' }, { name: 'occurred_at', type: 'timestamp' }, { name: 'change_seq', type: 'int8' },
  ] },
  { name: 'property', group: 'Locations', x: 40, y: 900, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'name', type: 'text' }, { name: 'city', type: 'text' }, { name: 'status', type: 'property_status_t' }, { name: 'unit_count_declared', type: 'int4' }, { name: 'change_seq', type: 'int8' },
  ] },
  { name: 'unit', group: 'Locations', x: 360, y: 900, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'property_id', type: 'uuid', key: 'fk' }, { name: 'building_id', type: 'uuid', key: 'fk' }, { name: 'label', type: 'text' }, { name: 'occupancy_status', type: 'text' }, { name: 'current_turn_id', type: 'uuid', key: 'fk' }, { name: 'change_seq', type: 'int8' },
  ] },
  { name: 'part', group: 'Parts & lineage', x: 1000, y: 900, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'part_catalog_id', type: 'uuid', key: 'fk' }, { name: 'source_asset_id', type: 'uuid', key: 'fk' }, { name: 'component_type', type: 'component_type_t' }, { name: 'status', type: 'part_status_t' }, { name: 'installed_in_asset_id', type: 'uuid', key: 'fk' },
  ] },
  { name: 'turn', group: 'Operations', x: 1320, y: 900, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'org_id', type: 'uuid', key: 'fk' }, { name: 'property_id', type: 'uuid', key: 'fk' }, { name: 'unit_id', type: 'uuid', key: 'fk' }, { name: 'status', type: 'turn_status_t' }, { name: 'completed_at', type: 'timestamp' },
  ] },
  { name: 'part_usage', group: 'Parts & lineage', x: 680, y: 1200, columns: [
    { name: 'id', type: 'uuid', key: 'pk' }, { name: 'service_event_id', type: 'uuid', key: 'fk' }, { name: 'asset_id', type: 'uuid', key: 'fk' }, { name: 'part_id', type: 'uuid', key: 'fk' }, { name: 'action', type: 'text' }, { name: 'total_cost', type: 'numeric' },
  ] },
];

const relations = [
  ['service_event', 'asset'], ['service_event', 'work_order'], ['service_event', 'unit'], ['service_event', 'property'], ['service_event', 'membership'], ['service_event', 'part_usage'],
  ['asset', 'organization'], ['asset', 'asset_model'], ['asset', 'unit'], ['asset_model', 'organization'], ['work_order', 'property'], ['work_order', 'membership'], ['property', 'organization'], ['unit', 'property'], ['part', 'asset'], ['part', 'part_usage'], ['turn', 'unit'], ['turn', 'property'],
];

const cardWidth = 260;
const cardHeight = (table: Table) => 46 + table.columns.length * 24; // 46px header + 24px per row

export function Architecture() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('service_event');
  const [group, setGroup] = useState('All domains');
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => Object.fromEntries(tables.map((table) => [table.name, { x: table.x, y: table.y }])));
  const [zoom, setZoom] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dragRef = useRef<{ name: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const groups = ['All domains', ...Array.from(new Set(tables.map((table) => table.group)))];
  const visible = useMemo(() => tables.filter((table) => (group === 'All domains' || table.group === group) && (!query || table.name.includes(query.toLowerCase()) || table.columns.some((column) => column.name.includes(query.toLowerCase())))), [group, query]);
  const visibleNames = new Set(visible.map((table) => table.name));
  const byName = new Map(tables.map((table) => [table.name, table]));
  const selectedTable = byName.get(selected);
  const moveTable = (event: PointerEvent, name: string) => {
    const current = positions[name];
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = { name, dx: (event.clientX - bounds.left) / zoom - current.x, dy: (event.clientY - bounds.top) / zoom - current.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const dragTable = (event: PointerEvent) => {
    if (!dragRef.current) return;
    const { name, dx, dy } = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPositions((current) => ({ ...current, [name]: { x: Math.max(10, (event.clientX - bounds.left) / zoom - dx), y: Math.max(10, (event.clientY - bounds.top) / zoom - dy) } }));
  };
  const stopDragging = () => { dragRef.current = null; };
  const autoLayout = () => {
    const next: Record<string, { x: number; y: number }> = Object.fromEntries(tables.map((table) => [table.name, { x: table.x, y: table.y }]));
    setPositions(next);
    setSelected('service_event');
    setDrawerOpen(false);
    requestAnimationFrame(() => canvasRef.current?.scrollTo({ left: 560, top: 220, behavior: 'smooth' }));
  };

  return (
    <div className="np-architecture-page">
      <div className="np-architecture-toolbar">
        <div className="np-architecture-title"><h2>Data architecture</h2><span className="np-muted">{tables.length} tables · {relations.length} relationships</span></div>
        <div className="np-architecture-actions"><label className="np-architecture-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find table or column…" /></label><select value={group} onChange={(event) => setGroup(event.target.value)}>{groups.map((item) => <option key={item}>{item}</option>)}</select><button type="button" className="np-topbar-btn" onClick={autoLayout}>Auto layout</button><button type="button" className="np-topbar-btn" onClick={() => setDrawerOpen((open) => !open)}>{drawerOpen ? 'Hide dictionary' : 'Show dictionary'}</button></div>
      </div>
      <div className="np-architecture-canvas" ref={canvasRef}>
        <svg className="np-architecture-lines" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} viewBox="0 0 1680 1480" preserveAspectRatio="none" aria-hidden="true">
          {relations.map(([from, to]) => { const a = byName.get(from); const b = byName.get(to); if (!a || !b || !visibleNames.has(from) || !visibleNames.has(to)) return null; const ap = positions[from]; const bp = positions[to]; const ax = ap.x + cardWidth / 2; const ay = ap.y + cardHeight(a) / 2; const bx = bp.x + cardWidth / 2; const by = bp.y + cardHeight(b) / 2; return <line key={`${from}-${to}`} x1={ax} y1={ay} x2={bx} y2={by} className={from === selected || to === selected ? 'is-active' : ''} />; })}
        </svg>
        {visible.map((table) => <button type="button" key={table.name} className={`np-schema-table ${selected === table.name ? 'is-selected' : ''} ${table.name === 'service_event' ? 'is-hub' : ''}`} style={{ left: positions[table.name].x, top: positions[table.name].y, transform: `scale(${zoom})`, transformOrigin: 'top left' }} onClick={() => { setSelected(table.name); setDrawerOpen(true); }} onPointerMove={dragTable} onPointerUp={stopDragging}>
          <span className="np-schema-table__head" onPointerDown={(event) => moveTable(event, table.name)}><span className="np-schema-icon">▦</span><strong>{table.name}</strong><small>{table.group}</small><span>⋮</span></span>
          <span className="np-schema-table__columns">{table.columns.map((column) => <span className="np-schema-column" key={column.name}><i className={column.key ? `key-${column.key}` : ''}>{column.key === 'pk' ? '◆' : column.key === 'fk' ? '◇' : ''}</i><b>{column.name}</b><em>{column.type}</em></span>)}</span>
        </button>)}
        <div className="np-schema-zoom"><button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}>+</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.max(.55, value - .1))}>−</button><button type="button" onClick={() => setZoom(1)}>Reset</button></div>
        {drawerOpen && selectedTable && <aside className="np-schema-dictionary"><div className="np-schema-dictionary__head"><div><span className="np-kicker">Data dictionary</span><h3>{selectedTable.name}</h3><small>{selectedTable.group} · {selectedTable.columns.length} columns</small></div><button type="button" onClick={() => setDrawerOpen(false)}>×</button></div><p>Canonical entity definition and field-level contract for the Nameplate backend.</p><div className="np-dictionary-list">{selectedTable.columns.map((column) => <div className="np-dictionary-row" key={column.name}><strong>{column.name}</strong><span>{column.type}</span><small>{column.key === 'pk' ? 'PRIMARY KEY' : column.key === 'fk' ? 'FOREIGN KEY' : 'FIELD'}</small></div>)}</div></aside>}
        <div className="np-schema-legend"><span><i className="legend-dot legend-hub" />Selected hub</span><span><i className="legend-dot legend-key" />Foreign key</span><span><i className="legend-line" />Relationship</span></div>
        <div className="np-schema-minimap"><b>SCHEMA MAP</b><span>● {visible.length} visible tables</span><div className="np-minimap-bars">{visible.slice(0, 9).map((table) => <i key={table.name} style={{ width: `${Math.min(92, table.columns.length * 5 + 20)}%` }} />)}</div></div>
      </div>
    </div>
  );
}
