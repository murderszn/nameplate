/**
 * Asset registry / search — filterable/sortable table per
 * v0-scope.md §1.2 (property, category, status, age, cost, last
 * confirmed). Wire up to GET /v1/assets and GET /v1/assets/lookup.
 */
export function Assets() {
  const columns = [
    'NPID',
    'Category',
    'Manufacturer / Model',
    'Status',
    'Property / Unit',
    'Last confirmed',
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search NPID, serial, or legacy tag…"
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--np-mist-200)',
          }}
        />
        <button className="np-btn">Scan / lookup</button>
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
          <tr>
            <td colSpan={columns.length}>
              <div className="np-empty-state">
                No assets loaded. Connect to{' '}
                <code className="mono">
                  GET /v1/assets?property_id=&status=&category=&q=
                </code>
                .
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
