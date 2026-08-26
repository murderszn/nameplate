import { KpiTile } from '../components/KpiTile';

/**
 * Portfolio Dashboard — top-level KPI tiles + property league table +
 * at-risk work orders + unresolved reconciliation flags, per
 * v0-scope.md §1.2 and metrics.md §1. Placeholder data only; wire up to
 * GET /v1/reports/portfolio-summary once the reports module exists.
 */
export function Dashboard() {
  const kpis = [
    { label: 'Assets tracked', value: '—' },
    { label: 'Scan verification rate', value: '—' },
    { label: 'Open work orders', value: '—' },
    { label: 'SLA at risk', value: '—' },
    { label: 'Unconfirmed > 180d', value: '—' },
    { label: 'Data completeness', value: '—' },
  ];

  return (
    <div>
      <div className="np-kpi-grid">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', marginBottom: 12 }}>
        Property league table
      </h2>
      <div className="np-empty-state">
        No properties loaded yet — connect to{' '}
        <code className="mono">GET /v1/reports/portfolio-summary</code>.
      </div>

      <h2 style={{ fontSize: '1rem', margin: '24px 0 12px' }}>
        Unresolved reconciliation flags
      </h2>
      <div className="np-empty-state">Nothing to review.</div>
    </div>
  );
}
