import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/app_theme.dart';
import 'responsive_layout.dart';

class NpFleetItem {
  final String index;
  final String code;
  final String displayName;
  final String category;
  final String darkAsset;
  final String lightAsset;

  const NpFleetItem({
    required this.index,
    required this.code,
    required this.displayName,
    required this.category,
    required this.darkAsset,
    required this.lightAsset,
  });
}

class NpAssets {
  NpAssets._();

  static const logoDark = 'assets/images/nameplate-logo-transparent.png';
  static const logoLight = 'assets/images/nameplate-logo-light.png';

  // Branded Fleet Isometric Line Art (from website/fleet/iso.html)
  static const isoFridge = 'assets/images/iso/fridge.svg';
  static const isoRange = 'assets/images/iso/range.svg';
  static const isoWasher = 'assets/images/iso/washer.svg';
  static const isoDryer = 'assets/images/iso/dryer.svg';
  static const isoDishwasher = 'assets/images/iso/dishwasher.svg';
  static const isoMicrowave = 'assets/images/iso/microwave.svg';
  static const isoWaterHeater = 'assets/images/iso/water-heater.svg';
  static const isoHvac = 'assets/images/iso/hvac.svg';
  static const isoThermostat = 'assets/images/iso/thermostat.svg';
  static const isoCondenser = 'assets/images/iso/condenser.svg';

  // Light-mode variants
  static const isoLightFridge = 'assets/images/iso/light/fridge.svg';
  static const isoLightRange = 'assets/images/iso/light/range.svg';
  static const isoLightWasher = 'assets/images/iso/light/washer.svg';
  static const isoLightDryer = 'assets/images/iso/light/dryer.svg';
  static const isoLightDishwasher = 'assets/images/iso/light/dishwasher.svg';
  static const isoLightMicrowave = 'assets/images/iso/light/microwave.svg';
  static const isoLightWaterHeater = 'assets/images/iso/light/water-heater.svg';
  static const isoLightHvac = 'assets/images/iso/light/hvac.svg';
  static const isoLightThermostat = 'assets/images/iso/light/thermostat.svg';
  static const isoLightCondenser = 'assets/images/iso/light/condenser.svg';

  // Preserved schematic paths for backward compatibility
  static const schematicFridge = 'assets/images/schematics/fridge.png';
  static const schematicWasher = 'assets/images/schematics/washer.png';
  static const schematicDryer = 'assets/images/schematics/dryer.png';
  static const schematicHvac = 'assets/images/schematics/hvac.png';
  static const schematicMicrowave = 'assets/images/schematics/microwave.png';
  static const schematicDishwasher = 'assets/images/schematics/dishwasher.png';
  static const schematicThermostat = 'assets/images/schematics/thermostat.png';

  static const List<NpFleetItem> fleet = [
    NpFleetItem(
      index: '001',
      code: 'FRIDGE',
      displayName: 'French-Door Refrigerator',
      category: 'Refrigerator',
      darkAsset: isoFridge,
      lightAsset: isoLightFridge,
    ),
    NpFleetItem(
      index: '002',
      code: 'RANGE',
      displayName: 'Electric Range',
      category: 'Range',
      darkAsset: isoRange,
      lightAsset: isoLightRange,
    ),
    NpFleetItem(
      index: '003',
      code: 'WASHER',
      displayName: 'Front-Load Washer',
      category: 'Washer',
      darkAsset: isoWasher,
      lightAsset: isoLightWasher,
    ),
    NpFleetItem(
      index: '004',
      code: 'DRYER',
      displayName: 'Front-Load Dryer',
      category: 'Dryer',
      darkAsset: isoDryer,
      lightAsset: isoLightDryer,
    ),
    NpFleetItem(
      index: '005',
      code: 'DISHWASHER',
      displayName: 'Built-In Dishwasher',
      category: 'Dishwasher',
      darkAsset: isoDishwasher,
      lightAsset: isoLightDishwasher,
    ),
    NpFleetItem(
      index: '006',
      code: 'MICROWAVE',
      displayName: 'Over-The-Range Microwave',
      category: 'Microwave',
      darkAsset: isoMicrowave,
      lightAsset: isoLightMicrowave,
    ),
    NpFleetItem(
      index: '007',
      code: 'WATER HEATER',
      displayName: 'Heat Pump Water Heater',
      category: 'Water heater',
      darkAsset: isoWaterHeater,
      lightAsset: isoLightWaterHeater,
    ),
    NpFleetItem(
      index: '008',
      code: 'AIR HANDLER',
      displayName: 'Air Handler / HVAC',
      category: 'HVAC',
      darkAsset: isoHvac,
      lightAsset: isoLightHvac,
    ),
    NpFleetItem(
      index: '009',
      code: 'THERMOSTAT',
      displayName: 'Smart Thermostat',
      category: 'Thermostat',
      darkAsset: isoThermostat,
      lightAsset: isoLightThermostat,
    ),
    NpFleetItem(
      index: '010',
      code: 'CONDENSER',
      displayName: 'Outdoor Condenser',
      category: 'Condenser',
      darkAsset: isoCondenser,
      lightAsset: isoLightCondenser,
    ),
  ];

