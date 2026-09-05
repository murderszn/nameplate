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
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.npColors.lineStrong),
      ),
      clipBehavior: Clip.antiAlias,
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
                              _Header(asset: asset),
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
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  children: [
                    _Header(asset: asset),
                    const SizedBox(height: 20),
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

class _Header extends StatelessWidget {
  final Asset asset;
  const _Header({required this.asset});

  Color _statusBarColor(AssetStatus status) {
    switch (status) {
      case AssetStatus.active:
        return const Color(0xFF10B981);
      case AssetStatus.needsRepair:
      case AssetStatus.awaitingParts:
      case AssetStatus.inRepair:
        return const Color(0xFFF59E0B);
      case AssetStatus.unaccountedFor:
        return const Color(0xFFC51F2D);
      default:
        return const Color(0xFF6B7280);
    }
  }

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final topBarColor = _statusBarColor(asset.status);

    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.npColors.lineStrong),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 4px top color bar by asset.status (active #10B981, needsRepair/awaitingParts #F59E0B, unaccountedFor #c51f2d, else gray)
          Container(
            height: 4,
            width: double.infinity,
            color: topBarColor,
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 180px hero block with borderRadius:12, BoxFit.cover, black gradient scrim, and NpStatusPill overlaid top-right
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 180,
                    width: double.infinity,
                    color: const Color(0xFF0A0C10),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // Ambient dot grid texture
                        const Opacity(
                          opacity: 0.20,
                          child: NpDotGrid(),
                        ),
                        // Radial crimson glow behind appliance
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
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 24.0, top: 12.0),
                            child: NpApplianceArt(
                              categoryOrTitle: asset.categoryDisplayName,
                              fit: BoxFit.contain,
                              height: 120,
                            ),
                          ),
                        ),
                        if (NpAssets.fleetItemFor(asset.categoryDisplayName) != null)
                          Positioned(
                            top: 12,
                            left: 14,
                            child: Text(
                              '${NpAssets.fleetItemFor(asset.categoryDisplayName)!.index} // ${NpAssets.fleetItemFor(asset.categoryDisplayName)!.code}',
                              style: NpType.mono.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.2,
                                color: context.npColors.white40,
                              ),
                            ),
                          ),
                        // Black gradient scrim
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.6),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.85),
                              ],
                              stops: const [0.0, 0.45, 1.0],
                            ),
                          ),
                        ),
                        // Overlaid top-right NpStatusPill
                        Positioned(
                          top: 12,
                          right: 12,
                          child: _StatusChip(status: asset.status),
                        ),
                        // Bottom asset title and category overlay
                        Positioned(
                          left: 16,
                          right: 16,
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
                              Text(
                                asset.categoryDisplayName,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.75),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // _InfoRow list below
                Container(
                  decoration: BoxDecoration(
                    color: context.npColors.bgElevated,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: context.npColors.lineStrong),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    children: [
                      _InfoRow(
                        icon: Icons.place_outlined,
                        label: 'Location',
                        value: asset.currentLocationLabel ?? 'Unknown',
                      ),
                      Divider(height: 1, color: context.npColors.lineStrong),
                      _InfoRow(
                        icon: Icons.verified_outlined,
                        label: 'Confirmed',
                        value: asset.currentLocationConfirmedAt != null
                            ? _formatDate(asset.currentLocationConfirmedAt!)
                            : 'Never',
                      ),
                      Divider(height: 1, color: context.npColors.lineStrong),
                      _InfoRow(
                        icon: Icons.build_outlined,
                        label: 'Serviced',
                        value: asset.lastServiceAt != null
                            ? _formatDate(asset.lastServiceAt!)
                            : 'Never',
                      ),
                      Divider(height: 1, color: context.npColors.lineStrong),
                      _InfoRow(
                        icon: Icons.tag,
                        label: 'Serial',
                        value: asset.serialNumber ?? 'Not recorded',
                        mono: true,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool mono;
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.mono = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: context.npColors.gray500),
          const SizedBox(width: 10),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(color: context.npColors.gray500, fontSize: 12),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: mono
                  ? NpType.mono.copyWith(
                      color: context.npColors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    )
                  : TextStyle(
                      color: context.npColors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
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
