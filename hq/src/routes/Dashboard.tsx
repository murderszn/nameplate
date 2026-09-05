import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Asset, type Property, type ServiceEvent, type WorkOrder } from '../api/client';
import { money, num, statusLabel } from '../lib/format';
import '../styles/dashboard.css';

const OPEN = ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'];
const EXTERNAL = ['tenant', 'warranty', 'insurance'];
const DAY = 86_400_000;
const isLive = (a: Asset) => !['retired', 'disposed'].includes(a.status);
const isUnconfirmed = (a: Asset) => !a.currentLocationConfirmedAt || Date.parse(a.currentLocationConfirmedAt) < Date.now() - 180 * DAY;
const knownAge = (a: Asset) => a.installDate && (a as Asset & { installDateConfidence?: string }).installDateConfidence !== 'unknown' && Number.isFinite(Date.parse(a.installDate)) && Date.parse(a.installDate) <= Date.now();
const pastLife = (a: Asset) => {
  const life = a.expectedLifeMonths ?? a.assetModel?.expectedLifeMonths ?? a.category?.defaultUsefulLifeMonths;
  return knownAge(a) && life != null && (Date.now() - Date.parse(a.installDate!)) / (365.25 * DAY) * 12 > life;
};

function Icon({ name }: { name: 'arrow' | 'building' | 'clock' | 'box' | 'check' | 'download' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === 'building' && <><path d="M4 21V5h10v16M14 10h6v11M2 21h20M8 9h2m-2 4h2m-2 4h2m7-3h1m-1 3h1" /></>}
    {name === 'clock' && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
    {name === 'box' && <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" /></>}
    {name === 'check' && <><path d="m8 12 3 3 5-6" /><circle cx="12" cy="12" r="9" /></>}
    {name === 'download' && <path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" />}
  </svg>;
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [property, setProperty] = useState('all');
  const [months, setMonths] = useState(12);
  const [includeExternal, setIncludeExternal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const org = await api.getOrg();
        const [p, a, w, e] = await Promise.all([api.listProperties(org.id), api.listAssets(org.id), api.listWorkOrders(org.id), api.listServiceEvents(org.id)]);
        if (cancelled) return;
        setProperties(p); setAssets(a); setWorkOrders(w); setEvents(e); setLoadedAt(new Date());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (selectedMonth !== null) detailDialog.current?.showModal();
    else detailDialog.current?.close();
  }, [selectedMonth]);

  const data = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const scopedAssets = assets.filter(a => property === 'all' || a.currentPropertyId === property);
    const live = scopedAssets.filter(isLive);
    const open = workOrders.filter(w => (property === 'all' || w.propertyId === property) && OPEN.includes(w.status) && !w.completedAt);
    const overdue = open.filter(w => w.slaDueAt && Date.parse(w.slaDueAt) < now.getTime());
    const eligible = events.filter(e => !(e as ServiceEvent & { correctedByEventId?: string }).correctedByEventId && (property === 'all' || e.propertyId === property) && Date.parse(e.occurredAt) >= start.getTime() && Date.parse(e.occurredAt) <= now.getTime());
    const costEvents = eligible.filter(e => includeExternal || !EXTERNAL.includes(e.costBorneBy ?? ''));
    const monthly = Array.from({ length: months }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const rows = costEvents.filter(e => e.occurredAt.slice(0, 7) === key);
      return { key, date, value: rows.reduce((s, e) => s + num(e.totalCost), 0), count: rows.length };
    });
    const categories = Array.from(new Set(live.map(a => a.category?.displayName ?? 'Uncategorized'))).map(label => ({ label, count: live.filter(a => (a.category?.displayName ?? 'Uncategorized') === label).length })).sort((a, b) => b.count - a.count);
    return { start, live, open, overdue, costEvents, monthly, categories, spend: costEvents.reduce((s, e) => s + num(e.totalCost), 0), unconfirmed: live.filter(isUnconfirmed), unaccounted: live.filter(a => a.status === 'unaccounted_for'), pastLife: live.filter(pastLife), knownDates: live.filter(knownAge), resolvedModels: live.filter(a => a.assetModelId), serials: live.filter(a => a.serialNumber?.trim()) };
  }, [assets, workOrders, events, property, months, includeExternal]);

  const scopeLink = (route: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ ...(property !== 'all' ? { property } : {}), ...params });
    return `${route}${query.size ? `?${query}` : ''}`;
  };
  const propertyRows = properties.filter(p => property === 'all' || p.id === property).map(p => {
    const rows = data.live.filter(a => a.currentPropertyId === p.id);
    const spend = data.costEvents.filter(e => e.propertyId === p.id).reduce((s, e) => s + num(e.totalCost), 0);
    return { p, count: rows.length, spend, overdue: data.overdue.filter(w => w.propertyId === p.id).length, unconfirmed: rows.filter(isUnconfirmed).length };
  }).sort((a, b) => b.spend - a.spend);
  const maxMonth = Math.max(...data.monthly.map(m => m.value), 1);
  const monthRows = data.costEvents.filter(e => e.occurredAt.slice(0, 7) === selectedMonth);
  const queue = [...data.open].sort((a, b) => (a.slaDueAt ? Date.parse(a.slaDueAt) : Infinity) - (b.slaDueAt ? Date.parse(b.slaDueAt) : Infinity)).slice(0, 4);
  const period = `${data.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  const exportSummary = () => {
    const rows = [['Property', 'Assets under management', `Maintenance spend (${period})`, 'Overdue work orders', 'Locations unconfirmed >180d'], ...propertyRows.map(r => [r.p.name, r.count, r.spend.toFixed(2), r.overdue, r.unconfirmed])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `nameplate-portfolio-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) return <div className="hq-loading" role="status"><div className="hq-loading-mark" /><h2>Opening your portfolio</h2><p>Gathering assets, service costs, and work orders.</p></div>;
  if (error) return <div className="hq-empty" role="alert"><h2>Portfolio data is unavailable</h2><p>{error}</p><button className="hq-button" onClick={() => setRefresh(v => v + 1)}>Try again</button></div>;

  return <div className="hq-page hq-overview">
    <header className="hq-page-header">
      <div><p className="hq-eyebrow">YOUR PORTFOLIO, AT A GLANCE</p><h1 className="hq-page-title">Portfolio overview</h1><p className="hq-page-description">Know what needs attention. Keep every property moving.</p></div>
      <button className="hq-button" onClick={exportSummary}><Icon name="download" /> Export summary</button>
    </header>
    <div className="hq-overview-toolbar">
      <div className="hq-toolbar">
        <label className="hq-filter"><Icon name="building" /><span className="sr-only">Property scope</span><select value={property} onChange={e => setProperty(e.target.value)}><option value="all">All properties</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="hq-filter"><Icon name="clock" /><span className="sr-only">Reporting period</span><select value={months} onChange={e => setMonths(Number(e.target.value))}><option value={12}>Last 12 months</option><option value={6}>Last 6 months</option><option value={3}>Last 3 months</option></select></label>
      </div>
      <span className="hq-updated">Updated {loadedAt?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}<button onClick={() => setRefresh(v => v + 1)} aria-label="Refresh portfolio" title="Refresh portfolio">↻</button></span>
    </div>

    <section className="hq-metric-grid" aria-label="Portfolio key metrics">
      <Link className="hq-metric-card" to={scopeLink('/assets', { focus: 'active' })}><span className="hq-metric-label">Assets under management <Icon name="box" /></span><strong className="hq-metric-value">{data.live.length.toLocaleString()}</strong><span className="hq-metric-footnote">Across {propertyRows.length} {propertyRows.length === 1 ? 'property' : 'properties'} <span>↗</span></span></Link>
      <Link className="hq-metric-card" to={scopeLink('/analytics', { months: String(months), tab: 'cost' })}><span className="hq-metric-label">Maintenance spend <span>$</span></span><strong className="hq-metric-value">{money(data.spend)}</strong><span className="hq-metric-footnote">{months} months · {includeExternal ? 'all payers' : 'owner cost'} <span>↗</span></span></Link>
      <Link className="hq-metric-card" to={scopeLink('/work-orders', { focus: 'open' })}><span className="hq-metric-label">Open work orders <Icon name="clock" /></span><strong className="hq-metric-value">{data.open.length}</strong><span className={`hq-metric-footnote ${data.overdue.length ? 'hq-danger-text' : ''}`}>{data.overdue.length} past SLA due date <span>↗</span></span></Link>
      <Link className="hq-metric-card" to={scopeLink('/assets', { focus: 'unaccounted' })}><span className="hq-metric-label">Unaccounted for <Icon name="box" /></span><strong className="hq-metric-value">{data.unaccounted.length}</strong><span className="hq-metric-footnote">Review location records <span>↗</span></span></Link>
      <div className="hq-metric-card hq-metric-card--unavailable"><span className="hq-metric-label">Turns in progress <Icon name="building" /></span><strong className="hq-metric-value">—</strong><span className="hq-metric-footnote">Turn records not connected</span></div>
      <Link className="hq-metric-card" to={scopeLink('/assets', { focus: 'past-life' })}><span className="hq-metric-label">Past expected life <Icon name="clock" /></span><strong className="hq-metric-value">{data.pastLife.length}</strong><span className="hq-metric-footnote">{data.knownDates.length} with known install dates <span>↗</span></span></Link>
    </section>

    <div className="hq-dashboard-main">
      <section className="hq-card hq-spend-card">
        <div className="hq-card-header"><div><h2 className="hq-card-title">Maintenance spend</h2><p className="hq-card-description">{period} · includes current month to date</p></div><Link className="hq-text-link" to={scopeLink('/analytics', { months: String(months) })}>Explore costs <Icon name="arrow" /></Link></div>
        <div className="hq-spend-total"><strong>{money(data.spend)}</strong><span>{data.costEvents.length} recorded service events</span></div>
        <div className="hq-spend-chart" aria-label="Monthly maintenance cost; select a month to inspect service events">
          <div className="hq-spend-axis"><span>{money(maxMonth)}</span><span>{money(maxMonth / 2)}</span><span>$0</span></div>
          <div className="hq-spend-plot">{data.monthly.map(m => <button key={m.key} className="hq-month" onClick={() => setSelectedMonth(m.key)} aria-label={`${m.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}: ${money(m.value)}, ${m.count} service events`}><span className="hq-month-track"><span className={`hq-month-bar ${m.count === 0 ? 'hq-month-bar--empty' : ''}`} style={{ height: `${Math.max(m.value / maxMonth * 100, m.count ? 2 : 0)}%` }} /><span className="hq-month-tooltip">{money(m.value)}<small>{m.count} events</small></span></span><span className="hq-month-label">{m.date.toLocaleDateString('en-US', { month: 'short' })}</span></button>)}</div>
        </div>
        <div className="hq-chart-footer"><span><i className="hq-chart-dot" /> {includeExternal ? 'All recorded costs' : 'Owner maintenance costs'}</span><label><input type="checkbox" checked={includeExternal} onChange={e => setIncludeExternal(e.target.checked)} /> Include other payers</label></div>
      </section>

      <section className="hq-card hq-attention-card"><div className="hq-card-header"><div><p className="hq-eyebrow">NEXT UP</p><h2 className="hq-card-title">Needs attention</h2></div><span className="hq-attention-heading-icon"><Icon name="clock" /></span></div>
        <Link className="hq-attention-item" to={scopeLink('/work-orders', { focus: 'overdue' })}><span className="hq-attention-icon hq-attention-icon--danger"><Icon name="clock" /></span><span className="hq-attention-copy"><strong>Work orders overdue</strong><small>Past the committed SLA date</small></span><strong className="hq-attention-count">{data.overdue.length}</strong><span>›</span></Link>
        <Link className="hq-attention-item" to={scopeLink('/assets', { focus: 'unconfirmed' })}><span className="hq-attention-icon hq-attention-icon--warning"><Icon name="box" /></span><span className="hq-attention-copy"><strong>Locations to confirm</strong><small>No confirmation in 180 days</small></span><strong className="hq-attention-count">{data.unconfirmed.length}</strong><span>›</span></Link>
        <Link className="hq-attention-item" to={scopeLink('/assets', { focus: 'past-life' })}><span className="hq-attention-icon"><Icon name="building" /></span><span className="hq-attention-copy"><strong>Replacement review</strong><small>Assets past expected useful life</small></span><strong className="hq-attention-count">{data.pastLife.length}</strong><span>›</span></Link>
        <div className="hq-attention-note"><Icon name="check" /><p>Start with overdue work. Confirm location records before taking action.</p></div>
      </section>
    </div>

    <div className="hq-dashboard-bottom">
      <section className="hq-card"><div className="hq-card-header"><div><h2 className="hq-card-title">Property performance</h2><p className="hq-card-description">Compare spend and open issues across your portfolio.</p></div><Link className="hq-text-link" to="/properties">All properties <Icon name="arrow" /></Link></div>
        <div className="hq-table-wrap"><table className="np-table hq-overview-table"><thead><tr><th>Property</th><th>Assets</th><th>Spend / unit / mo.</th><th>Overdue</th></tr></thead><tbody>{propertyRows.map(({ p, count, spend, overdue }) => <tr key={p.id}><td><Link to={`/properties/${p.id}`} className="hq-property-name"><span className="hq-property-avatar"><Icon name="building" /></span><span><strong>{p.name}</strong><small>{[p.city, p.state].filter(Boolean).join(', ') || 'Location not recorded'} · {p.unitCountDeclared ?? '—'} units</small></span></Link></td><td>{count}</td><td><Link title="Explore maintenance costs" to={`/analytics?property=${encodeURIComponent(p.id)}&months=${months}`}>{p.unitCountDeclared && p.unitCountDeclared > 0 ? money(spend / p.unitCountDeclared / months, 2) : '—'}</Link></td><td><Link className={`hq-status ${overdue ? 'hq-status--danger' : 'hq-status--good'}`} to={`/work-orders?property=${encodeURIComponent(p.id)}&focus=overdue`}>{overdue ? `${overdue} overdue` : 'None overdue'}</Link></td></tr>)}</tbody></table>{!propertyRows.length && <div className="hq-empty">No properties to display.</div>}</div>
        <p className="hq-card-footnote">Owner-cost rules follow the payer filter above. Monthly averages include the current partial month.</p>
      </section>
      <section className="hq-card"><div className="hq-card-header"><div><h2 className="hq-card-title">Work order queue</h2><p className="hq-card-description">Open work, ordered by SLA due date.</p></div><Link className="hq-text-link" to={scopeLink('/work-orders', { focus: 'open' })}>View all <Icon name="arrow" /></Link></div><div className="hq-work-queue">{queue.map(w => <Link key={w.id} to={scopeLink('/work-orders', { wo: w.id })} className="hq-queue-item"><span className={`hq-queue-dot ${w.slaDueAt && Date.parse(w.slaDueAt) < Date.now() ? 'hq-queue-dot--danger' : ''}`} /><span className="hq-queue-content"><span className="hq-queue-meta"><span className="mono">WO-{w.number}</span><span>{statusLabel(w.priority)}</span></span><strong>{w.title}</strong><small>{properties.find(p => p.id === w.propertyId)?.name ?? 'Property not recorded'}</small></span><span className="hq-queue-due">{w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}<span>›</span></span></Link>)}{!queue.length && <div className="hq-empty"><Icon name="check" /><p>No open work orders in this scope.</p></div>}</div></section>
    </div>

    <div className="hq-dashboard-bottom hq-dashboard-bottom--equal">
      <section className="hq-card"><div className="hq-card-header"><div><h2 className="hq-card-title">Assets by category</h2><p className="hq-card-description">{data.live.length} assets currently under management</p></div><Link className="hq-text-link" to={scopeLink('/assets', { focus: 'active' })}>Open registry <Icon name="arrow" /></Link></div><div className="hq-category-list">{data.categories.slice(0, 6).map(c => <Link key={c.label} to={scopeLink('/assets', { focus: 'active', category: c.label })} className="hq-category-row"><span>{c.label}</span><div className="hq-category-track"><i style={{ width: `${c.count / (data.live.length || 1) * 100}%` }} /></div><strong>{c.count}</strong></Link>)}{!data.categories.length && <div className="hq-empty">No active assets in this scope.</div>}</div></section>
      <section className="hq-card"><div className="hq-card-header"><div><h2 className="hq-card-title">Trust starts with complete records</h2><p className="hq-card-description">Coverage of assets under management</p></div><Link className="hq-text-link" to={scopeLink('/analytics', { tab: 'coverage' })}>Review data <Icon name="arrow" /></Link></div><div className="hq-coverage-list">{[{ label: 'Model identified', value: data.resolvedModels.length }, { label: 'Install date recorded', value: data.knownDates.length }, { label: 'Serial number recorded', value: data.serials.length }].map(c => <div key={c.label} className="hq-coverage-row"><div><span>{c.label}</span><strong>{data.live.length ? Math.round(c.value / data.live.length * 100) : 0}% <small>{c.value} / {data.live.length}</small></strong></div><div className="hq-coverage-track"><i style={{ width: `${c.value / (data.live.length || 1) * 100}%` }} /></div></div>)}</div><p className="hq-card-footnote">Age metrics exclude unknown installation dates. Scan verification is not yet available in this data feed.</p></section>
    </div>
    <footer className="hq-data-note">Calculated from asset, service event, and work order records. Costs stay with the property where service occurred. <Link to={scopeLink('/analytics')}>See metric definitions ↗</Link></footer>

    <dialog ref={detailDialog} className="hq-event-dialog" onCancel={() => setSelectedMonth(null)} onClose={() => setSelectedMonth(null)}><header className="hq-card-header"><div><p className="hq-eyebrow">SERVICE EVENT RECORDS</p><h2 className="hq-card-title">{selectedMonth && new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><p className="hq-card-description">{monthRows.length} events · {money(monthRows.reduce((s, e) => s + num(e.totalCost), 0))}</p></div><button className="hq-button" onClick={() => setSelectedMonth(null)} autoFocus aria-label="Close service event details">✕</button></header><div className="hq-table-wrap"><table className="np-table"><thead><tr><th>Date</th><th>Asset / service</th><th>Paid by</th><th>Cost</th></tr></thead><tbody>{monthRows.map(e => <tr key={e.id}><td>{new Date(e.occurredAt).toLocaleDateString()}</td><td><Link className="hq-text-link" to={`/assets/${e.assetId}`}>{assets.find(a => a.id === e.assetId)?.npid ?? e.assetId}</Link><small className="hq-event-type">{statusLabel(e.eventType)}</small></td><td>{statusLabel(e.costBorneBy ?? 'not specified')}</td><td>{money(e.totalCost, 2)}</td></tr>)}</tbody></table>{!monthRows.length && <p className="hq-empty">No service events recorded for this month and scope.</p>}</div><p className="hq-card-footnote">{includeExternal ? 'All payers included.' : 'Tenant, warranty, and insurance costs excluded.'} Corrected events excluded when identified.</p></dialog>
  </div>;
}
