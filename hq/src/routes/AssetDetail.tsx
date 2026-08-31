import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Asset, type CriticalPart, type ServiceEvent } from '../api/client';
import { CATEGORY_SCHEMATIC, isoDate, money, num, yearsLabel, yearsOld } from '../lib/format';

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
  const schematicKey = cf.schematicKey || (asset?.category?.key ? CATEGORY_SCHEMATIC[asset.category.key] : undefined);
  const spend = num(asset?.lifetimeServiceCost);
  const cost = num(asset?.purchaseCost);
  const spendPct = cost > 0 ? `${((spend / cost) * 100).toFixed(1)}%` : '—';
  const warrantyActive =
    asset?.warrantyExpiresOn && new Date(asset.warrantyExpiresOn).getTime() > Date.now();
  const warrantyYear = asset?.warrantyExpiresOn
    ? new Date(asset.warrantyExpiresOn).getFullYear()
    : null;

  const lineage = useMemo(() => asset?.serviceEvents ?? [], [asset]);

  if (loading) return <div className="np-empty-state">Loading asset ledger…</div>;
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
    <div className="np-asset-page">
      {/* Top Navigation Bar */}
      <div className="np-asset-nav">
        <Link to="/assets" className="np-asset-back-btn">
          ← Back to Registry
        </Link>
        <div className="np-asset-nav__meta">
          <span className="np-badge mono">{asset.npid}</span>
          <span className={`np-badge np-badge--status-${asset.status}`}>
            {asset.status.replaceAll('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Top Grid: Blueprint Visualizer + Core Spec Card */}
      <div className="np-asset-hero-grid">
        {/* Left: Controlled Blueprint Frame */}
        <div className="np-schematic-card">
          <div className="np-schematic-card__header">
            <span className="np-schematic-card__tag">
              SCHEMATIC // {asset.category?.displayName?.toUpperCase() ?? 'APPLIANCE'}
            </span>
            <span className="np-schematic-card__dot" />
          </div>

          <div className="np-schematic-card__canvas">
            {schematicKey ? (
              <img
                src={`./schematics/${schematicKey}.png`}
                alt={title}
                className="np-schematic-card__img"
                onError={(e) => {
                  // Fallback path
                  if (!e.currentTarget.src.includes('images/schematics')) {
                    e.currentTarget.src = `./images/schematics/${schematicKey}.png`;
                  }
                }}
              />
            ) : (
              <div className="np-schematic-card__placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="m9 9 6 6m0-6-6 6" />
                </svg>
                <span>No CAD schematic on file</span>
              </div>
            )}
          </div>

          <div className="np-schematic-card__footer">
            <span className="mono">NPID: {asset.npid}</span>
            <span className="np-muted">100% Scale Precision</span>
          </div>
        </div>

        {/* Right: Asset Identity & Primary Financial / Operating Metrics */}
        <div className="np-asset-spec-card">
          <div className="np-asset-spec-card__header">
            <div className="np-asset-spec-card__tag-row">
              <span className="np-asset-npid-pill">{asset.npid}</span>
              {asset.condition && (
                <span className="np-badge">Condition: {asset.condition}</span>
              )}
            </div>
            <h2 className="np-asset-spec-card__title">{title}</h2>
            <div className="np-asset-spec-card__sub">
              {asset.category?.displayName ?? 'Uncategorized'}
              {serialLine ? ` · ${serialLine}` : ''}
            </div>
          </div>

          {/* 4-Column Stat Grid */}
          <div className="np-asset-stat-grid">
            <div className="np-asset-stat-box">
              <span className="np-asset-stat-box__val">{yearsLabel(asset.installDate)}</span>
              <span className="np-asset-stat-box__lbl">Operating Age</span>
            </div>
            <div className={`np-asset-stat-box ${warrantyActive ? 'np-asset-stat-box--active' : 'np-asset-stat-box--expired'}`}>
              <span className="np-asset-stat-box__val">
                {warrantyActive ? `Active (${warrantyYear})` : 'Expired'}
              </span>
              <span className="np-asset-stat-box__lbl">
                {cf.warrantySub ?? 'OEM Warranty'}
              </span>
            </div>
            <div className="np-asset-stat-box">
              <span className="np-asset-stat-box__val">{money(cost, 2)}</span>
              <span className="np-asset-stat-box__lbl">Capital Cost</span>
            </div>
            <div className="np-asset-stat-box">
              <span className="np-asset-stat-box__val">
                {money(spend, 2)} <span className="np-asset-stat-box__sub">({spendPct})</span>
              </span>
              <span className="np-asset-stat-box__lbl">Service Spend</span>
            </div>
          </div>

          {(() => {
            const expectedLifeMonths = asset.expectedLifeMonths ?? asset.assetModel?.expectedLifeMonths ?? asset.category?.defaultUsefulLifeMonths;
            const ageMonths = (yearsOld(asset.installDate) ?? 0) * 12;
            const lifeRatio = expectedLifeMonths ? Math.min(ageMonths / expectedLifeMonths, 1.2) : null;
            if (lifeRatio == null) return null;
            const fill = lifeRatio > 1 ? '#eb2b2b' : lifeRatio > 0.8 ? '#eb2b2b' : lifeRatio > 0.6 ? '#f5a623' : '#22c55e';
            return (
              <div className="np-life-bar">
                <div className="np-life-bar__label">
                  USEFUL LIFE — {(ageMonths/12).toFixed(1)} yrs of {(expectedLifeMonths!/12).toFixed(0)} yrs expected ({Math.round(lifeRatio*100)}%)
                </div>
                <div className="np-life-bar__track">
                  <div className="np-life-bar__fill" style={{ width: `${Math.min(lifeRatio * 100, 100)}%`, background: fill }} />
                </div>
              </div>
            );
          })()}

          <div className="np-asset-card" style={{ marginTop: 16 }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(var(--overlay-rgb), 0.06)'}}>
              <span className="np-muted">OEM Base</span>
              <span className="np-badge">{warrantyActive ? 'Active' : 'Expired'} {warrantyYear ? `(${warrantyYear})` : ''}</span>
            </div>
            {cf.warrantyExtra && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(var(--overlay-rgb), 0.06)'}}>
                <span className="np-muted">Extended Warranty</span>
                <span className="np-badge">{cf.warrantyExtra}</span>
              </div>
            )}
            {(cf as any).compressorWarranty && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(var(--overlay-rgb), 0.06)'}}>
                <span className="np-muted">Compressor Warranty</span>
                <span className="np-badge">{(cf as any).compressorWarranty}</span>
              </div>
            )}
          </div>

          {/* Spatial & Physical Tags */}
          <div className="np-asset-spatial-tags">
            {asset.currentProperty && (
              <Link to={`/properties/${asset.currentProperty.id}`} className="np-spatial-pill">
                <span className="np-spatial-icon">📍</span>
                <span>{asset.currentProperty.name}</span>
              </Link>
            )}
            {asset.currentUnit && asset.currentProperty && (
              <Link
                to={`/properties/${asset.currentProperty.id}/units/${asset.currentUnit.id}`}
                className="np-spatial-pill"
              >
                <span>Unit {asset.currentUnit.label}</span>
              </Link>
            )}
            {cf.gps && (
              <span className="np-spatial-pill mono">
                <span>🛰</span>
                <span>{cf.gps}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Critical Monitored Components */}
      {cf.criticalParts && cf.criticalParts.length > 0 && (
        <div className="np-asset-card">
          <div className="np-asset-card__head">
            <h3 className="np-asset-card__title">Critical Components & Failure Triggers</h3>
            <span className="np-muted mono">{cf.criticalParts.length} Components Monitored</span>
          </div>
          <div className="np-critical-parts-grid">
            {cf.criticalParts.map((p: CriticalPart) => (
              <div key={p.title} className="np-critical-part-item">
                <span className={p.type === 'red' ? 'np-part-dot np-part-dot--red' : 'np-part-dot np-part-dot--white'} />
                <div className="np-critical-part-text">
                  <strong>{p.title}</strong>
                  <span>{p.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Component-Level Service & Parts Lineage Table */}
      <div className="np-asset-card">
        <div className="np-asset-card__head">
          <div className="np-asset-card__title-group">
            <h3 className="np-asset-card__title">Component-Level Service & Parts Lineage</h3>
            <span className="np-muted mono">
              Purchased: {isoDate(asset.manufactureDate)} · Installed: {isoDate(asset.installDate)}
            </span>
          </div>
          <span className="np-badge">{lineage.length} Recorded Events</span>
        </div>

        {lineage.length === 0 ? (
          <div className="np-empty-state">No service events recorded for this asset plate.</div>
        ) : (
          <div className="np-table-wrapper">
            <table className="np-table">
              <thead>
                <tr>
                  <th>Service Date</th>
                  <th>Component / Findings</th>
                  <th>Part / OEM #</th>
                  <th>Technician / Work Order</th>
                  <th>Ledger Total</th>
                </tr>
              </thead>
              <tbody>
                {lineage.map((e: ServiceEvent) => (
                  <tr key={e.id} style={e.isWarrantyClaim ? { background: 'rgba(235, 43, 43,0.06)' } : undefined}>
                    <td className="mono">{isoDate(e.occurredAt)}</td>
                    <td>
                      <div className="np-lineage-findings">
                        <strong>{e.findings ?? e.eventType.replaceAll('_', ' ')}</strong>
                      </div>
                    </td>
                    <td className="mono">{(e as any).partNumber ?? (e as any).customFields?.partNumber ?? '—'}</td>
                    <td>
                      <span className="np-lineage-tech">
                        {e.technician?.user?.fullName ?? 'Field Tech'}
                        {e.workOrder ? ` · WO-${e.workOrder.number}` : ''}
                      </span>
                    </td>
                    <td>
                      <span className={`np-badge${e.isWarrantyClaim ? ' np-badge--status-unaccounted_for' : ''}`}>
                        {e.isWarrantyClaim
                          ? 'OEM Warranty'
                          : `${e.eventType.replaceAll('_', ' ')} · ${money(e.totalCost, 2)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
