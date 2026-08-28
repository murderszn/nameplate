import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/service_event.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../service/log_service_event_screen.dart';
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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const NpKicker('02 / Ledger'),
            const SizedBox(height: 10),
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
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'No service events recorded yet.',
                        style: TextStyle(color: NpColors.steel500),
                      ),
                    ),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: events.length,
                  separatorBuilder: (_, _) => const Divider(height: 16),
                  itemBuilder: (context, i) => _HistoryTile(event: events[i]),
                );
              },
            ),
          ],
        ),
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
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${asset.manufacturer ?? 'Unknown'} ${asset.modelNumber ?? ''}'.trim(),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                _StatusChip(status: asset.status),
              ],
            ),
            if (NpAssets.schematicFor(asset.categoryDisplayName) != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset(
                  NpAssets.schematicFor(asset.categoryDisplayName)!,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
            ],
            const SizedBox(height: 4),
            Text(asset.categoryDisplayName, style: Theme.of(context).textTheme.bodyMedium),
            const Divider(height: 24),
            _InfoRow(icon: Icons.place_outlined, label: 'Location', value: asset.currentLocationLabel ?? 'Unknown'),
            _InfoRow(
              icon: Icons.verified_outlined,
              label: 'Last confirmed',
              value: asset.currentLocationConfirmedAt != null
                  ? _formatDate(asset.currentLocationConfirmedAt!)
                  : 'Never',
            ),
            _InfoRow(
              icon: Icons.build_outlined,
              label: 'Last serviced',
              value: asset.lastServiceAt != null ? _formatDate(asset.lastServiceAt!) : 'Never',
            ),
            _InfoRow(icon: Icons.tag, label: 'Serial', value: asset.serialNumber ?? 'Not recorded'),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: NpColors.steel500),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: NpColors.steel500)),
          Expanded(child: Text(value)),
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
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.icon(
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => LogServiceEventScreen(asset: asset)),
          ),
          icon: const Icon(Icons.build),
          label: const Text('Log Service'),
        ),
        OutlinedButton.icon(
          onPressed: () {
            // TODO: POST /v1/assets/:id/move flow — scan destination, reason,
            // GPS where permitted. Must never be a silent field edit
            // (v0-scope.md §1.1 "Move an asset").
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Move asset — TODO')),
            );
          },
          icon: const Icon(Icons.move_up),
          label: const Text('Move'),
        ),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(foregroundColor: NpColors.fault600),
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => FlagMissingBrokenScreen(asset: asset)),
          ),
          icon: const Icon(Icons.flag_outlined),
          label: const Text('Flag Issue'),
        ),
      ],
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final ServiceEvent event;
  const _HistoryTile({required this.event});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.build_circle_outlined, color: NpColors.plate600),
      title: Text(event.eventType.name),
      subtitle: Text(event.findings ?? 'No findings recorded'),
      trailing: Text('\$${event.totalCost.toStringAsFixed(2)}'),
    );
  }
}
