export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function money(v: unknown, digits = 0): string {
  const n = num(v);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function yearsOld(installDate: string | null | undefined): number | null {
  if (!installDate) return null;
  const ms = Date.now() - new Date(installDate).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / (365.25 * 86_400_000);
}

export function yearsLabel(installDate: string | null | undefined): string {
  const y = yearsOld(installDate);
  return y == null ? '—' : `${y.toFixed(1)} Yrs`;
}

export function statusLabel(s: string): string {
  return s.replaceAll('_', ' ');
}

export function isoDate(v: string | null | undefined): string {
  if (!v) return '—';
  return new Date(v).toISOString().slice(0, 10);
}

export const CATEGORY_SCHEMATIC: Record<string, string> = {
  washer: 'washer',
  dryer: 'dryer',
  refrigerator: 'fridge',
  dishwasher: 'dishwasher',
  hvac_air_handler: 'hvac',
  microwave: 'microwave',
  thermostat: 'thermostat',
};
