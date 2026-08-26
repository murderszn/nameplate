export function KpiTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="np-card np-kpi-card">
      <div className="np-kpi-label">{label}</div>
      <div className="np-kpi-value">{value}</div>
    </div>
  );
}
