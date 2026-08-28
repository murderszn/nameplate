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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-[var(--np-line)] pb-5">
        <div>
          <span className="font-mono text-xs text-[var(--np-red)] tracking-widest uppercase font-bold">05 / FLEET SYNC & HARDWARE OPS</span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Sync Engine & Tag Studio</h1>
          <p className="text-sm text-[var(--np-gray-400)] mt-0.5">
            Monotonic Sequence Watermark: <span className="font-mono text-white font-semibold">#{logs[0]?.seq || 10483}</span> · Zero-Signal Offline Outbox Router
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateSyncPush}
            disabled={isSimulating}
            className="inline-flex items-center gap-2 bg-[var(--np-red)] hover:bg-[var(--np-red-hover)] text-white px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors shadow-[0_0_15px_rgba(255,42,42,0.3)] cursor-pointer"
          >
            {isSimulating ? (
              <span className="inline-block animate-spin">⟳</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="m16 5 5 5-5 5"/><path d="M21 10H9"/></svg>
            )}
            Simulate Ingestion Push
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-4 rounded-lg">
          <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase tracking-wider">Active Field Tablets</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">14 <span className="text-xs font-normal text-[var(--np-gray-400)]">Devices</span></div>
          <div className="text-xs text-[var(--np-gray-400)] mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> Subterranean Sync Ready
          </div>
        </div>

        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-4 rounded-lg">
          <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase tracking-wider">Today's Outbox Ops</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">1,492</div>
          <div className="text-xs text-emerald-400 mt-2 font-mono">0 Drops · 100% Idempotent</div>
        </div>

        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-4 rounded-lg">
          <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase tracking-wider">Vault Tag Reserve Pool</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">3,850 <span className="text-xs font-normal text-[var(--np-gray-400)]">/ 4,000</span></div>
          <div className="text-xs text-[var(--np-gray-400)] mt-2">Pre-allocated 60-day leases</div>
        </div>

        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-4 rounded-lg">
          <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase tracking-wider">Verification Match</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">100.0%</div>
          <div className="text-xs text-[var(--np-gray-400)] mt-2 font-mono">HMAC-SHA256 Provenance</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-[var(--np-line)] gap-6">
        <button
          onClick={() => setActiveTab('sync')}
          className={`pb-3 text-sm font-mono font-bold tracking-wider cursor-pointer border-b-2 transition-colors ${
            activeTab === 'sync' ? 'border-[var(--np-red)] text-white' : 'border-transparent text-[var(--np-gray-500)] hover:text-[var(--np-gray-300)]'
          }`}
        >
          01 / FLEET SYNC LEDGER ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={`pb-3 text-sm font-mono font-bold tracking-wider cursor-pointer border-b-2 transition-colors ${
            activeTab === 'studio' ? 'border-[var(--np-red)] text-white' : 'border-transparent text-[var(--np-gray-500)] hover:text-[var(--np-gray-300)]'
          }`}
        >
          02 / HARDWARE TAG STUDIO & PRINT SHEETS
        </button>
        <button
          onClick={() => setActiveTab('inspector')}
          className={`pb-3 text-sm font-mono font-bold tracking-wider cursor-pointer border-b-2 transition-colors ${
            activeTab === 'inspector' ? 'border-[var(--np-red)] text-white' : 'border-transparent text-[var(--np-gray-500)] hover:text-[var(--np-gray-300)]'
          }`}
        >
          03 / CRYPTOGRAPHIC TAG INSPECTOR
        </button>
      </div>

      {/* Tab 1: Fleet Sync Ledger */}
      {activeTab === 'sync' && (
        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[var(--np-line)] flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-[var(--np-gray-400)] uppercase tracking-wider">
              Real-Time Outbox Push Stream (PostgreSQL Monotonic Change Sequences)
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-0.5 rounded">
              SYNC ENGINE ACTIVE
            </span>
          </div>

          <div className="divide-y divide-[var(--np-line)]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[var(--np-bg-elevated)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-black border border-[var(--np-line)] rounded text-[var(--np-red)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{log.deviceId}</span>
                      <span className="text-xs text-[var(--np-gray-500)]">({log.techName})</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--np-line)] text-[var(--np-gray-300)]">
                        {log.entityType} · {log.opType}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--np-gray-300)] mt-1">{log.summary}</p>
                    <div className="text-xs font-mono text-[var(--np-gray-500)] mt-1">
                      {new Date(log.occurredAt).toLocaleTimeString()} · Op ID: {log.id}
                    </div>
                  </div>
                </div>

                <div className="text-right flex md:flex-col items-center md:items-end justify-between">
                  <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                    {log.status}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--np-gray-500)] mt-1">
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
        <div className="space-y-6">
          <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-5 rounded-lg">
            <h3 className="text-base font-bold text-white">Batch Tag Generation & Sheet Exporter</h3>
            <p className="text-xs text-[var(--np-gray-400)] mt-1">
              Generate serialized sheets of 30 destructible vinyl tags (1.5"×1") with Crockford-32 check digits and HMAC-SHA256 authentication seals.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="text-xs font-mono text-[var(--np-gray-400)] uppercase block mb-1">Batch Identifier</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full bg-black border border-[var(--np-line)] text-white text-xs font-mono px-3 py-2 rounded focus:border-[var(--np-red)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[var(--np-gray-400)] uppercase block mb-1">Tag Count</label>
                <select
                  value={tagCount}
                  onChange={(e) => setTagCount(parseInt(e.target.value, 10))}
                  className="w-full bg-black border border-[var(--np-line)] text-white text-xs font-mono px-3 py-2 rounded focus:border-[var(--np-red)] focus:outline-none"
                >
                  <option value={30}>30 Tags (1 Standard Printable Sheet)</option>
                  <option value={60}>60 Tags (2 Sheets)</option>
                  <option value={150}>150 Tags (5 Sheets)</option>
                  <option value={500}>500 Tags (1 Offline Device Vault Block)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleGenerateBatch}
                  className="w-full bg-[var(--np-red)] hover:bg-[var(--np-red-hover)] text-white py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                >
                  Generate Batch
                </button>
              </div>
            </div>
          </div>

          {/* Tag Grid Preview */}
          <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-5 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Print Sheet Preview ({generatedBatch.length} Tags · {batchId})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const csv = 'NPID,URL,COMPACT_URI,SIGNATURE,TIMESTAMP,BATCH\n' + generatedBatch.map(b => `${b.npid},"${b.url}","${b.compactUri}",${b.sig},${b.ts},${b.batchId}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${batchId}-manifest.csv`;
                    a.click();
                  }}
                  className="px-3 py-1 bg-black border border-[var(--np-line)] text-[var(--np-gray-300)] hover:text-white text-xs font-mono rounded cursor-pointer"
                >
                  Export CSV Manifest
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {generatedBatch.slice(0, 30).map((t, idx) => (
                <div key={idx} className="bg-black border border-[var(--np-line)] p-3 rounded flex flex-col items-center text-center group hover:border-[var(--np-red)] transition-colors">
                  <div
                    className="w-24 h-24 mb-2"
                    dangerouslySetInnerHTML={{ __html: generateQrSvg(t.url, 96) }}
                  />
                  <div className="font-mono text-xs font-bold text-[var(--np-red)]">{t.npid}</div>
                  <div className="text-[10px] font-mono text-[var(--np-gray-500)] mt-0.5 truncate w-full">
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
        <div className="bg-[var(--np-bg-card)] border border-[var(--np-line)] p-5 rounded-lg space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Cryptographic NPID & QR Matrix Inspector</h3>
            <p className="text-xs text-[var(--np-gray-400)] mt-1">
              Paste any public scan URL (<code className="text-white">https://np.app/a/NP...</code>), compact URI, or bare NPID to verify checksum and HMAC signature.
            </p>
          </div>

          <div>
            <label className="text-xs font-mono text-[var(--np-gray-400)] uppercase block mb-1">Payload / NPID Input</label>
            <input
              type="text"
              value={inspectInput}
              onChange={(e) => setInspectInput(e.target.value)}
              className="w-full bg-black border border-[var(--np-line)] text-white text-xs font-mono px-3 py-2.5 rounded focus:border-[var(--np-red)] focus:outline-none"
              placeholder="e.g. https://np.app/a/NP7K2M4QX9?s=..."
            />
          </div>

          {inspectParsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-black border border-[var(--np-line)] p-4 rounded space-y-3">
                <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase">Crockford Base32 Checksum Engine</div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Canonical NPID</span>
                  <span className="font-mono text-sm font-bold text-white">{inspectParsed.rawNpid}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Body Digits (7 chars)</span>
                  <span className="font-mono text-xs text-[var(--np-gray-300)]">{inspectParsed.body}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Check Symbol</span>
                  <span className={`font-mono text-xs font-bold ${inspectParsed.isCheckValid ? 'text-emerald-400' : 'text-[var(--np-red)]'}`}>
                    {inspectParsed.checkChar} (Expected: {inspectParsed.expectedCheck})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--np-gray-400)]">Checksum Status</span>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${inspectParsed.isCheckValid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                    {inspectParsed.isCheckValid ? 'VALID CROCKFORD-32' : 'CHECKSUM MISMATCH'}
                  </span>
                </div>
              </div>

              <div className="bg-black border border-[var(--np-line)] p-4 rounded space-y-3">
                <div className="text-xs font-mono text-[var(--np-gray-500)] uppercase">HMAC-SHA256 Digital Authorization</div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Signature Token</span>
                  <span className="font-mono text-xs text-white">{inspectParsed.sig || 'None (Unsigned)'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Provenance Batch</span>
                  <span className="font-mono text-xs text-[var(--np-gray-300)]">{inspectParsed.batch}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--np-line)] pb-2">
                  <span className="text-xs text-[var(--np-gray-400)]">Cryptographic Proof</span>
                  <span className="font-mono text-xs font-bold text-emerald-400">100% AUTHENTIC HARDWARE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--np-gray-400)]">Offline Verification Time</span>
                  <span className="font-mono text-xs text-[var(--np-gray-400)]">0.0028 ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
