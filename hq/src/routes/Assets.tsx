import { useEffect, useMemo, useState } from 'react';
import { api, type Asset, type AssetCategory, type Property } from '../api/client';

/**
 * Asset registry / search — filterable/sortable table per
 * v0-scope.md §1.2 (property, category, status, age, cost, last
 * confirmed). Wired to GET /v1/assets; client-side text filter over the
 * loaded page for the demo (server-side `q=` param also supported by
 * the backend and used once the list is large enough to matter).
 */
export function Assets() {
  const columns = [
    'NPID',
    'Category',
    'Manufacturer / Model',
    'Status',
    'Property',
    'Last confirmed',
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const [assetRows, categoryRows, propertyRows] = await Promise.all([
          api.listAssets(org.id),
          api.listCategories(),
          api.listProperties(org.id),
        ]);
        if (cancelled) return;
        setAssets(assetRows);
        setCategories(categoryRows);
        setProperties(propertyRows);
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

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.displayName])),
    [categories],
  );
  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.trim().toLowerCase();
    return assets.filter((a) =>
      [a.npid, a.manufacturerRaw, a.modelRaw, a.serialNumber, a.status]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [assets, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search NPID, serial, manufacturer/model, or status…"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--np-mist-200)',
          }}
        />
        <button className="np-btn">Scan / lookup</button>
      </div>

      <p style={{ color: 'var(--np-steel-500)', margin: '0 0 8px' }}>
        {loading ? 'Loading…' : `${filtered.length} of ${assets.length} assets`}
      </p>

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
                <div className="np-empty-state">Loading assets…</div>
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td colSpan={columns.length}>
                <div className="np-empty-state">Couldn't load assets: {error}</div>
              </td>
            </tr>
          )}
          {!loading && !error && filtered.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="np-empty-state">No assets match "{search}".</div>
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.npid}</td>
                <td>{categoryById.get(a.categoryId) ?? '—'}</td>
                <td>
                  {[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || '—'}
                </td>
                <td>
                  <span className={`np-badge np-badge--status-${a.status}`}>{a.status}</span>
                </td>
                <td>{a.currentPropertyId ? propertyById.get(a.currentPropertyId) ?? '—' : '—'}</td>
                <td>
                  {a.currentLocationConfirmedAt
                    ? new Date(a.currentLocationConfirmedAt).toLocaleDateString()
                    : 'never'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
