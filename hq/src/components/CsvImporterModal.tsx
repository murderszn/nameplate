import React, { useState, useRef } from 'react';
import { api, type Asset, type Property, type AssetCategory } from '../api/client';
import { mintNpid, normalizeCrockford } from '../lib/qr';

interface CsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  categories: AssetCategory[];
  onImportComplete: (newAssets: Asset[]) => void;
}

interface ParsedRow {
  index: number;
  npid: string;
  isAutoMinted: boolean;
  categoryName: string;
  categoryId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  propertyName: string;
  propertyId: string;
  unitLabel: string;
  installDate: string;
  purchaseCost: number;
  expectedLifeMonths: number;
  condition: string;
  status: string;
  notes: string;
  isValid: boolean;
  error?: string;
}

// Simple RFC 4180 CSV parser
function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export const CsvImporterModal: React.FC<CsvImporterModalProps> = ({
  isOpen,
  onClose,
  properties,
  categories,
  onImportComplete,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id || 'prop_sonoran_ridge'
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{ count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateContent = [
      'npid,category,manufacturer,model,serial_number,property_id,unit_label,install_date,purchase_cost,expected_life_months,condition,status,notes',
      ',HVAC,Carrier,FE4ANF002,4821A90124,prop_sonoran_ridge,101,2021-04-15,4800,144,good,active,Split system air handler',
      ',Water Heater,Rheem,PROG50-40N,RH2022-0941,prop_sonoran_ridge,101,2022-01-10,1250,120,good,active,50-gallon atmospheric gas',
      ',Range,GE Appliances,JBS86SPSS,GE-994201,prop_sonoran_ridge,101,2021-04-15,850,144,good,active,Electric freestanding convection',
      ',Refrigerator,Whirlpool,WRF535SWHZ,WP-77218,prop_sonoran_ridge,101,2021-04-15,1600,120,good,active,French door with ice maker',
      ',Dishwasher,Bosch,SHXM4AY55N,BS-11029,prop_sonoran_ridge,101,2021-04-15,900,120,good,active,Stainless quiet series',
      ',Washer,Speed Queen,TR7003WN,SQ-88124,prop_sonoran_ridge,102,2020-08-20,1150,180,good,active,Commercial-grade top load',
      ',Dryer,Speed Queen,DR7003WE,SQ-88125,prop_sonoran_ridge,102,2020-08-20,1150,180,good,active,Commercial-grade electric dryer',
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nameplate_asset_onboarding_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setParseError('The selected file appears to be empty.');
        return;
      }

      try {
        const rawRows = parseCsv(text);
        if (rawRows.length < 2) {
          setParseError('CSV must have a header row and at least 1 record row.');
          return;
        }

        const headers = rawRows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const colMap: Record<string, number> = {};

        headers.forEach((h, idx) => {
          if (['npid', 'tag', 'assettag', 'code'].includes(h)) colMap.npid = idx;
          if (['category', 'categoryid', 'type', 'assetcategory'].includes(h)) colMap.category = idx;
          if (['manufacturer', 'make', 'brand', 'mfr'].includes(h)) colMap.manufacturer = idx;
          if (['model', 'modelnumber', 'modelraw'].includes(h)) colMap.model = idx;
          if (['serialnumber', 'serial', 'serialno', 'sn'].includes(h)) colMap.serial = idx;
          if (['propertyid', 'property', 'propertyname', 'community'].includes(h)) colMap.property = idx;
          if (['unitlabel', 'unit', 'unitid', 'apartment', 'room'].includes(h)) colMap.unit = idx;
          if (['installdate', 'installed', 'dateinstalled'].includes(h)) colMap.installDate = idx;
          if (['purchasecost', 'cost', 'price', 'purchaseprice'].includes(h)) colMap.cost = idx;
          if (['expectedlifemonths', 'lifemonths', 'usefulllife'].includes(h)) colMap.life = idx;
          if (['condition', 'assetcondition'].includes(h)) colMap.condition = idx;
          if (['status', 'assetstatus'].includes(h)) colMap.status = idx;
          if (['notes', 'comments', 'description'].includes(h)) colMap.notes = idx;
        });

        const rows: ParsedRow[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const r = rawRows[i];
          if (!r || r.length === 0 || r.every((c) => c.trim() === '')) continue;

          let npid = colMap.npid !== undefined ? r[colMap.npid]?.trim() : '';
          const isAutoMinted = !npid;
          if (isAutoMinted) {
            npid = mintNpid();
          } else {
            npid = npid.toUpperCase();
            if (!npid.startsWith('NP-')) {
              npid = `NP-${normalizeCrockford(npid)}`;
            }
          }

          const rawCat = colMap.category !== undefined ? r[colMap.category]?.trim() : 'HVAC';
          const matchedCat = categories.find(
            (c) =>
              c.displayName.toLowerCase() === rawCat.toLowerCase() ||
              c.key.toLowerCase() === rawCat.toLowerCase() ||
              c.id.toLowerCase() === rawCat.toLowerCase()
          ) || categories[0] || {
            id: 'cat_hvac',
            key: 'hvac',
            displayName: 'HVAC Equipment',
            defaultUsefulLifeMonths: 120,
            defaultReplacementCost: 4500,
          };

          const rawProp = colMap.property !== undefined ? r[colMap.property]?.trim() : '';
          const matchedProp = properties.find(
            (p) =>
              p.id === rawProp ||
              p.name.toLowerCase() === rawProp.toLowerCase() ||
              (p.code && p.code.toLowerCase() === rawProp.toLowerCase())
          ) || properties.find((p) => p.id === selectedPropertyId) || properties[0];

          const manufacturer = colMap.manufacturer !== undefined ? r[colMap.manufacturer]?.trim() : 'Generic';
          const model = colMap.model !== undefined ? r[colMap.model]?.trim() : 'Standard Model';
          const serialNumber = colMap.serial !== undefined ? r[colMap.serial]?.trim() : `SN-${Date.now()}`;
          const unitLabel = colMap.unit !== undefined ? r[colMap.unit]?.trim() : '101';
          const installDate = colMap.installDate !== undefined && r[colMap.installDate]?.trim()
            ? r[colMap.installDate]?.trim()
            : new Date().toISOString().split('T')[0];
          const purchaseCost = colMap.cost !== undefined && !isNaN(Number(r[colMap.cost]))
            ? Number(r[colMap.cost])
            : Number(matchedCat.defaultReplacementCost || 1200);
          const expectedLifeMonths = colMap.life !== undefined && !isNaN(Number(r[colMap.life]))
            ? Number(r[colMap.life])
            : Number(matchedCat.defaultUsefulLifeMonths || 120);
          const condition = colMap.condition !== undefined ? r[colMap.condition]?.trim().toLowerCase() : 'good';
          const status = colMap.status !== undefined ? r[colMap.status]?.trim().toLowerCase() : 'active';
          const notes = colMap.notes !== undefined ? r[colMap.notes]?.trim() : '';

          rows.push({
            index: i,
            npid,
            isAutoMinted,
            categoryName: matchedCat.displayName,
            categoryId: matchedCat.id,
            manufacturer,
            model,
            serialNumber,
            propertyName: matchedProp?.name || 'Sonoran Ridge',
            propertyId: matchedProp?.id || selectedPropertyId,
            unitLabel,
            installDate,
            purchaseCost,
            expectedLifeMonths,
            condition: ['excellent', 'good', 'fair', 'poor'].includes(condition) ? condition : 'good',
            status: ['active', 'needs_repair', 'in_repair', 'disposed', 'unaccounted_for'].includes(status) ? status : 'active',
            notes,
            isValid: true,
          });
        }

        setParsedRows(rows);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Failed to parse CSV spreadsheet.');
      }
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedRows.length });

    const createdAssets: Asset[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        const created = await api.createAsset({
          npid: row.npid,
          categoryId: row.categoryId,
          manufacturerRaw: row.manufacturer,
          modelRaw: row.model,
          serialNumber: row.serialNumber,
          serialConfidence: 'verified',
          status: row.status,
          condition: row.condition,
          currentPropertyId: row.propertyId,
          installDate: row.installDate ? `${row.installDate}T00:00:00Z` : null,
          purchaseCost: row.purchaseCost,
          expectedLifeMonths: row.expectedLifeMonths,
          notes: row.notes || `Imported via CSV into Unit ${row.unitLabel}`,
        });
        createdAssets.push(created);
      } catch (err) {
        console.warn(`Failed importing row ${row.index}:`, err);
      }

      setImportProgress({ current: i + 1, total: parsedRows.length });
    }

    setIsImporting(false);
    setImportSummary({ count: createdAssets.length });
    onImportComplete(createdAssets);

    setTimeout(() => {
      onClose();
    }, 1600);
  };

  const autoMintCount = parsedRows.filter((r) => r.isAutoMinted).length;

  return (
    <div
      className="np-drawer-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--line-strong)',
          borderRadius: 2,
          width: 'min(980px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
          }}
        >
          <div>
            <div className="mono red-accent" style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em' }}>
              PORTFOLIO ONBOARDING WIZARD
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--white)' }}>
              Bulk CSV Asset Roster Importer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="np-user-panel-close"
            style={{ borderRadius: 2 }}
            disabled={isImporting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Instructions & Template Box */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--line)',
              padding: '14px 18px',
              borderRadius: 2,
            }}
          >
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--white)', display: 'block' }}>
                Onboard Existing Appliance Rosters
              </strong>
              <p className="np-muted" style={{ fontSize: '0.78rem', margin: '2px 0 0' }}>
                Upload an existing spreadsheet of HVAC, appliances, and mechanical equipment. Missing NPIDs will be automatically minted in Crockford-32.
              </p>
            </div>
            <button
              type="button"
              className="np-btn"
              onClick={handleDownloadTemplate}
              style={{
                fontSize: '0.78rem',
                background: 'var(--bg-elevated)',
                color: 'var(--white)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Template (.CSV)
            </button>
          </div>

          {/* Upload Drag & Drop Area */}
          <div
            style={{
              border: '2px dashed var(--line-strong)',
              borderRadius: 2,
              padding: '28px 20px',
              textAlign: 'center',
              background: 'var(--bg-subtle)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div style={{ color: 'var(--red)', marginBottom: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--white)', display: 'block' }}>
              {fileName ? fileName : 'Click to select or drag & drop CSV roster'}
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>
              Supports .csv exports from Yardi, RealPage, AppFolio, or custom Excel sheets
            </span>
          </div>

          {parseError && (
            <div style={{ padding: '10px 14px', background: 'rgba(235, 43, 43, 0.1)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 2, fontSize: '0.8rem' }}>
              ⚠️ {parseError}
            </div>
          )}

          {/* Fallback Property Selector */}
          {parsedRows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--gray-400)' }}>
                  TARGET PROPERTY:
                </span>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="np-input mono"
                  style={{ width: 'auto', minWidth: 220 }}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'LOC'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: '0.76rem', color: 'var(--gray-300)' }}>
                <span>Parsed: <strong className="mono" style={{ color: 'var(--white)' }}>{parsedRows.length}</strong></span>
                <span>Auto-Minted Tags: <strong className="mono red-accent">{autoMintCount}</strong></span>
                <span>Ready: <strong className="mono" style={{ color: '#22c55e' }}>{parsedRows.filter(r => r.isValid).length}</strong></span>
              </div>
            </div>
          )}

          {/* Live Preview Table */}
          {parsedRows.length > 0 && (
            <div>
              <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 8, fontWeight: 700 }}>
                PARSED ROSTER PREVIEW ({parsedRows.length} ASSETS)
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '280px', border: '1px solid var(--line)', borderRadius: 2 }}>
                <table className="np-table" style={{ fontSize: '0.76rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>NPID</th>
                      <th>Category</th>
                      <th>Manufacturer / Model</th>
                      <th>Serial Number</th>
                      <th>Unit</th>
                      <th>Cost</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 15).map((row) => (
                      <tr key={row.index}>
                        <td>
                          <span className="mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
                            {row.npid}
                          </span>
                          {row.isAutoMinted && (
                            <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--gray-400)' }}>
                              ⚡ Auto-minted
                            </span>
                          )}
                        </td>
                        <td>{row.categoryName}</td>
                        <td>
                          <strong>{row.manufacturer}</strong> · {row.model}
                        </td>
                        <td className="mono">{row.serialNumber}</td>
                        <td>Unit {row.unitLabel}</td>
                        <td className="mono">${row.purchaseCost.toLocaleString()}</td>
                        <td>
                          <span className="np-badge np-badge--status-active" style={{ fontSize: '0.66rem' }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 6 }}>
                  Showing first 15 of {parsedRows.length} assets. All {parsedRows.length} will be committed.
                </div>
              )}
            </div>
          )}

          {/* Ingestion Progress */}
          {isImporting && importProgress && (
            <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--line)', borderRadius: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 8 }}>
                <span className="mono" style={{ color: 'var(--white)' }}>
                  Ingesting equipment into portfolio registry…
                </span>
                <span className="mono red-accent">
                  {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: 'var(--red)',
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Success Summary */}
          {importSummary && (
            <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e', borderRadius: 2, fontSize: '0.82rem', fontWeight: 600 }}>
              ✓ Successfully ingested {importSummary.count} equipment records into the active portfolio registry!
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: 'var(--bg-subtle)',
          }}
        >
          <button
            type="button"
            className="np-btn"
            onClick={onClose}
            disabled={isImporting}
            style={{ background: 'transparent', color: 'var(--gray-300)', border: '1px solid var(--line)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="np-btn np-btn--primary"
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isImporting}
            style={{ minWidth: 160 }}
          >
            {isImporting ? 'Ingesting Assets…' : `Commit & Ingest (${parsedRows.length}) Assets`}
          </button>
        </div>
      </div>
    </div>
  );
};
