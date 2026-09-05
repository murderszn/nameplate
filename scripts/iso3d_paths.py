#!/usr/bin/env python3
"""Pure-python SVG path flattener (no Blender dependency).

Parses the absolute-command path data emitted by iso3d_split.py
(M H V L C A Z) and flattens curves to polyline point lists.

Coordinates keep SVG orientation (y down); the Blender side negates Y.
"""
import math
import re

_TOKEN = re.compile(r"[MLHVCAZmlhvca z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def tokenize(d):
    return [t for t in _TOKEN.findall(d) if t.strip()]


def _arc_center(x1, y1, rx, ry, phi_deg, large, sweep, x2, y2):
    phi = math.radians(phi_deg % 360.0)
    rx, ry = abs(rx), abs(ry)
    if rx == 0 or ry == 0:
        return None
    dx, dy = (x1 - x2) / 2.0, (y1 - y2) / 2.0
    x1p = math.cos(phi) * dx + math.sin(phi) * dy
    y1p = -math.sin(phi) * dx + math.cos(phi) * dy
    lam = x1p ** 2 / rx ** 2 + y1p ** 2 / ry ** 2
    if lam > 1:
        s = math.sqrt(lam)
        rx, ry = rx * s, ry * s
    num = rx ** 2 * ry ** 2 - rx ** 2 * y1p ** 2 - ry ** 2 * x1p ** 2
    den = rx ** 2 * y1p ** 2 + ry ** 2 * x1p ** 2
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        co = -co
    cxp = co * rx * y1p / ry
    cyp = -co * ry * x1p / rx
    cx = math.cos(phi) * cxp - math.sin(phi) * cyp + (x1 + x2) / 2.0
    cy = math.sin(phi) * cxp + math.cos(phi) * cyp + (y1 + y2) / 2.0
    return cx, cy, rx, ry, phi


def _arc_points(x1, y1, rx, ry, phi_deg, large, sweep, x2, y2, segs=20):
    c = _arc_center(x1, y1, rx, ry, phi_deg, large, sweep, x2, y2)
    if c is None:
        return [(x2, y2)]
    cx, cy, rx, ry, phi = c

    def ang(px, py):
        dx, dy = (px - cx), (py - cy)
        # to ellipse frame
        ex = (math.cos(phi) * dx + math.sin(phi) * dy) / rx
        ey = (-math.sin(phi) * dx + math.cos(phi) * dy) / ry
        return math.atan2(ey, ex)

    a1, a2 = ang(x1, y1), ang(x2, y2)
    d = a2 - a1
    while d <= -math.pi:
        d += 2 * math.pi
    while d > math.pi:
        d -= 2 * math.pi
    if sweep == 1 and d < 0:
        d += 2 * math.pi
    if sweep == 0 and d > 0:
        d -= 2 * math.pi
    pts = []
    for i in range(1, segs + 1):
        a = a1 + d * i / segs
        ex, ey = math.cos(a), math.sin(a)
        px = cx + rx * math.cos(phi) * ex - ry * math.sin(phi) * ey
        py = cy + rx * math.sin(phi) * ex + ry * math.cos(phi) * ey
        pts.append((px, py))
    return pts


def _cubic(p0, p1, p2, p3, segs=12):
    pts = []
    for i in range(1, segs + 1):
        t = i / segs
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def flatten(d):
    """Return (points, closed). Raises ValueError on unsupported syntax."""
    toks = tokenize(d)
    pts = []
    closed = False
    cur = (0.0, 0.0)
    start = None
    i = 0

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    while i < len(toks):
        cmd = toks[i]
        i += 1
        if cmd == "M":
            cur = (num(), num())
            start = cur
            pts.append(cur)
            while i < len(toks) and toks[i] not in "MLHVCAZ":
                cur = (num(), num())
                pts.append(cur)
        elif cmd == "L":
            while True:
                cur = (num(), num())
                pts.append(cur)
                if i >= len(toks) or toks[i] in "MLHVCAZ":
                    break
        elif cmd == "H":
            while True:
                cur = (num(), cur[1])
                pts.append(cur)
                if i >= len(toks) or toks[i] in "MLHVCAZ":
                    break
        elif cmd == "V":
            while True:
                cur = (cur[0], num())
                pts.append(cur)
                if i >= len(toks) or toks[i] in "MLHVCAZ":
                    break
        elif cmd == "C":
            while True:
                p1 = (num(), num())
                p2 = (num(), num())
                p3 = (num(), num())
                pts.extend(_cubic(cur, p1, p2, p3))
                cur = p3
                if i >= len(toks) or toks[i] in "MLHVCAZ":
                    break
        elif cmd == "A":
            while True:
                rx, ry, rot, large, sweep, x, y = num(), num(), num(), int(num()), int(num()), num(), num()
                pts.extend(_arc_points(cur[0], cur[1], rx, ry, rot, large, sweep, x, y))
                cur = (x, y)
                if i >= len(toks) or toks[i] in "MLHVCAZ":
                    break
        elif cmd == "Z":
            closed = True
            if start is not None:
                cur = start
        else:
            raise ValueError(f"unsupported command: {cmd}")
    return pts, closed


def bbox(points_list):
    xs = [p[0] for pts in points_list for p in pts]
    ys = [p[1] for pts in points_list for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))