  static const propertyScottsdale = 'assets/images/properties/scottsdale_vista.jpg';
  static const propertyCamelback = 'assets/images/properties/camelback_vista.jpg';
  static const propertyRidge = 'assets/images/properties/sonoran_ridge.jpg';
  static const propertyDesert = 'assets/images/properties/desert_palm.jpg';

  static String propertyImageFor(String? propertyNameOrId) {
    if (propertyNameOrId == null) return propertyScottsdale;
    final key = propertyNameOrId.toLowerCase();
    if (key.contains('camelback') || key.contains('ct')) return propertyCamelback;
    if (key.contains('ridge') || key.contains('commons') || key.contains('dr') || key.contains('sonoran')) {
      return propertyRidge;
    }
    if (key.contains('palm') || key.contains('desert')) return propertyDesert;
    return propertyScottsdale;
  }

  /// Maps any category name or work-order title to the branded isometric SVG fleet asset.
  static String? svgFor(String? categoryOrTitle, {bool lightMode = false}) {
    if (categoryOrTitle == null) return null;
    final key = categoryOrTitle.toLowerCase();
    if (key.contains('fridge') || key.contains('refrigerator')) {
      return lightMode ? isoLightFridge : isoFridge;
    }
    if (key.contains('range') ||
        key.contains('stove') ||
        key.contains('oven') ||
        key.contains('cooktop')) {
      return lightMode ? isoLightRange : isoRange;
    }
    if (key.contains('washer') && !key.contains('dish')) {
      return lightMode ? isoLightWasher : isoWasher;
    }
    if (key.contains('dryer')) {
      return lightMode ? isoLightDryer : isoDryer;
    }
    if (key.contains('dishwasher') || key.contains('dish')) {
      return lightMode ? isoLightDishwasher : isoDishwasher;
    }
    if (key.contains('microwave')) {
      return lightMode ? isoLightMicrowave : isoMicrowave;
    }
    if (key.contains('water heater') ||
        key.contains('waterheater') ||
        key.contains('water-heater') ||
        key.contains('boiler')) {
      return lightMode ? isoLightWaterHeater : isoWaterHeater;
    }
    if (key.contains('condenser') ||
        key.contains('compressor') ||
        key.contains('outdoor')) {
      return lightMode ? isoLightCondenser : isoCondenser;
    }
    if (key.contains('thermostat') || key.contains('tstat')) {
      return lightMode ? isoLightThermostat : isoThermostat;
    }
    if (key.contains('hvac') ||
        key.contains('air handler') ||
        key.contains('handler') ||
        key.contains('furnace') ||
        key.contains('heat pump') ||
        key.contains('blower') ||
        key.contains('ac')) {
      return lightMode ? isoLightHvac : isoHvac;
    }
    return null;
  }

