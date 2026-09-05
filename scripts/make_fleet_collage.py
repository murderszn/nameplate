#!/usr/bin/env python3
"""Build dramatic fleet-collage hero art from the 10 Blender appliance PNGs.

Bakes a single wide JPG: dark studio backdrop + red floor glow + the full
appliance lineup standing on a shared floor line, hero fridge center.

Usage: .venv/bin/python scripts/make_fleet_collage.py
Output: website/images/fleet-collage.jpg (2400x1260)
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/tmp/iso3d_out"
OUT = os.path.join(ROOT, "website", "images", "fleet-collage.jpg")

W, H = 2400, 1120
FLOOR_Y = 940

# (file, target_height_px, x_center, draw_order Penting: hero last)
LINEUP = [
    ("condenser.png", 380, 195),
    ("hvac.png", 640, 430),
    ("water-heater.png", 670, 735),
    ("fridge.png", 750, 1080),      # hero
    ("range.png", 580, 1440),
    ("washer.png", 490, 1700),
    ("dryer.png", 490, 1930),
    ("dishwasher.png", 450, 2125),
    ("microwave.png", 320, 2270),
]
FLOATERS = [
    # (file, target_height_px, x_center, y_center)
    ("thermostat.png", 270, 205, 250),
]


def trim(im):
    """Crop to content: alpha >= 60 (skips faint shadow-catcher haze)."""
    a = im.split()[3]
    mask = a.point(lambda v: 255 if v >= 60 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    pad = 10
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(im.width, bbox[2] + pad)
    y1 = min(im.height, bbox[3] + pad)
    im = im.crop((x0, y0, x1, y1))
    # fade the bottom 14% so baked contact shadows dissolve into floor wash
    w, h = im.size
    fade_h = max(1, int(h * 0.14))
    alpha = im.split()[3]
    px = alpha.load()
    for y in range(h - fade_h, h):
        k = (y - (h - fade_h)) / fade_h  # 0 at top of fade -> 1 at bottom
        mult = 1.0 - 0.75 * k
        for x in range(w):
            px[x, y] = int(px[x, y] * mult)
    im.putalpha(alpha)
    return im


def radial_glow(size, color, max_alpha):
    """Square RGBA sprite: radial falloff glow."""
    s = size
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    px = glow.load()
    for y in range(s):
        for x in range(s):
            d = math.hypot(x - s / 2, y - s / 2) / (s / 2)
            if d <= 1.0:
                fall = (1.0 - d) ** 2.2
                px[x, y] = (*color, int(max_alpha * fall))
    return glow


def main():
    # ---- backdrop: vertical gradient
    top = (8, 8, 12)
    mid = (16, 14, 20)
    bot = (26, 20, 24)
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    for y in range(H):
        t = y / H
        if t < 0.55:
            k = t / 0.55
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.55) / 0.45
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        for x in range(W):
            px[x, y] = c
    bg = bg.convert("RGBA")

    # ---- red floor glow (wide, under hero)
    glow = radial_glow(1500, (235, 43, 43), 110)
    bg.alpha_composite(glow, (1080 - 750, FLOOR_Y - 620))
    # cool top-right glow
    cool = radial_glow(1100, (90, 120, 200), 42)
    bg.alpha_composite(cool, (W - 900, -300))
    # faint top-left red kiss
    kiss = radial_glow(700, (235, 43, 43), 36)
    bg.alpha_composite(kiss, (-250, -200))

    # ---- floor light band
    band = Image.new("RGBA", (W, 130), (0, 0, 0, 0))
    d = ImageDraw.Draw(band)
    for i in range(130):
        a = int(46 * (1 - abs(i - 46) / 84) ** 2) if abs(i - 46) < 84 else 0
        d.line([(0, i), (W, i)], fill=(235, 80, 80, max(0, a)))
    band = band.filter(ImageFilter.GaussianBlur(18))
    bg.alpha_composite(band, (0, FLOOR_Y - 46))

    # ---- floor shadow wash (grounds the lineup)
    shadow = Image.new("RGBA", (W, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    d.ellipse([120, 10, W - 120, 110], fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    bg.alpha_composite(shadow, (0, FLOOR_Y - 40))

    # ---- appliances (floor lineup; hero drawn last = on top)
    order = sorted(LINEUP, key=lambda e: 0 if e[0] == "fridge.png" else 1)
    for fname, th, xc in order:
        im = Image.open(os.path.join(SRC, fname)).convert("RGBA")
        im = trim(im)
        w = max(1, int(im.width * th / im.height))
        im = im.resize((w, th), Image.LANCZOS)
        bg.alpha_composite(im, (int(xc - w / 2), FLOOR_Y - th))

    # ---- floaters (thermostat, slight tilt + halo)
    for fname, th, xc, yc in FLOATERS:
        im = Image.open(os.path.join(SRC, fname)).convert("RGBA")
        im = trim(im)
        w = max(1, int(im.width * th / im.height))
        im = im.resize((w, th), Image.LANCZOS)
        halo = radial_glow(420, (235, 60, 60), 90)
        bg.alpha_composite(halo, (int(xc - 210), int(yc - 210)))
        im = im.rotate(-8, resample=Image.BICUBIC, expand=True)
        bg.alpha_composite(im, (int(xc - im.width / 2), int(yc - im.height / 2)))

    # ---- vignette
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dv = ImageDraw.Draw(vig)
    dv.rectangle([0, 0, W, H], outline=(0, 0, 0, 110), width=90)
    vig = vig.filter(ImageFilter.GaussianBlur(60))
    bg.alpha_composite(vig)

    # ---- grain (kills JPEG gradient banding): blend 5% mono noise
    grain = Image.effect_noise((W, H), 7).convert("L")
    grain_rgb = Image.merge("RGB", (grain, grain, grain))
    rgb = bg.convert("RGB")
    rgb = Image.blend(rgb, Image.composite(grain_rgb, rgb, grain), 0.05)

    rgb.save(OUT, quality=86, optimize=True)
    print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
