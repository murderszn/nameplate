import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

enum NpButtonVariant {
  primary, // Light: solid black. Dark: solid brand red. White text/icon.
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
        disabled ? context.npColors.gray800 : context.npSolid,
        disabled ? context.npColors.gray500 : NpColors.onSolid,
        disabled ? context.npColors.line : context.npSolid,
        NpColors.onSolid.withValues(alpha: 0.15),
      ),
      NpButtonVariant.secondary => (
        disabled ? context.npColors.bgSubtle : context.npColors.bgElevated,
        disabled ? context.npColors.gray500 : context.npColors.white,
        context.npColors.lineStrong,
        context.npColors.white08,
      ),
      NpButtonVariant.outline => (
        Colors.transparent,
        disabled ? context.npColors.gray500 : context.npColors.white,
        disabled ? context.npColors.line : context.npColors.lineStrong,
        Colors.transparent,
      ),
      NpButtonVariant.danger => (
        disabled ? context.npColors.bgSubtle : NpColors.redSubtle,
        disabled ? context.npColors.gray500 : NpColors.red,
        disabled ? context.npColors.line : NpColors.redBorder,
        NpColors.red.withValues(alpha: 0.15),
      ),
      NpButtonVariant.success => (
        disabled ? context.npColors.bgSubtle : context.npSuccessBg,
        disabled ? context.npColors.gray500 : context.npSuccessFg,
        disabled ? context.npColors.line : context.npSuccessFg.withValues(alpha: 0.4),
        context.npSuccessFg.withValues(alpha: 0.2),
      ),
      NpButtonVariant.white => (
        disabled ? context.npColors.gray800 : context.npColors.white,
        disabled ? context.npColors.gray500 : context.npColors.bg,
        disabled ? context.npColors.line : context.npColors.white,
        context.npColors.bg.withValues(alpha: 0.12),
      ),
    };

    final (height, iconSize, fontSize, horizontalPad, iconGap) = switch (size) {
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
            padding: EdgeInsets.all(4),
            margin: EdgeInsets.only(right: iconGap),
            decoration: BoxDecoration(
              color: iconBoxBg,
              borderRadius: BorderRadius.circular(8),
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
          SizedBox(width: 8),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: iconBoxBg,
              borderRadius: BorderRadius.circular(6),
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
        if (trailing != null) ...[SizedBox(width: 8), trailing!],
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
          borderRadius: BorderRadius.circular(10),
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
        ? context.npSolid
        : (isDestructive ? context.npDangerBg : context.npColors.bgElevated);
    final fg = disabled
        ? context.npColors.gray500
        : (active
              ? NpColors.onSolid
              : (isDestructive ? context.npDangerFg : context.npColors.white));
    final border = active
        ? context.npSolid
        : (isDestructive
              ? context.npDangerFg.withValues(alpha: 0.4)
              : context.npColors.lineStrong);

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
          borderRadius: BorderRadius.circular(10),
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

/// Interactive action tile with an icon, title, optional detail, and action.
class NpActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
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
        : context.npColors.bgElevated;
    final border = isSelected
        ? effectiveAccent
        : (isDestructive ? NpColors.redBorder : context.npColors.lineStrong);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap != null
          ? () {
              HapticFeedback.lightImpact();
              onTap!();
            }
          : null,
      child: Container(
        padding: EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isSelected ? effectiveAccent : context.npColors.bgCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected
                      ? effectiveAccent
                      : context.npColors.lineStrong,
                ),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? NpColors.onSolid : effectiveAccent,
              ),
            ),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: context.npColors.white,
                    ),
                  ),
                  if (subtitle != null) ...[
                    SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 12,
                        color: context.npColors.gray400,
                        height: 1.25,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[
              SizedBox(width: 10),
              trailing!,
            ] else if (onTap != null) ...[
              SizedBox(width: 10),
              Icon(
                Icons.arrow_forward_ios,
                size: 13,
                color: context.npColors.gray500,
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
        ? (activeColor ?? NpColors.onSolid)
        : context.npColors.gray400;
    final bg = isSelected
        ? (activeBg ?? context.npSolid)
        : context.npColors.bgElevated;
    final border = isSelected
        ? (activeColor ?? context.npSolid)
        : context.npColors.lineStrong;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap != null
          ? () {
              HapticFeedback.selectionClick();
              onTap!();
            }
          : null,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: fg),
              SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: fg,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Item definition for [NpMenuButton].
class NpMenuItem<T> {
  final T value;
  final String label;
  final IconData? icon;
  final bool isDestructive;

  const NpMenuItem({
    required this.value,
    required this.label,
    this.icon,
    this.isDestructive = false,
  });
}

/// Tactile industrial context menu button with structured dropdown items.
class NpMenuButton<T> extends StatelessWidget {
  final List<NpMenuItem<T>> items;
  final ValueChanged<T> onSelected;
  final IconData icon;
  final double size;
  final String? tooltip;

  const NpMenuButton({
    super.key,
    required this.items,
    required this.onSelected,
    this.icon = Icons.more_vert,
    this.size = 38,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<T>(
      tooltip: tooltip ?? 'Options',
      color: context.npColors.bgElevated,
      elevation: 8,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: context.npColors.lineStrong),
      ),
      onSelected: (val) {
        HapticFeedback.selectionClick();
        onSelected(val);
      },
      itemBuilder: (BuildContext context) {
        return items.map((item) {
          final color = item.isDestructive ? NpColors.red : context.npColors.white;
          return PopupMenuItem<T>(
            value: item.value,
            height: 40,
            child: Row(
              children: [
                if (item.icon != null) ...[
                  Icon(item.icon, size: 16, color: color),
                  SizedBox(width: 10),
                ],
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList();
      },
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: context.npColors.bgElevated,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: context.npColors.lineStrong),
        ),
        child: Center(
          child: Icon(icon, size: 18, color: context.npColors.gray400),
        ),
      ),
    );
  }
}

