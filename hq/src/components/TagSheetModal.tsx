import React, { useState } from 'react';
import { printTagSheet, type TagPrintItem, type TagPrintOptions } from '../lib/tagPrint';
import { generateQrSvg } from '../lib/qr';

interface TagSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagPrintItem[];
  batchId?: string;
  defaultPropertyName?: string;
}

export const TagSheetModal: React.FC<TagSheetModalProps> = ({
  isOpen,
  onClose,
  tags,
  batchId = 'BATCH-01',
  defaultPropertyName = 'NAMEPLATE ASSET TAG',
}) => {
  const [layout, setLayout] = useState<'avery-5160' | 'industrial-plate'>('avery-5160');
  const [headline, setHeadline] = useState(defaultPropertyName);
  const [fineprint, setFineprint] = useState('PROPERTY ASSET RECORD · DO NOT REMOVE');
  const [currentPage, setCurrentPage] = useState(0);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(tags.length / 30));
  const pageTags = tags.slice(currentPage * 30, (currentPage + 1) * 30);

  // Fill up to 30 slots for preview
  const displaySlots: (TagPrintItem | null)[] = [...pageTags];
  while (displaySlots.length < 30) {
    displaySlots.push(null);
  }

  const printOptions: TagPrintOptions = {
    sheetLayout: layout,
    sheetTitle: headline,
    fineprintText: fineprint,
    batchId,
  };

  const handlePrint = () => {
    printTagSheet(tags, printOptions);
  };

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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--line-strong)',
          borderRadius: 2,
          width: 'min(1100px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
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
              PHYSICAL HARDWARE TAG STUDIO
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--white)' }}>
              Print 30-Up Adhesive Label Sheet (PDF)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="np-user-panel-close"
            style={{ borderRadius: 2 }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Modal Body: Controls + Sheet Viewport */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Left Controls Column */}
          <div
            style={{
              padding: 20,
              borderRight: '1px solid var(--line)',
              background: 'var(--bg-subtle)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div className="np-form-group">
              <label style={{ fontSize: '0.68rem' }}>Sheet Specification</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 2,
                    border: `1px solid ${layout === 'avery-5160' ? 'var(--red)' : 'var(--line)'}`,
                    background: layout === 'avery-5160' ? 'var(--red-subtle)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    color: 'var(--white)',
                  }}
                >
                  <input
                    type="radio"
                    name="layout"
                    checked={layout === 'avery-5160'}
                    onChange={() => setLayout('avery-5160')}
                  />
                  <div>
                    <strong style={{ display: 'block' }}>Avery 5160 / 30-Up</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>
                      2.625" × 1.0" standard paper/polyester
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 2,
                    border: `1px solid ${layout === 'industrial-plate' ? 'var(--red)' : 'var(--line)'}`,
                    background: layout === 'industrial-plate' ? 'var(--red-subtle)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    color: 'var(--white)',
                  }}
                >
                  <input
                    type="radio"
                    name="layout"
                    checked={layout === 'industrial-plate'}
                    onChange={() => setLayout('industrial-plate')}
                  />
                  <div>
                    <strong style={{ display: 'block' }}>Industrial Destructible Plate</strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>
                      With tamper slits & fiducial marks
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="np-form-group">
              <label style={{ fontSize: '0.68rem' }}>Tag Label Header</label>
              <input
                type="text"
                className="np-input mono"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. SONORAN RIDGE"
              />
            </div>

            <div className="np-form-group">
              <label style={{ fontSize: '0.68rem' }}>Fineprint Instruction</label>
              <input
                type="text"
                className="np-input mono"
                value={fineprint}
                onChange={(e) => setFineprint(e.target.value)}
              />
            </div>

            <div
              style={{
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--line)',
                borderRadius: 2,
              }}
            >
              <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                BATCH DETAILS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>Batch ID:</span>
                <strong className="mono" style={{ fontSize: '0.8rem', color: 'var(--white)' }}>
                  {batchId}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>Total Tags:</span>
                <strong className="mono" style={{ fontSize: '0.8rem', color: 'var(--white)' }}>
                  {tags.length}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-300)' }}>Sheet Count:</span>
                <strong className="mono" style={{ fontSize: '0.8rem', color: 'var(--white)' }}>
                  {totalPages} {totalPages === 1 ? 'Sheet' : 'Sheets'}
                </strong>
              </div>
            </div>

            {/* Pagination if multiple sheets */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="np-btn"
                  style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--bg-elevated)', color: 'var(--white)', border: '1px solid var(--line)' }}
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                >
                  ← Prev Sheet
                </button>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  Sheet {currentPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  className="np-btn"
                  style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--bg-elevated)', color: 'var(--white)', border: '1px solid var(--line)' }}
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Next Sheet →
                </button>
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="np-btn np-btn--primary"
                onClick={handlePrint}
                style={{
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.88rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print Sheet / Save PDF
              </button>
              <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--gray-500)', textAlign: 'center' }}>
                Standard 8.5" × 11" Letter · No scaling required
              </div>
            </div>
          </div>

          {/* Right Preview Viewport */}
          <div
            style={{
              padding: 24,
              overflowY: 'auto',
              background: '#0a0a0a',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--gray-400)',
                marginBottom: 12,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <span>PHYSICAL SHEET PREVIEW (30 LABELS · 3 × 10 GRID)</span>
              <span style={{ color: 'var(--red)' }}>● 100% SCALE PROPORTIONAL</span>
            </div>

            {/* 8.5" x 11" Proportional Sheet Canvas */}
            <div
              style={{
                width: '680px',
                minHeight: '880px',
                background: '#ffffff',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
                padding: '28px 18px',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                color: '#000',
              }}
            >
              {/* Sheet header meta */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '8px',
                  color: '#666',
                  marginBottom: 10,
                  borderBottom: '1px solid #eee',
                  paddingBottom: 4,
                }}
              >
                <span>NAMEPLATE TAG SHEET · 30-UP PHYSICAL DIE-CUT</span>
                <span>BATCH: {batchId} · PAGE {currentPage + 1}/{totalPages}</span>
              </div>

              {/* 3x10 Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(10, 1fr)',
                  gap: '5px 8px',
                  flex: 1,
                }}
              >
                {displaySlots.map((tag, idx) => {
                  if (!tag) {
                    return (
                      <div
                        key={idx}
                        style={{
                          border: '1px dashed #ddd',
                          borderRadius: 2,
                          height: '74px',
                          background: '#fafafa',
                          opacity: 0.4,
                        }}
                      />
                    );
                  }

                  return (
                    <div
                      key={tag.npid + idx}
                      style={{
                        border: layout === 'industrial-plate' ? '1px solid #000' : '1px dashed #bbb',
                        background: layout === 'industrial-plate' ? '#fdfdfd' : '#ffffff',
                        padding: '4px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        height: '74px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Corner marks for industrial */}
                      {layout === 'industrial-plate' && (
                        <>
                          <div style={{ position: 'absolute', top: 2, left: 2, width: 4, height: 4, borderTop: '1px solid #000', borderLeft: '1px solid #000' }} />
                          <div style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderTop: '1px solid #000', borderRight: '1px solid #000' }} />
                          <div style={{ position: 'absolute', bottom: 2, left: 2, width: 4, height: 4, borderBottom: '1px solid #000', borderLeft: '1px solid #000' }} />
                          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 4, height: 4, borderBottom: '1px solid #000', borderRight: '1px solid #000' }} />
                        </>
                      )}

                      {/* QR Thumbnail */}
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          flexShrink: 0,
                          background: '#000',
                          padding: 2,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        dangerouslySetInnerHTML={{ __html: generateQrSvg(tag.url, 54) }}
                      />

                      {/* Tag Typography */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span
                            style={{
                              fontFamily: 'Courier New, monospace',
                              fontSize: '6px',
                              fontWeight: 800,
                              color: '#eb2b2b',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '80px',
                            }}
                          >
                            {headline}
                          </span>
                          <span style={{ fontFamily: 'Courier New, monospace', fontSize: '5px', color: '#666' }}>
                            {batchId}
                          </span>
                        </div>

                        <div
                          style={{
                            fontFamily: 'Courier New, monospace',
                            fontSize: '9.5px',
                            fontWeight: 900,
                            letterSpacing: '0.02em',
                            color: '#000',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tag.npid}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontFamily: 'Courier New, monospace',
                            fontSize: '5.5px',
                            color: '#555',
                          }}
                        >
                          <span>SIG: {tag.sig.slice(0, 6)}</span>
                          <span style={{ fontWeight: 700, background: '#eee', padding: '0 2px' }}>ECC-H</span>
                        </div>

                        <div
                          style={{
                            fontFamily: 'Courier New, monospace',
                            fontSize: '4.5px',
                            color: '#777',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: 1,
                          }}
                        >
                          {fineprint}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
