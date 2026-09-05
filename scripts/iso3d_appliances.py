#!/usr/bin/env python3
"""Build REAL 3D appliance models procedurally (not extruded SVG outlines).

Each builder makes a true product: cabinet box + doors/handles/knobs/glass,
sitting on the floor (z=0), facing +Y (front toward camera at -Y).

Run INSIDE Blender:
  /Applications/Blender.app/Contents/MacOS/Blender -b \\
    -P scripts/iso3d_appliances.py -- ALL
  ... -- fridge washer
Output: /tmp/iso3d_out/<name>.png + <name>.glb (overwrites outline versions)
"""
import math
import os
import sys

import bpy
from mathutils import Vector

OUT_DIR = "/tmp/iso3d_out"
RES = 1024

# ---------------------------------------------------------------- materials
_MATS = {}


def mat_principled(name, base=(0.9, 0.9, 0.92, 1.0), metallic=0.1,
                   roughness=0.4, emission=None, emission_strength=0.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = base
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        try:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        except Exception:
            pass
    _MATS[name] = m
    return m


def palette():
    return {
        "body": mat_principled("ap_body", (0.88, 0.88, 0.90, 1.0), 0.15, 0.35),
        "dark": mat_principled("ap_dark", (0.09, 0.09, 0.10, 1.0), 0.6, 0.45),
        "steel": mat_principled("ap_steel", (0.62, 0.63, 0.65, 1.0), 0.9, 0.28),
        "glass": mat_principled("ap_glass", (0.03, 0.035, 0.045, 1.0), 0.2, 0.08),
        "black": mat_principled("ap_black", (0.02, 0.02, 0.025, 1.0), 0.3, 0.6),
        "red": mat_principled("ap_red", (0.92, 0.12, 0.12, 1.0), 0.1, 0.4,
                              emission=(0.92, 0.10, 0.10), emission_strength=0.25),
        "red_hot": mat_principled("ap_red_hot", (0.92, 0.12, 0.12, 1.0), 0.0, 0.5,
                                  emission=(1.0, 0.12, 0.12), emission_strength=6.0),
        "copper": mat_principled("ap_copper", (0.55, 0.28, 0.12, 1.0), 0.95, 0.3),
        "screen": mat_principled("ap_screen", (0.02, 0.03, 0.05, 1.0), 0.1, 0.2,
                                 emission=(0.35, 0.55, 1.0), emission_strength=2.0),
        "white": mat_principled("ap_white", (0.95, 0.95, 0.96, 1.0), 0.0, 0.5),
    }


# ---------------------------------------------------------------- helpers
def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                 bpy.data.lights, bpy.data.cameras):
        for x in list(coll):
            try:
                coll.remove(x)
            except Exception:
                pass
    _MATS.clear()


def _finish(ob, mat=None, bevel=0.015, smooth=False):
    if mat is not None:
        try:
            ob.data.materials.append(mat)
        except Exception:
            pass
    if bevel > 0:
        try:
            mod = ob.modifiers.new("EdgeBevel", "BEVEL")
            mod.width = bevel
            mod.segments = 2
            mod.limit_method = "ANGLE"
        except Exception:
            pass
    try:
        bpy.context.view_layer.objects.active = ob
        if smooth:
            bpy.ops.object.shade_smooth()
        else:
            try:
                bpy.ops.object.shade_auto_smooth()
            except Exception:
                pass
    except Exception:
        pass
    return ob


