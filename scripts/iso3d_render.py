#!/usr/bin/env python3
"""Render iso SVG appliances as 3D product shots with Blender.

Pipeline (no importer add-ons needed — curves are built directly):
  split layers (/tmp/iso3d/<name>.{faces,gray,red}.svg + manifest)
    -> dark beveled cabinet slabs (faces)
     + metallic tube inlay (gray linework)
     + emissive red tube inlay + studs (red linework)
    -> studio lighting, transparent PNG + GLB per appliance

Run INSIDE Blender (executes on your Mac, not in a sandbox):
  /Applications/Blender.app/Contents/MacOS/Blender -b \\
    -P scripts/iso3d_render.py -- ALL
  /Applications/Blender.app/Contents/MacOS/Blender -b \\
    -P scripts/iso3d_render.py -- fridge washer
Output: /tmp/iso3d_out/<name>.png + <name>.glb
Regenerate layers first: .venv/bin/python scripts/iso3d_split.py
"""
import json
import math
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from iso3d_paths import flatten  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

IN_DIR = "/tmp/iso3d"
OUT_DIR = "/tmp/iso3d_out"
WORLD = 4.2          # normalized max dimension
SLAB = 0.32          # faces extrusion depth
SLAB_BEVEL = 0.05
STUD = 0.38          # red dot extrusion
TUBE_GRAY = 0.016
TUBE_RED = 0.018
RES = 1024

NS = "http://www.w3.org/2000/svg"


def layer_paths(name, layer):
    root = ET.parse(os.path.join(IN_DIR, f"{name}.{layer}.svg")).getroot()
    out = []
    for p in root:
        pts, closed = flatten(p.get("d"))
        out.append((pts, closed))
    return out


def make_mat(name, kind):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    out = mat.node_tree.nodes["Material Output"]
    if kind == "red":
        emis = mat.node_tree.nodes.new("ShaderNodeEmission")
        emis.inputs["Color"].default_value = (0.92, 0.10, 0.10, 1.0)
        emis.inputs["Strength"].default_value = 6.0
        mat.node_tree.links.new(emis.outputs["Emission"], out.inputs["Surface"])
    else:
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        if kind == "faces":
            bsdf.inputs["Base Color"].default_value = (0.055, 0.055, 0.06, 1.0)
            bsdf.inputs["Metallic"].default_value = 0.85
            bsdf.inputs["Roughness"].default_value = 0.38
        else:  # gray
            bsdf.inputs["Base Color"].default_value = (0.62, 0.62, 0.64, 1.0)
            bsdf.inputs["Metallic"].default_value = 0.9
            bsdf.inputs["Roughness"].default_value = 0.3
        mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_curves(name, items, mat, extrude, bevel, cyclic):
    cu = bpy.data.curves.new(f"{name}_curve", type="CURVE")
    for sp in list(cu.splines):
        cu.splines.remove(sp)
    cu.dimensions = "3D"
    cu.fill_mode = "FULL"
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    for pts, closed in items:
        sp = cu.splines.new("POLY")
        xs = [p[0] for p in pts]
        sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            sp.points[i].co = (p[0], p[1], 0.0, 1.0)
        sp.use_cyclic_u = (closed if cyclic is None else cyclic)
    ob = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for x in list(coll):
            coll.remove(x)


def track_to(ob, target):
    con = ob.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"


