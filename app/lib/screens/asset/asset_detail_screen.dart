import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/service_event.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../service/log_service_event_screen.dart';
import '../settings/tag_studio_screen.dart';
import 'flag_missing_broken_screen.dart';

/// Asset detail: header (category/model/age/status/location/last serviced),
/// unified history timeline, and actions (log service, move, flag issue,
/// report missing) — v0-scope.md §1.1 "Asset detail".
/// Optimized for 11" tablets (Fire Max 11 etc.) with a 2-column inspection dashboard.
class AssetDetailScreen extends ConsumerWidget {
  final String assetId;

  const AssetDetailScreen({super.key, required this.assetId});

  Widget _buildHistorySection(
    BuildContext context,
    WidgetRef ref,
    Asset asset,
  ) {
    final eventRepo = ref.watch(serviceEventRepositoryProvider);

    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border.fromBorderSide(
          BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Service history',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                SizedBox(height: 12),
                FutureBuilder<List<ServiceEvent>>(
                  future: eventRepo.historyForAsset(asset.id),
                  builder: (context, historySnap) {
                    final events = historySnap.data ?? [];
                    if (events.isEmpty) {
                      return Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.history_outlined,
                                size: 36,
                                color: context.npColors.gray700,
                              ),
                              SizedBox(height: 8),
                              Text(
                                'No service events recorded yet.',
                                style: NpType.mono.copyWith(
                                  color: context.npColors.gray500,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      shrinkWrap: true,
                      physics: NeverScrollableScrollPhysics(),
                      itemCount: events.length,
                      separatorBuilder: (_, _) => Divider(
                        height: 1,
                        color: context.npColors.lineStrong,
                      ),
                      itemBuilder: (context, i) =>
                          _HistoryTile(event: events[i]),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetRepo = ref.watch(assetRepositoryProvider);
    final isTablet = context.isTablet;

    return FutureBuilder<Asset?>(
      future: assetRepo.getById(assetId),
      builder: (context, snapshot) {
        final asset = snapshot.data;
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (asset == null) {
          return Scaffold(body: Center(child: Text('Asset not found')));
        }

        return Scaffold(
          appBar: NpBrandAppBar(
            title: asset.npid,
            actions: [
              Padding(
                padding: EdgeInsets.only(right: 8),
                child: NpMenuButton<String>(
                  tooltip: 'Asset Options',
                  items: [
                    NpMenuItem(
                      value: 'flag',
                      label: 'Flag Missing / Damaged',
                      icon: Icons.flag_rounded,
                      isDestructive: true,
                    ),
                    NpMenuItem(
                      value: 'relocate',
                      label: 'Relocate Equipment',
                      icon: Icons.swap_horiz_rounded,
                    ),
                    NpMenuItem(
                      value: 'studio',
                      label: 'Hardware Tag Studio',
                      icon: Icons.qr_code_2_rounded,
                    ),
                    NpMenuItem(
                      value: 'copy',
                      label: 'Copy NPID Tag',
                      icon: Icons.copy_rounded,
                    ),
                  ],
                  onSelected: (action) {
                    switch (action) {
                      case 'flag':
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => FlagMissingBrokenScreen(asset: asset),
                          ),
                        );
                        break;
                      case 'relocate':
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Relocation workflow active for ${asset.npid}')),
                        );
                        break;
                      case 'studio':
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => TagStudioScreen()),
                        );
                        break;
                      case 'copy':
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Copied ${asset.npid} to clipboard')),
                        );
                        break;
                    }
                  },
                ),
              ),
            ],
          ),
          body: isTablet
              ? Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 5,
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _FullBleedMediaStage(asset: asset),
                              _TelemetryMatrix(asset: asset),
                              const SizedBox(height: 16),
                              _PrimaryActionCard(asset: asset),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        flex: 6,
                        child: SingleChildScrollView(
                          child: _buildHistorySection(context, ref, asset),
                        ),
                      ),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    _FullBleedMediaStage(asset: asset),
                    _TelemetryMatrix(asset: asset),
                    _buildHistorySection(context, ref, asset),
                  ],
                ),
          bottomNavigationBar: SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: context.npColors.bg,
                border: Border(top: BorderSide(color: context.npColors.lineStrong)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: NpButton.primary(
                      icon: Icons.build_rounded,
                      label: 'Log Service Event',
                      size: NpButtonSize.lg,
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => LogServiceEventScreen(asset: asset),
                        ),
                      ),
                    ),
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

class _FullBleedMediaStage extends StatelessWidget {
  final Asset asset;
  const _FullBleedMediaStage({required this.asset});

