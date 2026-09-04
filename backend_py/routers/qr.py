from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response

from .. import schemas
from ..qr_utils import (
    build_qr_payload,
    generate_qr_data_url,
    generate_qr_image_bytes,
    generate_qr_svg,
    validate_npid,
)

router = APIRouter(prefix="", tags=["QR Code"])


@router.get("/qr/tag/{npid}")
def get_qr_tag(
    npid: str,
    org_id: Optional[str] = Query("org_sonoran", alias="orgId"),
    batch_id: Optional[str] = Query("BATCH-01", alias="batchId"),
    format: Optional[str] = Query("json"),  # 'json', 'svg', 'png'
):
    valid, msg = validate_npid(npid, strict_checksum=False)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Invalid NPID format: {msg}")

    payload = build_qr_payload(npid=npid, org_id=org_id, batch_id=batch_id, include_crypto=True)
    target_url = payload["url"]

    if format == "svg":
        svg_content = generate_qr_svg(target_url)
        return Response(content=svg_content, media_type="image/svg+xml")
    elif format == "png":
        png_bytes = generate_qr_image_bytes(target_url, format="PNG")
        return Response(content=png_bytes, media_type="image/png")

    svg_content = generate_qr_svg(target_url)
    data_url = generate_qr_data_url(target_url)

    return schemas.QRTagResponse(
        npid=payload["npid"],
        clean_npid=payload["clean_npid"],
        url=payload["url"],
        compact_uri=payload["compact_uri"],
        signature=payload["signature"],
        timestamp=payload["timestamp"],
        batch_id=payload["batch_id"],
        org_id=payload["org_id"],
        crypto_enabled=payload["crypto_enabled"],
        svg=svg_content,
        data_url=data_url,
    )
