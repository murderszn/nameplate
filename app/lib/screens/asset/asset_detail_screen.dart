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

  Widget _buildHistorySection(BuildContext context, WidgetRef ref, Asset asset) {
    final eventRepo = ref.watch(serviceEventRepositoryProvider);

    return Container(
      decoration: const BoxDecoration(
        color: NpColors.bgCard,
        border: Border.fromBorderSide(BorderSide(color: NpColors.lineStrong)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: NpColors.lineStrong)),
            ),
            child: const NpKicker('02 / Ledger'),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Service & Lineage History',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                FutureBuilder<List<ServiceEvent>>(
                  future: eventRepo.historyForAsset(asset.id),
                  builder: (context, historySnap) {
                    final events = historySnap.data ?? [];
                    if (events.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(Icons.history_outlined,
                                  size: 36, color: NpColors.gray700),
                              const SizedBox(height: 8),
                              Text(
                                'No service events recorded yet.',
                                style: NpType.mono.copyWith(
                                  color: NpColors.gray500,
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
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: events.length,
                      separatorBuilder: (_, _) =>
                          const Divider(height: 1, color: NpColors.lineStrong),
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
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }
        if (asset == null) {
          return const Scaffold(body: Center(child: Text('Asset not found')));
        }

        return Scaffold(
          appBar: NpBrandAppBar(
            kicker: '02 / Plate',
            title: asset.npid,
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
                              const SizedBox(height: 16),
                              _ActionsRow(asset: asset),
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
                  padding: const EdgeInsets.all(16),
                  children: [
                    _Header(asset: asset),
                    const SizedBox(height: 16),
                    _ActionsRow(asset: asset),
                    const SizedBox(height: 20),
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
      decoration: const BoxDecoration(
        color: NpColors.bgCard,
        border: Border.fromBorderSide(BorderSide(color: NpColors.lineStrong)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top accent strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: NpColors.lineStrong)),
            ),
            child: Row(
              children: [
                const NpKicker('01 / Asset'),
                const Spacer(),
                _StatusChip(status: asset.status),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${asset.manufacturer ?? 'Unknown'} ${asset.modelNumber ?? ''}'
                      .trim(),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: NpColors.white,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  asset.categoryDisplayName,
                  style: const TextStyle(
                    color: NpColors.gray400,
                    fontSize: 14,
                  ),
                ),
                if (NpAssets.schematicFor(asset.categoryDisplayName) != null) ...[
                  const SizedBox(height: 12),
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
                const SizedBox(height: 16),
                Container(
                  decoration: const BoxDecoration(
                    border: Border.fromBorderSide(
                        BorderSide(color: NpColors.lineStrong)),
                  ),
                  child: Column(
                    children: [
                      _InfoRow(
                        icon: Icons.place_outlined,
                        label: 'Location',
                        value: asset.currentLocationLabel ?? 'Unknown',
                      ),
                      const Divider(height: 1, color: NpColors.lineStrong),
                      _InfoRow(
                        icon: Icons.verified_outlined,
                        label: 'Confirmed',
                        value: asset.currentLocationConfirmedAt != null
                            ? _formatDate(asset.currentLocationConfirmedAt!)
                            : 'Never',
                      ),
                      const Divider(height: 1, color: NpColors.lineStrong),
                      _InfoRow(
                        icon: Icons.build_outlined,
                        label: 'Serviced',
                        value: asset.lastServiceAt != null
                            ? _formatDate(asset.lastServiceAt!)
                            : 'Never',
                      ),
                      const Divider(height: 1, color: NpColors.lineStrong),
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 16, color: NpColors.gray500),
          const SizedBox(width: 10),
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(color: NpColors.gray500, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: mono
                  ? NpType.mono.copyWith(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: NpColors.white,
                    )
                  : const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: NpColors.white,
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

class _ActionsRow extends StatelessWidget {
  final Asset asset;
  const _ActionsRow({required this.asset});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        color: NpColors.bgCard,
        border: Border.fromBorderSide(BorderSide(color: NpColors.lineStrong)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const NpKicker('02 / Quick Actions'),
              const Spacer(),
              Text(
                'FIELD DISPATCH',
                style: NpType.mono.copyWith(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: NpColors.gray500,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              NpButton.primary(
                icon: Icons.build_rounded,
                label: 'Log Service',
                size: NpButtonSize.md,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => LogServiceEventScreen(asset: asset),
                  ),
                ),
              ),
              NpButton.danger(
                icon: Icons.flag_rounded,
                label: 'Flag Issue',
                size: NpButtonSize.md,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => FlagMissingBrokenScreen(asset: asset),
                  ),
                ),
              ),
              NpButton.secondary(
                icon: Icons.swap_horiz_rounded,
                label: 'Relocate',
                size: NpButtonSize.md,
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Relocation tool queued.')),
                  );
                },
              ),
              NpIconButton(
                icon: Icons.qr_code_2_rounded,
                tooltip: 'Hardware Tag Studio',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const TagStudioScreen(),
                  ),
                ),
                size: 44,
              ),
            ],
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
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: NpColors.bgElevated,
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: NpColors.lineStrong),
            ),
            child: const Icon(Icons.build_circle_outlined,
                color: NpColors.red, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.eventType.name.toUpperCase(),
                  style: NpType.mono.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: NpColors.white,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  event.findings ?? 'No findings recorded',
                  style: const TextStyle(color: NpColors.gray400, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '\$${event.totalCost.toStringAsFixed(2)}',
            style: NpType.mono.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: NpColors.white,
            ),
          ),
        ],
      ),
    );
  }
}