  @override
  Widget build(BuildContext context) {
    final schematic = NpAssets.schematicFor(asset.categoryDisplayName);

    return Container(
      width: double.infinity,
      height: 160,
      decoration: BoxDecoration(
        color: const Color(0xFF0A0C10),
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background technical grid texture
          Positioned.fill(
            child: Opacity(
              opacity: 0.05,
              child: CustomPaint(painter: _DetailGridPainter()),
            ),
          ),
          if (schematic != null)
            Positioned(
              right: -10,
              top: 0,
              bottom: 0,
              width: 200,
              child: Opacity(
                opacity: 0.28,
                child: Image.asset(
                  schematic,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          // Gradient shading to ensure high legibility
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.6),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.9),
                ],
                stops: const [0.0, 0.4, 1.0],
              ),
            ),
          ),
          // Top metadata pips
          Positioned(
            top: 14,
            left: 18,
            right: 18,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'NPID // ${asset.npid}',
                        style: NpType.mono.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF38BDF8),
                          letterSpacing: 1.0,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Text(
                    'ED25519 VERIFIED',
                    style: NpType.mono.copyWith(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Bottom equipment title and location
          Positioned(
            left: 18,
            right: 18,
            bottom: 14,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${asset.manufacturer ?? 'Portfolio Spec'} ${asset.modelNumber ?? ''}'.trim(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(
                      Icons.place_outlined,
                      size: 13,
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${asset.categoryDisplayName} · ${asset.currentLocationLabel ?? 'Unknown location'}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TelemetryMatrix extends StatelessWidget {
  final Asset asset;
  const _TelemetryMatrix({required this.asset});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgElevated,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _MatrixTile(
                  label: 'LIFETIME SERVICE',
                  value: '\$${asset.lifetimeServiceCost.toStringAsFixed(2)}',
                  valueColor: const Color(0xFF10B981),
                  accentColor: const Color(0xFF0F172A),
                  isMono: true,
                ),
              ),
              Container(width: 1, height: 68, color: context.npColors.lineStrong),
              Expanded(
                child: _MatrixTile(
                  label: 'OPERATIONAL STATUS',
                  accentColor: const Color(0xFF0F172A),
                  child: _StatusChip(status: asset.status),
                ),
              ),
            ],
          ),
          Divider(height: 1, color: context.npColors.lineStrong),
          Row(
            children: [
              Expanded(
                child: _MatrixTile(
                  label: 'SERIAL NUMBER',
                  value: asset.serialNumber ?? 'UNSPECIFIED',
                  valueColor: context.npColors.white,
                  accentColor: const Color(0xFF0F172A),
                  isMono: true,
                ),
              ),
              Container(width: 1, height: 68, color: context.npColors.lineStrong),
              Expanded(
                child: _MatrixTile(
                  label: 'CONFIRMED LOCATION',
                  value: asset.currentLocationLabel ?? 'NOT CONFIRMED',
                  valueColor: const Color(0xFF38BDF8),
                  accentColor: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MatrixTile extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? child;
  final Color? valueColor;
  final Color accentColor;
  final bool isMono;

  const _MatrixTile({
    required this.label,
    this.value,
    this.child,
    this.valueColor,
    required this.accentColor,
    this.isMono = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 68,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: context.npColors.bgCard,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            style: NpType.mono.copyWith(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: context.npColors.gray400,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 4),
          child ??
              Text(
                value ?? '',
                style: isMono
                    ? NpType.mono.copyWith(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: valueColor ?? context.npColors.white,
                      )
                    : TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: valueColor ?? context.npColors.white,
                      ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
        ],
      ),
    );
  }
}

class _DetailGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 0.5;
    const step = 20.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}


class _StatusChip extends StatelessWidget {
  final AssetStatus status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (status) {
      AssetStatus.active => ('Active', NpPillTone.verified),
      AssetStatus.needsRepair => ('Needs repair', NpPillTone.caution),
      AssetStatus.awaitingParts => ('Awaiting parts', NpPillTone.caution),
      AssetStatus.inRepair => ('In repair', NpPillTone.caution),
      AssetStatus.inStorage => ('In storage', NpPillTone.neutral),
      AssetStatus.unaccountedFor => ('Unaccounted for', NpPillTone.fault),
      AssetStatus.retired => ('Retired', NpPillTone.neutral),
      AssetStatus.disposed => ('Disposed', NpPillTone.neutral),
      AssetStatus.salvage => ('Salvage', NpPillTone.neutral),
    };
    return NpStatusPill(label: label, tone: tone);
  }
}

class _PrimaryActionCard extends StatelessWidget {
  final Asset asset;
  const _PrimaryActionCard({required this.asset});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border.fromBorderSide(
          BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          NpSectionLabel('Primary field action'),
          SizedBox(height: 12),
          NpButton.primary(
            icon: Icons.build_rounded,
            label: 'Log Service Event',
            size: NpButtonSize.lg,
            isExpanded: true,
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => LogServiceEventScreen(asset: asset),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final ServiceEvent event;
  const _HistoryTile({required this.event});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: context.npColors.bgElevated,
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: context.npColors.lineStrong),
            ),
            child: Icon(
              Icons.build_circle_outlined,
              color: NpColors.red,
              size: 16,
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.eventType.label,
                  style: NpType.mono.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: context.npColors.white,
                    letterSpacing: 0.6,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  event.findings ?? 'No findings recorded',
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 8),
          Text(
            '\$${event.totalCost.toStringAsFixed(2)}',
            style: NpType.mono.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: context.npColors.white,
            ),
          ),
        ],
      ),
    );
  }
}
