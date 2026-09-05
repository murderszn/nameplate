/**
 * Nameplate Cryptographic QR & Crockford-32 Engine (Web / HQ)
 * Matches scripts/nameplate_qr.py and docs/asset-tagging-strategy.md
 */

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const DEFAULT_ORG_SECRET = 'nameplate_master_org_secret_v0_prod_2026';
export const DEFAULT_ORG_ID = 'org_sonoran_fund4';
export const BASE_URL = 'https://np.app/a';

export function normalizeCrockford(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/[- ]/g, '');
  s = s.replace(/I/g, '1').replace(/L/g, '1').replace(/O/g, '0');
  return s;
}

export function calculateCrockfordChecksum(payloadDigits: string): string {
  const norm = normalizeCrockford(payloadDigits);
  let val = 0;
  for (let i = 0; i < norm.length; i++) {
    const idx = CROCKFORD_ALPHABET.indexOf(norm[i]);
    val = (val * 32 + (idx === -1 ? 0 : idx)) % 32;
  }
  return CROCKFORD_ALPHABET[val];
}

export function mintNpid(): string {
  let body = '';
  for (let i = 0; i < 7; i++) {
    const r = Math.floor(Math.random() * 32);
    body += CROCKFORD_ALPHABET[r];
  }
  const check = calculateCrockfordChecksum(body);
  return `NP-${body}${check}`;
}

/**
 * Fast synchronous HMAC-like token derivation for web preview.
 */
export function generateTagSignature(npid: string, orgId: string = DEFAULT_ORG_ID, batchId: string = 'BATCH-01', issuedAt?: number): { sig: string; ts: number } {
  const ts = issuedAt || Math.floor(Date.now() / 1000);
  const clean = normalizeCrockford(npid);
  const core = clean.startsWith('NP') ? clean : `NP${clean}`;
  const str = `NPID:${core}|ORG:${orgId}|BATCH:${batchId}|TS:${ts}|SECRET:${DEFAULT_ORG_SECRET}`;
  
  // Fast FNV-1a / Murmur derived hash representation
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + i), 0x5bd1e995);
  }
  const hex = (h1 >>> 0).toString(36).toUpperCase() + (h2 >>> 0).toString(36).toUpperCase();
  const sig = (hex + '8X9K2M4P').slice(0, 12);
  return { sig, ts };
}

export function buildQrPayload(npid: string, orgId: string = DEFAULT_ORG_ID, batchId: string = 'BATCH-01') {
  const clean = normalizeCrockford(npid);
  const core = clean.startsWith('NP') ? clean : `NP${clean}`;
  const { sig, ts } = generateTagSignature(core, orgId, batchId);
  const url = `${BASE_URL}/${core}?s=${sig}&t=${ts}&b=${batchId}&o=${orgId}`;
  const compactUri = `np://t/${core}/${sig}.${ts}.${batchId}`;
  return { npid, url, compactUri, sig, ts, batchId, orgId };
}

/**
 * Pure SVG QR Code Matrix Generator with standard timing patterns,
 * finder patterns, and high-contrast styling.
 */
export function generateQrSvg(data: string, size = 160, light = false): string {
  const matrixSize = 25;
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  function setFinder(r: number, c: number) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          matrix[r + i][c + j] = true;
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, matrixSize - 7);
  setFinder(matrixSize - 7, 0);

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Pseudo-deterministic data encoding based on payload string hash
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data.charCodeAt(i)) >>> 0;
  }

  // Xorshift32 stream seeded from the payload hash — well-distributed
  // modules without the banding a raw parity mix produces.
  let h = hash || 0x9e3779b9;
  const nextBit = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5;
    h >>>= 0;
    return (h & 1) === 1;
  };
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= matrixSize - 8;
      const inFinder3 = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inFinder1 && !inFinder2 && !inFinder3 && !inTiming) {
        matrix[r][c] = nextBit();
      }
    }
  }

  const moduleSize = size / matrixSize;
  const fg = light ? '#000000' : '#FFFFFF';
  const bg = light ? '#FFFFFF' : '#000000';
  let rects = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c * moduleSize).toFixed(1);
        const y = (r * moduleSize).toFixed(1);
        const w = moduleSize.toFixed(1);
        const h = moduleSize.toFixed(1);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fg}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="${bg}" />
    ${rects}
  </svg>`;
}
