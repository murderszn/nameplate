import { useEffect, useState } from 'react';
import { api, type Organization } from '../api/client';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);

  // Editable settings
  const [orgName, setOrgName] = useState('Sonoran Portfolio Management');
  const [timezone, setTimezone] = useState('America/Phoenix');
  const [currency, setCurrency] = useState('USD');
  const [replaceLimit, setReplaceLimit] = useState(400);
  const [replaceThresholdPct, setReplaceThresholdPct] = useState(60);
  const [allowTechCreate, setAllowTechCreate] = useState(true);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [geofenceEnforced, setGeofenceEnforced] = useState(true);

  // SLA Hours
  const [slaEmergency, setSlaEmergency] = useState(4);
  const [slaUrgent, setSlaUrgent] = useState(24);
  const [slaStandard, setSlaStandard] = useState(72);
  const [slaLow, setSlaLow] = useState(168);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'general' | 'slas' | 'field' | 'integrations'>('general');

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
      setSavedMessage('Portfolio configuration successfully saved.');
      setTimeout(() => setSavedMessage(null), 3500);
    }, 600);
  };

  if (loading) return <div className="np-empty-state">Loading portfolio settings…</div>;

  return (
    <div className="np-settings-page">
      <div className="np-settings-header">
        <div>
          <span className="np-kicker">05 / Configuration</span>
          <h2 style={{ margin: '4px 0 8px', fontSize: '1.4rem' }}>Portfolio Governance & Field Rules</h2>
          <p className="np-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Configure organization SLAs, field technician verification policies, and integration endpoints.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {savedMessage && (
            <span style={{ color: '#4ADE80', fontSize: '0.82rem', fontWeight: 600 }}>
              ✓ {savedMessage}
            </span>
          )}
          <button
            type="button"
            className="np-btn np-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Modern Segmented Control */}
      <div>
        <div className="np-segmented-tabs">
          <button
            type="button"
            className={`np-segmented-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General & Financial
          </button>
          <button
            type="button"
            className={`np-segmented-tab ${activeTab === 'slas' ? 'active' : ''}`}
            onClick={() => setActiveTab('slas')}
          >
            SLA Targets
          </button>
          <button
            type="button"
            className={`np-segmented-tab ${activeTab === 'field' ? 'active' : ''}`}
            onClick={() => setActiveTab('field')}
          >
            Field & Verification
          </button>
          <button
            type="button"
            className={`np-segmented-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            CMMS & Integrations
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {activeTab === 'general' && (
          <div className="np-settings-grid">
            <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Organization Profile</h3>
              <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
                Tenant root details and global accounting defaults.
              </p>

              <div className="np-form-group">
                <label>Portfolio Organization Name</label>
                <input
                  type="text"
                  className="np-input"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div className="np-form-row">
                <div className="np-form-group">
                  <label>Portfolio Slug (Immutable)</label>
                  <input
                    type="text"
                    className="np-input mono"
                    value={org?.slug ?? 'sonoran-portfolio-management'}
                    disabled
                  />
                </div>
                <div className="np-form-group">
                  <label>Plan Tier</label>
                  <input
                    type="text"
                    className="np-input"
                    value={(org?.plan ?? 'Enterprise Pilot').toUpperCase()}
                    disabled
                  />
                </div>
              </div>

              <div className="np-form-row">
                <div className="np-form-group">
                  <label>Default Timezone</label>
                  <select
                    className="np-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/Phoenix">America/Phoenix (MST - No DST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                  </select>
                </div>
                <div className="np-form-group">
                  <label>Operating Currency</label>
                  <select
                    className="np-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD ($ - United States Dollar)</option>
                    <option value="CAD">CAD ($ - Canadian Dollar)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Financial Rules & Thresholds</h3>
              <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
                Automated guardrails for field repair vs. replace decisions.
              </p>

              <div className="np-form-group">
                <label>Auto-Approval Repair Limit (USD)</label>
                <div className="np-input-prefix-wrap">
                  <span className="np-input-prefix">$</span>
                  <input
                    type="number"
                    className="np-input np-input--with-prefix"
                    value={replaceLimit}
                    onChange={(e) => setReplaceLimit(Number(e.target.value))}
                  />
                </div>
                <span className="np-form-hint">
                  Repairs exceeding this cost require portfolio manager sign-off before parts dispatch.
                </span>
              </div>

              <div className="np-form-group">
                <label>Replacement Threshold (% of Asset Replacement Value)</label>
                <div className="np-input-prefix-wrap">
                  <input
                    type="number"
                    className="np-input np-input--with-suffix"
                    value={replaceThresholdPct}
                    onChange={(e) => setReplaceThresholdPct(Number(e.target.value))}
                  />
                  <span className="np-input-suffix">%</span>
                </div>
                <span className="np-form-hint">
                  If cumulative maintenance exceeds 60% of replacement value, the system recommends unit replacement.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'slas' && (
          <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24, maxWidth: 900 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Service Level Agreement (SLA) Targets</h3>
            <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
              Resolution countdown timers triggered on work order dispatch. At-risk tickets are flagged on the Operations Cockpit.
            </p>

            <div className="np-sla-grid">
              <div className="np-sla-box">
                <div className="np-sla-box__header">
                  <span className="np-badge" style={{ background: 'rgba(235, 43, 43,0.15)', color: '#eb2b2b', borderColor: 'rgba(235, 43, 43,0.4)', fontWeight: 800 }}>EMERGENCY</span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#888' }}>{slaEmergency} HRS</span>
                </div>
                <span className="np-muted" style={{ fontSize: '0.78rem', marginBottom: 12, minHeight: 36 }}>
                  Water leaks, active HVAC failure in extreme weather conditions.
                </span>
                <div className="np-form-group" style={{ margin: 0 }}>
                  <label>Max Window (Hours)</label>
                  <input
                    type="number"
                    className="np-input mono"
                    value={slaEmergency}
                    onChange={(e) => setSlaEmergency(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="np-sla-box">
                <div className="np-sla-box__header">
                  <span className="np-badge" style={{ background: 'rgba(249,115,22,0.15)', color: '#F97316', borderColor: 'rgba(249,115,22,0.4)', fontWeight: 800 }}>URGENT</span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#888' }}>{slaUrgent} HRS</span>
                </div>
                <span className="np-muted" style={{ fontSize: '0.78rem', marginBottom: 12, minHeight: 36 }}>
                  Refrigerator out, oven down, priority tenant requests.
                </span>
                <div className="np-form-group" style={{ margin: 0 }}>
                  <label>Max Window (Hours)</label>
                  <input
                    type="number"
                    className="np-input mono"
                    value={slaUrgent}
                    onChange={(e) => setSlaUrgent(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="np-sla-box">
                <div className="np-sla-box__header">
                  <span className="np-badge" style={{ background: 'rgba(var(--overlay-rgb), 0.08)', color: 'var(--white)', borderColor: 'rgba(var(--overlay-rgb), 0.2)', fontWeight: 800 }}>STANDARD</span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#888' }}>{slaStandard} HRS</span>
                </div>
                <span className="np-muted" style={{ fontSize: '0.78rem', marginBottom: 12, minHeight: 36 }}>
                  Dishwasher cycle noise, dryer heating slow, non-critical faults.
                </span>
                <div className="np-form-group" style={{ margin: 0 }}>
                  <label>Max Window (Hours)</label>
                  <input
                    type="number"
                    className="np-input mono"
                    value={slaStandard}
                    onChange={(e) => setSlaStandard(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="np-sla-box">
                <div className="np-sla-box__header">
                  <span className="np-badge" style={{ background: 'rgba(var(--overlay-rgb), 0.04)', color: '#888', borderColor: 'rgba(var(--overlay-rgb), 0.1)', fontWeight: 800 }}>LOW</span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: '#888' }}>{slaLow} HRS</span>
                </div>
                <span className="np-muted" style={{ fontSize: '0.78rem', marginBottom: 12, minHeight: 36 }}>
                  Cosmetic handle scratch, turn walkthrough preventive queue.
                </span>
                <div className="np-form-group" style={{ margin: 0 }}>
                  <label>Max Window (Hours)</label>
                  <input
                    type="number"
                    className="np-input mono"
                    value={slaLow}
                    onChange={(e) => setSlaLow(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'field' && (
          <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24, maxWidth: 900 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Field Device Policies & Verification</h3>
            <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
              Control mobile app behaviors for technicians using Nameplate Field tablets.
            </p>

            <div className="np-toggle-list">
              <div className="np-toggle-card">
                <div className="np-toggle-info">
                  <div className="np-toggle-title">Allow Technician Asset Creation in Field</div>
                  <div className="np-toggle-sub">Technicians can register new appliances directly by scanning fresh Nameplate Tags.</div>
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

              <div className="np-toggle-card">
                <div className="np-toggle-info">
                  <div className="np-toggle-title">Require Diagnostic Photo on Service Completion</div>
                  <div className="np-toggle-sub">Forces work order resolution to include at least 1 image of completed repair or replaced parts.</div>
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

              <div className="np-toggle-card">
                <div className="np-toggle-info">
                  <div className="np-toggle-title">Enforce Unit Geofence Spatial Verification</div>
                  <div className="np-toggle-sub">Flags audit discrepancy if technician scans an asset tag outside the registered property boundary.</div>
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
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="np-settings-grid">
            <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Connected CMMS & Work Order Sync</h3>
              <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
                Live two-way synchronization with Linear, Jira, Yardi, and property management systems.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="np-integration-row">
                  <div className="np-integration-meta">
                    <strong style={{ color: 'var(--white)', fontSize: '0.88rem' }}>Linear Tracker</strong>
                    <span className="np-badge np-badge--status-active">Connected · Team APPL-OPS</span>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e' }}>● Sync Active</span>
                </div>

                <div className="np-integration-row">
                  <div className="np-integration-meta">
                    <strong style={{ color: 'var(--white)', fontSize: '0.88rem' }}>Jira Service Desk</strong>
                    <span className="np-badge np-badge--status-active">Connected · Project SON-FIELD</span>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#22c55e' }}>● Sync Active</span>
                </div>

                <div className="np-integration-row">
                  <div className="np-integration-meta">
                    <strong style={{ color: 'var(--white)', fontSize: '0.88rem' }}>Yardi Voyager</strong>
                    <span className="np-badge">Read-Only</span>
                  </div>
                  <span className="mono" style={{ fontSize: '0.74rem', color: '#888' }}>Scheduled 02:00 UTC</span>
                </div>
              </div>
            </div>

            <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>API Keys & Webhook Endpoints</h3>
              <p className="np-muted" style={{ fontSize: '0.8rem', marginBottom: 20 }}>
                Secure endpoints for webhook dispatch and sync cursors.
              </p>

              <div className="np-form-group">
                <label>Production API Endpoint</label>
                <input
                  type="text"
                  className="np-input mono"
                  value="https://api.nameplate.systems/v1"
                  disabled
                />
              </div>

              <div className="np-form-group">
                <label>Org Secret API Key</label>
                <input
                  type="password"
                  className="np-input mono"
                  value="np_sec_live_9921f08a8b1c4e2098d7"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
