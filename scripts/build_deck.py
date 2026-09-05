#!/usr/bin/env python3
"""Nameplate Asset Infrastructure Deck generator.

Renders 15 slides (1920x1080 PNG masters) in the current Nameplate
marketing style (black / white / #c51f2d, open layouts, no running chrome),
using live product screenshots and asset photography. Drop-in replacement
for website/images/deck/slide_*.png (viewer keeps 15 slides, same names).

Usage: .venv/bin/python scripts/build_deck.py [--only 03] [--masters-only]
"""
import argparse
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "website", "images")
DECK = os.path.join(IMG, "deck")

W, H = 1920, 1080
BG = (11, 11, 12)
WHITE = (255, 255, 255)
GRAY70 = (163, 163, 163)
GRAY40 = (110, 110, 110)
RED = (197, 31, 45)
RED_DEEP = (189, 31, 31)
CARD = (20, 20, 22)
LINE = (255, 255, 255, 26)
LINE_STRONG = (255, 255, 255, 55)


def _load_font(candidates):
    for path, index, size in candidates:
        try:
            return ImageFont.truetype(path, size, index=index)
        except Exception:
            continue
    raise RuntimeError(f"No font found for {candidates[0][2]}px (tried {len(candidates)} files)")


def fonts():
    helv = "/System/Library/Fonts/Helvetica.ttc"
    sup = "/System/Library/Fonts/Supplemental"
    menlo = "/System/Library/Fonts/Menlo.ttc"
    return {
        "display": _load_font([(helv, 1, 118), (f"{sup}/Arial Bold.ttf", 0, 118), (f"{sup}/Arial Black.ttf", 0, 118)]),
        "h1": _load_font([(helv, 1, 84), (f"{sup}/Arial Bold.ttf", 0, 84)]),
        "h2": _load_font([(helv, 1, 56), (f"{sup}/Arial Bold.ttf", 0, 56)]),
        "h3": _load_font([(helv, 1, 38), (f"{sup}/Arial Bold.ttf", 0, 38)]),
        "body": _load_font([(helv, 0, 30), (f"{sup}/Arial.ttf", 0, 30)]),
        "small": _load_font([(helv, 0, 25), (f"{sup}/Arial.ttf", 0, 25)]),
        "kick": _load_font([(menlo, 0, 24), ("/System/Library/Fonts/Courier.ttc", 0, 24)]),
        "kick_sm": _load_font([(menlo, 0, 20), ("/System/Library/Fonts/Courier.ttc", 0, 20)]),
        "mono": _load_font([(menlo, 0, 26), ("/System/Library/Fonts/Courier.ttc", 0, 26)]),
        "mono_b": _load_font([(menlo, 1, 26), ("/System/Library/Fonts/Courier Bold.ttf", 0, 26)]),
    }


F = fonts()


def tracked(text, spacing=2):
    return text


def text_size(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def center_text(draw, cx, y, text, font, fill=WHITE):
    w, _ = text_size(draw, text, font)
    draw.text((cx - w / 2, y), text, font=font, fill=fill)


def new_slide():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")
    # dot grid
    for x in range(0, W, 44):
        for y in range(0, H, 44):
            d.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 255, 10))
    # vignette
    vig = Image.new("L", (1, H))
    for y in range(H):
        t = abs(y - H / 2) / (H / 2)
        vig.putpixel((0, y), int(255 * (1 - 0.35 * t * t)))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    img = Image.composite(img, black, vig.resize((W, H)))
    d = ImageDraw.Draw(img, "RGBA")
    return img, d


def paste_cover(img, path, box):
    """Paste image cropped to cover box (x, y, w, h)."""
    x, y, w, h = box
    src = Image.open(os.path.join(IMG, path)).convert("RGB")
    scale = max(w / src.width, h / src.height)
    nw, nh = math.ceil(src.width * scale), math.ceil(src.height * scale)
    src = src.resize((nw, nh), Image.LANCZOS)
    ox, oy = (nw - w) // 2, (nh - h) // 2
    src = src.crop((ox, oy, ox + w, oy + h))
    img.paste(src, (x, y))
    return img


