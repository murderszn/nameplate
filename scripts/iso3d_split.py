#!/usr/bin/env python3
"""Split iso SVGs (CSS-class styled) into Blender-friendly layers.

Blender's SVG importer ignores <style> classes, so this emits, per
appliance, three SVGs with explicit presentation attributes:
  <name>.faces.svg   - closed filled shapes  (fill white)
  <name>.gray.svg    - gray linework         (stroke gray, no fill)
  <name>.red.svg     - red linework + dots   (stroke/fill red)

rect/circle elements are converted to paths (Blender-safe).
Usage: .venv/bin/python scripts/iso3d_split.py  (writes /tmp/iso3d/)
"""
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "website", "images", "iso")
OUT = "/tmp/iso3d"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)


def q(tag):
    return f"{{{NS}}}{tag}"


def rect_to_path(el):
    x, y = float(el.get("x", 0)), float(el.get("y", 0))
    w, h = float(el.get("width", 0)), float(el.get("height", 0))
    rx = float(el.get("rx", 0))
    if rx <= 0:
        return f"M{x},{y} H{x + w} V{y + h} H{x} Z"
    parts = [f"M{x + rx},{y}", f"H{x + w - rx}", f"A{rx},{rx} 0 0 1 {x + w},{y + rx}",
             f"V{y + h - rx}", f"A{rx},{rx} 0 0 1 {x + w - rx},{y + h}", f"H{x + rx}",
             f"A{rx},{rx} 0 0 1 {x},{y + h - rx}", f"V{y + rx}", f"A{rx},{rx} 0 0 1 {x + rx},{y}", "Z"]
    return " ".join(parts)


def circle_to_path(el):
    cx, cy, r = float(el.get("cx", 0)), float(el.get("cy", 0)), float(el.get("r", 0))
    return ellipse_to_path(cx, cy, r, r)


def ellipse_to_path(cx, cy, rx, ry):
    k = 0.5523
    return (f"M{cx - rx},{cy} C{cx - rx},{cy - k * ry} {cx - k * rx},{cy - ry} {cx},{cy - ry} "
            f"C{cx + k * rx},{cy - ry} {cx + rx},{cy - k * ry} {cx + rx},{cy} "
            f"C{cx + rx},{cy + k * ry} {cx + k * rx},{cy + ry} {cx},{cy + ry} "
            f"C{cx - k * rx},{cy + ry} {cx - rx},{cy + k * ry} {cx - rx},{cy} Z")


def convert(el):
    """Return (kind, d) for supported elements, else None."""
    tag = el.tag.replace(f"{{{NS}}}", "")
    if tag == "path":
        return ("path", el.get("d", ""))
    if tag == "rect":
        return ("path", rect_to_path(el))
    if tag == "circle":
        return ("path", circle_to_path(el))
    if tag == "ellipse":
        return ("path", ellipse_to_path(float(el.get("cx", 0)), float(el.get("cy", 0)),
                                        float(el.get("rx", 0)), float(el.get("ry", 0))))
    if tag in ("line", "polyline", "polygon"):
        pts = re.findall(r"[-+]?\d*\.?\d+", el.get("points", ""))
        if tag == "line":
            x1, y1, x2, y2 = el.get("x1"), el.get("y1"), el.get("x2"), el.get("y2")
            if None in (x1, y1, x2, y2):
                return None
            return ("path", f"M{x1},{y1} L{x2},{y2}")
        coords = list(zip(pts[::2], pts[1::2]))
        if not coords:
            return None
        d = "M" + " L".join(f"{x},{y}" for x, y in coords)
        if tag == "polygon":
            d += " Z"
        return ("path", d)
    return None


GRAY_CLASSES = {"ln", "thin"}
RED_CLASSES = {"red", "red-thin"}


def split_one(src_path, out_dir, name):
    tree = ET.parse(src_path)
    root = tree.getroot()
    layers = {"faces": [], "gray": [], "red": []}
    texts = []
    skipped = []
    for el in list(root):
        tag = el.tag.replace(f"{{{NS}}}", "")
        if tag in ("style", "defs", "metadata", "title", "desc"):
            continue
        if tag == "g":
            els = list(el)
        else:
            els = [el]
        for sub in els:
            stag = sub.tag.replace(f"{{{NS}}}", "")
            if stag == "text":
                fill = (sub.get("fill") or "").upper()
                texts.append({
                    "content": "".join(sub.itertext()),
                    "x": float(sub.get("x", 0)), "y": float(sub.get("y", 0)),
                    "size": float(sub.get("font-size", 24)),
                    "red": "EB2B2B" in fill or (sub.get("class") or "") in RED_CLASSES,
                })
                continue
            cls = (sub.get("class") or "").strip()
            conv = convert(sub)
            if conv is None:
                skipped.append(sub.tag)
                continue
            _, d = conv
            if cls == "face" or (not cls and (sub.get("fill") or "none") not in ("none", "")):
                layers["faces"].append((d, {"fill": "#FFFFFF", "stroke": "none"}))
            elif cls == "red-fill":
                layers["red"].append((d, {"fill": "#EB2B2B", "stroke": "none"}))
            elif cls in RED_CLASSES:
                layers["red"].append((d, {"fill": "none", "stroke": "#EB2B2B", "stroke-width": sub.get("stroke-width") or "3"}))
            elif cls in GRAY_CLASSES:
                w = "2" if cls == "thin" else "3.5"
                layers["gray"].append((d, {"fill": "none", "stroke": "#888888", "stroke-width": w}))
            else:
                skipped.append(f"{sub.tag}.{cls}")
    viewbox = root.get("viewBox", "0 0 512 512")
    counts = {}
    for layer, items in layers.items():
        doc = ET.Element(q("svg"), {"viewBox": viewbox})
        for d, attrs in items:
            ET.SubElement(doc, q("path"), {"d": d, **attrs})
        ET.ElementTree(doc).write(os.path.join(out_dir, f"{name}.{layer}.svg"))
        counts[layer] = len(items)
    import json
    with open(os.path.join(out_dir, f"{name}.json"), "w") as fh:
        json.dump({"viewbox": viewbox, "texts": texts}, fh)
    return counts, skipped, texts


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".svg"):
            continue
        counts, skipped, texts = split_one(os.path.join(SRC, f), OUT, f[:-4])
        extra = ("SKIPPED: " + ",".join(sorted(set(skipped)))) if skipped else ""
        if texts:
            extra += f" TEXTS: {texts}"
        print(f[:-4], counts, extra)


if __name__ == "__main__":
    main()
