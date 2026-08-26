import { useEffect, useState } from 'react';
import { KpiTile } from '../components/KpiTile';
import { api, type Asset, type Property, type WorkOrder } from '../api/client';

const OPEN_STATUSES = ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'];
const FLAGGED_STATUSES = ['unaccounted_for', 'needs_repair', 'in_repair'];

/**
 * Portfolio Dashboard — top-level KPI tiles + property league table +
 * at-risk work orders, per v0-scope.md §1.2 and metrics.md §1. Wired to
 * the live backend (GET /v1/properties, /v1/assets, /v1/work-orders);
 * a dedicated /v1/reports/portfolio-summary rollup is future work — for
 * this demo the tiles are computed client-side from the same lists the
 * Properties/Assets/Work Orders pages already fetch.
 */
export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const [props, assetRows, woRows] = await Promise.all([
          api.listProperties(org.id),
          api.listAssets(org.id),
          api.listWorkOrders(org.id),
        ]);
        if (cancelled) return;
        setProperties(props);
        setAssets(assetRows);
        setWorkOrders(woRows);
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

  if (loading) {
    return <div className="np-empty-state">Loading portfolio…</div>;
  }
  if (error) {
    return (
      <div className="np-empty-state">
        Couldn't reach the API at the configured backend URL — is
        <code className="mono"> npm run start:dev</code> running in{' '}
        <code className="mono">backend/</code>? ({error})
      </div>
    );
  }

  const flaggedCount = assets.filter((a) => FLAGGED_STATUSES.includes(a.status)).length;
  const openWoCount = workOrders.filter((w) => OPEN_STATUSES.includes(w.status)).length;
  const unconfirmed = assets.filter((a) => {
    if (!a.currentLocationConfirmedAt) return true;
    const days = (Date.now() - new Date(a.currentLocationConfirmedAt).getTime()) / 86_400_000;
    return days > 180;
  }).length;

  const kpis = [
    { label: 'Assets tracked', value: String(assets.length) },
    { label: 'Properties', value: String(properties.length) },
    { label: 'Open work orders', value: String(openWoCount) },
    { label: 'Flagged / missing assets', value: String(flaggedCount) },
    { label: 'Unconfirmed > 180d', value: String(unconfirmed) },
    {
      label: 'Data completeness',
      value: assets.length
        ? `${Math.round(
            (assets.filter((a) => a.manufacturerRaw || a.modelRaw).length / assets.length) * 100,
          )}%`
        : '—',
    },
  ];

  const woByProperty = new Map<string, number>();
  for (const wo of workOrders) {
    if (OPEN_STATUSES.includes(wo.status)) {
      woByProperty.set(wo.propertyId, (woByProperty.get(wo.propertyId) ?? 0) + 1);
    }
  }
  const assetsByProperty = new Map<string, number>();
  for (const a of assets) {
    if (a.currentPropertyId) {
      assetsByProperty.set(a.currentPropertyId, (assetsByProperty.get(a.currentPropertyId) ?? 0) + 1);
    }
  }

  const atRiskWorkOrders = workOrders
    .filter((w) => OPEN_STATUSES.includes(w.status))
    .sort((a, b) => (a.slaDueAt ?? '').localeCompare(b.slaDueAt ?? ''))
    .slice(0, 5);

  return (
    <div>
      <div className="np-kpi-grid">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: 12 }}>Property league table</h2>
      {properties.length === 0 ? (
        <div className="np-empty-state">No properties in this portfolio yet.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>City / State</th>
              <th>Assets tracked</th>
              <th>Open work orders</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  {p.city ?? '—'}
                  {p.state ? `, ${p.state}` : ''}
                </td>
                <td>{assetsByProperty.get(p.id) ?? 0}</td>
                <td>{woByProperty.get(p.id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: '1rem', margin: '24px 0 12px' }}>At-risk work orders</h2>
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
            </tr>
          </thead>
          <tbody>
            {atRiskWorkOrders.map((w) => (
              <tr key={w.id}>
                <td>WO-{w.number}</td>
                <td>{w.title}</td>
                <td>{w.priority}</td>
                <td>{w.status}</td>
                <td>{w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