def shot_frame(d, x, y, w, h, title=None):
    """Use the product image directly, without fake browser chrome or filenames."""
    return (x, y, w, h)


def arrow(d, x1, y1, x2, y2, color=RED, width=4):
    d.line([x1, y1, x2, y2], fill=color, width=width)
    ang = math.atan2(y2 - y1, x2 - x1)
    s = 16
    for da in (2.6, -2.6):
        d.line([x2, y2, x2 + s * math.cos(ang + da), y2 + s * math.sin(ang + da)], fill=color, width=width)


def deco_qr(d, x, y, size, seed=7):
    """Deterministic decorative QR-style matrix with finder patterns."""
    rnd = random.Random(seed)
    n = 25
    cell = size / n
    d.rectangle([x, y, x + size, y + size], fill=WHITE)
    for r in range(n):
        for c in range(n):
            in_finder = (r < 8 and c < 8) or (r < 8 and c >= n - 8) or (r >= n - 8 and c < 8)
            if not in_finder and rnd.random() < 0.46:
                d.rectangle([x + c * cell, y + r * cell, x + (c + 1) * cell, y + (r + 1) * cell], fill=(10, 10, 10))
    for fr, fc in [(0, 0), (0, n - 7), (n - 7, 0)]:
        fx, fy = x + fc * cell, y + fr * cell
        fs = 7 * cell
        d.rectangle([fx, fy, fx + fs, fy + fs], fill=(10, 10, 10))
        d.rectangle([fx + cell, fy + cell, fx + fs - cell, fy + fs - cell], fill=WHITE)
        d.rectangle([fx + 2 * cell, fy + 2 * cell, fx + fs - 2 * cell, fy + fs - 2 * cell], fill=(10, 10, 10))


