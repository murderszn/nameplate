import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  api,
  type Asset,
  type Property,
  type Unit,
  type WorkOrder,
} from '../api/client';
import { CATEGORY_SCHEMATIC, money, yearsLabel } from '../lib/format';

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

  return (
    <div>
      <div className="np-toolbar">
        <Link to={`/properties/${property.id}`} className="np-back">
          ← {property.name}
        </Link>
        <span className="np-badge np-badge--info">{unit.building?.name ?? 'Unit'}</span>
      </div>

      <div className="np-loc-hero">
        <div>
          <h2 className="np-plate-title">Unit {unit.label}</h2>
          <p className="np-muted">
            {property.name}
            {unit.building ? ` — ${unit.building.name}` : ''}
            {unit.floor != null ? ` · Floor ${unit.floor}` : ''}
          </p>
        </div>
        <span className={`np-badge np-badge--status-${unit.occupancyStatus ?? 'active'}`}>
          {(unit.occupancyStatus ?? 'unknown').replaceAll('_', ' ')}
        </span>
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

      <div className="np-stat-chips">
        <div className="np-stat-box">
          <span className="np-stat-val">{assets.length}</span>
          <span className="np-stat-lbl">Assets in unit</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{openWo}</span>
          <span className="np-stat-lbl">Open work orders</span>
        </div>
        <div className="np-stat-box">
          <span className="np-stat-val">{money(capital)}</span>
          <span className="np-stat-lbl">Capital in unit</span>
        </div>
      </div>

      <h2 className="np-section-heading">Plates in this unit</h2>
      {assets.length === 0 ? (
        <div className="np-empty-state">No tagged assets in this unit.</div>
      ) : (
        <div className="np-unit-plates">
          {assets.map((a) => {
            const key = a.customFields?.schematicKey || (a.category?.key ? CATEGORY_SCHEMATIC[a.category.key] : undefined);
            return (
              <button
                key={a.id}
                className="np-unit-plate"
                onClick={() => navigate(`/assets/${a.id}`)}
              >
                <div className="np-unit-plate__img">
                  {key ? (
                    <img
                      src={`./schematics/${key}.png`}
                      alt=""
                      onError={(e) => {
                        if (!e.currentTarget.src.includes('images/schematics')) {
                          e.currentTarget.src = `./images/schematics/${key}.png`;
                        }
                      }}
                    />
                  ) : (
                    <span className="np-muted">No schematic</span>
                  )}
                </div>
                <div className="np-unit-plate__body">
                  <div className="mono" style={{ color: 'var(--red)' }}>
                    {a.npid}
                  </div>
                  <strong>
                    {[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || a.notes || 'Asset'}
                  </strong>
                  <p className="np-muted">{a.customFields?.room ?? a.category?.displayName}</p>
                  <div className="np-unit-plate__meta">
                    <span className={`np-badge np-badge--status-${a.status}`}>
                      {a.status.replaceAll('_', ' ')}
                    </span>
                    <span className="np-muted">{yearsLabel(a.installDate)}</span>
                  </div>
                </div>
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
