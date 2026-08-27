import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Asset, type Property } from '../api/client';

/**
 * Properties list — CRUD table per v0-scope.md §1.2. Wired to
 * GET /v1/properties; "+ Add property" stays a placeholder until the
 * create form/DTO validation lands.
 */
export function Properties() {
  const navigate = useNavigate();
  const columns = ['Name', 'Code', 'City / State', 'Units declared', 'Assets tracked', 'Status'];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const [props, assetRows] = await Promise.all([
          api.listProperties(org.id),
          api.listAssets(org.id),
        ]);
        if (cancelled) return;
        setProperties(props);
        setAssets(assetRows);
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

  const assetsByProperty = new Map<string, number>();
  for (const a of assets) {
    if (a.currentPropertyId) {
      assetsByProperty.set(a.currentPropertyId, (assetsByProperty.get(a.currentPropertyId) ?? 0) + 1);
    }
  }

  return (
    <div>
      <div className="np-toolbar">
        <p className="np-muted">
          {loading ? 'Loading…' : `${properties.length} properties in this portfolio`}
        </p>
        <button className="np-btn">+ Add property</button>
      </div>

      <table className="np-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length}>
                <div className="np-empty-state">Loading properties…</div>
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={columns.length}>
                <div className="np-empty-state">Couldn't load properties: {error}</div>
              </td>
            </tr>
          )}
          {!loading && !error && properties.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="np-empty-state">No properties yet.</div>
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            properties.map((p) => (
              <tr
                key={p.id}
                className="np-row-link"
                onClick={() => navigate(`/properties/${p.id}`)}
              >
                <td>{p.name}</td>
                <td>{p.code ?? '—'}</td>
                <td>
                  {p.city ?? '—'}
                  {p.state ? `, ${p.state}` : ''}
                </td>
                <td>{p.unitCountDeclared ?? '—'}</td>
                <td>{assetsByProperty.get(p.id) ?? 0}</td>
                <td>
                  <span className={`np-badge np-badge--status-${p.status}`}>
                    {p.status.replaceAll('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
