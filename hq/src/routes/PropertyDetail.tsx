import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChartCard, DonutChart, HBarChart } from '../components/charts';
import {
  api,
  type Asset,
  type Building,
  type Property,
  type Unit,
  type WorkOrder,
} from '../api/client';
import { money, num, yearsLabel } from '../lib/format';

const OPEN = ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'];
const FLAGGED = ['unaccounted_for', 'needs_repair', 'in_repair'];
const STATUS_COLORS: Record<string, string> = {
  active: '#ffffff',
  needs_repair: '#ff2a2a',
  in_repair: '#d91d1d',
  unaccounted_for: '#ff4d4d',
  vacant: '#6b6b6b',
  occupied: '#ffffff',
  turning: '#a3a3a3',
};

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const org = await api.getOrg();
        const [prop, bldgs, unitRows, assetRows, woRows] = await Promise.all([
          api.getProperty(id),
          api.listBuildings(id),
          api.listUnits(id),
          api.listAssets(org.id, { propertyId: id }),
          api.listWorkOrders(org.id),
        ]);
        if (cancelled) return;
        setProperty(prop);
        setBuildings(bldgs);
        setUnits(unitRows);
        setAssets(assetRows);
        setWorkOrders(woRows.filter((w) => w.propertyId === id));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const assetsByUnit = useMemo(() => {
    const m = new Map<string, Asset[]>();
    for (const a of assets) {
      if (!a.currentUnitId) continue;
      const list = m.get(a.currentUnitId) ?? [];
      list.push(a);
      m.set(a.currentUnitId, list);
    }
    return m;
  }, [assets]);

  const woByUnit = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of workOrders) {
      if (w.unitId && OPEN.includes(w.status)) m.set(w.unitId, (m.get(w.unitId) ?? 0) + 1);
    }
    return m;
  }, [workOrders]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const label = a.category?.displayName ?? 'Uncategorized';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [assets]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) map.set(a.status, (map.get(a.status) ?? 0) + 1);
    return [...map.entries()]
      .map(([label, value]) => ({
        label: label.replaceAll('_', ' '),
        value,
        color: STATUS_COLORS[label] ?? '#a3a3a3',
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  if (loading) return <div className="np-empty-state">Loading location…</div>;
  if (error || !property) {
    return <div className="np-empty-state">Couldn't load location: {error ?? 'not found'}</div>;
  }

  const flagged = assets.filter((a) => FLAGGED.includes(a.status)).length;
  const openWo = workOrders.filter((w) => OPEN.includes(w.status)).length;
  const capital = assets.reduce((s, a) => s + num(a.purchaseCost), 0);
  const spend = assets.reduce((s, a) => s + num(a.lifetimeServiceCost), 0);
  const gps =
    property.latitude != null && property.longitude != null
      ? `${Number(property.latitude).toFixed(4)}° N, ${Math.abs(Number(property.longitude)).toFixed(4)}° W`
      : null;
  const address = [
    property.addressLine1,
    [property.city, property.state].filter(Boolean).join(', '),
    property.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      <div className="np-toolbar">
        <Link to="/properties" className="np-back">
          ← Portfolio
        </Link>
        <span className="np-badge np-badge--info">{property.code ?? 'LOC'}</span>
      </div>

      <div className="np-loc-hero">
        <div>
          <h2 className="np-plate-title">{property.name}</h2>
          <p className="np-muted">{address || 'Address not on file'}</p>
        </div>
        <span className={`np-badge np-badge--status-${property.status}`}>
          {property.status.replaceAll('_', ' ')}
        </span>
      </div>

      <dl className="np-meta-inline">
        <div>
          <dt>Units declared</dt>
          <dd>{property.unitCountDeclared ?? '—'}</dd>
        </div>
        <div>
          <dt>Year built</dt>
          <dd>{property.yearBuilt ?? '—'}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd className="mono">{property.timezone ?? '—'}</dd>
        </div>
        <div>
          <dt>Geofence</dt>
          <dd>
            {gps ?? '—'}
            {gps ? <span className="np-geopin">Verified</span> : null}
          </dd>
        </div>
      </dl>

      <div className="np-stat-chips">
        <div className="np-stat-box">
          <span className="np-stat-val">{units.length}</span>
          <span className="np-stat-lbl">Units in roster</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{assets.length}</span>
          <span className="np-stat-lbl">Assets tagged</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{openWo}</span>
          <span className="np-stat-lbl">Open work orders</span>
        </div>
        <div className={`np-stat-box${flagged ? ' np-stat-box--red' : ''}`}>
          <span className={`np-stat-val${flagged ? ' red-text' : ''}`}>{flagged}</span>
          <span className="np-stat-lbl">Flagged / unaccounted</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{money(capital)}</span>
          <span className="np-stat-lbl">Capital on plates</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{money(spend)}</span>
          <span className="np-stat-lbl">Lifetime service spend</span>
        </div>
      </div>

      {assets.length > 0 ? (
        <div className="np-dash-grid np-loc-charts">
          <ChartCard title="Status mix" subtitle="Plates currently at this property">
            <DonutChart data={byStatus} />
          </ChartCard>
          <ChartCard title="By category" subtitle="Installed base">
            <HBarChart data={byCategory} valueFormat={(n) => String(n)} />
          </ChartCard>
        </div>
      ) : null}

      <h2 className="np-section-heading">Buildings & units</h2>
      <div className="np-bldg-stack">
        {buildings.map((b) => {
          const bUnits = units.filter((u) => u.buildingId === b.id);
          return (
            <section key={b.id} className="np-bldg-card">
              <header className="np-bldg-card__head">
                <div>
                  <strong>{b.name}</strong>
                  <span className="np-muted mono">
                    {b.code ? ` ${b.code}` : ''}
                    {b.floors ? ` · ${b.floors} floors` : ''}
                  </span>
                </div>
                <span className="np-muted">{bUnits.length} units</span>
              </header>
              <table className="np-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Floor</th>
                    <th>Beds / baths</th>
                    <th>Sq ft</th>
                    <th>Occupancy</th>
                    <th>Assets</th>
                    <th>Open WO</th>
                  </tr>
                </thead>
                <tbody>
                  {bUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="np-empty-state">No units in this building.</div>
                      </td>
                    </tr>
                  ) : (
                    bUnits.map((u) => (
                      <tr
                        key={u.id}
                        className="np-row-link"
                        onClick={() => navigate(`/properties/${property.id}/units/${u.id}`)}
                      >
                        <td className="mono">{u.label}</td>
                        <td>{u.floor ?? '—'}</td>
                        <td>
                          {u.bedrooms ?? '—'} / {u.bathrooms ?? '—'}
                        </td>
                        <td>{u.squareFeet ?? '—'}</td>
                        <td>
                          <span className={`np-badge np-badge--status-${u.occupancyStatus ?? 'active'}`}>
                            {(u.occupancyStatus ?? '—').replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td>{assetsByUnit.get(u.id)?.length ?? 0}</td>
                        <td>{woByUnit.get(u.id) ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <h2 className="np-section-heading">Asset roster</h2>
      {assets.length === 0 ? (
        <div className="np-empty-state">No plates tagged at this property yet.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>NPID</th>
              <th>Category</th>
              <th>Model</th>
              <th>Unit</th>
              <th>Age</th>
              <th>Status</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="np-row-link" onClick={() => navigate(`/assets/${a.id}`)}>
                <td className="mono">{a.npid}</td>
                <td>{a.category?.displayName ?? '—'}</td>
                <td>{[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || '—'}</td>
                <td className="mono">{a.currentUnit?.label ?? '—'}</td>
                <td>{yearsLabel(a.installDate)}</td>
                <td>
                  <span className={`np-badge np-badge--status-${a.status}`}>
                    {a.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td>{money(a.purchaseCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="np-section-heading">Work orders</h2>
      {workOrders.length === 0 ? (
        <div className="np-empty-state">No work orders at this location.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>WO #</th>
              <th>Title</th>
              <th>Unit</th>
              <th>Priority</th>
              <th>Status</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((w) => (
              <tr key={w.id}>
                <td className="mono">WO-{w.number}</td>
                <td>{w.title}</td>
                <td className="mono">{w.unitLabel ?? '—'}</td>
                <td>
                  <span className="np-badge">{w.priority.replaceAll('_', ' ')}</span>
                </td>
                <td>
                  <span className={`np-badge np-badge--status-${w.status}`}>
                    {w.status.replaceAll('_', ' ')}
                  </span>
                </td>
                <td>{w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
