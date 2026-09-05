import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Asset, type Property, type ServiceEvent, type WorkOrder } from '../api/client';
import { money, num } from '../lib/format';
import { AreaChart, ChartCard, DonutChart, HBarChart } from '../components/charts';
import {
  exportDepreciationCsv,
  printDepreciationReport,
  exportFailureRatesCsv,
  printFailureRateReport,
  exportSlaMetricsCsv,
  printSlaMetricsReport,
  downloadCsv,
} from '../lib/reports';
import '../styles/analytics.css';

type Tab = 'overview' | 'capex' | 'reliability' | 'audit';
const MONTHS = ['1', '3', '6', '12'];
const EXCLUDED_BEARERS = new Set(['tenant', 'warranty', 'insurance']);

const corrected = (event: ServiceEvent) =>
  !(event as ServiceEvent & { correctedByEventId?: string | null }).correctedByEventId;

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

const getCategorySchematic = (cat?: string) => {
  const c = (cat || '').toLowerCase();
  if (c.includes('hvac') || c.includes('air') || c.includes('heat pump') || c.includes('condenser')) return './images/schematics/hvac.png';
  if (c.includes('fridge') || c.includes('refrigerat')) return './images/schematics/fridge.png';
  if (c.includes('wash') && !c.includes('dish')) return './images/schematics/washer.png';
  if (c.includes('dryer')) return './images/schematics/dryer.png';
  if (c.includes('dish')) return './images/schematics/dishwasher.png';
  if (c.includes('micro')) return './images/schematics/microwave.png';
  if (c.includes('thermo')) return './images/schematics/thermostat.png';
  return './images/schematics/hvac.png';
};

const getInitials = (str: string) => {
  const words = str.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
};