  static NpFleetItem? fleetItemFor(String? categoryOrTitle) {
    if (categoryOrTitle == null) return null;
    final svg = svgFor(categoryOrTitle, lightMode: false);
    if (svg == null) return null;
    for (final item in fleet) {
      if (item.darkAsset == svg) return item;
    }
    return null;
  }

  /// Backward-compatible schematic lookup; defaults to branded SVG fleet art.
  static String? schematicFor(String categoryOrTitle) {
    return svgFor(categoryOrTitle) ?? schematicFridge;
  }
}

/// 28px editorial dot grid — same overlay as website body::after / HQ shell.
class NpDotGrid extends StatelessWidget {
  const NpDotGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final dotColor = Theme.of(context).extension<NpPalette>()?.dotGrid ??
        const Color(0x06FFFFFF);
    return CustomPaint(
      painter: _DotGridPainter(dotColor),
      child: const SizedBox.expand(),
    );
  }
}

class _DotGridPainter extends CustomPainter {
  final Color color;
  const _DotGridPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const step = 28.0;
    for (double y = 0; y < size.height; y += step) {
      for (double x = 0; x < size.width; x += step) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DotGridPainter oldDelegate) =>
      color != oldDelegate.color;
}

class NpLogo extends StatelessWidget {
  final double height;
  const NpLogo({super.key, this.height = 36});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      Theme.of(context).brightness == Brightness.light
          ? NpAssets.logoLight
          : NpAssets.logoDark,
      height: height,
      filterQuality: FilterQuality.high,
    );
  }
}

/// Compact app bar with one clear title and an optional logo lockup.
class NpBrandAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool showLogo;

  const NpBrandAppBar({
    super.key,
    required this.title,
    this.actions,
    this.showLogo = false,
  });

  @override
  Size get preferredSize => Size.fromHeight(58);

  @override
  Widget build(BuildContext context) {
    final shouldShowLogo = showLogo && !context.isTablet;
    return AppBar(
      toolbarHeight: 57,
      titleSpacing: shouldShowLogo ? 8 : 16,
      title: Row(
        children: [
          if (shouldShowLogo) ...[
            NpLogo(height: 28),
            SizedBox(width: 10),
            Container(width: 1, height: 28, color: context.npColors.lineStrong),
            SizedBox(width: 10),
          ],
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: context.npColors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                height: 1.1,
              ),
            ),
          ),
        ],
      ),
      actions: actions,
      bottom: PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: context.npColors.lineStrong),
      ),
    );
  }
}

/// A quiet section heading used to organize controls without competing with
/// the page title.
class NpSectionLabel extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const NpSectionLabel(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: context.npColors.white,
              fontSize: 13,
              letterSpacing: -0.1,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}

class NpStatusPill extends StatelessWidget {
  final String label;
  final NpPillTone tone;

  const NpStatusPill({
    super.key,
    required this.label,
    this.tone = NpPillTone.neutral,
  });

