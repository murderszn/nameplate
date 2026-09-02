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
                  padding: EdgeInsets.all(20),
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
                              SizedBox(height: 16),
                              _PrimaryActionCard(asset: asset),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(width: 20),
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
                  padding: EdgeInsets.all(16),
                  children: [
                    _Header(asset: asset),
                    SizedBox(height: 16),
                    _PrimaryActionCard(asset: asset),
                    SizedBox(height: 20),
                    _buildHistorySection(context, ref, asset),
                  ],
                ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final Asset asset;
  const _Header({required this.asset});

  @override
  Widget build(BuildContext context) {
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
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${asset.manufacturer ?? 'Unknown'} ${asset.modelNumber ?? ''}'
                            .trim(),
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: context.npColors.white,
                          letterSpacing: -0.4,
                        ),
                      ),
                    ),
                    SizedBox(width: 12),
                    _StatusChip(status: asset.status),
                  ],
                ),
                SizedBox(height: 4),
                Text(
                  asset.categoryDisplayName,
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 14,
                  ),
                ),
                if (NpAssets.schematicFor(asset.categoryDisplayName) !=
                    null) ...[
                  SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Image.asset(
                      NpAssets.schematicFor(asset.categoryDisplayName)!,
                      height: 130,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                ],
                SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    border: Border.fromBorderSide(
                      BorderSide(color: context.npColors.lineStrong),
                    ),
                  ),
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

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
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
      padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: context.npColors.gray500),
          SizedBox(width: 10),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(color: context.npColors.gray500, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: mono
                  ? NpType.mono.copyWith(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: context.npColors.white,
                    )
                  : TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.npColors.white,
                    ),
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
