export function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'red' | 'amber';
}) {
  return (
    <div className={`np-card np-kpi-card${accent ? ` np-kpi-tile--${accent}` : ''}`}>
      <div className="np-kpi-label">{label}</div>
      <div className="np-kpi-value">{value}</div>
    </div>
  );
}
