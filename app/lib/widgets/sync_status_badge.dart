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
    final (label, icon, color) = switch (snapshot.state) {
      SyncState.synced => (
        'Synced',
        Icons.check_circle_outline,
        context.npColors.gray400,
      ),
      SyncState.offline => (
        'Offline',
        Icons.cloud_off_outlined,
        NpColors.pending,
      ),
      SyncState.pending => (
        '${snapshot.pendingCount} to upload',
        Icons.cloud_upload_outlined,
        NpColors.pending,
      ),
    };

    return Padding(
      padding: EdgeInsets.only(right: 12),
      child: Semantics(
        label: label,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 17, color: color),
            SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
