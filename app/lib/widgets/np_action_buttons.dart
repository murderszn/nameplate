import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

enum NpButtonVariant {
  primary, // Solid brand Red, White text/icon
  secondary, // Elevated dark charcoal, hairline border, White text
  outline, // Transparent bg, hairline border, White/Red text
  danger, // High-visibility Alert/Red tone
  success, // High-visibility Emerald/Green tone
  white, // Crisp high-contrast White bg, Black text
}

enum NpButtonSize {
  sm, // Height 34, font 11
  md, // Height 44, font 12
  lg, // Height 52, font 13
}

/// Industrial high-tactility button for the Nameplate field interface.
/// Pairs purposeful icon geometry with crisp mono typography and micro-interactions.
class NpButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onPressed;
  final NpButtonVariant variant;
  final NpButtonSize size;
  final bool isExpanded;
  final bool isLoading;
  final String? badge;

  const NpButton({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.variant = NpButtonVariant.primary,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  });

  const NpButton.primary({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.primary;

  const NpButton.secondary({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.secondary;

  const NpButton.outline({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.outline;

  const NpButton.danger({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.danger;

  const NpButton.success({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.success;

  const NpButton.white({
    super.key,
    required this.label,
    this.icon,
    this.leading,
    this.trailing,
    this.onPressed,
    this.size = NpButtonSize.md,
    this.isExpanded = false,
    this.isLoading = false,
    this.badge,
  }) : variant = NpButtonVariant.white;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || isLoading;

    final (bg, fg, border, iconBoxBg) = switch (variant) {
      NpButtonVariant.primary => (
        disabled ? NpColors.gray800 : NpColors.red,
        disabled ? NpColors.gray500 : NpColors.white,
        disabled ? NpColors.line : NpColors.redDeep,
        NpColors.white.withValues(alpha: 0.15),
      ),
      NpButtonVariant.secondary => (
        disabled ? NpColors.bgSubtle : NpColors.bgElevated,
        disabled ? NpColors.gray500 : NpColors.white,
        NpColors.lineStrong,
        NpColors.white08,
      ),
      NpButtonVariant.outline => (
        Colors.transparent,
        disabled ? NpColors.gray500 : NpColors.white,
        disabled ? NpColors.line : NpColors.lineStrong,
        Colors.transparent,
      ),
      NpButtonVariant.danger => (
        disabled ? NpColors.bgSubtle : NpColors.redSubtle,
        disabled ? NpColors.gray500 : NpColors.red,
        disabled ? NpColors.line : NpColors.redBorder,
        NpColors.red.withValues(alpha: 0.15),
      ),
      NpButtonVariant.success => (
        disabled ? NpColors.bgSubtle : const Color(0xFF0D2818),
        disabled ? NpColors.gray500 : const Color(0xFF22C55E),
        disabled ? NpColors.line : const Color(0x6622C55E),
        const Color(0x3322C55E),
      ),
      NpButtonVariant.white => (
        disabled ? NpColors.gray800 : NpColors.white,
        disabled ? NpColors.gray500 : NpColors.bg,
        disabled ? NpColors.line : NpColors.white,
        NpColors.bg.withValues(alpha: 0.12),
      ),
    };

    final (height, iconSize, fontSize, horizontalPad, iconGap) =
        switch (size) {
      NpButtonSize.sm => (34.0, 14.0, 11.0, 12.0, 6.0),
      NpButtonSize.md => (44.0, 18.0, 12.0, 16.0, 8.0),
      NpButtonSize.lg => (52.0, 20.0, 13.0, 20.0, 10.0),
    };

    final content = Row(
      mainAxisSize: isExpanded ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading)
          SizedBox(
            width: iconSize,
            height: iconSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(fg),
            ),
          )
        else if (leading != null)
          Padding(
            padding: EdgeInsets.only(right: iconGap),
            child: leading!,
          )
        else if (icon != null)
          Container(
            padding: const EdgeInsets.all(4),
            margin: EdgeInsets.only(right: iconGap),
            decoration: BoxDecoration(
              color: iconBoxBg,
              borderRadius: BorderRadius.circular(2),
            ),
            child: Icon(icon, size: iconSize, color: fg),
          ),
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: NpType.mono.copyWith(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              color: fg,
              letterSpacing: 0.8,
            ),
          ),
        ),
        if (badge != null) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: iconBoxBg,
              borderRadius: BorderRadius.circular(2),
            ),
            child: Text(
              badge!,
              style: NpType.mono.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: fg,
              ),
            ),
          ),
        ],
        if (trailing != null) ...[
          const SizedBox(width: 8),
          trailing!,
        ],
      ],
    );

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: disabled
          ? null
          : () {
              HapticFeedback.lightImpact();
              onPressed?.call();
            },
      child: Container(
        height: height,
        padding: EdgeInsets.symmetric(horizontal: horizontalPad),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: border, width: 1),
        ),
        child: isExpanded ? Center(child: content) : content,
      ),
    );
  }
}

