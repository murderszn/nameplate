import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Asset, type Property } from '../api/client';

type PropertySortKey = 'name' | 'code' | 'location' | 'units' | 'assets' | 'status';

export function Properties() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PropertySortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

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

  const assetsByProperty = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      if (a.currentPropertyId) {
        map.set(a.currentPropertyId, (map.get(a.currentPropertyId) ?? 0) + 1);
      }
    }
    return map;
  }, [assets]);

  const handleSort = (key: PropertySortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = properties.filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.city ?? '').toLowerCase().includes(q) ||
        (p.state ?? '').toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'code':
          cmp = (a.code ?? '').localeCompare(b.code ?? '');
          break;
        case 'location':
          cmp = `${a.city ?? ''} ${a.state ?? ''}`.localeCompare(`${b.city ?? ''} ${b.state ?? ''}`);
          break;
        case 'units':
          cmp = (a.unitCountDeclared ?? 0) - (b.unitCountDeclared ?? 0);
          break;
        case 'assets':
          cmp = (assetsByProperty.get(a.id) ?? 0) - (assetsByProperty.get(b.id) ?? 0);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [properties, search, sortKey, sortAsc, assetsByProperty]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Search & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          border: '1px solid rgba(var(--overlay-rgb), 0.08)',
          borderRadius: 2,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <input
            className="np-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter properties by name, code, or city…"
            style={{ width: '100%', maxWidth: 380 }}
          />
          <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 650, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? 'Loading…' : `${filteredAndSorted.length} of ${properties.length} PROPERTIES`}
          </span>
        </div>

        <button className="np-btn">+ Add property</button>
      </div>

      {/* Properties Table with High-Res Architecture Previews */}
      <div className="np-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="np-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Preview</th>
              <th
                onClick={() => handleSort('name')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Property Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('code')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Code {sortKey === 'code' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('location')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                City / State {sortKey === 'location' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('units')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Units Declared {sortKey === 'units' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('assets')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Assets Tracked {sortKey === 'assets' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Status {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>
                  <div className="np-empty-state">Loading properties…</div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={7}>
                  <div className="np-empty-state">Couldn't load properties: {error}</div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="np-empty-state">No properties match "{search}".</div>
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filteredAndSorted.map((p) => {
                const imgKey = p.code ? p.code.toLowerCase().replace('-', '_') : 'sonoran_ridge';
                return (
                  <tr
                    key={p.id}
                    className="np-row-link"
                    onClick={() => navigate(`/properties/${p.id}`)}
                    style={{ height: 68 }}
                  >
                    <td>
                      <div
                        style={{
                          width: 64,
                          height: 44,
                          borderRadius: 2,
                          overflow: 'hidden',
                          background: 'var(--bg-elevated)',
                          border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={`./images/properties/${imgKey}.jpg`}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.src = './images/properties/sonoran_ridge.jpg';
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong style={{ color: 'var(--white)', fontSize: '0.92rem' }}>{p.name}</strong>
                        <span style={{ fontSize: '0.74rem', color: '#888' }}>
                          {p.addressLine1 ?? 'Maricopa County, AZ'}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{p.code ?? '—'}</td>
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
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
