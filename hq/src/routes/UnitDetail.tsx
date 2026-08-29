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
        <div className="np-unit-plate-v2-grid">
          {assets.map((a) => {
            const expectedLifeMonths = a.expectedLifeMonths ?? a.assetModel?.expectedLifeMonths ?? a.category?.defaultUsefulLifeMonths ?? 0;
            const ageMonths = (a.installDate ? ((Date.now() - new Date(a.installDate).getTime()) / (365.25 * 86400000)) * 12 : 0);
            let ratio = expectedLifeMonths > 0 ? ageMonths / expectedLifeMonths : 0;
            ratio = Math.max(0, Math.min(ratio, 1));
            
            const lifeColor = ratio > 0.8 ? 'var(--red)' : ratio > 0.6 ? '#f5a623' : '#22c55e';
            
            return (
              <button
                key={a.id}
                className="np-unit-plate-v2"
                onClick={() => navigate(`/assets/${a.id}`)}
              >
                <div className="np-unit-plate-v2__head">
                  <span className="np-unit-plate-v2__npid">{a.npid}</span>
                  <span className="np-badge">{a.category?.displayName ?? 'Asset'}</span>
                </div>
                <div>
                  <div className="np-unit-plate-v2__title">
                    {[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || a.notes || 'Asset'}
                  </div>
                  <div className="np-unit-plate-v2__sub">
                    {a.customFields?.room ?? a.category?.displayName ?? '—'}
                  </div>
                </div>
                <div className="np-unit-plate-v2__stats">
                  <span className="np-unit-plate-v2__age">{yearsLabel(a.installDate)}</span>
                  <span className={`np-badge np-badge--status-${a.status}`}>
                    {a.status.replaceAll('_', ' ')}
                  </span>
                  <span className="np-unit-plate-v2__cost">{money(a.purchaseCost)}</span>
                </div>
                {expectedLifeMonths > 0 && (
                  <div className="np-unit-plate-v2__lifebar">
                    <div className="np-unit-plate-v2__lifebar-fill" style={{ width: `${ratio * 100}%`, background: lifeColor }} />
                  </div>
                )}
                {a.serviceEvents && a.serviceEvents.length > 0 && (
                  <div className="np-unit-plate-v2__last-svc">
                    Last service: {new Date(a.serviceEvents[0].occurredAt).toLocaleDateString()}
                  </div>
                )}
              </button>
            );
          })}
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
