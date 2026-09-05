import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'responsive_layout.dart';

class NpAssets {
  NpAssets._();

  static const logoDark = 'assets/images/nameplate-logo-transparent.png';
  static const logoLight = 'assets/images/nameplate-logo-light.png';

  static const schematicFridge = 'assets/images/schematics/fridge.png';
  static const schematicWasher = 'assets/images/schematics/washer.png';
  static const schematicDryer = 'assets/images/schematics/dryer.png';
  static const schematicHvac = 'assets/images/schematics/hvac.png';
  static const schematicMicrowave = 'assets/images/schematics/microwave.png';
  static const schematicDishwasher = 'assets/images/schematics/dishwasher.png';
  static const schematicThermostat = 'assets/images/schematics/thermostat.png';

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

  static String? schematicFor(String categoryOrTitle) {
    final key = categoryOrTitle.toLowerCase();
    if (key.contains('fridge') || key.contains('refrigerator')) {
      return schematicFridge;
    }
    if (key.contains('washer') && !key.contains('dish')) return schematicWasher;
    if (key.contains('dryer')) return schematicDryer;
    if (key.contains('hvac') ||
        key.contains('air handler') ||
        key.contains('water heater')) {
      return schematicHvac;
    }
    if (key.contains('microwave')) return schematicMicrowave;
    if (key.contains('dishwasher')) return schematicDishwasher;
    if (key.contains('thermostat')) return schematicThermostat;
    return null;
  }
}

/// 28px editorial dot grid — same overlay as website body::after / HQ shell.
class NpDotGrid extends StatelessWidget {
  const NpDotGrid({super.key});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DotGridPainter(context.npColors.dotGrid),
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
        borderRadius: BorderRadius.circular(2),
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
