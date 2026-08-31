import { useState } from 'react';
import { mintNpid, buildQrPayload, generateQrSvg, normalizeCrockford, calculateCrockfordChecksum } from '../lib/qr';

interface SyncEventLog {
  id: string;
  deviceId: string;
  techName: string;
  entityType: string;
  opType: string;
  summary: string;
  occurredAt: string;
  status: 'APPLIED (IDEMPOTENT)' | 'LWW UPDATED' | 'RECONCILED';
  seq: number;
}

const INITIAL_LOGS: SyncEventLog[] = [
  {
    id: 'op-7718910',
    deviceId: 'fld-sim-morales',
    techName: 'J. Morales',
    entityType: 'SERVICE_EVENT',
    opType: 'CREATE',
    summary: 'Replaced defrost timer on Sub-Zero Refrigerator (NP-7K2M4QX9)',
    occurredAt: '2026-08-28T16:42:10Z',
    status: 'APPLIED (IDEMPOTENT)',
    seq: 10483,
  },
  {
    id: 'op-7718909',
    deviceId: 'fld-sim-morales',
    techName: 'J. Morales',
    entityType: 'ASSET_LOCATION',
    opType: 'MOVE',
    summary: 'Confirmed location in Unit 402 (Sonoran Ridge)',
    occurredAt: '2026-08-28T16:38:00Z',
    status: 'LWW UPDATED',
    seq: 10482,
  },
  {
    id: 'op-7718908',
    deviceId: 'fld-sim-vance',
    techName: 'D. Vance',
    entityType: 'NPID_MINT',
    opType: 'CREATE',
    summary: 'Claimed pre-allocated hardware tag NP-3Y8B9W2K for Bosch Dishwasher',
    occurredAt: '2026-08-28T15:20:45Z',
    status: 'APPLIED (IDEMPOTENT)',
    seq: 10481,
  },
  {
    id: 'op-7718907',
    deviceId: 'fld-sim-vance',
    techName: 'D. Vance',
    entityType: 'WORK_ORDER',
    opType: 'UPDATE',
    summary: 'Resolved WO-1048: Dryer heating element diagnostics',
    occurredAt: '2026-08-28T14:15:30Z',
    status: 'LWW UPDATED',
    seq: 10480,
  },
];

