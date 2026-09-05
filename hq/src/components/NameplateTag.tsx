import { useMemo } from 'react';
import type { Asset } from '../api/client';
import { buildQrPayload, generateQrSvg } from '../lib/qr';

/**
 * Physical Nameplate tag replica — renders what is actually stuck to the
 * appliance (dark anodized plate, white QR block, rivets, tamper slits,
 * brand + NPID + fineprint), so a tech can visually match the unit's
 * plates against the hardware in front of them.
 *
 * The plate itself is intentionally static (like the hardware). Live ledger
 * state (status, age, cost) belongs in the card footer around it, not on it.
 */
export function NameplateTag({ asset }: { asset: Asset }) {
  const qrSvg = useMemo(() => {
    const payload = buildQrPayload(asset.npid);
    return generateQrSvg(payload.url, 120, true);
  }, [asset.npid]);

  const modelLine =
    [asset.manufacturerRaw, asset.modelRaw].filter(Boolean).join(' ') ||
    asset.assetModel?.displayName ||
    asset.category?.displayName ||
    'APPLIANCE';

  return (
    <div className="np-nameplate" aria-label={`Nameplate ${asset.npid}`}>
      <span className="np-nameplate__rivet tl" aria-hidden="true" />
      <span className="np-nameplate__rivet tr" aria-hidden="true" />
      <span className="np-nameplate__rivet bl" aria-hidden="true" />
      <span className="np-nameplate__rivet br" aria-hidden="true" />
      <div
        className="np-nameplate__qr"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
        aria-hidden="true"
      />
      <div className="np-nameplate__body">
        <div className="np-nameplate__brand">NAMEPLATE</div>
        <div className="np-nameplate__npid-label">NAMEPLATE ID</div>
        <div className="np-nameplate__npid">{asset.npid}</div>
        <div className="np-nameplate__model">{modelLine}</div>
        <div className="np-nameplate__fineprint">
          PROPERTY ASSET RECORD · DO NOT REMOVE
        </div>
      </div>
    </div>
  );
}
