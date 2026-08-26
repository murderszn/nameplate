/**
 * Properties list — CRUD table per v0-scope.md §1.2. Wire up to
 * GET /v1/properties once the API client (@nameplate/ts-client, per
 * architecture.md §6) exists.
 */
export function Properties() {
  const columns = ['Name', 'Code', 'City / State', 'Units', 'Status'];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <p style={{ color: 'var(--np-steel-500)', margin: 0 }}>
          0 properties in this portfolio
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
          <tr>
            <td colSpan={columns.length}>
              <div className="np-empty-state">
                No properties yet. Connect this table to{' '}
                <code className="mono">GET /v1/properties</code>.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