  @override
  Widget build(BuildContext context) {
    final (fg, bg, border) = switch (tone) {
      NpPillTone.verified => (
        context.npColors.bg,
        context.npColors.white,
        Colors.transparent,
      ),
      NpPillTone.caution => (
        context.npDangerFg,
        context.npDangerBg,
        context.npDangerFg.withValues(alpha: 0.35),
      ),
      NpPillTone.fault => (
        NpColors.onSolid,
        context.npDangerFg,
        Colors.transparent,
      ),
      NpPillTone.neutral => (
        context.npColors.gray400,
        Colors.transparent,
        context.npColors.lineStrong,
      ),
    };

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border),
      ),
      child: Text(
        label.toUpperCase(),
        style: NpType.mono.copyWith(
          color: fg,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

enum NpPillTone { verified, caution, fault, neutral }

/// Renders the branded isometric line art from The Fleet (website/fleet/iso.html)
/// for any appliance category or work order title.
class NpApplianceArt extends StatelessWidget {
  final String? categoryOrTitle;
  final String? assetPath;
  final double? width;
  final double? height;
  final BoxFit fit;
  final AlignmentGeometry alignment;
  final bool? lightMode;
  final Widget? fallback;

  const NpApplianceArt({
    super.key,
    this.categoryOrTitle,
    this.assetPath,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.center,
    this.lightMode,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    final isLight =
        lightMode ?? (Theme.of(context).brightness == Brightness.light);
    final path =
        assetPath ?? NpAssets.svgFor(categoryOrTitle, lightMode: isLight);

    if (path == null) {
      return fallback ??
          SizedBox(
            width: width,
            height: height,
            child: Center(
              child: Icon(
                Icons.inventory_2_outlined,
                size: (height != null && height! < 32) ? 16 : 28,
                color: context.npColors.gray500,
              ),
            ),
          );
    }

    if (path.endsWith('.svg')) {
      return SvgPicture.asset(
        path,
        width: width,
        height: height,
        fit: fit,
        alignment: alignment,
      );
    }

    return Image.asset(
      path,
      width: width,
      height: height,
      fit: fit,
      alignment: alignment,
    );
  }
}

/// Hero block showcasing the branded isometric appliance line art
/// with dot grid ambient texture, radial crimson glow, and fleet telemetry.
class NpFleetHero extends StatelessWidget {
  final String categoryOrTitle;
  final double height;
  final String? statusLabel;
  final NpPillTone statusTone;
  final Widget? overlayTopRight;
  final Widget? overlayBottom;

  const NpFleetHero({
    super.key,
    required this.categoryOrTitle,
    this.height = 180,
    this.statusLabel,
    this.statusTone = NpPillTone.neutral,
    this.overlayTopRight,
    this.overlayBottom,
  });

  @override
  Widget build(BuildContext context) {
    final fleetItem = NpAssets.fleetItemFor(categoryOrTitle);

    return Container(
      height: height,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(
        color: Color(0xFF070709),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Subtle ambient dot grid
          const Opacity(
            opacity: 0.22,
            child: NpDotGrid(),
          ),
          // Radial red glow behind the appliance
          Center(
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    NpColors.red.withValues(alpha: 0.14),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Centered isometric art
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: NpApplianceArt(
                categoryOrTitle: categoryOrTitle,
                fit: BoxFit.contain,
                height: height * 0.78,
              ),
            ),
          ),
          // Fleet Index & Name (e.g. 001 // FRIDGE)
          if (fleetItem != null)
            Positioned(
              top: 12,
              left: 14,
              child: Text(
                '${fleetItem.index} // ${fleetItem.code}',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: context.npColors.white40,
                ),
              ),
            ),
          // Status Pill or custom widget overlaid top right
          if (overlayTopRight != null)
            Positioned(
              top: 10,
              right: 12,
              child: overlayTopRight!,
            )
          else if (statusLabel != null)
            Positioned(
              top: 10,
              right: 12,
              child: NpStatusPill(
                label: statusLabel!,
                tone: statusTone,
              ),
            ),
          // Bottom overlay or gradient scrim
          if (overlayBottom != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: overlayBottom!,
            )
          else
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 28,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      const Color(0xFF070709).withValues(alpha: 0.75),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Helper widget to render an asset photo, which can either be an SVG
/// (e.g. from the branded fleet art) or a raster image (PNG/JPEG).
class NpAssetPhoto extends StatelessWidget {
  final String path;
  final double? width;
  final double? height;
  final BoxFit fit;

  const NpAssetPhoto({
    super.key,
    required this.path,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    if (path.endsWith('.svg')) {
      return Container(
        width: width,
        height: height,
        color: const Color(0xFF0A0C10),
        padding: const EdgeInsets.all(4),
        child: SvgPicture.asset(
          path,
          fit: BoxFit.contain,
          width: width,
          height: height,
        ),
      );
    }
    return Image.asset(
      path,
      width: width,
      height: height,
      fit: fit,
    );
  }
}
