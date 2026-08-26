import { useEffect, useState } from 'react';
import { api, type WorkOrder } from '../api/client';

/**
 * Work orders — kanban-by-status per v0-scope.md §1.2. Wired to
 * GET /v1/work-orders.
 */
const COLUMNS = [
  { status: 'open', label: 'Open' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'awaiting_parts', label: 'Awaiting parts' },
  { status: 'completed', label: 'Completed' },
];

export function WorkOrders() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await api.getOrg();
        const rows = await api.listWorkOrders(org.id);
        if (cancelled) return;
        setWorkOrders(rows);
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

  const openCount = workOrders.filter((w) =>
    ['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval'].includes(w.status),
  ).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ color: 'var(--np-steel-500)', margin: 0 }}>
          {loading ? 'Loading…' : `${openCount} open work orders`}
        </p>
        <button className="np-btn">+ New work order</button>
      </div>

      {error && <div className="np-empty-state">Couldn't load work orders: {error}</div>}

      {!error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`,
            gap: 12,
          }}
        >
          {COLUMNS.map((col) => {
            const items = workOrders.filter((w) => w.status === col.status);
            return (
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
                  {col.label} {loading ? '' : `(${items.length})`}
                </div>
                {loading ? (
                  <div className="np-empty-state" style={{ padding: '20px 8px' }}>
                    Loading…
                  </div>
                ) : items.length === 0 ? (
                  <div className="np-empty-state" style={{ padding: '20px 8px' }}>
                    None
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((w) => (
                      <div
                        key={w.id}
                        className="np-card"
                        style={{ padding: 10, background: 'var(--np-mist-50, #f7f8fa)' }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          WO-{w.number} · {w.priority}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>{w.title}</div>
                        {w.slaDueAt && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--np-steel-500)' }}>
                            SLA: {new Date(w.slaDueAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
