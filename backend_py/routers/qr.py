import io
from fastapi import APIRouter, HTTPException, Response
import qrcode
from PIL import Image, ImageDraw, ImageFont

router = APIRouter(tags=["qr"])


@router.get("/qr/tag/{npid}")
def generate_qr_tag(npid: str, size: int = 320):
    """
    Generate an authentic Nameplate hardware tag preview PNG image with NPID and QR code.
    """
    normalized = npid.strip().upper()
    
    # Generate QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(f"https://nameplate.io/p/{normalized}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")

    # Composite into physical Tag Frame
    tag_width = max(size, 320)
    tag_height = tag_width + 80
    tag_img = Image.new("RGBA", (tag_width, tag_height), color=(250, 250, 250, 255))
    draw = ImageDraw.Draw(tag_img)

    # Outer border & industrial tick marks
    draw.rectangle([2, 2, tag_width - 3, tag_height - 3], outline=(20, 20, 20, 255), width=3)
    draw.rectangle([8, 8, tag_width - 9, tag_height - 9], outline=(235, 43, 43, 255), width=2)

    # Top Brand Header
    draw.text((16, 14), "NAMEPLATE // ASSET LEDGER", fill=(20, 20, 20, 255))

    # Paste QR in center
    qr_resized = qr_img.resize((tag_width - 40, tag_width - 40))
    tag_img.paste(qr_resized, (20, 42), mask=qr_resized)

    # Bottom NPID Bar
    draw.rectangle([14, tag_height - 60, tag_width - 14, tag_height - 14], fill=(20, 20, 20, 255))
    draw.text((26, tag_height - 46), f"NPID: {normalized}", fill=(255, 255, 255, 255))

    buf = io.BytesIO()
    tag_img.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.getvalue(), media_type="image/png")
