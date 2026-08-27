import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Asset, type CriticalPart, type ServiceEvent } from '../api/client';
import { CATEGORY_SCHEMATIC, isoDate, money, num, yearsLabel } from '../lib/format';

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        const org = await api.getOrg();
        const row = await api.getAsset(id, org.id);
        if (!cancelled) setAsset(row);
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

  const cf = asset?.customFields ?? {};
  const schematic = cf.schematicKey || (asset?.category?.key ? CATEGORY_SCHEMATIC[asset.category.key] : undefined);
  const spend = num(asset?.lifetimeServiceCost);
  const cost = num(asset?.purchaseCost);
  const spendPct = cost > 0 ? `${((spend / cost) * 100).toFixed(1)}%` : '—';
  const warrantyActive =
    asset?.warrantyExpiresOn && new Date(asset.warrantyExpiresOn).getTime() > Date.now();
  const warrantyYear = asset?.warrantyExpiresOn
    ? new Date(asset.warrantyExpiresOn).getFullYear()
    : null;

  const lineage = useMemo(() => asset?.serviceEvents ?? [], [asset]);

  if (loading) return <div className="np-empty-state">Loading plate…</div>;
  if (error || !asset) {
    return <div className="np-empty-state">Couldn't load asset: {error ?? 'not found'}</div>;
  }

  const title =
    asset.notes ||
    asset.assetModel?.displayName ||
    [asset.manufacturerRaw, asset.modelRaw].filter(Boolean).join(' ') ||
    asset.npid;
  const serialLine = [
    asset.modelRaw ? `Model: ${asset.modelRaw}` : null,
    asset.serialNumber ? `Serial: ${asset.serialNumber}` : null,
    cf.serialLabel ? `(${cf.serialLabel})` : asset.serialConfidence,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Link to="/assets" style={{ color: 'var(--gray-400)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Asset Registry
        </Link>
      </div>

      <div className="np-plate-hero">
        <div className="np-plate-hero__schematic">
          {schematic ? (
            <img src={`/images/schematics/${schematic}.png`} alt={title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="np-muted" style={{ padding: 40, textAlign: 'center' }}>
              No schematic available for this category.
            </div>
          )}
        </div>

        <div className="np-plate-hero__meta">
          <div className="np-plate-hero__npid">{asset.npid}</div>
          <h2 className="np-plate-hero__title">{title}</h2>
          <div className="np-plate-hero__sub">
            {asset.category?.displayName ?? 'Uncategorized'}
            {serialLine ? ` · ${serialLine}` : ''}
          </div>

          <div className="np-plate-stats-grid">
            <div className="np-stat-box">
              <span className="np-stat-val">{yearsLabel(asset.installDate)}</span>
              <span className="np-stat-lbl">Active operating age</span>
            </div>
            <div className="np-stat-box np-stat-box--red">
              <span className="np-stat-val">
                {warrantyActive ? `Active (${warrantyYear})` : 'Expired'}
              </span>
              <span className="np-stat-lbl">
                {cf.warrantySub ?? 'OEM warranty status'}
              </span>
            </div>
            <div className="np-stat-box">
              <span className="np-stat-val">{money(cost, 2)}</span>
              <span className="np-stat-lbl">Original capital cost</span>
            </div>
            <div className="np-stat-box">
              <span className="np-stat-val">
                {money(spend, 2)} ({spendPct})
              </span>
              <span className="np-stat-lbl">Lifetime service spend</span>
            </div>
          </div>

          {cf.criticalParts && cf.criticalParts.length > 0 ? (
            <div className="np-parts-list">
              {cf.criticalParts.map((p: CriticalPart) => (
                <div key={p.title} className="np-part-row">
                  <span className={p.type === 'red' ? 'part-dot-red' : 'part-dot-white'} />
                  <div>
                    <strong>{p.title}</strong> — {p.text}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="np-section-header-row">
            <div className="np-section-title">
              <span className="brand-dot" />
              Component-level service & parts lineage
            </div>
            <span className="mono np-muted">
              PURCHASED: {isoDate(asset.manufactureDate)} · INSTALLED: {isoDate(asset.installDate)}
            </span>
          </div>

          {lineage.length === 0 ? (
            <div className="np-empty-state">No service events on this plate yet.</div>
          ) : (
            <table className="np-table">
              <thead>
                <tr>
                  <th>Service date</th>
                  <th>Component / findings</th>
                  <th>Technician / WO</th>
                  <th>Ledger</th>
                </tr>
              </thead>
              <tbody>
                {lineage.map((e: ServiceEvent) => (
                  <tr key={e.id}>
                    <td className="mono">{isoDate(e.occurredAt)}</td>
                    <td>{e.findings ?? e.eventType.replaceAll('_', ' ')}</td>
                    <td>
                      {e.technician?.user?.fullName ?? '—'}
                      {e.workOrder ? ` · WO-${e.workOrder.number}` : ''}
                    </td>
                    <td>
                      <span className={`np-badge${e.isWarrantyClaim ? ' np-badge--status-unaccounted_for' : ''}`}>
                        {e.isWarrantyClaim
                          ? 'OEM warranty'
                          : `${e.eventType.replaceAll('_', ' ')} · ${money(e.totalCost, 2)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="np-plate-facts">
            <span className={`np-badge np-badge--status-${asset.status}`}>
              {asset.status.replaceAll('_', ' ')}
            </span>
            {asset.condition && (
              <span className="np-badge">condition: {asset.condition}</span>
            )}
            {asset.currentProperty && (
              <Link to={`/properties/${asset.currentProperty.id}`} className="np-badge">
                {asset.currentProperty.name}
              </Link>
            )}
            {asset.currentUnit && asset.currentProperty && (
              <Link
                to={`/properties/${asset.currentProperty.id}/units/${asset.currentUnit.id}`}
                className="np-badge"
              >
                Unit {asset.currentUnit.label}
              </Link>
            )}
            {cf.gps && <span className="np-badge mono">{cf.gps}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