def render_one(name):
    clear_scene()
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 96
    try:
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.render.resolution_x = scene.render.resolution_y = RES
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"

    faces = layer_paths(name, "faces")
    gray = layer_paths(name, "gray")
    red = layer_paths(name, "red")
    with open(os.path.join(IN_DIR, f"{name}.json")) as fh:
        manifest = json.load(fh)

    # normalize: svg coords, y negated -> centered, max dim WORLD
    allpts = [p for items in (faces, gray, red) for pts, _ in items for p in pts]
    xs = [p[0] for p in allpts]
    ys = [-p[1] for p in allpts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    s = WORLD / max(max(xs) - min(xs), max(ys) - min(ys))

    def xf(items):
        return [([( (x - cx) * s, (-y - cy) * s) for x, y in pts], c) for pts, c in items]

    mat_faces = make_mat(f"{name}_faces", "faces")
    mat_gray = make_mat(f"{name}_gray", "gray")
    mat_red = make_mat(f"{name}_red", "red")

    # closed red dots become studs; open red strokes become tubes
    red_closed = [(pts, c) for pts, c in red if c]
    red_open = [(pts, c) for pts, c in red if not c]

    obs = [
        build_curves(f"{name}_faces", xf(faces), mat_faces, SLAB, SLAB_BEVEL, True),
        build_curves(f"{name}_gray", xf(gray), mat_gray, SLAB + 0.02, TUBE_GRAY, False),
        build_curves(f"{name}_red", xf(red_open), mat_red, SLAB + 0.02, TUBE_RED, False),
    ]
    if red_closed:
        obs.append(build_curves(f"{name}_studs", xf(red_closed), mat_red, STUD, 0.02, True))

    for t in manifest.get("texts", []):
        cu = bpy.data.curves.new(f"{name}_text", type="FONT")
        cu.body = t["content"]
        try:
            cu.align_x = "CENTER"
            cu.align_y = "CENTER"
        except Exception:
            pass
        cu.extrude = 0.06
        ob = bpy.data.objects.new(f"{name}_text", cu)
        scene.collection.objects.link(ob)
        lx, ly = (t["x"] - cx) * s, (-t["y"] - cy) * s
        ob.location = (lx, ly, SLAB + 0.02)
        ob.scale = (t["size"] / 512 * WORLD * 1.35,) * 3
        ob.data.materials.append(mat_red)
        obs.append(ob)

    # world: near-black studio
    world = bpy.data.worlds.new(f"{name}_world") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.012, 0.012, 0.014, 1.0)
    bg.inputs["Strength"].default_value = 1.0

    # lights
    sun = bpy.data.lights.new("key", type="SUN")
    sun.energy = 2.6
    sun_obj = bpy.data.objects.new("key", sun)
    scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(52), 0, math.radians(28))

    rim = bpy.data.lights.new("rim", type="AREA")
    rim.energy = 900.0
    rim.color = (1.0, 0.16, 0.16)
    rim.size = 5.0
    rim_obj = bpy.data.objects.new("rim", rim)
    scene.collection.objects.link(rim_obj)
    rim_obj.location = (-5.5, 3.5, 4.5)
    tgt = bpy.data.objects.new("target", None)
    scene.collection.objects.link(tgt)
    track_to(rim_obj, tgt)

    fill = bpy.data.lights.new("fill", type="AREA")
    fill.energy = 140.0
    fill.color = (0.62, 0.72, 1.0)
    fill.size = 6.0
    fill_obj = bpy.data.objects.new("fill", fill)
    scene.collection.objects.link(fill_obj)
    fill_obj.location = (5.0, -2.0, 1.5)
    track_to(fill_obj, tgt)

    # camera: gentle 3/4 view
    cam_data = bpy.data.cameras.new(f"{name}_cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new(f"{name}_cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (2.1, -5.8, 3.4)
    track_to(cam, tgt)
    scene.camera = cam

    os.makedirs(OUT_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(OUT_DIR, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    if hasattr(bpy.ops.export_scene, "gltf"):
        try:
            bpy.ops.export_scene.gltf(
                filepath=os.path.join(OUT_DIR, f"{name}.glb"),
                export_format="GLB", use_selection=False, export_materials="EXPORT")
        except Exception as e:
            print("glTF export skipped:", e)
    print(f"DONE {name}")


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["ALL"]
    names = ["condenser", "dishwasher", "dryer", "fridge", "hvac",
             "microwave", "range", "thermostat", "washer", "water-heater"]
    if not (len(args) == 1 and args[0] == "ALL"):
        names = [a for a in args if a in names] or names
    for n in names:
        render_one(n)


if __name__ == "__main__":
    main()
