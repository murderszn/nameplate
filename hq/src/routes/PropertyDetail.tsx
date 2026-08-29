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
import { money, num, yearsLabel, yearsOld } from '../lib/format';

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

  const flaggedByUnit = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets) {
      if (a.currentUnitId && FLAGGED.includes(a.status)) {
        m.set(a.currentUnitId, (m.get(a.currentUnitId) ?? 0) + 1);
      }
    }
    return m;
  }, [assets]);

  const activeWarranties = assets.filter((a) => a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() > Date.now());
  const expiredWarranties = assets.filter((a) => a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() <= Date.now());
  
  const totalAgeMonths = assets.reduce((s, a) => {
    const y = num(yearsOld(a.installDate));
    return s + (y * 12);
  }, 0);
  const avgAgeYears = assets.length > 0 ? (totalAgeMonths / 12 / assets.length).toFixed(1) + ' yrs' : '—';

  if (loading) return <div className="np-empty-state">Loading location…</div>;
  if (error || !property) {
    return <div className="np-empty-state">Couldn't load location: {error ?? 'not found'}</div>;
  }

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

  const imgKey = property.code ? property.code.toLowerCase().replace('-', '_') : 'sonoran_ridge';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="np-toolbar">
        <Link to="/properties" className="np-back">
          ← Back to Properties
        </Link>
        <span className="np-badge np-badge--info">{property.code ?? 'LOC'}</span>
      </div>

      {/* Property Hero Banner with Architecture Photo */}
      <div
        style={{
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#0d0d0d',
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 24,
        }}
      >
        <img
          src={`./images/properties/${imgKey}.jpg`}
          alt={property.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.38) contrast(1.1)',
          }}
          onError={(e) => {
            e.currentTarget.src = './images/properties/sonoran_ridge.jpg';
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span className="np-badge mono">{property.code ?? 'LOC'}</span>
              <span className={`np-badge np-badge--status-${property.status}`}>
                {property.status.replaceAll('_', ' ')}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {property.name}
            </h1>
            <p style={{ color: '#ccc', margin: 0, fontSize: '0.88rem' }}>
              📍 {address || 'Maricopa County, AZ'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '8px 14px', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{units.length}</div>
              <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase' }}>Units</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{assets.length}</div>
              <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase' }}>Plates</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#ff4d4d' }}>{openWo}</div>
              <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase' }}>Open Orders</div>
            </div>
          </div>
        </div>
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

      <div className="np-info-strip">
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{activeWarranties.length}</span>
          <span className="np-info-strip__lbl">Warranty Active</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{expiredWarranties.length}</span>
          <span className="np-info-strip__lbl">Warranty Expired</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{avgAgeYears}</span>
          <span className="np-info-strip__lbl">Avg Asset Age</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{money(capital)}</span>
          <span className="np-info-strip__lbl">Capital Deployed</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{money(spend)}</span>
          <span className="np-info-strip__lbl">Lifetime Spend</span>
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

      <h2 className="np-section-heading" style={{ borderLeft: '2px solid var(--red)', paddingLeft: 10 }}>Buildings & units</h2>
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
                    <th>Health</th>
                    <th>Capital</th>
                    <th>Assets</th>
                    <th>Open WO</th>
                  </tr>
                </thead>
                <tbody>
                  {bUnits.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="np-empty-state">No units in this building.</div>
                      </td>
                    </tr>
                  ) : (
                    bUnits.map((u) => {
                      const uAssets = assetsByUnit.get(u.id) ?? [];
                      const uFlagged = flaggedByUnit.get(u.id) ?? 0;
                      const uWo = woByUnit.get(u.id) ?? 0;
                      const uCapital = uAssets.reduce((s, a) => s + num(a.purchaseCost), 0);
                      const healthColor = uFlagged > 0 ? 'red' : uWo > 0 ? 'amber' : 'green';
                      return (
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
                          <td><span className={`np-health-dot np-health-dot--${healthColor}`} /></td>
                          <td>{money(uCapital)}</td>
                          <td>{uAssets.length}</td>
                          <td>{uWo}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <h2 className="np-section-heading" style={{ borderLeft: '2px solid var(--red)', paddingLeft: 10 }}>Asset roster</h2>
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
              <th>Warranty</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const expectedLifeMonths = a.expectedLifeMonths ?? a.assetModel?.expectedLifeMonths ?? a.category?.defaultUsefulLifeMonths;
              const ageMonths = num(yearsOld(a.installDate)) * 12;
              const pastLife = expectedLifeMonths && ageMonths > expectedLifeMonths;
              const activeWarranty = a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() > Date.now();
              return (
                <tr key={a.id} className="np-row-link" onClick={() => navigate(`/assets/${a.id}`)}>
                  <td className="mono">{a.npid}</td>
                  <td>{a.category?.displayName ?? '—'}</td>
                  <td>{[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || '—'}</td>
                  <td className="mono">{a.currentUnit?.label ?? '—'}</td>
                  <td style={pastLife ? { color: 'var(--red)' } : {}}>{yearsLabel(a.installDate)}</td>
                  <td>
                    <span className={`np-badge np-badge--status-${a.status}`}>
                      {a.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td>{a.warrantyExpiresOn ? (activeWarranty ? 'Active' : 'Exp.') : '—'}</td>
                  <td>{money(a.purchaseCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2 className="np-section-heading" style={{ borderLeft: '2px solid var(--red)', paddingLeft: 10 }}>Work orders</h2>
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
