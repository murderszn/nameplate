import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type Asset,
  type Property,
  type Unit,
  type WorkOrder,
} from '../api/client';
import { money, yearsLabel } from '../lib/format';
import { NameplateTag } from '../components/NameplateTag';

const OPEN = ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'];

export function UnitDetail() {
  const { id, unitId } = useParams<{ id: string; unitId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || !unitId) return;
      try {
        const org = await api.getOrg();
        const [prop, u, assetRows, woRows] = await Promise.all([
          api.getProperty(id),
          api.getUnit(unitId),
          api.listAssets(org.id, { propertyId: id, unitId }),
          api.listWorkOrders(org.id),
        ]);
        if (cancelled) return;
        setProperty(prop);
        setUnit(u);
        setAssets(assetRows);
        setWorkOrders(woRows.filter((w) => w.unitId === unitId));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, unitId]);

  if (loading) return <div className="np-empty-state">Loading unit…</div>;
  if (error || !property || !unit) {
    return <div className="np-empty-state">Couldn't load unit: {error ?? 'not found'}</div>;
  }

  const openWo = workOrders.filter((w) => OPEN.includes(w.status)).length;
  const capital = assets.reduce((s, a) => s + Number(a.purchaseCost ?? 0), 0);

  const activeWarranties = assets.filter((a) => a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() > Date.now()).length;

  return (
    <div>
      <div className="np-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={`/properties/${property.id}`} className="np-back">
            ← Back
          </Link>
          <div className="np-breadcrumbs">
            <span>{property.name}</span>
            <span className="np-breadcrumbs__sep">/</span>
            <span>{unit.building?.name ?? 'Building'}</span>
          </div>
        </div>
        <span className={`np-badge np-badge--status-${unit.occupancyStatus ?? 'active'}`}>
          {(unit.occupancyStatus ?? 'unknown').replaceAll('_', ' ')}
        </span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', margin: 0, lineHeight: 1 }}>
          Unit {unit.label}
        </h1>
      </div>

      <dl className="np-meta-inline">
        <div>
          <dt>Beds / baths</dt>
          <dd>
            {unit.bedrooms ?? '—'} / {unit.bathrooms ?? '—'}
          </dd>
        </div>
        <div>
          <dt>Square feet</dt>
          <dd>{unit.squareFeet ?? '—'}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {property.addressLine1}
            {property.city ? `, ${property.city}` : ''}
          </dd>
        </div>
        <div>
          <dt>Tagged plates</dt>
          <dd>{assets.length}</dd>
        </div>
      </dl>

      <div className="np-info-strip">
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{assets.length}</span>
          <span className="np-info-strip__lbl">Assets in unit</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{openWo}</span>
          <span className="np-info-strip__lbl">Open work orders</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{money(capital)}</span>
          <span className="np-info-strip__lbl">Capital in unit</span>
        </div>
        <div className="np-info-strip__div" />
        <div className="np-info-strip__item">
          <span className="np-info-strip__val">{activeWarranties}</span>
          <span className="np-info-strip__lbl">Warranty Active</span>
        </div>
      </div>

      <h2 className="np-section-heading">Plates in this unit</h2>
      {assets.length === 0 ? (
        <div className="np-empty-state">No tagged assets in this unit.</div>
      ) : (
        <div className="np-unit-plate-grid">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              className="np-plate-card"
              onClick={() => navigate(`/assets/${a.id}`)}
              title={`Open ledger for ${a.npid}`}
            >
              <NameplateTag asset={a} />
              <div className="np-plate-card__meta">
                <span className="np-plate-card__title">
                  {[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') ||
                    a.assetModel?.displayName ||
                    a.category?.displayName ||
                    'Asset'}
                </span>
                <span className="np-plate-card__sub">
                  {a.customFields?.room ?? a.category?.displayName ?? '—'}
                </span>
              </div>
              <div className="np-plate-card__foot">
                <span className={`np-badge np-badge--status-${a.status}`}>
                  {a.status.replaceAll('_', ' ')}
                </span>
                <span className="np-plate-card__age">{yearsLabel(a.installDate)}</span>
                <span className="np-plate-card__open">Open ledger →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <h2 className="np-section-heading">Work orders</h2>
      {workOrders.length === 0 ? (
        <div className="np-empty-state">Nothing open on this unit.</div>
      ) : (
        <table className="np-table">
          <thead>
            <tr>
              <th>WO #</th>
              <th>Title</th>
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