/// Compact square icon action button for toolbars and quick controls.
class NpIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final bool active;
  final bool isDestructive;
  final double size;
  final double iconSize;

  const NpIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.active = false,
    this.isDestructive = false,
    this.size = 40,
    this.iconSize = 18,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;

    final bg = active
        ? NpColors.red
        : (isDestructive ? NpColors.redSubtle : NpColors.bgElevated);
    final fg = disabled
        ? NpColors.gray500
        : (active
            ? NpColors.white
            : (isDestructive ? NpColors.red : NpColors.white));
    final border = active
        ? NpColors.red
        : (isDestructive ? NpColors.redBorder : NpColors.lineStrong);

    final button = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: disabled
          ? null
          : () {
              HapticFeedback.selectionClick();
              onPressed?.call();
            },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: border),
        ),
        child: Center(
          child: Icon(icon, size: iconSize, color: fg),
        ),
      ),
    );

    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: button);
    }
    return button;
  }
}

/// Rich interactive action tile with icon container badge, title, subtitle,
/// and trailing indicator or action chevron.
class NpActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final String? kicker;
  final VoidCallback? onTap;
  final bool isSelected;
  final bool isDestructive;
  final Widget? trailing;
  final Color? accentColor;

  const NpActionTile({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.kicker,
    this.onTap,
    this.isSelected = false,
    this.isDestructive = false,
    this.trailing,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveAccent =
        accentColor ?? (isDestructive ? NpColors.red : NpColors.red);
    final bg = isSelected
        ? effectiveAccent.withValues(alpha: 0.12)
        : NpColors.bgElevated;
    final border = isSelected
        ? effectiveAccent
        : (isDestructive ? NpColors.redBorder : NpColors.lineStrong);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: border, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isSelected
                    ? effectiveAccent
                    : NpColors.bgCard,
                borderRadius: BorderRadius.circular(2),
                border: Border.all(
                  color: isSelected
                      ? effectiveAccent
                      : NpColors.lineStrong,
                ),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? NpColors.white : effectiveAccent,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (kicker != null) ...[
                    Text(
                      kicker!.toUpperCase(),
                      style: NpType.mono.copyWith(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: effectiveAccent,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                  ],
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: NpColors.white,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: NpColors.gray400,
                        height: 1.25,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: 10),
              trailing!,
            ] else if (onTap != null) ...[
              const SizedBox(width: 10),
              const Icon(
                Icons.arrow_forward_ios,
                size: 13,
                color: NpColors.gray500,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Industrial tag / chip with icon, active state, and sharp styling.
class NpIconChip extends StatelessWidget {
  final IconData? icon;
  final String label;
  final bool isSelected;
  final VoidCallback? onTap;
  final Color? activeColor;
  final Color? activeBg;

  const NpIconChip({
    super.key,
    this.icon,
    required this.label,
    this.isSelected = false,
    this.onTap,
    this.activeColor,
    this.activeBg,
  });

  @override
  Widget build(BuildContext context) {
    final fg = isSelected
        ? (activeColor ?? NpColors.white)
        : NpColors.gray400;
    final bg = isSelected
        ? (activeBg ?? NpColors.red)
        : NpColors.bgElevated;
    final border = isSelected
        ? (activeColor ?? NpColors.red)
        : NpColors.lineStrong;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap != null
          ? () {
              HapticFeedback.selectionClick();
              onTap!();
            }
          : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: fg),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
