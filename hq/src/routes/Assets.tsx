import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Asset } from '../api/client';
import { money, num, yearsLabel, yearsOld } from '../lib/format';

type SortKey =
  | 'npid'
  | 'category'
  | 'model'
  | 'serial'
  | 'age'
  | 'warranty'
  | 'cost'
  | 'spend'
  | 'status'
  | 'location';

export function Assets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('npid');
  const [sortAsc, setSortAsc] = useState(true);
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

  // Sync search URL query param
  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery != null && urlQuery !== search) {
      setSearch(urlQuery);
    }
  }, [searchParams]);

  // Unique categories and properties for dropdowns
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.category?.displayName) set.add(a.category.displayName);
    }
    return Array.from(set).sort();
  }, [assets]);

  const properties = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.currentProperty?.name) set.add(a.currentProperty.name);
    }
    return Array.from(set).sort();
  }, [assets]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets) {
      if (a.status) set.add(a.status);
    }
    return Array.from(set).sort();
  }, [assets]);

  // Sorting Handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Filtered and Sorted Assets
  const filteredAndSorted = useMemo(() => {
    let result = assets.filter((a) => {
      if (selectedCategory !== 'all' && (a.category?.displayName ?? '') !== selectedCategory) {
        return false;
      }
      if (selectedProperty !== 'all' && (a.currentProperty?.name ?? '') !== selectedProperty) {
        return false;
      }
      if (selectedStatus !== 'all' && a.status !== selectedStatus) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches = [
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
          .some((v) => v!.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'npid':
          comparison = a.npid.localeCompare(b.npid);
          break;
        case 'category':
          comparison = (a.category?.displayName ?? '').localeCompare(b.category?.displayName ?? '');
          break;
        case 'model':
          comparison = (a.modelRaw ?? a.notes ?? '').localeCompare(b.modelRaw ?? b.notes ?? '');
          break;
        case 'serial':
          comparison = (a.serialNumber ?? '').localeCompare(b.serialNumber ?? '');
          break;
        case 'age':
          comparison = (yearsOld(a.installDate) ?? 0) - (yearsOld(b.installDate) ?? 0);
          break;
        case 'warranty':
          comparison = (a.warrantyExpiresOn ?? '').localeCompare(b.warrantyExpiresOn ?? '');
          break;
        case 'cost':
          comparison = num(a.purchaseCost) - num(b.purchaseCost);
          break;
        case 'spend':
          comparison = num(a.lifetimeServiceCost) - num(b.lifetimeServiceCost);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'location':
          comparison = `${a.currentProperty?.name ?? ''} ${a.currentUnit?.label ?? ''}`.localeCompare(
            `${b.currentProperty?.name ?? ''} ${b.currentUnit?.label ?? ''}`,
          );
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [assets, search, selectedCategory, selectedProperty, selectedStatus, sortKey, sortAsc]);

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

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedProperty('all');
    setSelectedStatus('all');
    setSearchParams({});
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedProperty !== 'all' ||
    selectedStatus !== 'all';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filtering & Search Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--bg-card)',
          border: '1px solid rgba(var(--overlay-rgb), 0.08)',
          borderRadius: 2,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              className="np-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onLookup();
              }}
              placeholder="Search NPID, serial, model, room, unit… or press Enter to scan"
              style={{ width: '100%' }}
            />
          </div>

          <button className="np-btn" onClick={() => void onLookup()} style={{ flexShrink: 0 }}>
            Scan / Lookup
          </button>
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(var(--overlay-rgb), 0.12)',
              borderRadius: 2,
              padding: '6px 10px',
              color: 'var(--white)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(var(--overlay-rgb), 0.12)',
              borderRadius: 2,
              padding: '6px 10px',
              color: 'var(--white)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(var(--overlay-rgb), 0.12)',
              borderRadius: 2,
              padding: '6px 10px',
              color: 'var(--white)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses ({statuses.length})</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                background: 'transparent',
                border: '1px solid rgba(235, 43, 43,0.4)',
                color: '#ff6666',
                borderRadius: 2,
                padding: '5px 10px',
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              Clear Filters ✕
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#888', fontFamily: 'monospace' }}>
            {filteredAndSorted.length} of {assets.length} ASSETS
          </span>
        </div>
      </div>

      {lookupError && (
        <div style={{ color: 'var(--red)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
          {lookupError}
        </div>
      )}

      {/* Sortable Asset Registry Table */}
      <div className="np-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="np-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('npid')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                NPID {sortKey === 'npid' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('category')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Category {sortKey === 'category' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('model')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Manufacturer / Model {sortKey === 'model' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('serial')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Serial {sortKey === 'serial' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('age')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Age {sortKey === 'age' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('warranty')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Warranty {sortKey === 'warranty' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('cost')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Cost {sortKey === 'cost' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('spend')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Spend {sortKey === 'spend' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Status {sortKey === 'status' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('location')}
                style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
              >
                Property / Unit {sortKey === 'location' ? (sortAsc ? '▲' : '▼') : '↕'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10}>
                  <div className="np-empty-state">Loading assets…</div>
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={10}>
                  <div className="np-empty-state">Couldn't load assets: {error}</div>
                </td>
              </tr>
            )}
            {!loading && !error && filteredAndSorted.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="np-empty-state">No assets match your search & filter criteria.</div>
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              filteredAndSorted.map((a) => {
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
    </div>
  );
}
