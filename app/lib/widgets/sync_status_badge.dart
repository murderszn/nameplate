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
    final snapshot = ref.watch(syncStatusProvider);
    return _badge(context, snapshot);
  }

  Widget _badge(BuildContext context, SyncStatusSnapshot snapshot) {
    final isPending = snapshot.state == SyncState.pending;
    final isOffline = snapshot.state == SyncState.offline;

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cloudIconColor = isDark ? Colors.white : Colors.black;

    final icon = isPending
        ? Icons.cloud_upload_outlined
        : (isOffline ? Icons.cloud_off_outlined : Icons.cloud_done_outlined);

    final tooltip = switch (snapshot.state) {
      SyncState.synced => 'Synced',
      SyncState.offline => 'Offline',
      SyncState.pending => '${snapshot.pendingCount} pending upload',
    };

    return Padding(
      padding: const EdgeInsets.only(right: 14),
      child: Tooltip(
        message: tooltip,
        child: Semantics(
          label: tooltip,
          child: Badge(
            isLabelVisible: isPending && snapshot.pendingCount > 0,
            label: Text(
              '${snapshot.pendingCount}',
              style: NpType.mono.copyWith(
                fontSize: 9,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            backgroundColor: NpColors.red,
            offset: const Offset(4, -4),
            child: Icon(icon, size: 20, color: cloudIconColor),
          ),
        ),
      ),
    );
  }
}
