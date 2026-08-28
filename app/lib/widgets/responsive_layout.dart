import 'package:flutter/material.dart';

/// Screen width breakpoints for tablet / field devices
class NpBreakpoints {
  NpBreakpoints._();

  /// Tablet portrait minimum logical width (e.g. Fire 7/8/11 portrait)
  static const double tablet = 640.0;

  /// Tablet landscape / 11-inch Fire Max 11 wide breakpoint
  static const double tabletWide = 840.0;

  /// Standard max width for single-column form centering on large displays
  static const double maxContentWidth = 720.0;
}

/// Helper methods to check current screen form factor
extension ResponsiveContext on BuildContext {
  double get screenWidth => MediaQuery.of(this).size.width;
  double get screenHeight => MediaQuery.of(this).size.height;

  bool get isTablet => screenWidth >= NpBreakpoints.tablet;
  bool get isTabletWide => screenWidth >= NpBreakpoints.tabletWide;
  bool get isLandscape => screenWidth > screenHeight;
}

/// A container that constrains content to a readable maximum width and centers it
class ResponsiveContainer extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsetsGeometry padding;

  const ResponsiveContainer({
    super.key,
    required this.child,
    this.maxWidth = NpBreakpoints.maxContentWidth,
    this.padding = const EdgeInsets.all(20),
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

/// Renders two columns side-by-side on wide/tablet screens, and stacked vertically on phone screens
class ResponsiveTwoColumn extends StatelessWidget {
  final Widget left;
  final Widget right;
  final int leftFlex;
  final int rightFlex;
  final double spacing;
  final double breakpoint;
  final CrossAxisAlignment crossAxisAlignment;

  const ResponsiveTwoColumn({
    super.key,
    required this.left,
    required this.right,
    this.leftFlex = 1,
    this.rightFlex = 1,
    this.spacing = 20,
    this.breakpoint = NpBreakpoints.tablet,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= breakpoint;

    if (!isWide) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          left,
          SizedBox(height: spacing),
          right,
        ],
      );
    }

    return Row(
      crossAxisAlignment: crossAxisAlignment,
      children: [
        Expanded(flex: leftFlex, child: left),
        SizedBox(width: spacing),
        Expanded(flex: rightFlex, child: right),
      ],
    );
  }
}
