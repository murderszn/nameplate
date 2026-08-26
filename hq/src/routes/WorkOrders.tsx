/**
 * Work orders — kanban-by-status per v0-scope.md §1.2. Wire up to
 * GET /v1/work-orders?status=&assignee=&property_id=&sla=.
 */
const COLUMNS = [
  { status: 'open', label: 'Open' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'awaiting_parts', label: 'Awaiting parts' },
  { status: 'completed', label: 'Completed' },
];

export function WorkOrders() {
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
          0 open work orders
        </p>
        <button className="np-btn">+ New work order</button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`,
          gap: 12,
        }}
      >
        {COLUMNS.map((col) => (
          <div key={col.status} className="np-card" style={{ minHeight: 220 }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--np-steel-500)',
                marginBottom: 10,
              }}
            >
              {col.label}
            </div>
            <div className="np-empty-state" style={{ padding: '20px 8px' }}>
              None
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
