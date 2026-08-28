import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/providers.dart';
import '../services/sync_status_service.dart';
import '../theme/app_theme.dart';
import 'np_brand.dart';

/// Always-visible sync indicator per v0-scope.md §1.1
/// ("Sync status indicator always visible: synced / N pending / offline").
/// Never encodes status by color alone (branding.md §6 rule) — icon + word.
class SyncStatusBadge extends ConsumerWidget {
  const SyncStatusBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(syncStatusProvider);
    return _badge(snapshot);
  }

  Widget _badge(SyncStatusSnapshot snapshot) {
    final (label, icon, tone) = switch (snapshot.state) {
      SyncState.synced => ('Synced', Icons.check_circle, NpPillTone.verified),
      SyncState.pending => ('${snapshot.pendingCount} pending', Icons.cloud_upload, NpPillTone.caution),
      SyncState.offline => ('Offline', Icons.cloud_off, NpPillTone.neutral),
    };

    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: switch (tone) {
              NpPillTone.verified => NpColors.white,
              NpPillTone.caution => NpColors.red,
              NpPillTone.fault => NpColors.red,
              NpPillTone.neutral => NpColors.gray400,
            },
          ),
          const SizedBox(width: 6),
          NpStatusPill(label: label, tone: tone),
        ],
      ),
    );
  }
}
