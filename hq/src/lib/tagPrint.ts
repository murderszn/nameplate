/**
 * Nameplate Tag Sheet Print Engine (HQ)
 *
 * Implements exact physical sheet layouts for:
 * 1. Standard 30-Up Avery 5160 (Letter 8.5"×11", 3 columns × 10 rows, labels 2.625"×1.0")
 * 2. Industrial Destructible Vinyl 30-Up (1.5"×1.0" with machine-vision fiducials & tamper slits)
 */

import { generateQrSvg } from './qr';

export interface TagPrintItem {
  npid: string;
  url: string;
  sig: string;
  ts: number;
  batchId?: string;
  propertyName?: string;
  categoryName?: string;
}

export interface TagPrintOptions {
  sheetLayout?: 'avery-5160' | 'industrial-plate';
  sheetTitle?: string;
  batchId?: string;
  propertyName?: string;
  fineprintText?: string;
  includeTamperSlits?: boolean;
  includeFiducials?: boolean;
  highContrast?: boolean;
}

export function generatePrintHtml(tags: TagPrintItem[], options: TagPrintOptions = {}): string {
  const layout = options.sheetLayout || 'avery-5160';
  const batchId = options.batchId || 'BATCH-01';
  const sheetTitle = options.sheetTitle || options.propertyName || 'NAMEPLATE ASSET TAG';
  const fineprint = options.fineprintText || 'PROPERTY ASSET RECORD · DO NOT REMOVE';
  const isIndustrial = layout === 'industrial-plate';

  // Group tags into pages of 30
  const pages: TagPrintItem[][] = [];
  for (let i = 0; i < tags.length; i += 30) {
    pages.push(tags.slice(i, i + 30));
  }
  if (pages.length === 0) {
    pages.push([]);
  }

  const pagesHtml = pages
    .map((pageTags, pageIdx) => {
      // Pad to 30 if last page is partial
      const slots: (TagPrintItem | null)[] = [...pageTags];
      while (slots.length < 30) {
        slots.push(null);
      }

      const labelsHtml = slots
        .map((tag) => {
          if (!tag) {
            return `<div class="np-label np-label--empty"></div>`;
          }

          const qrSvg = generateQrSvg(tag.url, 80);
          const fiducialsHtml = isIndustrial
            ? `
              <span class="fiducial tl"></span>
              <span class="fiducial tr"></span>
              <span class="fiducial bl"></span>
              <span class="fiducial br"></span>
              <span class="tamper-slit tl"></span>
              <span class="tamper-slit tr"></span>
              <span class="tamper-slit bl"></span>
              <span class="tamper-slit br"></span>
            `
            : '';

          return `
            <div class="np-label ${isIndustrial ? 'np-label--industrial' : 'np-label--avery'}">
              ${fiducialsHtml}
              <div class="np-label-qr">
                ${qrSvg}
              </div>
              <div class="np-label-body">
                <div class="np-label-header">
                  <span class="np-label-title">${sheetTitle}</span>
                  <span class="np-label-batch">${batchId}</span>
                </div>
                <div class="np-label-npid">${tag.npid}</div>
                <div class="np-label-meta">
                  <span class="np-label-sig">SIG: ${tag.sig.slice(0, 8)}</span>
                  <span class="np-label-sec">ECC-H</span>
                </div>
                <div class="np-label-fineprint">${fineprint}</div>
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="np-print-page">
          <div class="np-sheet-header-print">
            <span class="np-sheet-meta-left">NAMEPLATE HARDWARE REGISTRY · 30-UP STICKER SHEET · PAGE ${pageIdx + 1} OF ${pages.length}</span>
            <span class="np-sheet-meta-right">BATCH: ${batchId} · CROCKFORD-32 · SHA-256</span>
          </div>
          <div class="np-sheet-grid">
            ${labelsHtml}
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Nameplate Tag Sheet — ${batchId}</title>
  <style>
    @page {
      size: 8.5in 11in portrait;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      width: 8.5in;
      margin: 0 auto;
    }
    .np-print-page {
      width: 8.5in;
      height: 11in;
      position: relative;
      page-break-after: always;
      padding-top: 0.5in;
      padding-bottom: 0.5in;
      padding-left: 0.1875in;
      padding-right: 0.1875in;
      background: #ffffff;
      overflow: hidden;
    }
    .np-sheet-header-print {
      position: absolute;
      top: 0.15in;
      left: 0.25in;
      right: 0.25in;
      display: flex;
      justify-content: space-between;
      font-family: "Courier New", Courier, monospace;
      font-size: 6.5pt;
      color: #666666;
      letter-spacing: 0.06em;
    }
    .np-sheet-grid {
      display: grid;
      grid-template-columns: repeat(3, 2.625in);
      grid-template-rows: repeat(10, 1.0in);
      column-gap: 0.125in;
      row-gap: 0in;
      width: 8.125in;
      height: 10.0in;
    }
    .np-label {
      width: 2.625in;
      height: 1.0in;
      padding: 0.08in 0.1in;
      display: flex;
      align-items: center;
      gap: 0.1in;
      position: relative;
      background: #ffffff;
      border: 1px dashed #e2e2e2;
      overflow: hidden;
    }
    @media print {
      .np-label {
        border: none;
      }
      .np-sheet-header-print {
        opacity: 0.75;
      }
    }
    .np-label--empty {
      background: transparent;
      border: none;
    }
    .np-label-qr {
      width: 0.84in;
      height: 0.84in;
      flex-shrink: 0;
      background: #000000;
      padding: 0.04in;
      border-radius: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .np-label-qr svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .np-label-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5pt;
    }
    .np-label-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1;
    }
    .np-label-title {
      font-family: "Courier New", Courier, monospace;
      font-size: 5.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #eb2b2b;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 1.1in;
    }
    .np-label-batch {
      font-family: "Courier New", Courier, monospace;
      font-size: 5pt;
      color: #666666;
      font-weight: 600;
    }
    .np-label-npid {
      font-family: "Courier New", Courier, monospace;
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: #000000;
      line-height: 1.1;
      white-space: nowrap;
    }
    .np-label-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: "Courier New", Courier, monospace;
      font-size: 5.5pt;
      color: #444444;
      line-height: 1;
    }
    .np-label-sec {
      font-weight: 700;
      color: #000000;
      background: #f0f0f0;
      padding: 0.5pt 2pt;
      border-radius: 1pt;
    }
    .np-label-fineprint {
      font-family: "Courier New", Courier, monospace;
      font-size: 4.4pt;
      color: #555555;
      letter-spacing: 0.02em;
      line-height: 1.15;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Industrial Plate Styling (tamper slits, benchmarks) */
    .np-label--industrial {
      border: 1px solid #111111;
      background: #fafafa;
    }
    .fiducial {
      position: absolute;
      width: 4pt;
      height: 4pt;
      border: 1pt solid #000000;
    }
    .fiducial.tl { top: 2pt; left: 2pt; border-right: none; border-bottom: none; }
    .fiducial.tr { top: 2pt; right: 2pt; border-left: none; border-bottom: none; }
    .fiducial.bl { bottom: 2pt; left: 2pt; border-right: none; border-top: none; }
    .fiducial.br { bottom: 2pt; right: 2pt; border-left: none; border-top: none; }

    .tamper-slit {
      position: absolute;
      width: 6pt;
      height: 1pt;
      background: #eb2b2b;
      opacity: 0.85;
    }
    .tamper-slit.tl { top: 4pt; left: 8pt; transform: rotate(-35deg); }
    .tamper-slit.tr { top: 4pt; right: 8pt; transform: rotate(35deg); }
    .tamper-slit.bl { bottom: 4pt; left: 8pt; transform: rotate(35deg); }
    .tamper-slit.br { bottom: 4pt; right: 8pt; transform: rotate(-35deg); }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

/**
 * Direct print trigger using an isolated iframe so the user never leaves HQ Console.
 */
export function printTagSheet(tags: TagPrintItem[], options: TagPrintOptions = {}): void {
  const html = generatePrintHtml(tags, options);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }
    }, 350);
  };
}