def wrap(d, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if text_size(d, trial, font)[0] <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def slide01():
    img, d = new_slide()
    logo = Image.open(os.path.join(IMG, "nameplate-logo-transparent.png")).convert("RGBA").resize((220, 220), Image.LANCZOS)
    img.paste(logo, (W // 2 - 110, 150), logo)
    center_text(d, W / 2, 400, "EVERY APPLIANCE.", F["display"])
    center_text(d, W / 2, 530, "ACCOUNTED FOR.", F["display"], fill=RED)
    center_text(d, W / 2, 668, "The immutable asset record and physical chain-of-custody engine for multifamily portfolios.",
                F["body"], fill=GRAY70)
    stats = [("200+", "UNITS PER PROPERTY"), ("3", "CONNECTED APPS"), ("1", "SHARED LEDGER")]
    for i, (val, lbl) in enumerate(stats):
        cx = W / 2 - 480 + i * 480
        center_text(d, cx, 830, val, F["h2"], fill=RED)
        center_text(d, cx, 890, tracked(lbl, 1), F["kick_sm"], fill=GRAY40)
    return img


def slide02():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Where multifamily capital", font=F["h1"])
    d.text((120, y + 92), "quietly dissolves.", font=F["h1"], fill=RED)
    cards = [
        ("TURNOVER SHRINKAGE", "Equipment moves during make-ready turns or leaves with vendors. Without a physical chain of custody, the loss is absorbed as friction."),
        ("ORAL-TRADITION HISTORY", "Whoever serviced the unit last year remembers what they did — if they still work there. Warranties and write-offs live in memory."),
        ("BLIND CAPEX", "Aging clusters surface only as emergencies. CapEx is forced into reactive crisis spend, never planned replacement."),
    ]
    x = 120
    for title, body in cards:


        d.text((x + 32, 470), tracked(title, 1), font=F["kick_sm"], fill=RED)
        for i, line in enumerate(wrap(d, body, F["small"], 456)):
            d.text((x + 32, 518 + i * 36), line, font=F["small"], fill=GRAY70)
        x += 560

    msg = "When the registry rots into fiction, operators make $10,000 capital decisions on guesswork."
    tw, _ = text_size(d, msg, F["h3"])
    d.text(((W - tw) / 2, 850), msg, font=F["h3"])
    return img


def slide03():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Capture in the field.", font=F["h2"])
    d.text((120, y + 64), "Resolve in HQ.", font=F["h2"], fill=RED)
    cols = [
        ("FIELD APP", "FLUTTER · OFFLINE-FIRST", "field_ios_turns.png",
         "Sub-second scans, turn checklists, and service events — with zero signal in the basement."),
        ("RESIDENT PORTAL", "REACT · 3 PAGES", None,
         "Home, Report issue, Work orders. Ticket intake bound to the appliance NPID — no app install."),
        ("HQ CONSOLE", "REACT · LIVE LEDGER", "hq_dashboard.png",
         "Portfolio health, CapEx forecasts, warranty claims, and dispatch — from one office."),
    ]
    x = 120
    for name, stack, shot, body in cols:
        d.text((x + 32, 412), name, font=F["h3"], fill=WHITE)
        if shot:
            paste_cover(img, f"gallery/{shot}", (x + 32, 486, 456, 200))
        else:
            # Raster fallback rendered from resident-portal.svg for the deck exports.
            portal = Image.open(os.path.join(IMG, "deck", "resident-portal.png")).convert("RGBA")
            img.paste(portal, (x + 32, 486), portal)
        d = ImageDraw.Draw(img, "RGBA")
        for i, line in enumerate(wrap(d, body, F["small"], 456)):
            d.text((x + 32, 726 + i * 36), line, font=F["small"], fill=GRAY70)
        x += 560
    return img


def slide04():
    img, d = new_slide()
    y = 174
    d.text((120, y), "The plate is the record.", font=F["h1"])
    rows = [
        ("READABILITY", "Corroded, painted over, unreadable at arm's length.", "Error-corrected QR. Scans at arm's length, in the dark."),
        ("UNIQUENESS", "Formats overlap across brands. Not globally unique.", "Crockford Base32. Mathematically guaranteed global uniqueness."),
        ("PRE-EXISTENCE", "Cannot log it until found and transcribed.", "Pre-allocated in-app. Minted before the serial is known."),
        ("SPEED", "45 seconds of hunting, flashlight, and typing.", "Sub-3-second scan. No typing, ever."),
    ]
    d.text((560, 330), "MANUFACTURER SERIALS", font=F["kick"], fill=GRAY40)
    d.text((1150, 330), "NAMEPLATE IDs (NPIDs)", font=F["kick"], fill=RED)
    y0 = 370
    for i, (label, left, right) in enumerate(rows):
        yy = y0 + i * 118
        d.line([120, yy, 1800, yy], fill=(255, 255, 255, 26), width=1)
        d.text((120, yy + 18), label, font=F["kick_sm"], fill=GRAY70)
        for j, line in enumerate(wrap(d, left, F["small"], 560)):
            d.text((560, yy + 12 + j * 34), line, font=F["small"], fill=GRAY40)

        for j, line in enumerate(wrap(d, right, F["small"], 600)):
            d.text((1174, yy + 14 + j * 34), line, font=F["small"], fill=WHITE)
    d.line([120, y0 + 4 * 118, 1800, y0 + 4 * 118], fill=(255, 255, 255, 26), width=1)

    msg = "Serials are for intelligence (warranties, parts). NPIDs are for operations. We capture both — the ledger runs on NPIDs."
    tw, _ = text_size(d, msg, F["small"])
    d.text(((W - tw) / 2, 890), msg, font=F["small"])
    return img


def slide05():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Engineered like the software:", font=F["h2"])
    d.text((120, y + 64), "consistency is a speed feature.", font=F["h2"], fill=RED)
    inner = shot_frame(d, 120, 400, 900, 480, title="qr-reference-holographic")
    paste_cover(img, "qr-reference-holographic.png", inner)
    d = ImageDraw.Draw(img, "RGBA")
    calls = [
        ("THE PAYLOAD", "Error-corrected QR, Level H. Survives grime and scratches. Encodes a signed URL."),
        ("HUMAN-READABLE KEY", "Crockford Base32 NPID — no I, L, O, U — with a check digit that rejects typos instantly."),
        ("THE SUBSTRATE", "Tamper-destructible vinyl. Shreds on removal, leaving visible evidence. The theft deterrent."),
        ("THE ADHESIVE", "High-tack acrylic rated for heat, grease, and utility-closet temperature cycling."),
    ]
    yy = 400
    for title, body in calls:

        d.ellipse([1088, yy + 20, 1100, yy + 32], fill=RED)
        d.text((1114, yy + 14), tracked(title, 1), font=F["kick_sm"], fill=WHITE)
        for j, line in enumerate(wrap(d, body, F["small"], 660)):
            d.text((1114, yy + 44 + j * 32), line, font=F["small"], fill=GRAY70)
        yy += 134
    return img


def slide06():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Zero bars. Zero friction.", font=F["h1"])
    stages = [
        ("THE MIRROR", "Local SQLite (Drift). Techs read and write here — the app never waits on network."),
        ("THE QUEUE", "Append-only outbox. Every mutation carries op ID, timestamp, and idempotency key."),
        ("THE ENGINE", "Background sync worker. Pushes batches with backoff the moment signal returns."),
        ("THE TRUTH", "Postgres system of record. Monotonic sequences reconcile every change exactly once."),
    ]
    x = 120
    for i, (title, body) in enumerate(stages):


        d.text((x + 28, 486), tracked(title, 1), font=F["kick_sm"], fill=WHITE)
        for j, line in enumerate(wrap(d, body, F["small"], 324)):
            d.text((x + 28, 530 + j * 34), line, font=F["small"], fill=GRAY70)
        if i < 3:
            arrow(d, x + 380, 595, x + 420, 595)
        x += 420

    msg = "A tech logs 11 service events and 40 photos with zero signal in a basement laundry room."
    msg2 = "Walking into the parking lot, everything lands correctly. The app never blocks to arbitrate state."
    for k, m in enumerate([msg, msg2]):
        tw, _ = text_size(d, m, F["small"])
        d.text(((W - tw) / 2, 830 + k * 36), m, font=F["small"], fill=GRAY70)
    return img


def slide07():
    img, d = new_slide()
    y = 174
    center_text(d, W / 2, y, "ASSET · NP-7K2M4QX9", F["h2"])
    d.line([140, 420, 1780, 420], fill=RED, width=6)
    events = [
        ("Installed · Unit 4B", (34, 197, 94), "00:32:40"),
        ("Compressor failed · Moved to shop", (245, 158, 11), "20:32:30"),
        ("Repaired in shop", (34, 197, 94), "20:32:20"),
        ("Installed · Unit 12C", (34, 197, 94), "20:32:14"),
    ]
    x = 200
    for label, color, ts in events:
        d.ellipse([x - 16, 404, x + 16, 436], fill=WHITE)
        d.ellipse([x - 9, 411, x + 9, 429], fill=color)
        tw, _ = text_size(d, label, F["small"])
        d.text((x - tw / 2, 452), label, font=F["small"], fill=WHITE)
        cw, _ = text_size(d, ts, F["kick_sm"])
        d.text((x - cw / 2, 486), ts, font=F["kick_sm"], fill=GRAY40)
        x += 480

    d.text((600, 584), "asset_location rule enforcement:", font=F["mono"], fill=RED)
    rules = ["one open location per asset", "no chronological gaps", "no overlapping timestamps"]
    for i, r in enumerate(rules):
        d.text((600, 620 + i * 34), f"· {r}", font=F["mono"], fill=GRAY70)

    msg = "Strictly append-only. Location changes are never silent edits — mistakes are corrected by appended"
    msg2 = "correction rows, so a manipulated history stays visibly recorded in the history."
    for k, m in enumerate([msg, msg2]):
        tw, _ = text_size(d, m, F["small"])
        d.text(((W - tw) / 2, 796 + k * 36), m, font=F["small"], fill=GRAY70)
    return img


def slide08():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Walk the unit once.", font=F["h1"])
    steps = [
        ("01", "ROSTER", "The server builds a dynamic checklist from the exact assets assigned to the unit.", "field_ios_turns.png"),
        ("02", "SCAN + VERIFY", "Tech walks the room, scanning tags in seconds. Unknown assets get tagged inline.", "field_ios_scan.png"),
        ("03", "TRIAGE", "Single-tap condition: Present, Damaged, Needs Service, or Missing.", "field_ios_workorders.png"),
        ("04", "AUTO-EMIT", "Completion auto-generates SLA-driven work orders for every flagged item.", "field_tablet_turns.png"),
    ]
    x = 120
    for num, title, body, shot in steps:


        d.text((x + 28, 476), tracked(title, 1), font=F["kick_sm"], fill=WHITE)
        inner = shot_frame(d, x + 28, 518, 334, 180, title=shot.split(".")[0])
        paste_cover(img, f"gallery/{shot}", inner)
        d = ImageDraw.Draw(img, "RGBA")
        for j, line in enumerate(wrap(d, body, F["small"], 334)):
            d.text((x + 28, 714 + j * 32), line, font=F["small"], fill=GRAY70)
        x += 420

    msg = "Walk the unit once. Create perfect certainty. Everything else is automatically written down."
    tw, _ = text_size(d, msg, F["small"])
    d.text(((W - tw) / 2, 896), msg, font=F["small"])
    return img


def slide09():
    img, d = new_slide()
    y = 174
    d.text((120, y), "We trace physical lineage.", font=F["h1"])

    d.text((152, 458), tracked("14-YR-OLD FRIDGE", 1), font=F["kick_sm"], fill=GRAY40)
    d.rounded_rectangle([170, 500, 430, 700], radius=4, fill=(242, 242, 244))
    try:
        icon = Image.open(os.path.join(IMG, "..", "portal", "schematics", "fridge.png")).convert("RGBA").resize((180, 180), Image.LANCZOS)
        img.paste(icon, (220, 510), icon)
    except Exception:
        pass
    d.text((152, 724), "Dead compressor.", font=F["h3"])
    d.text((152, 764), "Written off.", font=F["h3"], fill=GRAY70)
    arrow(d, 620, 620, 700, 620, width=8)

    center_text(d, 960, 470, "MAIN CONTROL BOARD", F["kick"], fill=RED)
    center_text(d, 960, 504, "SALVAGED", F["h2"])
    center_text(d, 960, 580, "$0 cash cost.", F["h3"])
    center_text(d, 960, 624, "$215 imputed value.", F["h3"], fill=RED)
    center_text(d, 960, 690, "part.source_asset_id", F["kick_sm"], fill=GRAY70)
    center_text(d, 960, 716, "> installed_in_asset_id", F["kick_sm"], fill=GRAY70)
    arrow(d, 1220, 620, 1300, 620, width=8)

    d.text((1372, 458), tracked("2-YR-OLD FRIDGE", 1), font=F["kick_sm"], fill=GRAY40)
    d.rounded_rectangle([1390, 500, 1650, 700], radius=4, fill=(242, 242, 244))
    try:
        icon = Image.open(os.path.join(IMG, "..", "portal", "schematics", "fridge.png")).convert("RGBA").resize((180, 180), Image.LANCZOS)
        img.paste(icon, (1440, 510), icon)
    except Exception:
        pass
    d.text((1372, 724), "Needs board.", font=F["h3"])
    d.text((1372, 764), "Salvage installed.", font=F["h3"], fill=RED)

    msg = "Shops get rewarded for reuse. Portfolios avoid thousands in unnecessary purchases."
    tw, _ = text_size(d, msg, F["small"])
    d.text(((W - tw) / 2, 862), msg, font=F["small"], fill=GRAY70)
    return img


def slide10():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Your numbers dictate:", font=F["h2"])
    d.text((120, y + 64), "repair, replace, rebuy.", font=F["h2"], fill=RED)
    inner = shot_frame(d, 120, 400, 820, 470, title="hq_analytics")
    paste_cover(img, "gallery/hq_analytics.png", inner)
    d = ImageDraw.Draw(img, "RGBA")
    inner2 = shot_frame(d, 980, 400, 820, 470, title="hq_lemon_detection")
    paste_cover(img, "reports/hq_lemon_detection.png", inner2)
    d = ImageDraw.Draw(img, "RGBA")
    labels = ["REALIZED LIFESPAN + CAPEX FORECAST", "BRAND LEMON MATRIX"]
    for i, lbl in enumerate(labels):
        cx = 120 + i * 860 + 410
        tw, _ = text_size(d, lbl, F["kick_sm"])
        d.text((cx - tw / 2, 882), lbl, font=F["kick_sm"], fill=GRAY40)
    return img


def slide11():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Assets, never people.", font=F["h1"])
    d.text((560, 340), "SYSTEM SIGNAL", font=F["kick"], fill=GRAY40)
    d.text((1180, 340), "AUTOMATED ACTION", font=F["kick"], fill=RED)
    rows = [
        ("No confirmed scan in 180+ days", "Triggers a verification work order."),
        ("'Missing' finding during a unit turn", "Opens a 30-day grace window."),
        ("Scan outside the expected property", "Logged, flagged for HQ review."),
        ("Grace window expires with no scans", "Escalates to unaccounted-for."),
    ]
    y0 = 380
    for i, (sig, act) in enumerate(rows):
        yy = y0 + i * 108

        d.text((160, yy + 32), sig, font=F["body"])
        arrow(d, 1050, yy + 48, 1110, yy + 48, width=5)
        d.text((1140, yy + 32), act, font=F["body"], fill=RED if i in (1, 3) else WHITE)

    msg = "The 30-day grace window converts most 'missing' tags into benign relocations — preserving field trust."
    tw, _ = text_size(d, msg, F["small"])
    d.text(((W - tw) / 2, 852), msg, font=F["small"])
    msg2 = "If techs feel surveilled, they stop scanning. We never auto-accuse or rank technicians by loss."
    tw2, _ = text_size(d, msg2, F["small"])
    d.text(((W - tw2) / 2, 886), msg2, font=F["small"])
    return img


def slide12():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Every scan enriches everyone.", font=F["h1"])

    d.text((152, 458), tracked("PROPERTY A · ORG 1", 1), font=F["kick_sm"], fill=GRAY40)
    center_text(d, 340, 540, "Tech scans a", F["body"])
    center_text(d, 340, 578, "\u201cWhirlpool", F["h3"])
    center_text(d, 340, 622, "WTW5000DW\u201d", F["h3"], fill=RED)
    center_text(d, 340, 680, "missing model data typed once.", F["small"], fill=GRAY70)
    # central cylinder
    cx, cy, cw = 960, 610, 300
    d.ellipse([cx - cw / 2, cy - 150, cx + cw / 2, cy - 90], fill=(30, 30, 34), outline=RED, width=3)
    d.rectangle([cx - cw / 2, cy - 120, cx + cw / 2, cy + 120], fill=(30, 30, 34), outline=RED, width=3)
    d.ellipse([cx - cw / 2, cy + 90, cx + cw / 2, cy + 150], fill=(18, 18, 20), outline=RED, width=3)
    d.ellipse([cx - cw / 2, cy + 90, cx + cw / 2, cy + 150], fill=None, outline=(255, 255, 255, 40), width=1)
    center_text(d, cx, 560, "SHARED", F["kick"], fill=RED)
    center_text(d, cx, 592, "ASSET-MODEL", F["kick"])
    center_text(d, cx, 624, "CATALOG", F["kick"])
    arrow(d, 600, 610, 780, 610, width=8)
    arrow(d, 1140, 610, 1320, 610, width=8)

    d.text((1392, 458), tracked("PROPERTY B · ORG 2", 1), font=F["kick_sm"], fill=GRAY40)
    center_text(d, 1580, 540, "Tech scans the", F["body"])
    center_text(d, 1580, 578, "same model", F["h3"], fill=RED)
    center_text(d, 1580, 622, "a week later.", F["h3"])
    center_text(d, 1580, 680, "Specs, life curves, parts — instant.", F["small"], fill=GRAY70)

    msg = "No customer-identifying data is ever shared. Only manufacturer specs and aggregated lifespan statistics."
    msg2 = "After 50,000 tagged assets: \u201cthe dishwashers in your portfolio fail at 6.2 years; comparables last 9.8.\u201d"
    for k, m in enumerate([msg, msg2]):
        tw, _ = text_size(d, m, F["small"])
        d.text(((W - tw) / 2, 840 + k * 36), m, font=F["small"], fill=GRAY70 if k == 0 else WHITE)
    return img


def slide13():
    img, d = new_slide()
    y = 174
    d.text((120, y), "Boring parts, exotic guarantees.", font=F["h1"])
    tiers = [
        ("EDGE TIER", "Field app", "Flutter · Drift/SQLite", "Offline mirror, scan pipeline, photo queue. Works in parking garages."),
        ("CORE TIER", "Sync API + Ledger", "FastAPI · Postgres", "Append-only events, monotonic sequences, idempotent push/pull. SQLite for local pilots."),
        ("PRESENTATION", "HQ + Resident portal", "React 19 · TypeScript", "Dashboards, dispatch kanban, analytics — and 3-page ticket intake for residents."),
    ]
    x = 120
    for i, (tier, name, stack, body) in enumerate(tiers):


        d.text((x + 32, 458), tracked(tier, 1), font=F["kick"], fill=RED)
        d.text((x + 32, 496), name, font=F["h3"])
        d.text((x + 32, 544), stack, font=F["kick_sm"], fill=GRAY40)
        for j, line in enumerate(wrap(d, body, F["small"], 456)):
            d.text((x + 32, 590 + j * 34), line, font=F["small"], fill=GRAY70)
        if i < 2:
            arrow(d, x + 520, 600, x + 560, 600)
        x += 560

    msg = "Why Postgres, not a document store? Historical integrity is the product: part lineage across locations"
    msg2 = "and time is graph-shaped. Constraints, window functions, and append-only ledgers cannot silently rot."
    for k, m in enumerate([msg, msg2]):
        tw, _ = text_size(d, m, F["small"])
        d.text(((W - tw) / 2, 830 + k * 36), m, font=F["small"], fill=GRAY70)
    return img


def slide14():
    img, d = new_slide()
    y = 174
    center_text(d, W / 2, y, "SCAN VERIFICATION RATE", F["display"])
    center_text(d, W / 2, y + 130, "TARGET \u2265 70%", F["display"], fill=RED)
    center_text(d, W / 2, y + 262, "Share of service events and turn items backed by an actual hardware scan.",
                F["body"], fill=GRAY70)
    params = [
        ("90-DAY PILOT", ["200–500 units deployed", "≥ 95% of in-unit assets tagged", "≥ 80% of events in-app, not on paper"]),
        ("WHY IT COMPOUNDS", ["Each scan adds to the dataset", "Every feature unlocks downstream", "No dashboard saves an untouched product"]),
    ]
    x = 320
    for title, items in params:


        tw, _ = text_size(d, tracked(title, 1), F["kick"])
        d.text((x + (600 - tw) / 2, 648), tracked(title, 1), font=F["kick"], fill=RED)
        for j, it in enumerate(items):
            d.text((x + 60, 700 + j * 44), f"•  {it}", font=F["small"])
        x += 640
    return img


def slide15():
    img, d = new_slide()
    inner = shot_frame(d, 120, 220, 880, 640, title="the tag")
    paste_cover(img, "qr-reference-holographic.png", inner)
    d = ImageDraw.Draw(img, "RGBA")
    d.text((1080, 300), "Walk the", font=F["display"])
    d.text((1080, 430), "unit once.", font=F["display"], fill=RED)
    d.text((1080, 566), "Everything else", font=F["h2"], fill=GRAY70)
    d.text((1080, 636), "is already written down.", font=F["h3"], fill=GRAY70)
    subs = ["Scan the plate.", "See the history.", "Log the fix."]
    for i, s in enumerate(subs):
        d.ellipse([1080, 740 + i * 44, 1092, 752 + i * 44], fill=RED)
        d.text((1110, 734 + i * 44), s, font=F["body"])
    d.rounded_rectangle([1080, 884, 1620, 948], radius=4, fill=RED)
    d.text((1130, 900), "Tag your portfolio >", font=F["h3"])
    return img


SLIDES = [slide01, slide02, slide03, slide04, slide05, slide06, slide07,
          slide08, slide09, slide10, slide11, slide12, slide13, slide14, slide15]


def export_derivatives(masters):
    from PIL import Image as PImage
    web_dir = os.path.join(DECK, "web")
    thumb_dir = os.path.join(DECK, "thumbs")
    os.makedirs(web_dir, exist_ok=True)
    os.makedirs(thumb_dir, exist_ok=True)
    for i, master in enumerate(masters, 1):
        web = master.resize((1600, 900), PImage.LANCZOS)
        web.save(os.path.join(web_dir, f"slide_{i:02d}.webp"), "WEBP", quality=84, method=6)
        thumb = master.resize((240, 135), PImage.LANCZOS)
        thumb.save(os.path.join(thumb_dir, f"slide_{i:02d}.webp"), "WEBP", quality=80, method=6)
    print("wrote web + thumbs webp")


def export_pdf(masters):
    from PIL import Image as PImage
    out = os.path.join(ROOT, "website", "docs", "Nameplate_Asset_Infrastructure.pdf")
    rgb = [m.convert("RGB") for m in masters]
    rgb[0].save(out, "PDF", save_all=True, append_images=rgb[1:], resolution=150.0)
    print(f"wrote {out}")


def export_pptx(masters):
    """Refresh existing image slides without rebuilding the PowerPoint template."""
    import io
    import posixpath
    import zipfile
    import xml.etree.ElementTree as ET
    out = os.path.join(ROOT, "website", "docs", "Nameplate_Asset_Infrastructure.pptx")
    replacements = {}
    with zipfile.ZipFile(out) as source:
        for i, master in enumerate(masters, 1):
            rel_path = f"ppt/slides/_rels/slide{i}.xml.rels"
            rels = ET.fromstring(source.read(rel_path))
            image_rels = [rel for rel in rels if rel.attrib["Type"].endswith("/image")]
            if len(image_rels) != 1:
                raise ValueError(f"Expected one image on existing slide {i}")
            target = posixpath.normpath(posixpath.join("ppt/slides", image_rels[0].attrib["Target"]))
            buf = io.BytesIO()
            master.convert("RGB").save(buf, "JPEG", quality=95)
            replacements[target] = buf.getvalue()
        with zipfile.ZipFile(out + ".tmp", "w", zipfile.ZIP_DEFLATED) as dest:
            for item in source.infolist():
                dest.writestr(item, replacements.get(item.filename, source.read(item.filename)))
    os.replace(out + ".tmp", out)
    print(f"wrote {out} (original slide structure preserved)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int, default=0, help="Render one slide (1-15) to /tmp for review")
    ap.add_argument("--masters-only", action="store_true")
    ap.add_argument("--skip-pdf-pptx", action="store_true")
    args = ap.parse_args()
    if args.only:
        SLIDES[args.only - 1]().save(f"/tmp/deck_{args.only:02d}.png")
        print(f"wrote /tmp/deck_{args.only:02d}.png")
        return
    masters = []
    for i, fn in enumerate(SLIDES, 1):
        img = fn()
        masters.append(img)
        out = os.path.join(DECK, f"slide_{i:02d}.png")
        img.save(out)
        print(f"wrote {out}")
    if args.masters_only:
        return
    export_derivatives(masters)
    if not args.skip_pdf_pptx:
        export_pdf(masters)
        export_pptx(masters)


if __name__ == "__main__":
    main()
