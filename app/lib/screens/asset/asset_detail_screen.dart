import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/service_event.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../service/log_service_event_screen.dart';
import 'flag_missing_broken_screen.dart';

/// Asset detail: header (category/model/age/status/location/last serviced),
/// unified history timeline, and actions (log service, move, flag issue,
/// report missing) — v0-scope.md §1.1 "Asset detail".
///
/// TODO(data): read Asset + ServiceEvent history from the local Drift
/// mirror only (architecture.md §4.1) — this screen must render identically
/// online or offline. TODO(history): also merge in location moves and work
/// orders into one reverse-chronological timeline (v0-scope.md §1.1);
/// currently only service events are shown.
class AssetDetailScreen extends ConsumerWidget {
  final String assetId;

  const AssetDetailScreen({super.key, required this.assetId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetRepo = ref.watch(assetRepositoryProvider);
    final eventRepo = ref.watch(serviceEventRepositoryProvider);

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
          appBar: AppBar(title: Text(asset.npid)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Header(asset: asset),
              const SizedBox(height: 16),
              _ActionsRow(asset: asset),
              const SizedBox(height: 24),
              Text('History', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FutureBuilder<List<ServiceEvent>>(
                future: eventRepo.historyForAsset(asset.id),
                builder: (context, historySnap) {
                  final events = historySnap.data ?? [];
                  if (events.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Text('No service events yet.'),
                    );
                  }
                  return Column(
                    children: events.map((e) => _HistoryTile(event: e)).toList(),
                  );
                },
              ),
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
    final (label, color, bg) = switch (status) {
      AssetStatus.active => ('Active', NpColors.verified600, NpColors.verified100),
      AssetStatus.needsRepair => ('Needs repair', NpColors.caution600, NpColors.signal100),
      AssetStatus.awaitingParts => ('Awaiting parts', NpColors.caution600, NpColors.signal100),
      AssetStatus.inRepair => ('In repair', NpColors.caution600, NpColors.signal100),
      AssetStatus.inStorage => ('In storage', NpColors.steel500, NpColors.mist100),
      AssetStatus.unaccountedFor => ('Unaccounted for', NpColors.fault600, NpColors.fault100),
      AssetStatus.retired => ('Retired', NpColors.steel500, NpColors.mist100),
      AssetStatus.disposed => ('Disposed', NpColors.steel500, NpColors.mist100),
      AssetStatus.salvage => ('Salvage', NpColors.steel500, NpColors.mist100),
    };
    return Chip(
      label: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
      backgroundColor: bg,
      side: BorderSide.none,
    );
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
