import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Asset } from '../api/client';
import { money, num, yearsLabel } from '../lib/format';

export function Assets() {
  const navigate = useNavigate();
  const columns = [
    'NPID',
    'Category',
    'Manufacturer / Model',
    'Serial',
    'Age',
    'Warranty',
    'Cost',
    'Spend',
    'Status',
    'Property / Unit',
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const assetRows = await api.listAssets(org.id);
        if (cancelled) return;
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

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.trim().toLowerCase();
    return assets.filter((a) =>
      [
        a.npid,
        a.manufacturerRaw,
        a.modelRaw,
        a.serialNumber,
        a.status,
        a.category?.displayName,
        a.currentProperty?.name,
        a.currentUnit?.label,
        a.notes,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [assets, search]);

  async function onLookup() {
    setLookupError(null);
    const code = search.trim();
    if (!code) return;
    try {
      const org = await api.getOrg();
      const hit = await api.lookupAsset(code, org.id);
      navigate(`/assets/${hit.id}`);
    } catch {
      setLookupError(`No plate resolves for "${code}".`);
    }
  }

  return (
    <div>
      <div className="np-toolbar">
        <input
          className="np-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onLookup();
          }}
          placeholder="Search NPID, serial, model, unit… or scan a plate"
        />
        <button className="np-btn" onClick={() => void onLookup()}>
          Scan / lookup
        </button>
      </div>

      <p className="np-muted" style={{ margin: '0 0 12px' }}>
        {loading ? 'Loading…' : `${filtered.length} of ${assets.length} assets`}
        {lookupError ? ` · ${lookupError}` : ''}
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
            filtered.map((a) => {
              const warrantyActive =
                a.warrantyExpiresOn && new Date(a.warrantyExpiresOn).getTime() > Date.now();
              return (
                <tr
                  key={a.id}
                  className="np-row-link"
                  onClick={() => navigate(`/assets/${a.id}`)}
                >
                  <td className="mono">{a.npid}</td>
                  <td>{a.category?.displayName ?? '—'}</td>
                  <td>
                    {[a.manufacturerRaw, a.modelRaw].filter(Boolean).join(' ') || a.notes || '—'}
                  </td>
                  <td className="mono">{a.serialNumber ?? '—'}</td>
                  <td>{yearsLabel(a.installDate)}</td>
                  <td>
                    {a.warrantyExpiresOn
                      ? warrantyActive
                        ? `Active ${new Date(a.warrantyExpiresOn).getFullYear()}`
                        : `Expired ${new Date(a.warrantyExpiresOn).getFullYear()}`
                      : '—'}
                  </td>
                  <td>{money(a.purchaseCost)}</td>
                  <td>{money(num(a.lifetimeServiceCost))}</td>
                  <td>
                    <span className={`np-badge np-badge--status-${a.status}`}>
                      {a.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {a.currentProperty?.name ?? '—'}
                    {a.currentUnit ? ` · ${a.currentUnit.label}` : ''}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