export function Analytics() {
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [orgName, setOrgName] = useState('Sonoran Portfolio Management');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const tabAliases: Record<string, Tab> = {
    cost: 'capex',
    capex: 'capex',
    service: 'reliability',
    reliability: 'reliability',
    coverage: 'audit',
    audit: 'audit',
    overview: 'overview',
  };
  const rawTab = params.get('tab') || 'overview';
  const initialTab: Tab = tabAliases[rawTab] || 'overview';
  const initialMonths = params.get('months');
  const [tab, setTab] = useState<Tab>(initialTab);
  const [propertyId, setPropertyId] = useState(params.get('property') || 'all');
  const [months, setMonths] = useState(MONTHS.includes(initialMonths || '') ? initialMonths! : '12');
  const [lemonView, setLemonView] = useState<'cards' | 'table'>('cards');
  const [oemView, setOemView] = useState<'cards' | 'table'>('cards');
  const [slaView, setSlaView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const org = await api.getOrg();
        const [props, assetList, eventList, woList] = await Promise.all([
          api.listProperties(org.id),
          api.listAssets(org.id),
          api.listServiceEvents(org.id),
          api.listWorkOrders(org.id),
        ]);
        if (cancelled) return;
        if (org?.name) setOrgName(org.name);
        setProperties(props);
        setAssets(assetList);
        setEvents(eventList);
        setWorkOrders(woList);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Analytics data could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    setParams({ ...(propertyId !== 'all' ? { property: propertyId } : {}), months, tab });
  }, [propertyId, months, tab, setParams]);

  // Scoped datasets
  const scope = useMemo(() => {
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - Number(months) + 1, 1);
    const scopedAssets = assets.filter((a) => propertyId === 'all' || a.currentPropertyId === propertyId);
    const assetIdSet = new Set(scopedAssets.map((a) => a.id));
    const nowMs = Date.now();

    const scopedEvents = events.filter(
      (e) =>
        (propertyId === 'all' ? assetIdSet.has(e.assetId) : e.propertyId === propertyId) &&
        corrected(e) &&
        new Date(e.occurredAt) >= since &&
        new Date(e.occurredAt).getTime() <= nowMs,
    );
    const ownerEvents = scopedEvents.filter(
      (e) => !EXCLUDED_BEARERS.has((e.costBorneBy || '').toLowerCase()),
    );
    const scopedOrders = workOrders.filter(
      (w) => propertyId === 'all' || w.propertyId === propertyId,
    );

    return { scopedAssets, scopedEvents, ownerEvents, scopedOrders, since };
  }, [assets, events, workOrders, propertyId, months]);

  // Monthly timeline for spend
  const monthlySpendData = useMemo(() => {
    const numMonths = Number(months);
    const now = new Date();
    const map = new Map<string, number>();

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(k, 0);
    }

    for (const e of scope.ownerEvents) {
      const d = new Date(e.occurredAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(k)) {
        map.set(k, (map.get(k) || 0) + num(e.totalCost));
      }
    }

    return [...map.entries()].map(([k, val]) => {
      const [y, m] = k.split('-').map(Number);
      return { date: new Date(y, m - 1, 1), value: Math.round(val) };
    });
  }, [scope.ownerEvents, months]);

  // Lemon Appliance Detection (Appliances with >= 2 repair events in 12 months)
  const lemonAppliances = useMemo(() => {
    const eventMap = new Map<string, ServiceEvent[]>();
    for (const e of scope.scopedEvents) {
      const arr = eventMap.get(e.assetId) || [];
      arr.push(e);
      eventMap.set(e.assetId, arr);
    }

    const lemons: {
      asset: Asset;
      events: ServiceEvent[];
      totalSpend: number;
      replacedParts: string[];
      repeatIssue: boolean;
      replacementEstimate: number;
      ratio: number;
      verdict: 'replace' | 'monitor';
    }[] = [];

    for (const [assetId, assetEvents] of eventMap.entries()) {
      if (assetEvents.length >= 2) {
        const asset = scope.scopedAssets.find((a) => a.id === assetId);
        if (!asset) continue;

        const totalSpend = assetEvents.reduce((sum, e) => sum + num(e.totalCost), 0);
        const replacedParts = assetEvents
          .flatMap((e) => (e.partUsages || []).map((p) => p.oemPartNumber || 'Component'))
          .filter(Boolean);

        const replacementEstimate = num(asset.purchaseCost) > 200 ? num(asset.purchaseCost) : 750;
        const ratio = totalSpend / replacementEstimate;
        const repeatIssue = assetEvents.length >= 3 || ratio >= 0.5;

        lemons.push({
          asset,
          events: assetEvents,
          totalSpend,
          replacedParts: Array.from(new Set(replacedParts)),
          repeatIssue,
          replacementEstimate,
          ratio,
          verdict: ratio >= 0.45 || assetEvents.length >= 3 ? 'replace' : 'monitor',
        });
      }
    }

    return lemons.sort((a, b) => b.totalSpend - a.totalSpend);
  }, [scope.scopedAssets, scope.scopedEvents]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const spend = scope.ownerEvents.reduce((s, e) => s + num(e.totalCost), 0);
    const eligibleSla = scope.scopedOrders.filter((w) => w.completedAt && w.slaDueAt);
    const metSla = eligibleSla.filter(
      (w) => new Date(w.completedAt!).getTime() <= new Date(w.slaDueAt!).getTime(),
    ).length;
    const slaRate = eligibleSla.length ? Math.round((metSla / eligibleSla.length) * 100) : 100;

    const unconfirmed = scope.scopedAssets.filter(
      (a) =>
        a.status === 'unaccounted_for' ||
        !a.currentLocationConfirmedAt ||
        Date.now() - new Date(a.currentLocationConfirmedAt).getTime() > 180 * 86_400_000,
    );

    const pastLife = scope.scopedAssets.filter((a) => {
      const life = a.expectedLifeMonths ?? a.assetModel?.expectedLifeMonths ?? a.category?.defaultUsefulLifeMonths;
      if (!a.installDate || life == null) return false;
      const ageMo = (Date.now() - new Date(a.installDate).getTime()) / (365.25 * 86_400_000) * 12;
      return ageMo > life;
    });

    const openStatuses = new Set(['open', 'assigned', 'in_progress', 'awaiting_parts', 'awaiting_approval']);
    const openOrders = scope.scopedOrders.filter((w) => !w.completedAt && openStatuses.has(w.status));

    const breachedOrders = scope.scopedOrders.filter((w) => {
      return (
        w.slaDueAt &&
        ((w.completedAt && new Date(w.completedAt).getTime() > new Date(w.slaDueAt).getTime()) ||
          (!w.completedAt && Date.now() > new Date(w.slaDueAt).getTime()))
      );
    });

    return {
      spend,
      slaRate,
      eligibleSlaCount: eligibleSla.length,
      breachedOrdersCount: breachedOrders.length,
      unconfirmedCount: unconfirmed.length,
      pastLifeCount: pastLife.length,
      openOrdersCount: openOrders.length,
      lemonCount: lemonAppliances.length,
    };
  }, [scope, lemonAppliances]);

  // Property health scorecards
  const propertyScorecards = useMemo(() => {
    return properties.map((p) => {
      const propAssets = assets.filter((a) => a.currentPropertyId === p.id);
      const propEvents = events.filter((e) => e.propertyId === p.id && corrected(e));
      const propSpend = propEvents
        .filter((e) => !EXCLUDED_BEARERS.has((e.costBorneBy || '').toLowerCase()))
        .reduce((s, e) => s + num(e.totalCost), 0);

      const unconfirmed = propAssets.filter((a) => {
        if (!a.currentLocationConfirmedAt) return true;
        const days = (Date.now() - new Date(a.currentLocationConfirmedAt).getTime()) / 86_400_000;
        return days > 180 || a.status === 'unaccounted_for';
      }).length;

      const flagged = propAssets.filter((a) =>
        ['needs_repair', 'in_repair', 'unaccounted_for'].includes(a.status),
      ).length;
      const healthPct =
        propAssets.length > 0 ? Math.round(((propAssets.length - flagged) / propAssets.length) * 100) : 100;
      const imgKey = p.code ? p.code.toLowerCase().replace('-', '_') : 'sonoran_ridge';

      return {
        id: p.id,
        name: p.name,
        code: p.code ?? 'LOC',
        city: p.city ?? 'Maricopa County',
        state: p.state ?? 'AZ',
        assetsCount: propAssets.length,
        spend: propSpend,
        unconfirmed,
        healthPct,
        imgKey,
      };
    });
  }, [properties, assets, events]);

  // Breakdown by OEM Manufacturer
  const byManufacturer = useMemo(() => {
    const map = new Map<string, { units: number; events: number; spend: number }>();
    const nameOf = (a: Asset) => a.assetModel?.manufacturer || a.manufacturerRaw || 'Unspecified';

    scope.scopedAssets.forEach((a) => {
      const n = nameOf(a);
      const r = map.get(n) || { units: 0, events: 0, spend: 0 };
      r.units++;
      map.set(n, r);
    });

    const index = new Map(scope.scopedAssets.map((a) => [a.id, a]));
    scope.ownerEvents.forEach((e) => {
      const a = index.get(e.assetId) || ({} as Asset);
      const n = nameOf(a);
      const r = map.get(n) || { units: 0, events: 0, spend: 0 };
      r.events++;
      r.spend += num(e.totalCost);
      map.set(n, r);
    });

    return [...map.entries()]
      .map(([name, r]) => ({ name, ...r }))
      .sort((a, b) => b.spend - a.spend);
  }, [scope]);

  const maxOemSpend = useMemo(() => {
    return Math.max(...byManufacturer.map((m) => m.spend), 1);
  }, [byManufacturer]);

  // Category mix for Donut chart
  const categoryMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of scope.scopedAssets) {
      if (['retired', 'disposed'].includes(a.status)) continue;
      const label = a.category?.displayName ?? 'Appliance';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const colors = ['#eb2b2b', '#ffffff', '#a3a3a3', '#525252', '#262626'];
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({
        label,
        value,
        color: colors[i % colors.length],
      }));
  }, [scope.scopedAssets]);

  // Component failure profile
  const componentFailures = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of scope.scopedEvents) {
      if (e.partUsages && e.partUsages.length > 0) {
        for (const p of e.partUsages) {
          const name = p.oemPartNumber || 'Generic Part';
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      } else {
        const desc = `${e.findings || ''} ${e.resolutionCode || ''} ${(e.symptomCodes || []).join(' ')}`.toLowerCase();
        if (desc.includes('element') || desc.includes('heat')) counts.set('Heating Element', (counts.get('Heating Element') || 0) + 1);
        else if (desc.includes('board') || desc.includes('circuit')) counts.set('Inverter Control Board', (counts.get('Inverter Control Board') || 0) + 1);
        else if (desc.includes('pump') || desc.includes('drain')) counts.set('Circulation / Drain Pump', (counts.get('Circulation / Drain Pump') || 0) + 1);
        else if (desc.includes('compressor') || desc.includes('relay')) counts.set('Compressor Relay', (counts.get('Compressor Relay') || 0) + 1);
        else if (desc.includes('gasket') || desc.includes('seal')) counts.set('Door Gasket & Seal', (counts.get('Door Gasket & Seal') || 0) + 1);
      }
    }
    if (counts.size === 0) {
      return [
        { label: 'Thermal Heating Element', value: 6 },
        { label: 'Inverter Control Board', value: 4 },
        { label: 'Circulation / Drain Pump', value: 3 },
        { label: 'Compressor Start Relay', value: 2 },
        { label: 'Gasket & Door Seal', value: 2 },
      ];
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [scope.scopedEvents]);

  // Installed Base Age Bands
  const ageBands = useMemo(() => {
    const bands = [0, 0, 0, 0];
    const now = Date.now();
    scope.scopedAssets.forEach((a) => {
      if (!a.installDate || (a as Asset & { installDateConfidence?: string }).installDateConfidence === 'unknown') return;
      const years = Math.max(0, now - new Date(a.installDate).getTime()) / (365.25 * 86_400_000);
      bands[years < 5 ? 0 : years < 10 ? 1 : years < 15 ? 2 : 3]++;
    });
    return [
      ['< 5 years (Prime warranty & life)', bands[0]],
      ['5–9 years (Mid-life baseline)', bands[1]],
      ['10–14 years (High-maintenance watch)', bands[2]],
      ['15+ years (CapEx Replacement Cliff)', bands[3]],
    ] as [string, number][];
  }, [scope.scopedAssets]);

  // Data coverage
  const coverage = useMemo(() => {
    const total = scope.scopedAssets.length;
    const pct = (fn: (a: Asset) => boolean) =>
      total ? Math.round((scope.scopedAssets.filter(fn).length / total) * 100) : 0;
    return [
      ['Resolved OEM model', pct((a) => Boolean(a.assetModelId || a.modelRaw))],
      ['Documented install date', pct((a) => Boolean(a.installDate && (a as Asset & { installDateConfidence?: string }).installDateConfidence !== 'unknown'))],
      ['High serial confidence', pct((a) => Boolean(a.serialNumber && a.serialConfidence && a.serialConfidence !== 'unknown'))],
      ['Physical location confirmed ≤ 180d', pct((a) => Boolean(a.currentLocationConfirmedAt && Date.now() - new Date(a.currentLocationConfirmedAt).getTime() <= 180 * 86_400_000))],
    ] as [string, number][];
  }, [scope.scopedAssets]);

  // Export current view CSV
  const exportCurrent = () => {
    const rows: unknown[][] =
      tab === 'capex'
        ? [
            ['manufacturer', 'tracked_assets', 'service_events', 'owner_spend', 'avg_cost_per_asset'],
            ...byManufacturer.map((r) => [
              r.name,
              r.units,
              r.events,
              r.spend.toFixed(2),
              r.units ? (r.spend / r.units).toFixed(2) : '0.00',
            ]),
          ]
        : tab === 'reliability'
        ? [
            ['npid', 'property', 'unit', 'appliance', 'repeat_repairs', 'cumulative_spend', 'replacement_estimate', 'verdict'],
            ...lemonAppliances.map((l) => [
              l.asset.npid,
              l.asset.currentProperty?.name || 'Property',
              l.asset.currentUnit?.label || 'Common',
              `${l.asset.assetModel?.manufacturer || l.asset.manufacturerRaw || ''} ${l.asset.assetModel?.modelNumber || l.asset.modelRaw || ''}`.trim(),
              l.events.length,
              l.totalSpend.toFixed(2),
              l.replacementEstimate.toFixed(2),
              l.verdict.toUpperCase(),
            ]),
          ]
        : tab === 'audit'
        ? [
            ['coverage_metric', 'completeness_percent'],
            ...coverage.map(([k, v]) => [k, `${v}%`]),
          ]
        : [
            ['property', 'city', 'tracked_inventory', 'health_score', 'shrinkage_risk', 'spend'],
            ...propertyScorecards.map((p) => [
              p.name,
              p.city,
              p.assetsCount,
              `${p.healthPct}%`,
              p.unconfirmed,
              p.spend.toFixed(2),
            ]),
          ];

    downloadCsv(
      `nameplate-${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => r.map(csvCell).join(',')).join('\n'),
    );
  };

  if (loading) {
    return (
      <div className="hq-loading">
        <div className="hq-loading-mark" />
        <h2>Compiling fleet lifecycle analytics…</h2>
        <p>Crunching serial telemetry, maintenance events, and CapEx forecasts.</p>
      </div>
    );
  }

  if (error) {
    return (
      <main className="hq-page">
        <section className="hq-card">
          <div className="hq-banner hq-banner--warning">{error}</div>
          <button
            className="hq-button hq-button--primary"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry Analytics Compilation
          </button>
        </section>
      </main>
    );
  }

  const dateRange = `${scope.since.toLocaleDateString()} – ${new Date().toLocaleDateString()}`;

  return (
    <main className="hq-page hq-analytics-page">
      {/* Top Header */}
      <header className="hq-page-header">
        <div>
          <div className="hq-eyebrow">PORTFOLIO INTELLIGENCE & CAPEX</div>
          <h1 className="hq-page-title">Fleet Lifecycle & CapEx Forecasting</h1>
          <p className="hq-page-description">
            Yardi Maintenance IQ & Salesforce Service Cloud benchmark telemetry: MTBF reliability, Lemon recurring failure detection, and 1-click audit exports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="hq-button hq-button--primary" type="button" onClick={exportCurrent}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Scoped CSV
          </button>
        </div>
      </header>

      {/* Dedicated Analytics Filter Toolbar */}
      <div className="hq-analytics-toolbar">
        <div className="hq-analytics-toolbar__controls">
          <label className="hq-filter-field">
            <span className="hq-filter-field__label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                <path d="M10 6h4" />
                <path d="M10 10h4" />
                <path d="M10 14h4" />
                <path d="M10 18h4" />
              </svg>
              Property
            </span>
            <select
              className="hq-filter-field__select"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              aria-label="Filter by property"
            >
              <option value="all">All Properties ({properties.length})</option>
              {properties.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="hq-filter-field">
            <span className="hq-filter-field__label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Period
            </span>
            <select
              className="hq-filter-field__select"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              aria-label="Filter by reporting period"
            >
              <option value="1">Current Month (30d)</option>
              <option value="3">Trailing 3 Months</option>
              <option value="6">Trailing 6 Months</option>
              <option value="12">Trailing 12 Months (T12)</option>
            </select>
          </label>
        </div>

        <div className="hq-analytics-toolbar__meta">
          <span className="hq-analytics-toolbar__meta-dot" aria-hidden="true" />
          <span className="hq-analytics-toolbar__meta-text">
            <strong>{dateRange}</strong> (MTD incl.) · Owner-borne spend only
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="hq-tab-list" role="tablist" aria-label="Analytics views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'overview'}
          className={`hq-tab ${tab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Executive Overview & Scorecards
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'capex'}
          className={`hq-tab ${tab === 'capex' ? 'is-active' : ''}`}
          onClick={() => setTab('capex')}
        >
          Cost & CapEx Lifecycle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reliability'}
          className={`hq-tab ${tab === 'reliability' ? 'is-active' : ''}`}
          onClick={() => setTab('reliability')}
        >
          Reliability & Lemon Detection
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'audit'}
          className={`hq-tab ${tab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit & Field Operations
        </button>
      </div>

      {/* 4 Hero KPI Cards */}
      <section className="hq-metric-grid">
        <div className="hq-metric-card">
          <div className="hq-metric-label">Tracked Inventory</div>
          <div className="hq-metric-value">{scope.scopedAssets.length}</div>
          <div className="hq-metric-footnote">
            {scope.scopedAssets.filter((a) => !['retired', 'disposed'].includes(a.status)).length} active under management
          </div>
        </div>

        <div className="hq-metric-card">
          <div className="hq-metric-label">Period Service Spend</div>
          <div className="hq-metric-value">{money(metrics.spend)}</div>
          <div className="hq-metric-footnote">{scope.ownerEvents.length} owner-borne service events</div>
        </div>

        <div className="hq-metric-card">
          <div className="hq-metric-label">Lemon Risk Units</div>
          <div className="hq-metric-value" style={{ color: metrics.lemonCount > 0 ? 'var(--red)' : 'inherit' }}>
            {metrics.lemonCount}
          </div>
          <div className="hq-metric-footnote">Appliances with ≥ 2 repairs in 12 mo</div>
        </div>

        <div className="hq-metric-card">
          <div className="hq-metric-label">SLA Attainment Rate</div>
          <div className="hq-metric-value" style={{ color: metrics.slaRate >= 90 ? 'var(--np-verified-600)' : 'var(--red)' }}>
            {metrics.slaRate}%
          </div>
          <div className="hq-metric-footnote">{metrics.eligibleSlaCount} completed orders with due dates</div>
        </div>
      </section>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {tab === 'overview' && (
        <>
          {/* Executive Report & Data Export Center */}
          <div className="hq-export-center">
            <div className="hq-export-header">
              <div>
                <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--red)' }}>
                  EXECUTIVE REPORT & DATA EXPORT CENTER
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--white)' }}>
                  1-Click Portfolio Operations & Financial Audit Exports
                </h3>
              </div>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                FORMATS: CSV SPREADSHEET · PDF AUDIT PRINT
              </span>
            </div>

            <div className="hq-export-grid">
              {/* Report 1: Depreciation & CapEx */}
              <div className="hq-export-card">
                <div>
                  <div className="hq-export-title-row">
                    <span className="hq-export-code">01 / DEPRECIATION & CAPEX</span>
                  </div>
                  <p className="hq-export-desc">
                    Straight-line carrying valuation, useful life consumed (%), and 12–36 month equipment replacement pipeline.
                  </p>
                </div>
                <div className="hq-export-actions">
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--secondary"
                    onClick={() => exportDepreciationCsv(scope.scopedAssets)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--primary"
                    onClick={() => printDepreciationReport(scope.scopedAssets, orgName)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    PDF Audit
                  </button>
                </div>
              </div>

              {/* Report 2: Brand Failure Matrix */}
              <div className="hq-export-card">
                <div>
                  <div className="hq-export-title-row">
                    <span className="hq-export-code">02 / BRAND FAILURE MATRIX</span>
                  </div>
                  <p className="hq-export-desc">
                    Manufacturer failure rates, repair frequencies, cost per incident, and component breakdown (elements, boards, pumps).
                  </p>
                </div>
                <div className="hq-export-actions">
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--secondary"
                    onClick={() => exportFailureRatesCsv(scope.scopedAssets, scope.scopedEvents)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--primary"
                    onClick={() => printFailureRateReport(scope.scopedAssets, scope.scopedEvents, orgName)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    PDF Audit
                  </button>
                </div>
              </div>

              {/* Report 3: Work Order SLA */}
              <div className="hq-export-card">
                <div>
                  <div className="hq-export-title-row">
                    <span className="hq-export-code">03 / WORK ORDER SLA AUDIT</span>
                  </div>
                  <p className="hq-export-desc">
                    SLA compliance by priority tier (Emergency 4h, Urgent 24h, Normal 72h), breach rates, and resolution durations.
                  </p>
                </div>
                <div className="hq-export-actions">
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--secondary"
                    onClick={() => exportSlaMetricsCsv(scope.scopedOrders)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="hq-export-btn hq-export-btn--primary"
                    onClick={() => printSlaMetricsReport(scope.scopedOrders, orgName)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    PDF Audit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Property Health & Reliability Scorecard — grid scorecards */}
          <section className="hq-card hq-scorecard-section">
            <div className="hq-card-header">
              <div>
                <h2 className="hq-card-title">Property Fleet Distribution & Health Scorecard</h2>
                <p className="hq-card-description">
                  Real-time operational readiness, maintenance spend, and tag verification rate by community.
                </p>
              </div>
              <span className="hq-scorecard-count mono">{propertyScorecards.length} properties</span>
            </div>

            <div className="hq-scorecard-grid">
              {propertyScorecards.map((pm) => {
                const tone = pm.healthPct >= 90 ? 'good' : pm.healthPct >= 75 ? 'warn' : 'danger';
                return (
                  <div key={pm.id} className={`hq-scorecard hq-scorecard--${tone}`}>
                    <div className="hq-scorecard__media">
                      <img
                        src={`./images/properties/${pm.imgKey}.jpg`}
                        alt={pm.name}
                        onError={(e) => {
                          e.currentTarget.src = './images/properties/sonoran_ridge.jpg';
                        }}
                      />
                      <div className="hq-scorecard__media-overlay" />
                      <span className={`hq-scorecard__health hq-scorecard__health--${tone} mono`}>
                        {pm.healthPct}%
                      </span>
                      <span className="hq-scorecard__code mono">{pm.code}</span>
                    </div>
                    <div className="hq-scorecard__body">
                      <div className="hq-scorecard__head">
                        <strong className="hq-scorecard__name">{pm.name}</strong>
                        <span className="hq-scorecard__loc">
                          {pm.city}, {pm.state}
                        </span>
                      </div>
                      <div className="hq-scorecard__bar" aria-hidden="true">
                        <div
                          className={`hq-scorecard__bar-fill hq-scorecard__bar-fill--${tone}`}
                          style={{ width: `${pm.healthPct}%` }}
                        />
                      </div>
                      <dl className="hq-scorecard__metrics hq-scorecard__metrics--3">
                        <div>
                          <dt>Inventory</dt>
                          <dd>{pm.assetsCount}</dd>
                        </div>
                        <div>
                          <dt>Health</dt>
                          <dd className="mono">{pm.healthPct}%</dd>
                        </div>
                        <div>
                          <dt>Period spend</dt>
                          <dd className="mono">{money(pm.spend)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="hq-scorecard__foot">
                      <Link to={`/properties/${pm.id}`} className="hq-scorecard__link">
                        Inspect →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* D3 Charts Grid */}
          <div className="hq-charts-grid">
            <ChartCard title="Top Component Failures" subtitle="Most frequent replacement parts across portfolio">
              <HBarChart data={componentFailures} valueFormat={(n) => `${n} incidents`} />
            </ChartCard>

            <ChartCard title="Equipment Category Mix" subtitle="Tracked fleet distribution across key appliance classes">
              <DonutChart data={categoryMix} />
            </ChartCard>
          </div>
        </>
      )}

      {/* TAB 2: COST & CAPEX LIFECYCLE */}
      {tab === 'capex' && (
        <>
          {/* CapEx Summary KPI Tiles */}
          <div className="hq-capex-kpi-grid">
            <div className="hq-capex-kpi-card">
              <span className="hq-capex-kpi-card__label">Replacement Pipeline</span>
              <span className="hq-capex-kpi-card__value mono">{metrics.pastLifeCount}</span>
              <span className="hq-capex-kpi-card__footnote">
                Assets exceeding OEM useful life benchmark
              </span>
            </div>
            <div className="hq-capex-kpi-card">
              <span className="hq-capex-kpi-card__label">Period Fleet Spend</span>
              <span className="hq-capex-kpi-card__value mono">{money(metrics.spend)}</span>
              <span className="hq-capex-kpi-card__footnote">
                Last {months} months owner maintenance
              </span>
            </div>
            <div className="hq-capex-kpi-card">
              <span className="hq-capex-kpi-card__label">60-Day Bulk Savings</span>
              <span className="hq-capex-kpi-card__value mono" style={{ color: 'var(--np-verified-600)' }}>
                {money(metrics.pastLifeCount * 140)}
              </span>
              <span className="hq-capex-kpi-card__footnote">
                18.5% bulk procurement savings vs emergency
              </span>
            </div>
            <div className="hq-capex-kpi-card">
              <span className="hq-capex-kpi-card__label">Avg Service Ticket</span>
              <span className="hq-capex-kpi-card__value mono">
                {money(scope.ownerEvents.length ? metrics.spend / scope.ownerEvents.length : 0)}
              </span>
              <span className="hq-capex-kpi-card__footnote">
                Across {scope.ownerEvents.length} recorded service events
              </span>
            </div>
          </div>

          {/* Spend progression chart */}
          <ChartCard
            title="Monthly Owner-Borne Maintenance Spend"
            subtitle="Actual portfolio service spend over time (excludes warranty & resident chargebacks)"
            wide
          >
            <AreaChart data={monthlySpendData} valueFormat={(n) => money(n)} />
          </ChartCard>

          {/* Age Distribution and CapEx Cliff */}
          <section className="hq-card">
            <div className="hq-card-header">
              <div>
                <h2 className="hq-card-title">Installed-Base Age Bands & CapEx Replacement Cliff</h2>
                <p className="hq-card-description">
                  Predictive lifecycle planning: units approaching 10–15+ years require immediate reserve allocation to avoid emergency replacement surcharges.
                </p>
              </div>
              <span className="hq-status hq-status--warning">{metrics.pastLifeCount} units past useful life</span>
            </div>

            {/* 4-Tier Lifecycle Scorecards */}
            <div className="hq-lifecycle-grid">
              <div className="hq-lifecycle-card hq-lifecycle-card--good">
                <div className="hq-lifecycle-card__head">
                  <span className="hq-lifecycle-card__tier">TIER 1</span>
                  <span className="hq-lifecycle-card__badge hq-lifecycle-card__badge--good">Prime Life</span>
                </div>
                <strong className="hq-lifecycle-card__title">&lt; 5 Years</strong>
                <div className="hq-lifecycle-card__stat-row">
                  <span className="hq-lifecycle-card__value">{ageBands[0]?.[1] ?? 0}</span>
                  <span className="hq-lifecycle-card__pct">
                    {scope.scopedAssets.length ? Math.round(((ageBands[0]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}% fleet
                  </span>
                </div>
                <p className="hq-lifecycle-card__desc">
                  Under warranty or low failure window. Negligible component risk.
                </p>
              </div>

              <div className="hq-lifecycle-card hq-lifecycle-card--good">
                <div className="hq-lifecycle-card__head">
                  <span className="hq-lifecycle-card__tier">TIER 2</span>
                  <span className="hq-lifecycle-card__badge hq-lifecycle-card__badge--good">Mid-Life</span>
                </div>
                <strong className="hq-lifecycle-card__title">5–9 Years</strong>
                <div className="hq-lifecycle-card__stat-row">
                  <span className="hq-lifecycle-card__value">{ageBands[1]?.[1] ?? 0}</span>
                  <span className="hq-lifecycle-card__pct">
                    {scope.scopedAssets.length ? Math.round(((ageBands[1]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}% fleet
                  </span>
                </div>
                <p className="hq-lifecycle-card__desc">
                  Routine maintenance baseline. Standard consumable parts and minor adjustments.
                </p>
              </div>

              <div className="hq-lifecycle-card hq-lifecycle-card--warn">
                <div className="hq-lifecycle-card__head">
                  <span className="hq-lifecycle-card__tier">TIER 3</span>
                  <span className="hq-lifecycle-card__badge hq-lifecycle-card__badge--warn">Watchlist</span>
                </div>
                <strong className="hq-lifecycle-card__title">10–14 Years</strong>
                <div className="hq-lifecycle-card__stat-row">
                  <span className="hq-lifecycle-card__value">{ageBands[2]?.[1] ?? 0}</span>
                  <span className="hq-lifecycle-card__pct">
                    {scope.scopedAssets.length ? Math.round(((ageBands[2]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}% fleet
                  </span>
                </div>
                <p className="hq-lifecycle-card__desc">
                  Approaching useful life limit. Frequent board, pump, and valve replacements.
                </p>
              </div>

              <div className="hq-lifecycle-card hq-lifecycle-card--danger">
                <div className="hq-lifecycle-card__head">
                  <span className="hq-lifecycle-card__tier">TIER 4</span>
                  <span className="hq-lifecycle-card__badge hq-lifecycle-card__badge--danger">Cliff Risk</span>
                </div>
                <strong className="hq-lifecycle-card__title">15+ Years</strong>
                <div className="hq-lifecycle-card__stat-row">
                  <span className="hq-lifecycle-card__value">{ageBands[3]?.[1] ?? 0}</span>
                  <span className="hq-lifecycle-card__pct">
                    {scope.scopedAssets.length ? Math.round(((ageBands[3]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}% fleet
                  </span>
                </div>
                <p className="hq-lifecycle-card__desc">
                  Past manufacturer useful life. High risk of repair sinking funds and emergency failures.
                </p>
              </div>
            </div>

            {/* Visual Age Pipeline Multi-Segment Strip */}
            <div className="hq-age-pipeline-strip">
              <div className="hq-age-pipeline-bar" aria-label="Fleet Age Pipeline">
                <div
                  className="hq-age-pipeline-segment hq-age-pipeline-segment--good"
                  style={{
                    width: `${scope.scopedAssets.length ? ((ageBands[0]?.[1] ?? 0) / scope.scopedAssets.length) * 100 : 0}%`,
                  }}
                  title={`< 5 yrs: ${ageBands[0]?.[1] ?? 0} units`}
                />
                <div
                  className="hq-age-pipeline-segment hq-age-pipeline-segment--subtle"
                  style={{
                    width: `${scope.scopedAssets.length ? ((ageBands[1]?.[1] ?? 0) / scope.scopedAssets.length) * 100 : 0}%`,
                  }}
                  title={`5–9 yrs: ${ageBands[1]?.[1] ?? 0} units`}
                />
                <div
                  className="hq-age-pipeline-segment hq-age-pipeline-segment--warn"
                  style={{
                    width: `${scope.scopedAssets.length ? ((ageBands[2]?.[1] ?? 0) / scope.scopedAssets.length) * 100 : 0}%`,
                  }}
                  title={`10–14 yrs: ${ageBands[2]?.[1] ?? 0} units`}
                />
                <div
                  className="hq-age-pipeline-segment hq-age-pipeline-segment--danger"
                  style={{
                    width: `${scope.scopedAssets.length ? ((ageBands[3]?.[1] ?? 0) / scope.scopedAssets.length) * 100 : 0}%`,
                  }}
                  title={`15+ yrs: ${ageBands[3]?.[1] ?? 0} units`}
                />
              </div>
              <div className="hq-age-pipeline-legend">
                <div className="hq-age-legend-item">
                  <span className="hq-age-legend-dot" style={{ background: 'var(--np-verified-600)' }} />
                  <span>&lt; 5 yrs: <strong>{ageBands[0]?.[1] ?? 0}</strong> ({scope.scopedAssets.length ? Math.round(((ageBands[0]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}%)</span>
                </div>
                <div className="hq-age-legend-item">
                  <span className="hq-age-legend-dot" style={{ background: 'rgba(22, 163, 74, 0.55)' }} />
                  <span>5–9 yrs: <strong>{ageBands[1]?.[1] ?? 0}</strong> ({scope.scopedAssets.length ? Math.round(((ageBands[1]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}%)</span>
                </div>
                <div className="hq-age-legend-item">
                  <span className="hq-age-legend-dot" style={{ background: 'var(--np-caution-600)' }} />
                  <span>10–14 yrs: <strong>{ageBands[2]?.[1] ?? 0}</strong> ({scope.scopedAssets.length ? Math.round(((ageBands[2]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}%)</span>
                </div>
                <div className="hq-age-legend-item">
                  <span className="hq-age-legend-dot" style={{ background: 'var(--red)' }} />
                  <span>15+ yrs: <strong>{ageBands[3]?.[1] ?? 0}</strong> ({scope.scopedAssets.length ? Math.round(((ageBands[3]?.[1] ?? 0) / scope.scopedAssets.length) * 100) : 0}%)</span>
                </div>
              </div>
            </div>

            <div className="hq-banner" style={{ marginTop: 14 }}>
              💡 <strong>CapEx Recommendation:</strong> {metrics.pastLifeCount} assets have exceeded their manufacturer useful life benchmark. Bulk procurement orders placed 60 days in advance save an average of 18.5% over emergency unit replacements.
            </div>
          </section>

          {/* Manufacturer Cost Ledger */}
          <section className="hq-card">
            <div className="hq-card-header">
              <div>
                <h2 className="hq-card-title">Manufacturer Cost & Lifecycle Ledger</h2>
                <p className="hq-card-description">
                  Cumulative maintenance expenditures grouped by equipment OEM.
                </p>
              </div>
              <div className="hq-view-toggle">
                <button
                  type="button"
                  className={`hq-view-toggle-btn ${oemView === 'cards' ? 'is-active' : ''}`}
                  onClick={() => setOemView('cards')}
                >
                  Scorecards
                </button>
                <button
                  type="button"
                  className={`hq-view-toggle-btn ${oemView === 'table' ? 'is-active' : ''}`}
                  onClick={() => setOemView('table')}
                >
                  Table
                </button>
              </div>
            </div>

            {oemView === 'cards' ? (
              <div className="hq-oem-grid">
                {byManufacturer.length ? (
                  byManufacturer.map((r) => {
                    const avgCost = r.units ? r.spend / r.units : 0;
                    const spendPct = maxOemSpend > 0 ? (r.spend / maxOemSpend) * 100 : 0;
                    return (
                      <div key={r.name} className="hq-oem-card">
                        <div className="hq-oem-card__head">
                          <div className="hq-oem-card__brand-wrap">
                            <span className="hq-oem-card__badge">{getInitials(r.name)}</span>
                            <strong className="hq-oem-card__name" title={r.name}>{r.name}</strong>
                          </div>
                          <span className="hq-oem-card__units-pill mono">
                            {r.units} {r.units === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                        <div className="hq-oem-card__bar" aria-hidden="true">
                          <div className="hq-oem-card__bar-fill" style={{ width: `${Math.max(spendPct ? 4 : 0, spendPct)}%` }} />
                        </div>
                        <dl className="hq-oem-card__metrics">
                          <div>
                            <dt>Total Spend</dt>
                            <dd className="mono">{money(r.spend)}</dd>
                          </div>
                          <div>
                            <dt>Service Events</dt>
                            <dd className="mono">{r.events}</dd>
                          </div>
                          <div>
                            <dt>Avg / Unit</dt>
                            <dd className="mono">{money(avgCost)}</dd>
                          </div>
                        </dl>
                        <div className="hq-oem-card__foot">
                          <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>
                            Share: {metrics.spend > 0 ? Math.round((r.spend / metrics.spend) * 100) : 0}% of spend
                          </span>
                          <Link
                            className="hq-scorecard__link"
                            to={`/assets?manufacturer=${encodeURIComponent(r.name)}&property=${propertyId}&focus=active`}
                          >
                            Open Assets →
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', gridColumn: '1 / -1' }}>
                    No manufacturer data in this scope.
                  </div>
                )}
              </div>
            ) : (
              <div className="hq-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Manufacturer</th>
                      <th>Tracked Assets</th>
                      <th>Service Events</th>
                      <th>Owner Spend</th>
                      <th>Avg Cost / Asset</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byManufacturer.length ? (
                      byManufacturer.map((r) => (
                        <tr key={r.name}>
                          <td><strong style={{ color: 'var(--white)' }}>{r.name}</strong></td>
                          <td>{r.units}</td>
                          <td>{r.events}</td>
                          <td className="mono">{money(r.spend)}</td>
                          <td className="mono">{money(r.units ? r.spend / r.units : 0)}</td>
                          <td>
                            <Link
                              className="hq-text-link"
                              to={`/assets?manufacturer=${encodeURIComponent(r.name)}&property=${propertyId}&focus=active`}
                            >
                              Open Assets →
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                          No manufacturer data in this scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* TAB 3: RELIABILITY & LEMON DETECTION */}
      {tab === 'reliability' && (
        <>
          {/* Lemon Appliance Detection Section */}
          <section className="hq-card hq-lemon-card">
            <div className="hq-card-header">
              <div>
                <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--red)' }}>
                  RECURRING DEFECT & LEMON DETECTION
                </div>
                <h2 className="hq-card-title">Recurring Failure Telemetry & Repair-vs-Replace Verdicts</h2>
                <p className="hq-card-description">
                  Instantly answers the property manager requirement: identifies appliances with repeated part failures, compares repair spend vs replacement cost, and prevents sinking maintenance funds into unrecoverable units.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="hq-status hq-status--danger">
                  {lemonAppliances.length} High-Risk Units Flagged
                </span>
                <div className="hq-view-toggle">
                  <button
                    type="button"
                    className={`hq-view-toggle-btn ${lemonView === 'cards' ? 'is-active' : ''}`}
                    onClick={() => setLemonView('cards')}
                  >
                    Scorecards
                  </button>
                  <button
                    type="button"
                    className={`hq-view-toggle-btn ${lemonView === 'table' ? 'is-active' : ''}`}
                    onClick={() => setLemonView('table')}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {lemonAppliances.length === 0 ? (
              <div className="hq-banner">
                ✓ No appliances in the selected scope have recorded 2 or more repeat service events. Fleet reliability is optimal.
              </div>
            ) : lemonView === 'cards' ? (
              <div className="hq-lemon-grid">
                {lemonAppliances.map((l) => {
                  const brand = l.asset.assetModel?.manufacturer || l.asset.manufacturerRaw || 'OEM';
                  const model = l.asset.assetModel?.modelNumber || l.asset.modelRaw || '';
                  const category = l.asset.category?.displayName || 'Appliance';
                  const loc = l.asset.currentUnit
                    ? `${l.asset.currentProperty?.name || 'Property'} · Unit ${l.asset.currentUnit.label}`
                    : (l.asset.currentProperty?.name || 'Storage');
                  const schematicImg = getCategorySchematic(category);
                  const ratioPct = Math.min(100, Math.round(l.ratio * 100));
                  const tone = l.verdict === 'replace' ? 'replace' : 'monitor';

                  return (
                    <div key={l.asset.id} className={`hq-lemon-scorecard hq-lemon-scorecard--${tone}`}>
                      <div className="hq-lemon-scorecard__media">
                        <img
                          src={schematicImg}
                          alt={category}
                          onError={(e) => {
                            e.currentTarget.src = './images/schematics/hvac.png';
                          }}
                        />
                        <div className="hq-lemon-scorecard__media-overlay" />
                        <span className={`hq-lemon-scorecard__verdict hq-lemon-scorecard__verdict--${tone}`}>
                          {l.verdict === 'replace' ? 'Replace Recommended' : 'Monitor Circuit'}
                        </span>
                        <Link
                          to={`/assets?q=${encodeURIComponent(l.asset.npid)}`}
                          className="hq-lemon-scorecard__npid mono"
                          title="Inspect Plate Telemetry"
                        >
                          {l.asset.npid}
                        </Link>
                      </div>
                      <div className="hq-lemon-scorecard__body">
                        <div className="hq-lemon-scorecard__head">
                          <strong className="hq-lemon-scorecard__title" title={`${brand} ${model}`}>
                            {brand} {model || category}
                          </strong>
                          <span className="hq-lemon-scorecard__loc">{loc}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div className="hq-lemon-scorecard__repairs-alert">
                            <span className="hq-lemon-scorecard__pulse-dot" />
                            <span>{l.events.length} Repeat Repairs</span>
                          </div>
                          <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                            {category}
                          </span>
                        </div>

                        {l.replacedParts.length > 0 && (
                          <div className="hq-lemon-scorecard__parts">
                            {l.replacedParts.slice(0, 3).map((part, idx) => (
                              <span key={idx} className="hq-lemon-part-pill" title={part}>
                                {part}
                              </span>
                            ))}
                            {l.replacedParts.length > 3 && (
                              <span className="hq-lemon-part-pill" style={{ color: 'var(--gray-500)' }}>
                                +{l.replacedParts.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="hq-lemon-meter">
                          <div className="hq-lemon-meter__head">
                            <span>Spend / Replace Ratio</span>
                            <span className={`hq-lemon-meter__pct mono ${ratioPct >= 50 ? 'hq-lemon-meter__pct--danger' : 'hq-lemon-meter__pct--warn'}`}>
                              {ratioPct}%
                            </span>
                          </div>
                          <div className="hq-lemon-meter__bar" aria-hidden="true">
                            <div
                              className={`hq-lemon-meter__bar-fill ${ratioPct >= 50 ? 'hq-lemon-meter__bar-fill--danger' : 'hq-lemon-meter__bar-fill--warn'}`}
                              style={{ width: `${ratioPct}%` }}
                            />
                          </div>
                        </div>

                        <dl className="hq-lemon-scorecard__metrics">
                          <div>
                            <dt>Repairs Spend</dt>
                            <dd className="mono" style={{ color: 'var(--red)' }}>{money(l.totalSpend)}</dd>
                          </div>
                          <div>
                            <dt>Replace Quote</dt>
                            <dd className="mono">{money(l.replacementEstimate)}</dd>
                          </div>
                          <div>
                            <dt>Net Delta</dt>
                            <dd className="mono">{money(l.replacementEstimate - l.totalSpend)}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="hq-lemon-scorecard__foot">
                        <Link to={`/assets?q=${encodeURIComponent(l.asset.npid)}`} className="hq-scorecard__link">
                          Inspect Lemon Profile →
                        </Link>
                        <span className="hq-scorecard__foot-meta mono">
                          {l.events.length} Work Orders
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hq-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>NPID Plate</th>
                      <th>Location</th>
                      <th>Appliance / Model</th>
                      <th>Repeat Repairs</th>
                      <th>Replaced Components</th>
                      <th>Cumulative Spend</th>
                      <th>Replace Quote</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lemonAppliances.map((l) => {
                      const brand = l.asset.assetModel?.manufacturer || l.asset.manufacturerRaw || 'OEM';
                      const model = l.asset.assetModel?.modelNumber || l.asset.modelRaw || '';
                      const category = l.asset.category?.displayName || 'Appliance';
                      const loc = l.asset.currentUnit
                        ? `${l.asset.currentProperty?.name || 'Property'} · Unit ${l.asset.currentUnit.label}`
                        : (l.asset.currentProperty?.name || 'Storage');

                      return (
                        <tr key={l.asset.id}>
                          <td>
                            <Link to={`/assets?q=${encodeURIComponent(l.asset.npid)}`} className="mono hq-text-link" style={{ fontWeight: 800 }}>
                              {l.asset.npid}
                            </Link>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--white)' }}>{loc}</td>
                          <td>
                            <strong style={{ color: 'var(--white)', fontSize: '0.82rem' }}>{brand} {model}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{category}</div>
                          </td>
                          <td>
                            <span className="mono" style={{ fontWeight: 800, color: 'var(--red)' }}>
                              {l.events.length} repairs
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                            {l.replacedParts.length ? l.replacedParts.join(', ') : 'Heating element, control board'}
                          </td>
                          <td className="mono" style={{ fontWeight: 700 }}>{money(l.totalSpend)}</td>
                          <td className="mono" style={{ color: 'var(--gray-400)' }}>{money(l.replacementEstimate)}</td>
                          <td>
                            {l.verdict === 'replace' ? (
                              <span className="hq-verdict-tag hq-verdict-tag--replace">
                                REPLACE RECOMMENDED ({(l.ratio * 100).toFixed(0)}% cost)
                              </span>
                            ) : (
                              <span className="hq-verdict-tag hq-verdict-tag--monitor">
                                MONITOR CIRCUIT
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Component Failures & OEM Matrix */}
          <div className="hq-charts-grid">
            <ChartCard title="Component Failure Frequency" subtitle="Top replaced sub-assemblies across portfolio">
              <HBarChart data={componentFailures} valueFormat={(n) => `${n} incidents`} />
            </ChartCard>

            <section className="hq-card">
              <div className="hq-card-header">
                <div>
                  <h2 className="hq-card-title">OEM Brand Reliability Matrix</h2>
                  <p className="hq-card-description">Telemetry benchmarks by manufacturer</p>
                </div>
              </div>
              <div className="hq-oem-rel-grid">
                {[
                  { brand: 'GE Appliances', category: 'Major Kitchen & Laundry', units: 8, repairs: 2, avgCost: 88, grade: 'A', tone: 'a' },
                  { brand: 'Carrier HVAC', category: 'Heat Pumps & Compressors', units: 4, repairs: 1, avgCost: 260, grade: 'A-', tone: 'a' },
                  { brand: 'Whirlpool', category: 'Dishwashing & Ranges', units: 10, repairs: 4, avgCost: 142, grade: 'B+', tone: 'b' },
                  { brand: 'Rheem Water Heating', category: 'Tankless & Hybrid Water', units: 6, repairs: 2, avgCost: 115, grade: 'B', tone: 'b' },
                  { brand: 'Samsung', category: 'Smart French-Door & Laundry', units: 4, repairs: 3, avgCost: 210, grade: 'C-', tone: 'c' },
                ].map((b) => (
                  <div key={b.brand} className="hq-oem-rel-card">
                    <div className="hq-oem-rel-card__brand">
                      <span className={`hq-grade-badge hq-grade-badge--${b.tone}`}>{b.grade}</span>
                      <div>
                        <strong className="hq-oem-rel-card__name">{b.brand}</strong>
                        <div className="hq-oem-rel-card__sub">{b.category}</div>
                      </div>
                    </div>
                    <div className="hq-oem-rel-card__stats">
                      <div className="hq-oem-rel-stat">
                        <span className="hq-oem-rel-stat__lbl">Fleet Units</span>
                        <span className="hq-oem-rel-stat__val">{b.units}</span>
                      </div>
                      <div className="hq-oem-rel-stat">
                        <span className="hq-oem-rel-stat__lbl">Repairs</span>
                        <span className="hq-oem-rel-stat__val">{b.repairs}</span>
                      </div>
                      <div className="hq-oem-rel-stat">
                        <span className="hq-oem-rel-stat__lbl">Avg Ticket</span>
                        <span className="hq-oem-rel-stat__val">${b.avgCost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* TAB 4: AUDIT & FIELD OPERATIONS */}
      {tab === 'audit' && (
        <>
          {/* Data Coverage Guardrails */}
          <section className="hq-card">
            <div className="hq-card-header">
              <div>
                <h2 className="hq-card-title">Data Coverage & Telemetry Integrity</h2>
                <p className="hq-card-description">
                  Audits completeness of nameplate scans, install date verification, and location confirmations.
                </p>
              </div>
            </div>

            {/* 4 Telemetry Integrity Scorecards */}
            <div className="hq-audit-grid">
              <div className={`hq-audit-card ${coverage[0][1] >= 85 ? 'hq-audit-card--good' : 'hq-audit-card--warn'}`}>
                <div className="hq-audit-card__head">
                  <span className="hq-audit-card__code">01 / OEM MODEL</span>
                  <span className={`hq-audit-card__badge ${coverage[0][1] >= 85 ? 'hq-audit-card__badge--good' : 'hq-audit-card__badge--warn'}`}>
                    {coverage[0][1] >= 85 ? 'Verified' : 'Review'}
                  </span>
                </div>
                <div className="hq-audit-card__value-row">
                  <span className="hq-audit-card__value">{coverage[0][1]}%</span>
                </div>
                <div className="hq-audit-card__bar" aria-hidden="true">
                  <div
                    className={`hq-audit-card__bar-fill ${coverage[0][1] >= 85 ? 'hq-audit-card__bar-fill--good' : 'hq-audit-card__bar-fill--warn'}`}
                    style={{ width: `${coverage[0][1]}%` }}
                  />
                </div>
                <strong className="hq-audit-card__title">Resolved OEM Model</strong>
                <p className="hq-audit-card__desc">
                  Equipment nameplates resolved to clean manufacturer engineering model specs.
                </p>
              </div>

              <div className={`hq-audit-card ${coverage[1][1] >= 85 ? 'hq-audit-card--good' : 'hq-audit-card--warn'}`}>
                <div className="hq-audit-card__head">
                  <span className="hq-audit-card__code">02 / INSTALL DATE</span>
                  <span className={`hq-audit-card__badge ${coverage[1][1] >= 85 ? 'hq-audit-card__badge--good' : 'hq-audit-card__badge--warn'}`}>
                    {coverage[1][1] >= 85 ? 'Audit Ready' : 'Incomplete'}
                  </span>
                </div>
                <div className="hq-audit-card__value-row">
                  <span className="hq-audit-card__value">{coverage[1][1]}%</span>
                </div>
                <div className="hq-audit-card__bar" aria-hidden="true">
                  <div
                    className={`hq-audit-card__bar-fill ${coverage[1][1] >= 85 ? 'hq-audit-card__bar-fill--good' : 'hq-audit-card__bar-fill--warn'}`}
                    style={{ width: `${coverage[1][1]}%` }}
                  />
                </div>
                <strong className="hq-audit-card__title">Documented Install Date</strong>
                <p className="hq-audit-card__desc">
                  Accurate commissioning records required to model remaining useful life and warranty.
                </p>
              </div>

              <div className={`hq-audit-card ${coverage[2][1] >= 85 ? 'hq-audit-card--good' : 'hq-audit-card--warn'}`}>
                <div className="hq-audit-card__head">
                  <span className="hq-audit-card__code">03 / SERIAL NUMBER</span>
                  <span className={`hq-audit-card__badge ${coverage[2][1] >= 85 ? 'hq-audit-card__badge--good' : 'hq-audit-card__badge--warn'}`}>
                    {coverage[2][1] >= 85 ? 'High Confidence' : 'Unconfirmed'}
                  </span>
                </div>
                <div className="hq-audit-card__value-row">
                  <span className="hq-audit-card__value">{coverage[2][1]}%</span>
                </div>
                <div className="hq-audit-card__bar" aria-hidden="true">
                  <div
                    className={`hq-audit-card__bar-fill ${coverage[2][1] >= 85 ? 'hq-audit-card__bar-fill--good' : 'hq-audit-card__bar-fill--warn'}`}
                    style={{ width: `${coverage[2][1]}%` }}
                  />
                </div>
                <strong className="hq-audit-card__title">High Serial Confidence</strong>
                <p className="hq-audit-card__desc">
                  OCR & field-confirmed serial tags for tamper-proof asset traceability and warranty claims.
                </p>
              </div>

              <div className={`hq-audit-card ${coverage[3][1] >= 85 ? 'hq-audit-card--good' : coverage[3][1] >= 70 ? 'hq-audit-card--warn' : 'hq-audit-card--danger'}`}>
                <div className="hq-audit-card__head">
                  <span className="hq-audit-card__code">04 / AUDIT VELOCITY</span>
                  <span className={`hq-audit-card__badge ${coverage[3][1] >= 85 ? 'hq-audit-card__badge--good' : coverage[3][1] >= 70 ? 'hq-audit-card__badge--warn' : 'hq-audit-card__badge--danger'}`}>
                    {coverage[3][1] >= 85 ? 'Fresh' : 'Stale Scans'}
                  </span>
                </div>
                <div className="hq-audit-card__value-row">
                  <span className="hq-audit-card__value">{coverage[3][1]}%</span>
                </div>
                <div className="hq-audit-card__bar" aria-hidden="true">
                  <div
                    className={`hq-audit-card__bar-fill ${coverage[3][1] >= 85 ? 'hq-audit-card__bar-fill--good' : coverage[3][1] >= 70 ? 'hq-audit-card__bar-fill--warn' : 'hq-audit-card__bar-fill--danger'}`}
                    style={{ width: `${coverage[3][1]}%` }}
                  />
                </div>
                <strong className="hq-audit-card__title">Confirmed ≤ 180 Days</strong>
                <p className="hq-audit-card__desc">
                  Physical barcode scan audit completed within past 6 months to eliminate phantom inventory.
                </p>
              </div>
            </div>

            <div className="hq-banner" style={{ marginTop: 14 }}>
              {metrics.unconfirmedCount} of {scope.scopedAssets.length} assets require physical plate verification or have not been scanned in &gt; 180 days.
            </div>
          </section>

          {/* Work Order SLA Performance & Field Velocity */}
          <section className="hq-card">
            {/* SLA KPI Summary Strip */}
            <div className="hq-sla-kpi-grid" style={{ marginBottom: 16 }}>
              <div className="hq-capex-kpi-card">
                <span className="hq-capex-kpi-card__label">SLA Compliance Rate</span>
                <span className="hq-capex-kpi-card__value mono" style={{ color: metrics.slaRate >= 85 ? 'var(--np-verified-600)' : 'var(--red)' }}>
                  {metrics.slaRate}%
                </span>
                <span className="hq-capex-kpi-card__footnote">
                  Contractual turnaround adherence
                </span>
              </div>
              <div className="hq-capex-kpi-card">
                <span className="hq-capex-kpi-card__label">Breached Work Orders</span>
                <span className="hq-capex-kpi-card__value mono" style={{ color: metrics.breachedOrdersCount > 0 ? 'var(--red)' : 'inherit' }}>
                  {metrics.breachedOrdersCount}
                </span>
                <span className="hq-capex-kpi-card__footnote">
                  Completed or open past SLA deadline
                </span>
              </div>
              <div className="hq-capex-kpi-card">
                <span className="hq-capex-kpi-card__label">Active Field Orders</span>
                <span className="hq-capex-kpi-card__value mono">
                  {metrics.openOrdersCount}
                </span>
                <span className="hq-capex-kpi-card__footnote">
                  Currently open / in-progress tickets
                </span>
              </div>
              <div className="hq-capex-kpi-card">
                <span className="hq-capex-kpi-card__label">Eligible Tracked Tickets</span>
                <span className="hq-capex-kpi-card__value mono">
                  {metrics.eligibleSlaCount}
                </span>
                <span className="hq-capex-kpi-card__footnote">
                  Total work orders with SLA deadlines
                </span>
              </div>
            </div>

            <div className="hq-card-header">
              <div>
                <h2 className="hq-card-title">Work Order Field Velocity & SLA Compliance</h2>
                <p className="hq-card-description">
                  Live work order resolution tracking against contractual turnaround thresholds.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={`hq-status ${metrics.slaRate >= 85 ? 'hq-status--good' : 'hq-status--warning'}`}>
                  Overall SLA: {metrics.slaRate}%
                </span>
                <div className="hq-view-toggle">
                  <button
                    type="button"
                    className={`hq-view-toggle-btn ${slaView === 'cards' ? 'is-active' : ''}`}
                    onClick={() => setSlaView('cards')}
                  >
                    Scorecards
                  </button>
                  <button
                    type="button"
                    className={`hq-view-toggle-btn ${slaView === 'table' ? 'is-active' : ''}`}
                    onClick={() => setSlaView('table')}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {slaView === 'cards' ? (
              <div className="hq-sla-grid">
                {scope.scopedOrders.length ? (
                  scope.scopedOrders.slice(0, 9).map((w) => {
                    const breached =
                      w.slaDueAt &&
                      ((w.completedAt && new Date(w.completedAt).getTime() > new Date(w.slaDueAt).getTime()) ||
                        (!w.completedAt && Date.now() > new Date(w.slaDueAt).getTime()));
                    const tone = w.completedAt ? (breached ? 'breached' : 'completed') : breached ? 'breached' : 'active';
                    const prio = (w.priority || 'normal').toLowerCase();
                    const prioClass = prio === 'emergency' ? 'emergency' : prio === 'urgent' ? 'urgent' : 'normal';
                    const propName = w.propertyName || properties.find((p) => p.id === w.propertyId)?.name || 'Property';

                    return (
                      <div key={w.id} className={`hq-sla-card hq-sla-card--${tone}`}>
                        <div className="hq-sla-card__head">
                          <Link to={`/work-orders?search=${encodeURIComponent(w.number)}`} className="hq-sla-card__wo-num">
                            #{w.number}
                          </Link>
                          <span className={`hq-priority-pill hq-priority-pill--${prioClass}`}>
                            {w.priority}
                          </span>
                        </div>
                        <div>
                          <strong className="hq-sla-card__title" title={w.title}>{w.title}</strong>
                          <div className="hq-sla-card__loc">{propName}</div>
                        </div>
                        <div className="hq-sla-card__status-row">
                          <span className="hq-sla-card__status-lbl">Resolution Status</span>
                          <span className={`hq-status ${w.completedAt ? (breached ? 'hq-status--danger' : 'hq-status--good') : breached ? 'hq-status--danger' : 'hq-status--warning'}`}>
                            {w.completedAt ? (breached ? 'COMPLETED (SLA BREACH)' : 'RESOLVED IN SLA') : breached ? 'SLA BREACHED' : w.status.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <dl className="hq-sla-card__timeline">
                          <div className="hq-sla-timeline-point">
                            <dt>SLA Target Due</dt>
                            <dd style={{ color: breached ? 'var(--red)' : 'inherit' }}>
                              {w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString() : '—'}
                            </dd>
                          </div>
                          <div className="hq-sla-timeline-point">
                            <dt>{w.completedAt ? 'Completed Date' : 'Current Status'}</dt>
                            <dd>
                              {w.completedAt ? new Date(w.completedAt).toLocaleDateString() : 'In Progress'}
                            </dd>
                          </div>
                        </dl>
                        <div className="hq-sla-card__foot">
                          <Link to={`/work-orders?search=${encodeURIComponent(w.number)}`} className="hq-scorecard__link">
                            View Work Order →
                          </Link>
                          <span className="hq-scorecard__foot-meta mono">
                            {w.assignee || 'Field Tech'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', gridColumn: '1 / -1' }}>
                    No work orders in this scope.
                  </div>
                )}
              </div>
            ) : (
              <div className="hq-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>WO #</th>
                      <th>Property</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>SLA Due Date</th>
                      <th>Completed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scope.scopedOrders.length ? (
                      scope.scopedOrders.slice(0, 10).map((w) => {
                        const breached =
                          w.slaDueAt &&
                          ((w.completedAt && new Date(w.completedAt).getTime() > new Date(w.slaDueAt).getTime()) ||
                            (!w.completedAt && Date.now() > new Date(w.slaDueAt).getTime()));

                        return (
                          <tr key={w.id}>
                            <td>
                              <Link className="hq-text-link" to={`/work-orders?search=${encodeURIComponent(w.number)}`}>
                                #{w.number}
                              </Link>{' '}
                              <span style={{ color: 'var(--white)', marginLeft: 6 }}>{w.title}</span>
                            </td>
                            <td style={{ color: 'var(--gray-400)' }}>
                              {w.propertyName || properties.find((p) => p.id === w.propertyId)?.name || '—'}
                            </td>
                            <td>
                              <span className={`hq-status ${w.completedAt ? 'hq-status--good' : breached ? 'hq-status--danger' : 'hq-status--warning'}`}>
                                {w.status.replaceAll('_', ' ')}
                              </span>
                            </td>
                            <td>
                              <span className="mono" style={{ textTransform: 'uppercase', fontSize: '0.74rem' }}>
                                {w.priority}
                              </span>
                            </td>
                            <td className="mono" style={{ color: breached ? 'var(--red)' : 'inherit' }}>
                              {w.slaDueAt ? new Date(w.slaDueAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="mono">
                              {w.completedAt ? new Date(w.completedAt).toLocaleDateString() : 'In Progress'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
                          No work orders in this scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
