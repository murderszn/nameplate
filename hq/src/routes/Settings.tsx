import { useEffect, useState } from 'react';
import { api, type Organization } from '../api/client';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // General & Financial Settings
  const [orgName, setOrgName] = useState('Sonoran Portfolio Management');
  const [timezone, setTimezone] = useState('America/Phoenix');
  const [currency, setCurrency] = useState('USD');
  const [replaceLimit, setReplaceLimit] = useState(400);
  const [replaceThresholdPct, setReplaceThresholdPct] = useState(60);

  // Field & Verification Policies
  const [allowTechCreate, setAllowTechCreate] = useState(true);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [geofenceEnforced, setGeofenceEnforced] = useState(true);
  const [offlineAutoSync, setOfflineAutoSync] = useState(true);

  // SLA Hours
  const [slaEmergency, setSlaEmergency] = useState(4);
  const [slaUrgent, setSlaUrgent] = useState(24);
  const [slaStandard, setSlaStandard] = useState(72);
  const [slaLow, setSlaLow] = useState(168);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'general' | 'slas' | 'field' | 'integrations' | 'easter-eggs'>('general');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const o = await api.getOrg();
        if (cancelled) return;
        setOrg(o);
        if (o.name) setOrgName(o.name);
      } catch {
        // Fallback to default demo settings
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedMessage('Portfolio governance configuration saved.');
      setTimeout(() => setSavedMessage(null), 3500);
    }, 450);
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  if (loading) {
    return (
      <div className="np-container-card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="np-empty-state">Loading portfolio configuration…</div>
      </div>
    );
  }

  return (
    <div className="np-settings-v2">
      {/* Header & Global Action */}
      <div className="np-settings-v2__header">
        <div>
          <div className="np-settings-v2__eyebrow">PORTFOLIO GOVERNANCE & RULES</div>
          <h1 className="np-settings-v2__title">Settings & Policies</h1>
          <p className="np-settings-v2__desc">
            Define organizational standards, automated repair thresholds, service level agreements, and field device verification policies across your portfolio.
          </p>
        </div>

        <div className="np-settings-v2__actions">
          {savedMessage && (
            <span className="np-settings-v2__toast">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {savedMessage}
            </span>
          )}
          <button
            type="button"
            className="np-btn np-btn--primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 120 }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Modern Horizontal Segmented Tabs */}
      <div className="np-settings-v2__nav-wrap">
        <nav className="np-settings-v2__nav" aria-label="Settings categories">
          <button
            type="button"
            className={`np-settings-v2__tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            General & Financial
          </button>

          <button
            type="button"
            className={`np-settings-v2__tab ${activeTab === 'slas' ? 'active' : ''}`}
            onClick={() => setActiveTab('slas')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            SLA Targets
          </button>

          <button
            type="button"
            className={`np-settings-v2__tab ${activeTab === 'field' ? 'active' : ''}`}
            onClick={() => setActiveTab('field')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
            Field & Verification
          </button>

          <button
            type="button"
            className={`np-settings-v2__tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v6" />
              <path d="m4.93 10.93 4.24 4.24" />
              <path d="M2 12h6" />
              <path d="m4.93 13.07 4.24-4.24" />
              <path d="M14 12h8" />
              <path d="m19.07 10.93-4.24 4.24" />
              <path d="m19.07 13.07-4.24-4.24" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            CMMS & Integrations
          </button>

          <button
            type="button"
            className={`np-settings-v2__tab ${activeTab === 'easter-eggs' ? 'active' : ''}`}
            onClick={() => setActiveTab('easter-eggs')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" /><path d="M3 12h18" /><circle cx="12" cy="12" r="8" /><path d="m8 8 8 8" /><path d="m16 8-8 8" />
            </svg>
            Nameplate Easter Eggs
          </button>
        </nav>
      </div>

      <form onSubmit={handleSave}>

        {/* TAB 1: General & Financial */}
        {activeTab === 'general' && (
          <div className="np-settings-v2__grid">
            <div className="np-settings-v2__card">
              <div className="np-settings-v2__card-head">
                <div>
                  <h3 className="np-settings-v2__card-title">Organization & Tenant Profile</h3>
                  <p className="np-settings-v2__card-sub">Root tenant metadata, workspace identifier, and locale conventions.</p>
                </div>
                <span className="np-badge np-badge--status-active">Active Organization</span>
              </div>

              <div className="np-form-group">
                <label>Portfolio Entity Name</label>
                <input
                  type="text"
                  className="np-input"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Sonoran Portfolio Management"
                />
              </div>

              <div className="np-form-row">
                <div className="np-form-group">
                  <label>Tenant Slug (Immutable)</label>
                  <input
                    type="text"
                    className="np-input mono"
                    value={org?.slug ?? 'sonoran-portfolio-management'}
                    disabled
                  />
                </div>
                <div className="np-form-group">
                  <label>Plan Subscription</label>
                  <input
                    type="text"
                    className="np-input"
                    value={(org?.plan ?? 'Enterprise Tier').toUpperCase()}
                    disabled
                  />
                </div>
              </div>

              <div className="np-form-row">
                <div className="np-form-group">
                  <label>Operating Timezone</label>
                  <select
                    className="np-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/Phoenix">America/Phoenix (MST · UTC-7 No DST)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PT · UTC-8/7)</option>
                    <option value="America/Denver">America/Denver (MT · UTC-7/6)</option>
                    <option value="America/Chicago">America/Chicago (CT · UTC-6/5)</option>
                    <option value="America/New_York">America/New York (ET · UTC-5/4)</option>
                  </select>
                </div>
                <div className="np-form-group">
                  <label>Accounting Currency</label>
                  <select
                    className="np-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($ United States Dollar)</option>
                    <option value="CAD">CAD ($ Canadian Dollar)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="np-settings-v2__card">
              <div className="np-settings-v2__card-head">
                <div>
                  <h3 className="np-settings-v2__card-title">Capital Guardrails & Thresholds</h3>
                  <p className="np-settings-v2__card-sub">Automate repair-vs-replace decision engines and dispatch authorization limits.</p>
                </div>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--red)', fontWeight: 700 }}>
                  AUTO-TRIAGE ON
                </span>
              </div>

              <div className="np-form-group">
                <label>Auto-Approval Repair Limit</label>
                <div className="np-input-prefix-wrap">
                  <span className="np-input-prefix">$</span>
                  <input
                    type="number"
                    className="np-input np-input--with-prefix mono"
                    value={replaceLimit}
                    onChange={(e) => setReplaceLimit(Number(e.target.value))}
                    min={0}
                    step={25}
                  />
                </div>
                <span className="np-form-hint">
                  Field work orders exceeding this dollar amount require property director authorization before parts dispatch.
                </span>
              </div>

              <div className="np-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Capital Replacement Threshold</label>
                  <span className="mono" style={{ fontWeight: 800, color: 'var(--red)', fontSize: '0.84rem' }}>
                    {replaceThresholdPct}% of Asset Value
                  </span>
                </div>
                <div className="np-input-prefix-wrap">
                  <input
                    type="number"
                    className="np-input np-input--with-suffix mono"
                    value={replaceThresholdPct}
                    onChange={(e) => setReplaceThresholdPct(Number(e.target.value))}
                    min={10}
                    max={100}
                  />
                  <span className="np-input-suffix">%</span>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${replaceThresholdPct}%`,
                      background: replaceThresholdPct >= 70 ? 'var(--red)' : '#f59e0b',
                      borderRadius: 'inherit',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>

                <span className="np-form-hint">
                  When cumulative lifetime maintenance expenses exceed {replaceThresholdPct}% of OEM unit replacement value, the platform flags the appliance as an irrecoverable lemon.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SLA Targets */}
        {activeTab === 'slas' && (
          <div className="np-container-card">
            <div className="np-container-toolbar">
              <div className="np-container-toolbar__meta">
                <h3 className="np-container-toolbar__title">Service Level Agreement (SLA) Resolution Windows</h3>
                <span className="np-container-toolbar__count">Active Countdown Escalation Rules</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                Timers activate immediately upon work order creation. Technicians receive priority notifications as deadlines approach, and at-risk orders surface automatically on the Operations Cockpit.
              </p>
            </div>

            <div style={{ padding: 20 }}>
              <div className="np-settings-v2__sla-grid">
                {/* Emergency */}
                <div className="np-settings-v2__sla-card" style={{ borderColor: 'rgba(197, 31, 45, 0.28)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="np-settings-v2__sla-badge np-settings-v2__sla-badge--emergency">
                        ● EMERGENCY
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>P1 CRITICAL</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: '0 0 16px', lineHeight: 1.45, minHeight: 48 }}>
                      Uncontained water leaks, total HVAC outage during extreme temperature advisory, primary electrical shorts.
                    </p>
                  </div>
                  <div className="np-form-group" style={{ margin: 0 }}>
                    <label>Max Resolution (Hours)</label>
                    <input
                      type="number"
                      className="np-input mono"
                      value={slaEmergency}
                      onChange={(e) => setSlaEmergency(Number(e.target.value))}
                      min={1}
                      max={48}
                    />
                  </div>
                </div>

                {/* Urgent */}
                <div className="np-settings-v2__sla-card" style={{ borderColor: 'rgba(249, 115, 22, 0.28)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="np-settings-v2__sla-badge np-settings-v2__sla-badge--urgent">
                        ● URGENT
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>P2 HIGH</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: '0 0 16px', lineHeight: 1.45, minHeight: 48 }}>
                      Refrigerator compressor failure, inoperable range/oven, single-fixture plumbing stoppage.
                    </p>
                  </div>
                  <div className="np-form-group" style={{ margin: 0 }}>
                    <label>Max Resolution (Hours)</label>
                    <input
                      type="number"
                      className="np-input mono"
                      value={slaUrgent}
                      onChange={(e) => setSlaUrgent(Number(e.target.value))}
                      min={1}
                      max={120}
                    />
                  </div>
                </div>

                {/* Standard */}
                <div className="np-settings-v2__sla-card" style={{ borderColor: 'rgba(59, 130, 246, 0.28)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="np-settings-v2__sla-badge np-settings-v2__sla-badge--standard">
                        ● STANDARD
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>P3 NORMAL</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: '0 0 16px', lineHeight: 1.45, minHeight: 48 }}>
                      Dishwasher cycle drainage error, clothes dryer heating delay, microwave turntable motor fault.
                    </p>
                  </div>
                  <div className="np-form-group" style={{ margin: 0 }}>
                    <label>Max Resolution (Hours)</label>
                    <input
                      type="number"
                      className="np-input mono"
                      value={slaStandard}
                      onChange={(e) => setSlaStandard(Number(e.target.value))}
                      min={6}
                      max={240}
                    />
                  </div>
                </div>

                {/* Low */}
                <div className="np-settings-v2__sla-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="np-settings-v2__sla-badge np-settings-v2__sla-badge--low">
                        ● LOW
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>P4 ROUTINE</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: '0 0 16px', lineHeight: 1.45, minHeight: 48 }}>
                      Cosmetic handle replacement, preventive turnover inspection queue, non-urgent aesthetic repairs.
                    </p>
                  </div>
                  <div className="np-form-group" style={{ margin: 0 }}>
                    <label>Max Resolution (Hours)</label>
                    <input
                      type="number"
                      className="np-input mono"
                      value={slaLow}
                      onChange={(e) => setSlaLow(Number(e.target.value))}
                      min={12}
                      max={720}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="np-container-footer">
              <span>SLA tracking enforces tenant satisfaction commitments</span>
              <span>All 4 priority categories active</span>
            </div>
          </div>
        )}

        {/* TAB 3: Field & Verification */}
        {activeTab === 'field' && (
          <div className="np-container-card">
            <div className="np-container-toolbar">
              <div className="np-container-toolbar__meta">
                <h3 className="np-container-toolbar__title">Technician Device & Field Verification Policies</h3>
                <span className="np-container-toolbar__count">App Enforcement Rules</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-400)' }}>
                Enforce tamper-evident tag validation, GPS geofencing, and diagnostic capture requirements across all Nameplate Field mobile devices.
              </p>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="np-settings-v2__toggle-row">
                <div className="np-settings-v2__toggle-label">
                  <strong>Allow In-Field Appliance Registration</strong>
                  <small>Technicians can provision fresh equipment into the inventory ledger simply by scanning an unassigned Nameplate Tag in an apartment unit.</small>
                </div>
                <label className="np-switch">
                  <input
                    type="checkbox"
                    checked={allowTechCreate}
                    onChange={(e) => setAllowTechCreate(e.target.checked)}
                  />
                  <span className="np-switch-slider" />
                </label>
              </div>

              <div className="np-settings-v2__toggle-row">
                <div className="np-settings-v2__toggle-label">
                  <strong>Mandatory Diagnostic Photography</strong>
                  <small>Blocks technicians from closing a work order unless at least one high-resolution photo of the completed repair or serial plate is uploaded.</small>
                </div>
                <label className="np-switch">
                  <input
                    type="checkbox"
                    checked={requirePhoto}
                    onChange={(e) => setRequirePhoto(e.target.checked)}
                  />
                  <span className="np-switch-slider" />
                </label>
              </div>

              <div className="np-settings-v2__toggle-row">
                <div className="np-settings-v2__toggle-label">
                  <strong>Spatial GPS Geofence Verification</strong>
                  <small>Validates device geolocation coordinates against the registered building boundary polygon when tags are scanned to prevent ghost maintenance entries.</small>
                </div>
                <label className="np-switch">
                  <input
                    type="checkbox"
                    checked={geofenceEnforced}
                    onChange={(e) => setGeofenceEnforced(e.target.checked)}
                  />
                  <span className="np-switch-slider" />
                </label>
              </div>

              <div className="np-settings-v2__toggle-row">
                <div className="np-settings-v2__toggle-label">
                  <strong>Offline Queue Opportunistic Auto-Sync</strong>
                  <small>Automatically drains the local Drift SQLite delta queue and sends pending ops to the cloud whenever connectivity is re-established in basements or parking structures.</small>
                </div>
                <label className="np-switch">
                  <input
                    type="checkbox"
                    checked={offlineAutoSync}
                    onChange={(e) => setOfflineAutoSync(e.target.checked)}
                  />
                  <span className="np-switch-slider" />
                </label>
              </div>
            </div>

            <div className="np-container-footer">
              <span>Policies enforced on technician mobile client builds v1.4+</span>
              <span>4 device security policies configured</span>
            </div>
          </div>
        )}

        {/* TAB 4: CMMS & Integrations */}
        {activeTab === 'integrations' && (
          <div className="np-settings-v2__grid">
            <div className="np-settings-v2__card">
              <div className="np-settings-v2__card-head">
                <div>
                  <h3 className="np-settings-v2__card-title">Connected CMMS & Work Order Sync</h3>
                  <p className="np-settings-v2__card-sub">Two-way ticket synchronization and property management integrations.</p>
                </div>
                <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 700 }}>
                  2 ACTIVE PIPELINES
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="np-settings-v2__integration-item">
                  <div className="np-settings-v2__integration-info">
                    <div className="np-settings-v2__integration-icon">📐</div>
                    <div>
                      <strong style={{ color: 'var(--white)', fontSize: '0.88rem', display: 'block' }}>Linear Dispatch</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>Team APPL-OPS · Bidirectional Webhook</span>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 700 }}>● Live Sync</span>
                </div>

                <div className="np-settings-v2__integration-item">
                  <div className="np-settings-v2__integration-info">
                    <div className="np-settings-v2__integration-icon">⚡</div>
                    <div>
                      <strong style={{ color: 'var(--white)', fontSize: '0.88rem', display: 'block' }}>Jira Service Management</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>Project SON-FIELD · REST API v3</span>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 700 }}>● Live Sync</span>
                </div>

                <div className="np-settings-v2__integration-item">
                  <div className="np-settings-v2__integration-info">
                    <div className="np-settings-v2__integration-icon">🏢</div>
                    <div>
                      <strong style={{ color: 'var(--white)', fontSize: '0.88rem', display: 'block' }}>Yardi Voyager</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>Unit Inventory & Tenant Ledger</span>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>Daily 02:00 UTC</span>
                </div>
              </div>
            </div>

            <div className="np-settings-v2__card">
              <div className="np-settings-v2__card-head">
                <div>
                  <h3 className="np-settings-v2__card-title">API Keys & Webhook Endpoints</h3>
                  <p className="np-settings-v2__card-sub">Secure credentials for programmatic access and event listener dispatch.</p>
                </div>
                <span className="np-badge">TLS 1.3 Verified</span>
              </div>

              <div className="np-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Production REST Endpoint</label>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://api.nameplate.systems/v1', 'endpoint')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedField === 'endpoint' ? '✓ Copied URL' : 'Copy URL'}
                  </button>
                </div>
                <input
                  type="text"
                  className="np-input mono"
                  value="https://api.nameplate.systems/v1"
                  readOnly
                />
              </div>

              <div className="np-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Live Organization Secret Key</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--gray-400)', fontSize: '0.74rem', cursor: 'pointer' }}
                    >
                      {showSecret ? 'Hide' : 'Reveal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('np_sec_live_9921f08a8b1c4e2098d7', 'key')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {copiedField === 'key' ? '✓ Copied Key' : 'Copy Key'}
                    </button>
                  </div>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  className="np-input mono"
                  value="np_sec_live_9921f08a8b1c4e2098d7"
                  readOnly
                />
                <span className="np-form-hint">
                  Never commit this secret key to client-side code or public repositories.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Nameplate Easter Eggs */}
        {activeTab === 'easter-eggs' && (
          <div className="np-settings-v2__grid">
            <div className="np-settings-v2__card">
              <div className="np-settings-v2__card-head">
                <div>
                  <h3 className="np-settings-v2__card-title">Nameplate Easter Eggs</h3>
                  <p className="np-settings-v2__card-sub">A small collection of Nameplate things to leave running when the work is done.</p>
                </div>
                <span className="np-badge np-badge--status-active">2 EXPERIENCES</span>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <a className="np-settings-v2__integration-item" href="../appliance-idle.html" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div className="np-settings-v2__integration-info">
                    <div className="np-settings-v2__integration-icon">◌</div>
                    <div>
                      <strong style={{ color: 'var(--white)', fontSize: '0.9rem', display: 'block' }}>Appliance Idle Screen</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>The living Nameplate appliance grid · fullscreen with F</span>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--red)', fontWeight: 700 }}>OPEN ↗</span>
                </a>
                <a className="np-settings-v2__integration-item" href="../home-invaders/" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div className="np-settings-v2__integration-info">
                    <div className="np-settings-v2__integration-icon">✦</div>
                    <div>
                      <strong style={{ color: 'var(--white)', fontSize: '0.9rem', display: 'block' }}>Home Invaders</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>Defend the home · arrows to move · space to blast</span>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--red)', fontWeight: 700 }}>PLAY ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
