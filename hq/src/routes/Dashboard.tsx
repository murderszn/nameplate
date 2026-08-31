import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KpiTile } from '../components/KpiTile';
import {
  AreaChart,
  ChartCard,
  DonutChart,
  GroupedBarChart,
  HBarChart,
  Histogram,
} from '../components/charts';
import { api, type Asset, type Property, type ServiceEvent, type WorkOrder } from '../api/client';
import { money, num, statusLabel, yearsOld } from '../lib/format';

const OPEN_STATUSES = ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'];
const FLAGGED_STATUSES = ['unaccounted_for', 'needs_repair', 'in_repair'];
const STATUS_COLORS: Record<string, string> = {
  active: '#ffffff',
  needs_repair: '#eb2b2b',
  in_repair: '#c91f1f',
  unaccounted_for: '#f44343',
  awaiting_parts: '#a3a3a3',
  retired: '#6b6b6b',
  disposed: '#2e2e2e',
  in_storage: '#d4d4d4',
};

/**
 * Portfolio Dashboard — KPI tiles + D3 charts (metrics.md §1) plus
 * property league / at-risk work orders.
 */
export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const [props, assetRows, woRows, evRows] = await Promise.all([
          api.listProperties(org.id),
          api.listAssets(org.id),
          api.listWorkOrders(org.id),
          api.listServiceEvents(org.id),
        ]);
        if (cancelled) return;
        setProperties(props);
        setAssets(assetRows);
        setWorkOrders(woRows);
        setEvents(evRows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveAssets = useMemo(
    () => assets.filter((a) => !['retired', 'disposed'].includes(a.status)),
    [assets],
  );

  const t12Spend = useMemo(() => {
    const cutoff = Date.now() - 365 * 86_400_000;
    return events
      .filter((e) => new Date(e.occurredAt).getTime() >= cutoff && e.costBorneBy !== 'warranty')
      .reduce((s, e) => s + num(e.totalCost), 0);
  }, [events]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const e of events) {
      if (e.costBorneBy === 'warranty') continue;
      const d = new Date(e.occurredAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + num(e.totalCost));
    }
    return [...map.entries()].map(([key, value]) => {
      const [y, m] = key.split('-').map(Number);
      return { date: new Date(y, m, 1), value };
    });
  }, [events]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of liveAssets) {
      const label = a.category?.displayName ?? 'Uncategorized';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [liveAssets]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) map.set(a.status, (map.get(a.status) ?? 0) + 1);
    return [...map.entries()]
      .map(([label, value]) => ({
        label: statusLabel(label),
        value,
        color: STATUS_COLORS[label] ?? '#a3a3a3',
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  const propertyBars = useMemo(() => {
    const spend = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const a of liveAssets) {
      if (a.currentPropertyId) counts.set(a.currentPropertyId, (counts.get(a.currentPropertyId) ?? 0) + 1);
    }
    for (const e of events) {
      if (e.propertyId && e.costBorneBy !== 'warranty') {
        spend.set(e.propertyId, (spend.get(e.propertyId) ?? 0) + num(e.totalCost));
      }
    }
    return properties.map((p) => ({
      label: p.name.replace(' Apartments', '').replace(' Residences', '').replace(' Commons', ''),
      values: { assets: counts.get(p.id) ?? 0, spend: Math.round(spend.get(p.id) ?? 0) },
    }));
  }, [properties, liveAssets, events]);

  const ages = useMemo(
    () =>
      liveAssets
        .map((a) => yearsOld(a.installDate))
        .filter((n): n is number => n != null),
    [liveAssets],
  );

  const flaggedCount = assets.filter((a) => FLAGGED_STATUSES.includes(a.status)).length;
  const openWoCount = workOrders.filter((w) => OPEN_STATUSES.includes(w.status)).length;
  const unconfirmed = assets.filter((a) => {
    if (!a.currentLocationConfirmedAt) return true;
    const days = (Date.now() - new Date(a.currentLocationConfirmedAt).getTime()) / 86_400_000;
    return days > 180;
  }).length;
  const pastLife = liveAssets.filter((a) => {
    const ageMo = (yearsOld(a.installDate) ?? 0) * 12;
    const life = a.expectedLifeMonths ?? a.assetModel?.expectedLifeMonths ?? a.category?.defaultUsefulLifeMonths;
    return life != null && ageMo > life;
  }).length;

  const kpis = [
    { label: 'Assets under management', value: String(liveAssets.length) },
    { label: 'T12 maintenance spend', value: money(t12Spend) },
    { label: 'Open work orders', value: String(openWoCount), accent: openWoCount > 0 ? 'amber' : undefined },
    { label: 'Flagged / missing', value: String(flaggedCount), accent: flaggedCount > 0 ? 'red' : undefined },
    { label: 'Unconfirmed > 180d', value: String(unconfirmed) },
    { label: 'Past expected life', value: String(pastLife), accent: pastLife > 0 ? 'red' : undefined },
  ];

  const woByProperty = new Map<string, number>();
  for (const wo of workOrders) {
    if (OPEN_STATUSES.includes(wo.status)) {
      woByProperty.set(wo.propertyId, (woByProperty.get(wo.propertyId) ?? 0) + 1);
    }
  }
  const assetsByProperty = new Map<string, number>();
  const flaggedByProperty = new Map<string, number>();
  const ageSumByProperty = new Map<string, number>();
  for (const a of assets) {
    if (a.currentPropertyId) {
      assetsByProperty.set(a.currentPropertyId, (assetsByProperty.get(a.currentPropertyId) ?? 0) + 1);
      if (FLAGGED_STATUSES.includes(a.status)) {
        flaggedByProperty.set(a.currentPropertyId, (flaggedByProperty.get(a.currentPropertyId) ?? 0) + 1);
      }
      const age = yearsOld(a.installDate);
      if (age != null) {
        ageSumByProperty.set(a.currentPropertyId, (ageSumByProperty.get(a.currentPropertyId) ?? 0) + age);
      }
    }
  }

  const atRiskWorkOrders = workOrders
    .filter((w) => OPEN_STATUSES.includes(w.status))
    .sort((a, b) => (a.slaDueAt ?? '').localeCompare(b.slaDueAt ?? ''))
    .slice(0, 5);

  const activeWarranties = assets.filter((a) => a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() > Date.now());
  const warrantyRemainingMonthsSum = activeWarranties.reduce((sum, a) => {
    if (!a.warrantyExpiresOn) return sum;
    const months = (new Date(a.warrantyExpiresOn).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    return sum + months;
  }, 0);
  const avgRemainingMonths = activeWarranties.length > 0 ? (warrantyRemainingMonthsSum / activeWarranties.length).toFixed(1) : '0';

  if (loading) return <div className="np-empty-state">Loading portfolio…</div>;
  if (error) {
    return (
      <div className="np-empty-state">
        Couldn't reach the API at the configured backend URL — is
        <code className="mono"> npm run start:dev</code> running in{' '}
        <code className="mono">backend/</code>? ({error})
      </div>
    );
  }

  return (
    <div>
      <div className="np-kpi-grid">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} accent={k.accent as any} />
        ))}
      </div>

      <div className="np-info-strip">
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{liveAssets.length}</span>
          <span className="np-info-strip__lbl">Tracked Assets</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{activeWarranties.length}</span>
          <span className="np-info-strip__lbl">Warranty Active</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{avgRemainingMonths}</span>
          <span className="np-info-strip__lbl">Avg Remaining Mo</span>
        </div>
      </div>

      <div className="np-dash-grid">
        <ChartCard
          wide
          title="Trailing 12-month spend"
          subtitle="Owner-borne service cost by month · warranty excluded"
        >
          <AreaChart data={monthly} valueFormat={(n) => money(n)} />
        </ChartCard>
        <ChartCard title="Status mix" subtitle="Live registry, including retired">
          <DonutChart data={byStatus} />
        </ChartCard>
        <ChartCard title="Assets by category" subtitle="Active + in-service units">
          <HBarChart data={byCategory} valueFormat={(n) => String(n)} />
        </ChartCard>
        <ChartCard title="Property load" subtitle="White: assets · Red: T12 spend ($)">
          <GroupedBarChart
            data={propertyBars}
            series={[
              { key: 'assets', label: 'Assets', color: 'var(--white)' },
              { key: 'spend', label: 'Spend $', color: '#eb2b2b' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Age of installed base" subtitle="Years since install date">
          <Histogram values={ages} xLabel="years" />
        </ChartCard>
      </div>

      <h2 className="np-section-heading">Property league table</h2>
      {properties.length === 0 ? (
        <div className="np-empty-state">No properties in this portfolio yet.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>City / State</th>
              <th>Assets tracked</th>
              <th>Flagged</th>
              <th>Avg age</th>
              <th>Open work orders</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => {
              const count = assetsByProperty.get(p.id) ?? 0;
              const avgAge = count > 0 && ageSumByProperty.has(p.id) ? (ageSumByProperty.get(p.id)! / count).toFixed(1) + ' yrs' : '—';
              return (
                <tr
                  key={p.id}
                  className="np-row-link"
                  onClick={() => navigate(`/properties/${p.id}`)}
                >
                  <td>{p.name}</td>
                  <td>
                    {p.city ?? '—'}
                    {p.state ? `, ${p.state}` : ''}
                  </td>
                  <td>{count}</td>
                  <td>{flaggedByProperty.get(p.id) ?? 0}</td>
                  <td>{avgAge}</td>
                  <td>{woByProperty.get(p.id) ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 className="np-section-heading">At-risk work orders</h2>
      {atRiskWorkOrders.length === 0 ? (
        <div className="np-empty-state">Nothing open right now.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>WO #</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA due</th>
              <th>Days overdue</th>
            </tr>
          </thead>
          <tbody>
            {atRiskWorkOrders.map((w) => {
              const isPastDue = w.slaDueAt && new Date(w.slaDueAt).getTime() < Date.now();
              const daysOverdue = isPastDue ? Math.floor((Date.now() - new Date(w.slaDueAt!).getTime()) / 86400000) : null;
              return (
                <tr key={w.id} style={isPastDue ? { background: 'rgba(235, 43, 43,0.06)' } : undefined}>
                  <td className="mono">WO-{w.number}</td>
                  <td><Link to="/work-orders" className="np-table-link">{w.title} ↗</Link></td>
                  <td>
                    <span className="np-badge">{w.priority.replaceAll('_', ' ')}</span>
                  </td>
                  <td>
                    <span className={`np-badge np-badge--status-${w.status}`}>
                      {w.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td>{w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString() : '—'}</td>
                  <td>{isPastDue && daysOverdue ? daysOverdue : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="np-muted" style={{ marginTop: 28 }}>
        Drill into the{' '}
        <Link to="/assets" style={{ color: 'var(--red)' }}>
          asset registry
        </Link>{' '}
        for plate-level lineage, warranty, and schematics.
      </p>
    </div>
  );
}