def box(P, name, loc, dims, mat, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.dimensions = Vector(dims)
    # re-assert location (setting dimensions can shift in some versions)
    ob.location = Vector(loc)
    return _finish(ob, mat, bevel)


def cyl(P, name, loc, radius, depth, mat, axis="Z", vertices=32, bevel=0.008):
    if axis == "Z":
        rot = (0, 0, 0)
    elif axis == "X":
        rot = (0, math.radians(90), 0)
    else:
        rot = (math.radians(90), 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth,
                                        vertices=vertices, location=loc, rotation=rot)
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return _finish(ob, mat, bevel, smooth=(axis == "Y"))


def torus(P, name, loc, major, minor, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(location=loc, rotation=rot,
                                     major_radius=major, minor_radius=minor)
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return _finish(ob, mat, 0.0, smooth=True)


def text_on_face(P, content, loc, size=0.18, mat=None):
    cu = bpy.data.curves.new("txt", type="FONT")
    cu.body = content
    try:
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
    except Exception:
        pass
    cu.extrude = 0.008
    ob = bpy.data.objects.new("txt", cu)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = Vector(loc)
    # face +Y upright: -90° about X puts normal +Y but text-up becomes -Z,
    # so spin 180° about local Y to bring text-up back to +Z
    ob.rotation_euler = (math.radians(-90), math.radians(180), 0)
    ob.scale = (size, size, size)
    if mat is not None:
        try:
            ob.data.materials.append(mat)
        except Exception:
            pass
    return ob


def feet(P, x, y, h=0.06, r=0.035):
    for sx in (-x, x):
        for sy in (-y, y):
            cyl(P, "foot", (sx, sy, h / 2), r, h, P["black"], axis="Z", bevel=0.004)


# ---------------------------------------------------------------- builders
# Convention: front faces +Y. Floor z=0.

def build_fridge(P):
    W, D, H = 1.5, 1.05, 2.1
    box(P, "cabinet", (0, 0, H / 2 + 0.06), (W, D, H), P["body"], 0.02)
    # doors: two french doors + freezer drawer (thin proud boxes on +Y face)
    fy = D / 2
    box(P, "door_L", (-W / 4, fy + 0.015, 1.52), (W / 2 - 0.02, 0.05, 1.28), P["body"], 0.012)
    box(P, "door_R", (W / 4, fy + 0.015, 1.52), (W / 2 - 0.02, 0.05, 1.28), P["body"], 0.012)
    box(P, "freezer", (0, fy + 0.015, 0.62), (W - 0.04, 0.05, 0.62), P["body"], 0.012)
    # handles (red accent): vertical bars
    cyl(P, "handle_L", (-0.18, fy + 0.09, 1.55), 0.022, 0.85, P["red"], axis="Z", bevel=0.004)
    cyl(P, "handle_R", (0.18, fy + 0.09, 1.55), 0.022, 0.85, P["red"], axis="Z", bevel=0.004)
    cyl(P, "handle_fz", (0, fy + 0.09, 0.72), 0.022, 1.0, P["red"], axis="X", bevel=0.004)
    # dispenser recess on left door
    box(P, "dispenser", (-0.375, fy + 0.02, 1.55), (0.28, 0.03, 0.42), P["dark"], 0.008)
    box(P, "dispense_btn", (-0.375, fy + 0.045, 1.45), (0.14, 0.02, 0.10), P["red"], 0.004)
    # hinge caps + kickplate + side vents
    box(P, "hinge_L", (-0.55, 0.1, 2.16), (0.18, 0.3, 0.05), P["steel"], 0.008)
    box(P, "hinge_R", (0.55, 0.1, 2.16), (0.18, 0.3, 0.05), P["steel"], 0.008)
    box(P, "kick", (0, fy - 0.03, 0.11), (W - 0.1, 0.04, 0.10), P["dark"], 0.004)
    for i in range(3):
        box(P, f"louver_{i}", (W / 2 + 0.005, -0.1 - i * 0.12, 0.7), (0.02, 0.3, 0.03), P["dark"], 0.002)


def build_washer(P, dryer=False):
    W, D, H = 1.05, 1.0, 1.35
    box(P, "chassis", (0, 0, H / 2 + 0.06), (W, D, H), P["body"], 0.02)
    fy = D / 2
    # control panel band
    box(P, "panel", (0, fy + 0.01, H - 0.10), (W - 0.04, 0.06, 0.24), P["body"], 0.01)
    box(P, "display", (-0.18, fy + 0.045, H - 0.10), (0.22, 0.015, 0.10), P["screen"], 0.004)
    if dryer:
        cyl(P, "knob", (-0.36, fy + 0.06, H - 0.10), 0.055, 0.07, P["steel"], axis="Y", bevel=0.006)
        cyl(P, "start_btn", (0.30, fy + 0.05, H - 0.10), 0.035, 0.03, P["red_hot"], axis="Y", bevel=0.004)
        box(P, "lint", (0.15, 0.15, H + 0.10), (0.22, 0.12, 0.06), P["red"], 0.006)
        # square door with round window
        box(P, "door", (0, fy + 0.02, 0.68), (0.72, 0.06, 0.72), P["dark"], 0.02)
        cyl(P, "window", (0, fy + 0.055, 0.68), 0.26, 0.02, P["glass"], axis="Y", bevel=0.004)
    else:
        cyl(P, "knob", (0.30, fy + 0.06, H - 0.10), 0.06, 0.07, P["red"], axis="Y", bevel=0.006)
        box(P, "tray", (-0.32, fy + 0.02, H - 0.10), (0.24, 0.10, 0.10), P["steel"], 0.006)
        # round porthole door (ring must face +Y -> rotate 90° about X)
        torus(P, "door_ring", (0, fy + 0.04, 0.66), 0.33, 0.055, P["dark"],
              rot=(math.radians(90), 0, 0))
        cyl(P, "door_glass", (0, fy + 0.02, 0.66), 0.32, 0.03, P["glass"], axis="Y", bevel=0.004)
        cyl(P, "latch", (0.38, fy + 0.05, 0.66), 0.03, 0.06, P["red"], axis="Y", bevel=0.003)
    box(P, "kick", (0, fy - 0.02, 0.13), (W - 0.12, 0.03, 0.10), P["dark"], 0.004)
    feet(P, 0.42, 0.38)


def build_dishwasher(P):
    W, D, H = 1.0, 1.0, 1.25
    box(P, "chassis", (0, 0, H / 2 + 0.06), (W, D, H), P["body"], 0.02)
    fy = D / 2
    box(P, "panel", (0, fy + 0.005, H - 0.06), (W - 0.04, 0.05, 0.16), P["dark"], 0.008)
    box(P, "display", (0, fy + 0.035, H - 0.06), (0.30, 0.01, 0.05), P["screen"], 0.002)
    # full-width red towel-bar handle on stanchions
    cyl(P, "bar", (0, fy + 0.12, H - 0.38), 0.025, W - 0.16, P["red"], axis="X", bevel=0.004)
    box(P, "st_L", (-W / 2 + 0.12, fy + 0.07, H - 0.38), (0.05, 0.10, 0.05), P["steel"], 0.004)
    box(P, "st_R", (W / 2 - 0.12, fy + 0.07, H - 0.38), (0.05, 0.10, 0.05), P["steel"], 0.004)
    box(P, "door_seam", (0, fy + 0.008, 0.62), (W - 0.06, 0.015, 0.02), P["dark"], 0.002)
    box(P, "kick", (0, fy - 0.10, 0.10), (W - 0.10, 0.22, 0.12), P["dark"], 0.004)
    feet(P, 0.40, 0.35)


def build_range(P):
    W, D, H = 1.15, 1.0, 1.15
    box(P, "oven", (0, 0, H / 2 + 0.06), (W, D, H), P["body"], 0.02)
    # cooktop + backguard
    box(P, "cooktop", (0, 0.02, H + 0.085), (W, D + 0.04, 0.05), P["dark"], 0.008)
    box(P, "guard", (0, -D / 2 + 0.08, H + 0.38), (W, 0.16, 0.55), P["body"], 0.015)
    box(P, "guard_face", (0, -D / 2 + 0.165, H + 0.38), (W - 0.08, 0.015, 0.40), P["dark"], 0.004)
    box(P, "clock", (0, -D / 2 + 0.175, H + 0.44), (0.30, 0.015, 0.10), P["screen"], 0.003)
    for i, x in enumerate((-0.42, -0.28, 0.28, 0.42)):
        cyl(P, f"knob_{i}", (x, -D / 2 + 0.18, H + 0.30), 0.032, 0.05, P["steel"], axis="Y", bevel=0.004)
    # 4 burners
    for bx, bz in ((-0.30, 0.25), (0.30, 0.25), (-0.30, -0.25), (0.30, -0.25)):
        cyl(P, "burner", (bx, bz, H + 0.12), 0.16, 0.025, P["black"], axis="Z", bevel=0.004)
        torus(P, "coil", (bx, bz, H + 0.135), 0.11, 0.012, P["steel"])
    # oven door: window + red bar handle + drawer
    fy = D / 2
    box(P, "window", (0, fy + 0.005, 0.72), (0.78, 0.03, 0.44), P["glass"], 0.008)
    cyl(P, "handle", (0, fy + 0.10, 1.06), 0.024, W - 0.18, P["red"], axis="X", bevel=0.004)
    box(P, "drawer", (0, fy + 0.008, 0.28), (W - 0.10, 0.03, 0.22), P["body"], 0.008)
    feet(P, 0.47, 0.40)


def build_microwave(P):
    W, D, H = 1.05, 0.62, 0.58
    box(P, "cab", (0, 0, 0.70), (W, D, H), P["body"], 0.02)
    fy = D / 2
    # door with window on left 2/3
    box(P, "door", (-0.13, fy + 0.01, 0.70), (0.72, 0.04, H - 0.08), P["dark"], 0.01)
    box(P, "window", (-0.13, fy + 0.03, 0.70), (0.56, 0.015, H - 0.20), P["glass"], 0.004)
    cyl(P, "handle", (0.24, fy + 0.09, 0.70), 0.02, H - 0.12, P["red"], axis="Z", bevel=0.003)
    # control panel right strip
    box(P, "panel", (0.38, fy + 0.01, 0.70), (0.24, 0.04, H - 0.08), P["dark"], 0.008)
    box(P, "clock", (0.38, fy + 0.035, 0.86), (0.16, 0.012, 0.07), P["screen"], 0.002)
    for r in range(3):
        for c in range(2):
            box(P, f"key_{r}_{c}", (0.345 + c * 0.09, fy + 0.033, 0.74 - r * 0.08),
                (0.06, 0.012, 0.05), P["steel"], 0.002)
    cyl(P, "start", (0.38, fy + 0.035, 0.50), 0.035, 0.02, P["red_hot"], axis="Y", bevel=0.003)
    # top vents
    for i in range(4):
        box(P, f"vent_{i}", (-0.25 + i * 0.12, 0, 0.995), (0.06, D - 0.15, 0.012), P["dark"], 0.001)
    feet(P, 0.44, 0.22, h=0.05)


def build_water_heater(P):
    R, H = 0.55, 1.70
    cyl(P, "tank", (0, 0, H / 2 + 0.06), R, H, P["body"], axis="Z", vertices=48, bevel=0.015)
    # top heat-pump unit
    cyl(P, "hp", (0, 0, H + 0.22), 0.42, 0.34, P["dark"], axis="Z", vertices=48, bevel=0.012)
    for i in range(10):
        a = math.radians(i * 36)
        box(P, f"louver_{i}", (math.cos(a) * 0.425, math.sin(a) * 0.425, H + 0.22),
            (0.10, 0.015, 0.16), P["black"], 0.001)
    cyl(P, "led", (0, 0.40, H + 0.24), 0.025, 0.03, P["red_hot"], axis="Y", bevel=0.003)
    # pipes on top
    cyl(P, "pipe_hot", (-0.18, 0, H + 0.52), 0.045, 0.35, P["copper"], axis="Z", bevel=0.005)
    cyl(P, "pipe_cold", (0.18, 0, H + 0.52), 0.045, 0.35, P["steel"], axis="Z", bevel=0.005)
    # side TPR valve + discharge pipe (red handle)
    box(P, "tpr", (R - 0.02, 0.1, 1.35), (0.10, 0.08, 0.12), P["steel"], 0.006)
    cyl(P, "tpr_pipe", (R + 0.02, 0.1, 0.75), 0.028, 1.05, P["steel"], axis="Z", bevel=0.004)
    cyl(P, "tpr_red", (R - 0.02, 0.1, 1.44), 0.03, 0.06, P["red"], axis="Z", bevel=0.003)
    # front control + element covers
    box(P, "ui", (0, R - 0.01, 1.25), (0.30, 0.03, 0.20), P["dark"], 0.006)
    box(P, "ui_glass", (0, R + 0.005, 1.28), (0.22, 0.012, 0.10), P["screen"], 0.002)
    box(P, "elem_up", (0, R - 0.015, 0.95), (0.34, 0.025, 0.28), P["steel"], 0.006)
    box(P, "elem_lo", (0, R - 0.015, 0.45), (0.34, 0.025, 0.28), P["steel"], 0.006)
    cyl(P, "drain", (-0.35, 0.35, 0.22), 0.04, 0.18, P["copper"], axis="X", bevel=0.004)
    feet(P, 0.35, 0.35)


def build_hvac(P):
    W, D, H = 1.0, 0.75, 2.0
    box(P, "cab", (0, 0, H / 2 + 0.06), (W, D, H), P["body"], 0.02)
    fy = D / 2
    # top duct collar
    box(P, "collar", (0, 0, H + 0.16), (0.6, 0.45, 0.22), P["steel"], 0.01)
    # filter grille compartment with louvers
    box(P, "grille", (0, fy + 0.005, 1.62), (W - 0.12, 0.03, 0.55), P["dark"], 0.006)
    for i in range(5):
        box(P, f"fin_{i}", (0, fy + 0.02, 1.44 + i * 0.09), (W - 0.20, 0.02, 0.035), P["steel"], 0.002)
    box(P, "pulltab", (0.30, fy + 0.035, 1.50), (0.10, 0.03, 0.06), P["red"], 0.003)
    # blower door seam + red disconnect + spec badge
    box(P, "seam", (0, fy + 0.003, 1.02), (W - 0.10, 0.012, 0.02), P["dark"], 0.001)
    box(P, "disconnect", (0.32, fy + 0.03, 0.85), (0.12, 0.06, 0.16), P["red"], 0.005)
    box(P, "badge", (-0.30, fy + 0.01, 0.85), (0.20, 0.012, 0.12), P["steel"], 0.002)
    # copper line set + PVC drain on right side
    cyl(P, "suction", (W / 2 + 0.10, -0.1, 1.0), 0.045, 1.9, P["copper"], axis="Z", bevel=0.005)
    cyl(P, "liquid", (W / 2 + 0.20, -0.1, 1.0), 0.025, 1.9, P["copper"], axis="Z", bevel=0.004)
    cyl(P, "drain", (W / 2 + 0.10, 0.25, 0.35), 0.035, 0.9, P["white"], axis="X", bevel=0.004)
    box(P, "rail_L", (-0.35, 0, 0.03), (0.12, D, 0.06), P["dark"], 0.004)
    box(P, "rail_R", (0.35, 0, 0.03), (0.12, D, 0.06), P["dark"], 0.004)


def build_condenser(P):
    W, D, H = 1.15, 1.15, 0.95
    box(P, "chassis", (0, 0, H / 2 + 0.08), (W, D, H), P["body"], 0.025)
    # top fan recess + blades + grille rings
    cyl(P, "fanwell", (0, 0, H + 0.075), 0.44, 0.04, P["dark"], axis="Z", vertices=48, bevel=0.004)
    for i in range(3):
        a = math.radians(i * 120)
        blade = box(P, f"blade_{i}", (math.cos(a) * 0.20, math.sin(a) * 0.20, H + 0.09),
                    (0.34, 0.13, 0.015), P["steel"], 0.004)
        blade.rotation_euler = (0, 0, a)
    cyl(P, "hub", (0, 0, H + 0.10), 0.09, 0.06, P["red"], axis="Z", bevel=0.005)
    for r in (0.46, 0.34, 0.22):
        torus(P, f"grille_{r}", (0, 0, H + 0.12), r, 0.012, P["steel"], rot=(0, 0, 0))
    # front coil fins
    for i in range(6):
        box(P, f"coil_{i}", (0, D / 2 + 0.005, 0.30 + i * 0.10), (W - 0.24, 0.015, 0.045), P["dark"], 0.002)
    # service compartment + red valve caps
    box(P, "service", (0.38, D / 2 + 0.01, 0.42), (0.30, 0.05, 0.40), P["dark"], 0.008)
    cyl(P, "valve1", (0.32, D / 2 + 0.05, 0.35), 0.03, 0.06, P["red"], axis="Y", bevel=0.003)
    cyl(P, "valve2", (0.44, D / 2 + 0.05, 0.35), 0.03, 0.06, P["red"], axis="Y", bevel=0.003)
    box(P, "pan", (0, 0, 0.05), (W + 0.04, D + 0.04, 0.06), P["dark"], 0.008)
    feet(P, 0.45, 0.45, h=0.08, r=0.05)


def build_thermostat(P):
    # wall plate + round smart stat facing +Y
    box(P, "plate", (0, -0.03, 1.30), (0.70, 0.06, 1.00), P["white"], 0.015)
    cyl(P, "body", (0, 0.06, 1.30), 0.34, 0.12, P["white"], axis="Y", vertices=48, bevel=0.01)
    cyl(P, "face", (0, 0.125, 1.30), 0.29, 0.02, P["glass"], axis="Y", vertices=48, bevel=0.003)
    # red setpoint arc (partial torus tilted to face front)
    arc = torus(P, "arc", (0, 0.135, 1.30), 0.24, 0.018, P["red_hot"], rot=(math.radians(90), 0, 0))
    # temperature readout
    text_on_face(P, "72", (0, 0.14, 1.32), size=0.22, mat=P["red_hot"])
    cyl(P, "led", (0, 0.135, 1.02), 0.018, 0.02, P["red_hot"], axis="Y", bevel=0.002)


BUILDERS = {
    "fridge": build_fridge,
    "washer": lambda P: build_washer(P, dryer=False),
    "dryer": lambda P: build_washer(P, dryer=True),
    "dishwasher": build_dishwasher,
    "range": build_range,
    "microwave": build_microwave,
    "water-heater": build_water_heater,
    "hvac": build_hvac,
    "condenser": build_condenser,
    "thermostat": build_thermostat,
}

NAMES = ["condenser", "dishwasher", "dryer", "fridge", "hvac",
         "microwave", "range", "thermostat", "washer", "water-heater"]


# ---------------------------------------------------------------- stage
def track_to(ob, target):
    con = ob.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"


def stage_and_shoot(name):
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

    # dark studio world
    world = scene.world if scene.world else bpy.data.worlds.new("world")
    scene.world = world
    try:
        world.use_nodes = True
        bg = world.node_tree.nodes["Background"]
        bg.inputs["Color"].default_value = (0.012, 0.012, 0.014, 1.0)
        bg.inputs["Strength"].default_value = 1.0
    except Exception:
        pass

    # ground shadow catcher
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    ground = bpy.context.view_layer.objects.active
    ground.name = "ground"
    try:
        ground.is_shadow_catcher = True
    except Exception:
        pass
    gm = bpy.data.materials.new("ground_m")
    gm.use_nodes = True
    try:
        bsdf = gm.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.025, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.9
    except Exception:
        pass
    try:
        ground.data.materials.append(gm)
    except Exception:
        pass

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
    rim_obj.location = (-5.5, -3.5, 4.5)

    fill = bpy.data.lights.new("fill", type="AREA")
    fill.energy = 140.0
    fill.color = (0.62, 0.72, 1.0)
    fill.size = 6.0
    fill_obj = bpy.data.objects.new("fill", fill)
    scene.collection.objects.link(fill_obj)
    fill_obj.location = (5.0, 4.0, 1.5)

    tgt = bpy.data.objects.new("target", None)
    scene.collection.objects.link(tgt)
    tgt.location = (0, 0, 1.0 if name != "thermostat" else 1.3)
    track_to(rim_obj, tgt)
    track_to(fill_obj, tgt)

    cam_data = bpy.data.cameras.new(f"{name}_cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new(f"{name}_cam", cam_data)
    scene.collection.objects.link(cam)
    if name == "thermostat":
        cam.location = (1.6, 3.2, 1.9)
    else:
        cam.location = (3.0, 4.6, 2.8)
    track_to(cam, tgt)
    scene.camera = cam

    os.makedirs(OUT_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(OUT_DIR, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    if hasattr(bpy.ops.export_scene, "gltf"):
        try:
            bpy.ops.export_scene.gltf(
                filepath=os.path.join(OUT_DIR, f"{name}.glb"),
                export_format="GLB", use_selection=False,
                export_materials="EXPORT")
        except Exception as e:
            print("glTF export skipped:", e)
    print(f"DONE {name}")


def render_one(name):
    clear_scene()
    P = palette()
    BUILDERS[name](P)
    # normalize: keep on floor, already centered in X/Y by construction
    stage_and_shoot(name)


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["ALL"]
    names = list(NAMES) if (len(args) == 1 and args[0] == "ALL") else [a for a in args if a in NAMES] or list(NAMES)
    for n in names:
        render_one(n)


if __name__ == "__main__":
    main()
