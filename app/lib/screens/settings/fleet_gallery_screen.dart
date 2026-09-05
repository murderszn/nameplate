import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';

/// The Fleet — Isometric Line Art Gallery
///
/// Direct Flutter counterpart of `website/fleet/iso.html`.
/// Showcases the 10 branded isometric appliances with high-contrast
/// line-art styling, monospace index badges, and signature Nameplate red accents.
class FleetGalleryScreen extends StatelessWidget {
  const FleetGalleryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final columns = context.isTablet ? 5 : 2;

    return Scaffold(
      appBar: NpBrandAppBar(
        title: 'The Fleet',
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: NpColors.red.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: NpColors.redBorder),
                ),
                child: Text(
                  '10 UNITS // LINE ART',
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: NpColors.red,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Background ambient 28px dot grid
          const Positioned.fill(
            child: Opacity(
              opacity: 0.2,
              child: NpDotGrid(),
            ),
          ),
          // Radial red ambient glow from top
          Positioned(
            top: -100,
            left: 0,
            right: 0,
            height: 300,
            child: Center(
              child: Container(
                width: 600,
                height: 300,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      NpColors.red.withValues(alpha: 0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),
          GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.9,
            ),
            itemCount: NpAssets.fleet.length,
            itemBuilder: (context, index) {
              final item = NpAssets.fleet[index];
              return _FleetCell(
                item: item,
                onTap: () => _showApplianceDetail(context, item),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showApplianceDetail(BuildContext context, NpFleetItem item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF090A0D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.85,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: context.npColors.lineStrong,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Text(
                      '${item.index} // ${item.code}',
                      style: NpType.mono.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        color: NpColors.red,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: NpColors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.displayName,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 200,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFF050507),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: context.npColors.lineStrong),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Opacity(
                        opacity: 0.25,
                        child: NpDotGrid(),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: NpApplianceArt(
                          assetPath: item.darkAsset,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'STANDARD CATEGORY',
                            style: NpType.mono.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: context.npColors.gray400,
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.category,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'VECTOR ASSET PATH',
                            style: NpType.mono.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: context.npColors.gray400,
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.darkAsset,
                            style: NpType.mono.copyWith(
                              fontSize: 11,
                              color: context.npColors.gray300,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
}

class _FleetCell extends StatefulWidget {
  final NpFleetItem item;
  final VoidCallback onTap;

  const _FleetCell({
    required this.item,
    required this.onTap,
  });

  @override
  State<_FleetCell> createState() => _FleetCellState();
}

class _FleetCellState extends State<_FleetCell> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(6),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
            decoration: BoxDecoration(
              color: _hovered
                  ? NpColors.red.withValues(alpha: 0.08)
                  : const Color(0xFF0A0C10),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: _hovered
                    ? NpColors.red.withValues(alpha: 0.6)
                    : context.npColors.lineStrong,
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.item.index,
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: context.npColors.white40,
                      ),
                    ),
                    AnimatedOpacity(
                      duration: const Duration(milliseconds: 200),
                      opacity: _hovered ? 1.0 : 0.4,
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: NpColors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ],
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: NpApplianceArt(
                      assetPath: widget.item.darkAsset,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
                Text(
                  widget.item.code,
                  textAlign: TextAlign.center,
                  style: NpType.mono.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.8,
                    color: _hovered ? Colors.white : context.npColors.white70,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
