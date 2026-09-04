import base64
import hashlib
import hmac
import io
import os
import secrets
import time
from typing import Dict, Optional, Tuple

DEFAULT_ORG_SECRET = os.getenv("NAMEPLATE_SECRET_KEY", "nameplate_master_org_secret_v0_prod_2026")
DEFAULT_ORG_ID = "org_sonoran_fund4"
BASE_URL = os.getenv("NAMEPLATE_BASE_URL", "https://np.app/a")

CROCKFORD_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
CROCKFORD_CHECK_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ*~$#="


def normalize_crockford(s: str) -> str:
    s = s.upper().replace("-", "").replace(" ", "")
    s = s.replace("I", "1").replace("L", "1").replace("O", "0")
    return s


def calculate_crockford_checksum(payload_digits: str, modulo: int = 32) -> str:
    norm = normalize_crockford(payload_digits)
    if norm.startswith("NP"):
        norm = norm[2:]
    val = 0
    for ch in norm:
        idx = CROCKFORD_CHARS.find(ch)
        if idx == -1:
            idx = 0
        val = (val * 32 + idx)
    
    if modulo == 37:
        check_idx = val % 37
        if check_idx < len(CROCKFORD_CHECK_CHARS):
            return CROCKFORD_CHECK_CHARS[check_idx]
        return CROCKFORD_CHARS[check_idx % 32]
    
    return CROCKFORD_CHARS[val % 32]


def mint_npid(prefix: str = "NP-", body_len: int = 7) -> str:
    body = "".join(secrets.choice(CROCKFORD_CHARS) for _ in range(body_len))
    checksum = calculate_crockford_checksum(body, modulo=32)
    return f"{prefix}{body}{checksum}"


def validate_npid(npid: str, strict_checksum: bool = False) -> Tuple[bool, str]:
    clean = normalize_crockford(npid)
    if clean.startswith("NP"):
        clean = clean[2:]
    if len(clean) != 8:
        return False, f"Invalid length {len(clean)} (expected 8 characters after NP-)"
    
    for ch in clean:
        if ch not in CROCKFORD_CHARS and ch not in CROCKFORD_CHECK_CHARS:
            return False, f"Invalid Crockford character '{ch}' in NPID"
            
    if strict_checksum:
        body, check = clean[:7], clean[7]
        expected_32 = calculate_crockford_checksum(body, modulo=32)
        expected_37 = calculate_crockford_checksum(body, modulo=37)
        if check != expected_32 and check != expected_37:
            return False, f"Checksum mismatch: got '{check}', expected '{expected_32}'"
            
    return True, "Valid Crockford Base32 NPID"


def generate_tag_signature(
    npid: str,
    org_id: str = DEFAULT_ORG_ID,
    batch_id: str = "BATCH-01",
    issued_at: Optional[int] = None,
    secret_key: str = DEFAULT_ORG_SECRET,
    sig_len: int = 12
) -> Tuple[str, int]:
    if issued_at is None:
        issued_at = int(time.time())
    
    clean = normalize_crockford(npid)
    if clean.startswith("NP"):
        clean = clean[2:]
    payload = f"NPID:{clean}|ORG:{org_id}|BATCH:{batch_id}|TS:{issued_at}".encode("utf-8")
    h = hmac.new(secret_key.encode("utf-8"), payload, hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(h[:sig_len]).decode("ascii").rstrip("=")
    return sig, issued_at


def verify_tag_signature(
    npid: str,
    sig: str,
    issued_at: int,
    org_id: str = DEFAULT_ORG_ID,
    batch_id: str = "BATCH-01",
    secret_key: str = DEFAULT_ORG_SECRET
) -> bool:
    try:
        expected_sig, _ = generate_tag_signature(
            npid=npid,
            org_id=org_id,
            batch_id=batch_id,
            issued_at=issued_at,
            secret_key=secret_key,
            sig_len=len(base64.urlsafe_b64decode(sig + "==")) if sig else 12
        )
        return hmac.compare_digest(sig, expected_sig)
    except Exception:
        return False


def build_qr_payload(
    npid: str,
    org_id: str = DEFAULT_ORG_ID,
    batch_id: str = "BATCH-01",
    include_crypto: bool = True,
    secret_key: str = DEFAULT_ORG_SECRET
) -> Dict[str, str]:
    clean = normalize_crockford(npid)
    if clean.startswith("NP"):
        clean = clean[2:]
    npid_formatted = f"NP-{clean}"

    if not include_crypto:
        url = f"{BASE_URL}/{clean}"
        return {
            "npid": npid_formatted,
            "clean_npid": clean,
            "url": url,
            "compact_uri": f"np://t/{clean}",
            "signature": "",
            "timestamp": str(int(time.time())),
            "batch_id": batch_id,
            "org_id": org_id,
            "crypto_enabled": "false"
        }

    sig, ts = generate_tag_signature(
        npid=clean,
        org_id=org_id,
        batch_id=batch_id,
        secret_key=secret_key
    )
    
    url = f"{BASE_URL}/{clean}?s={sig}&t={ts}&b={batch_id}&o={org_id}"
    compact_uri = f"np://t/{clean}/{sig}.{ts}.{batch_id}"

    return {
        "npid": npid_formatted,
        "clean_npid": clean,
        "url": url,
        "compact_uri": compact_uri,
        "signature": sig,
        "timestamp": str(ts),
        "batch_id": batch_id,
        "org_id": org_id,
        "crypto_enabled": "true"
    }


def generate_qr_image_bytes(data: str, format: str = "PNG") -> bytes:
    import qrcode
    from PIL import Image

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def generate_qr_svg(data: str) -> str:
    import qrcode
    import qrcode.image.svg

    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(data, image_factory=factory, error_correction=qrcode.constants.ERROR_CORRECT_H)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")


def generate_qr_data_url(data: str) -> str:
    png_bytes = generate_qr_image_bytes(data, format="PNG")
    b64 = base64.b64encode(png_bytes).decode("ascii")
    return f"data:image/png;base64,{b64}"
