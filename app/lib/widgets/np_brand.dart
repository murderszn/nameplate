import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class NpAssets {
  NpAssets._();

  static const logo = 'assets/images/nameplate-logo-transparent.png';

  static const schematicFridge = 'assets/images/schematics/fridge.png';
  static const schematicWasher = 'assets/images/schematics/washer.png';
  static const schematicDryer = 'assets/images/schematics/dryer.png';
  static const schematicHvac = 'assets/images/schematics/hvac.png';
  static const schematicMicrowave = 'assets/images/schematics/microwave.png';
  static const schematicDishwasher = 'assets/images/schematics/dishwasher.png';
  static const schematicThermostat = 'assets/images/schematics/thermostat.png';

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
    return const CustomPaint(
      painter: _DotGridPainter(),
      child: SizedBox.expand(),
    );
  }
}

class _DotGridPainter extends CustomPainter {
  const _DotGridPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0x06FFFFFF);
    const step = 28.0;
    for (double y = 0; y < size.height; y += step) {
      for (double x = 0; x < size.width; x += step) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Editorial kicker: red left-bar rule + mono all-caps label.
class NpKicker extends StatelessWidget {
  final String text;
  const NpKicker(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 3,
          height: 14,
          decoration: const BoxDecoration(
            color: NpColors.red,
            borderRadius: BorderRadius.all(Radius.circular(1)),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          text.toUpperCase(),
          style: NpType.mono.copyWith(
            color: NpColors.red,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.6,
          ),
        ),
      ],
    );
  }
}

class NpLogo extends StatelessWidget {
  final double height;
  const NpLogo({super.key, this.height = 36});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      NpAssets.logo,
      height: height,
      filterQuality: FilterQuality.high,
    );
  }
}

/// App bar matching HQ topbar: kicker + display title, optional logo lockup.
class NpBrandAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String kicker;
  final String title;
  final List<Widget>? actions;
  final bool showLogo;

  const NpBrandAppBar({
    super.key,
    required this.kicker,
    required this.title,
    this.actions,
    this.showLogo = false,
  });

  @override
  Size get preferredSize => const Size.fromHeight(72);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: 71,
      titleSpacing: showLogo ? 8 : 16,
      title: Row(
        children: [
          if (showLogo) ...[
            const NpLogo(height: 32),
            const SizedBox(width: 12),
            Container(width: 1, height: 32, color: NpColors.lineStrong),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                NpKicker(kicker),
                const SizedBox(height: 3),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: NpColors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: actions,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: NpColors.lineStrong),
      ),
    );
  }
}

/// Section label with a red left-bar rule — use inside scrollable content.
class NpSectionLabel extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const NpSectionLabel(this.text, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 3, height: 14, color: NpColors.red),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text.toUpperCase(),
            style: NpType.mono.copyWith(
              color: NpColors.gray400,
              fontSize: 11,
              letterSpacing: 1.4,
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
      NpPillTone.verified => (NpColors.bg, NpColors.white, Colors.transparent),
      NpPillTone.caution => (
        NpColors.red,
        NpColors.redSubtle,
        NpColors.redBorder,
      ),
      NpPillTone.fault => (NpColors.white, NpColors.red, Colors.transparent),
      NpPillTone.neutral => (
        NpColors.gray400,
        Colors.transparent,
        NpColors.lineStrong,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