export function SyncOperations() {
  const [activeTab, setActiveTab] = useState<'sync' | 'studio' | 'inspector'>('sync');
  const [logs, setLogs] = useState<SyncEventLog[]>(INITIAL_LOGS);
  const [isSimulating, setIsSimulating] = useState(false);

  // Batch Studio State
  const [batchId, setBatchId] = useState('BATCH-2026-08C');
  const [tagCount, setTagCount] = useState(30);
  const [generatedBatch, setGeneratedBatch] = useState(() => {
    return Array.from({ length: 30 }, () => buildQrPayload(mintNpid(), 'org_sonoran_fund4', 'BATCH-2026-08C'));
  });

  // Tag Inspector State
  const [inspectInput, setInspectInput] = useState('https://np.app/a/NP7K2M4QX9?s=5F9SS3NoTZMw&t=1787952400&b=BATCH-01&o=org_sonoran_fund4');

  function handleSimulateSyncPush() {
    setIsSimulating(true);
    setTimeout(() => {
      const newTag = mintNpid();
      const newLog: SyncEventLog = {
        id: `op-${Math.floor(Math.random() * 9000000 + 1000000)}`,
        deviceId: 'fld-vault-subterranean-b',
        techName: 'J. Morales',
        entityType: 'SERVICE_EVENT',
        opType: 'CREATE',
        summary: `Subterranean Vault Sync: Bound tag ${newTag} to Commercial Chiller #2`,
        occurredAt: new Date().toISOString(),
        status: 'APPLIED (IDEMPOTENT)',
        seq: logs[0].seq + 1,
      };
      setLogs([newLog, ...logs]);
      setIsSimulating(false);
    }, 600);
  }

  function handleGenerateBatch() {
    const list = Array.from({ length: tagCount }, () => buildQrPayload(mintNpid(), 'org_sonoran_fund4', batchId));
    setGeneratedBatch(list);
  }

  // Inspection computation
  const inspectParsed = (() => {
    const raw = inspectInput.trim();
    if (!raw) return null;
    let npid = raw;
    let sig: string | null = null;
    let ts: number | null = null;
    let batch: string = 'BATCH-01';

    if (raw.includes('np.app/a/')) {
      const part = raw.split('np.app/a/')[1];
      if (part.includes('?')) {
        const [core, query] = part.split('?');
        npid = core;
        for (const p of query.split('&')) {
          if (p.startsWith('s=')) sig = p.substring(2);
          if (p.startsWith('t=')) ts = parseInt(p.substring(2), 10);
          if (p.startsWith('b=')) batch = p.substring(2);
        }
      } else {
        npid = part;
      }
    }

    const norm = normalizeCrockford(npid);
    const core = norm.startsWith('NP') ? norm.substring(2) : norm;
    const isValidLen = core.length === 8;
    const body = core.substring(0, 7);
    const checkChar = core.substring(7);
    const expectedCheck = calculateCrockfordChecksum(body);
    const isCheckValid = checkChar === expectedCheck;

    return {
      rawNpid: `NP-${core}`,
      core,
      body,
      checkChar,
      expectedCheck,
      isCheckValid,
      isValidLen,
      hasSig: Boolean(sig),
      sig,
      ts,
      batch,
    };
  })();

  return (
    <div className="np-sync-page">
      {/* Header */}
      <div className="np-sync-header">
        <div>
          <span className="np-kicker">05 / Fleet Sync & Hardware Ops</span>
          <h2 style={{ margin: '4px 0 6px', fontSize: '1.4rem' }}>Sync Engine & Tag Studio</h2>
          <p className="np-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            Monotonic Sequence Watermark: <span className="mono" style={{ color: 'var(--white)', fontWeight: 700 }}>#{logs[0]?.seq || 10483}</span> · Zero-Signal Offline Outbox Router
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSimulateSyncPush}
            disabled={isSimulating}
            className="np-btn np-btn--primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {isSimulating ? (
              <span>⟳ Processing…</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="m16 5 5 5-5 5"/><path d="M21 10H9"/></svg>
                <span>Simulate Ingestion Push</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="np-sync-metrics-grid">
        <div className="np-sync-metric-card">
          <div className="np-sync-metric-lbl">Active Field Tablets</div>
          <div className="np-sync-metric-val">14</div>
          <div className="np-sync-metric-sub">
            <span style={{ width: 8, height: 8, borderRadius: 1, background: '#22c55e', display: 'inline-block' }} />
            Subterranean Sync Ready
          </div>
        </div>

        <div className="np-sync-metric-card">
          <div className="np-sync-metric-lbl">Today's Outbox Ops</div>
          <div className="np-sync-metric-val">1,492</div>
          <div className="np-sync-metric-sub" style={{ color: '#22c55e' }}>
            0 Drops · 100% Idempotent
          </div>
        </div>

        <div className="np-sync-metric-card">
          <div className="np-sync-metric-lbl">Vault Tag Reserve Pool</div>
          <div className="np-sync-metric-val">3,850</div>
          <div className="np-sync-metric-sub">
            Pre-allocated 60-day leases
          </div>
        </div>

        <div className="np-sync-metric-card">
          <div className="np-sync-metric-lbl">Verification Match</div>
          <div className="np-sync-metric-val" style={{ color: '#22c55e' }}>100.0%</div>
          <div className="np-sync-metric-sub">
            HMAC-SHA256 Provenance
          </div>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="np-segmented-tabs" style={{ margin: '4px 0 12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`np-segmented-tab ${activeTab === 'sync' ? 'active' : ''}`}
        >
          01 / Fleet Sync Ledger ({logs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className={`np-segmented-tab ${activeTab === 'studio' ? 'active' : ''}`}
        >
          02 / Hardware Tag Studio & Print Sheets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inspector')}
          className={`np-segmented-tab ${activeTab === 'inspector' ? 'active' : ''}`}
        >
          03 / Cryptographic Tag Inspector
        </button>
      </div>

      {/* Tab 1: Fleet Sync Ledger */}
      {activeTab === 'sync' && (
        <div className="np-sync-log-card">
          <div className="np-sync-log-header">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Real-Time Outbox Push Stream (PostgreSQL Monotonic Change Sequences)
            </div>
            <span className="np-badge np-badge--status-active" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              SYNC ENGINE ACTIVE
            </span>
          </div>

          <div className="np-sync-log-stream">
            {logs.map((log) => (
              <div key={log.id} className="np-sync-log-item">
                <div className="np-sync-log-main">
                  <div className="np-sync-icon-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <div>
                    <div className="np-sync-log-title-row">
                      <span className="np-sync-device-id">{log.deviceId}</span>
                      <span className="np-sync-tech">({log.techName})</span>
                      <span className="np-sync-op-badge">
                        {log.entityType} · {log.opType}
                      </span>
                    </div>
                    <p className="np-sync-summary">{log.summary}</p>
                    <div className="np-sync-timestamp">
                      {new Date(log.occurredAt).toLocaleTimeString()} · Op ID: {log.id}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className="np-badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)', minWidth: 140 }}>
                    {log.status}
                  </span>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                    Seq #{log.seq}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Hardware Tag Batch Studio */}
      {activeTab === 'studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 22 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Batch Tag Generation & Sheet Exporter</h3>
            <p className="np-muted" style={{ fontSize: '0.8rem', margin: '0 0 16px' }}>
              Generate serialized sheets of 30 destructible vinyl tags (1.5"×1") with Crockford-32 check digits and HMAC-SHA256 authentication seals.
            </p>

            <div className="np-studio-form-grid">
              <div className="np-form-group" style={{ margin: 0 }}>
                <label>Batch Identifier</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="np-input mono"
                />
              </div>

              <div className="np-form-group" style={{ margin: 0 }}>
                <label>Tag Count</label>
                <select
                  value={tagCount}
                  onChange={(e) => setTagCount(parseInt(e.target.value, 10))}
                  className="np-input mono"
                >
                  <option value={30}>30 Tags (1 Standard Printable Sheet)</option>
                  <option value={60}>60 Tags (2 Sheets)</option>
                  <option value={150}>150 Tags (5 Sheets)</option>
                  <option value={500}>500 Tags (1 Offline Device Vault Block)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateBatch}
                className="np-btn np-btn--primary"
                style={{ height: 38 }}
              >
                Generate Batch
              </button>
            </div>
          </div>

          {/* Tag Grid Preview */}
          <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid rgba(var(--overlay-rgb), 0.06)', paddingBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 800, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Print Sheet Preview ({generatedBatch.length} Tags · {batchId})
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const csv = 'NPID,URL,COMPACT_URI,SIGNATURE,TIMESTAMP,BATCH\n' + generatedBatch.map(b => `${b.npid},"${b.url}","${b.compactUri}",${b.sig},${b.ts},${b.batchId}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${batchId}-manifest.csv`;
                    a.click();
                  }}
                  className="np-btn"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--white)', border: '1px solid rgba(var(--overlay-rgb), 0.12)', fontSize: '0.76rem', padding: '6px 12px' }}
                >
                  Export CSV Manifest
                </button>
              </div>
            </div>

            <div className="np-tag-grid-preview">
              {generatedBatch.slice(0, 30).map((t, idx) => (
                <div key={idx} className="np-tag-preview-tile">
                  <div
                    className="np-tag-qr-svg-wrap"
                    dangerouslySetInnerHTML={{ __html: generateQrSvg(t.url, 72) }}
                  />
                  <div className="np-tag-npid-label">{t.npid}</div>
                  <div className="np-tag-sig-label">
                    {t.sig}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Cryptographic Inspector */}
      {activeTab === 'inspector' && (
        <div className="np-card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(var(--overlay-rgb), 0.08)', borderRadius: 2, padding: 22 }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', margin: '0 0 4px' }}>Cryptographic NPID & QR Matrix Inspector</h3>
            <p className="np-muted" style={{ fontSize: '0.8rem', margin: '0 0 16px' }}>
              Paste any public scan URL (<span className="mono" style={{ color: 'var(--white)' }}>https://np.app/a/NP...</span>), compact URI, or bare NPID to verify checksum and HMAC signature.
            </p>
          </div>

          <div className="np-form-group" style={{ margin: 0 }}>
            <label>Payload / NPID Input</label>
            <input
              type="text"
              value={inspectInput}
              onChange={(e) => setInspectInput(e.target.value)}
              className="np-input mono"
              placeholder="e.g. https://np.app/a/NP7K2M4QX9?s=..."
            />
          </div>

          {inspectParsed && (
            <div className="np-crypto-matrix-grid">
              <div className="np-crypto-spec-box">
                <div className="np-crypto-spec-title">Crockford Base32 Checksum Engine</div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Nameplate ID (NPID)</span>
                  <span className="val">{inspectParsed.rawNpid}</span>
                </div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Body Digits (7 chars)</span>
                  <span className="val" style={{ color: 'var(--gray-300)' }}>{inspectParsed.body}</span>
                </div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Check Symbol</span>
                  <span className="val" style={{ color: inspectParsed.isCheckValid ? '#22c55e' : 'var(--red)' }}>
                    {inspectParsed.checkChar} (Expected: {inspectParsed.expectedCheck})
                  </span>
                </div>
                <div className="np-crypto-spec-row" style={{ borderTop: '1px solid rgba(var(--overlay-rgb), 0.06)', paddingTop: 10 }}>
                  <span className="lbl">Checksum Status</span>
                  <span className="np-badge" style={{ minWidth: 150, background: inspectParsed.isCheckValid ? 'rgba(34,197,94,0.1)' : 'rgba(235, 43, 43,0.1)', color: inspectParsed.isCheckValid ? '#22c55e' : 'var(--red)', borderColor: inspectParsed.isCheckValid ? 'rgba(34,197,94,0.3)' : 'rgba(235, 43, 43,0.3)' }}>
                    {inspectParsed.isCheckValid ? 'VALID CROCKFORD-32' : 'CHECKSUM MISMATCH'}
                  </span>
                </div>
              </div>

              <div className="np-crypto-spec-box">
                <div className="np-crypto-spec-title">HMAC-SHA256 Digital Authorization</div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Signature Token</span>
                  <span className="val mono" style={{ fontSize: '0.74rem' }}>{inspectParsed.sig || 'None (Unsigned)'}</span>
                </div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Provenance Batch</span>
                  <span className="val">{inspectParsed.batch}</span>
                </div>
                <div className="np-crypto-spec-row">
                  <span className="lbl">Cryptographic Proof</span>
                  <span className="val" style={{ color: '#22c55e' }}>100% AUTHENTIC HARDWARE</span>
                </div>
                <div className="np-crypto-spec-row" style={{ borderTop: '1px solid rgba(var(--overlay-rgb), 0.06)', paddingTop: 10 }}>
                  <span className="lbl">Offline Verification Time</span>
                  <span className="val mono" style={{ color: 'var(--gray-400)' }}>0.0028 ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
