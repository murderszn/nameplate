import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/providers.dart';
import '../services/sync_status_service.dart';
import '../theme/app_theme.dart';

/// Always-visible sync indicator per v0-scope.md §1.1
/// ("Sync status indicator always visible: synced / N pending / offline").
/// Never encodes status by color alone (branding.md §6 rule) — icon + word.
class SyncStatusBadge extends ConsumerWidget {
  const SyncStatusBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshotAsync = ref.watch(syncStatusProvider);

    return snapshotAsync.when(
      data: (snapshot) => _badge(snapshot),
      loading: () => const SizedBox.shrink(),
      error: (_, __) => _badge(const SyncStatusSnapshot(state: SyncState.offline)),
    );
  }

  Widget _badge(SyncStatusSnapshot snapshot) {
    final (label, icon, color) = switch (snapshot.state) {
      SyncState.synced => ('Synced', Icons.check_circle, NpColors.verified600),
      SyncState.pending => ('${snapshot.pendingCount} pending', Icons.cloud_upload, NpColors.offline500),
      SyncState.offline => ('Offline', Icons.cloud_off, NpColors.steel500),
    };

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
        ],
      ),
    );
  }
}
