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
    if (snapshot.state == SyncState.pending) {
      return Padding(
        padding: const EdgeInsets.only(right: 16),
        child: Semantics(
          label: '${snapshot.pendingCount} pending uploads',
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              const Icon(
                Icons.cloud_upload_outlined,
                size: 20,
                color: NpColors.red,
              ),
              Positioned(
                right: -10,
                top: -9,
                child: Container(
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: NpColors.red,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${snapshot.pendingCount}',
                    style: const TextStyle(
                      color: NpColors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final (label, icon, tone) = switch (snapshot.state) {
      SyncState.synced => ('Synced', Icons.check_circle, NpPillTone.verified),
      SyncState.offline => ('Offline', Icons.cloud_off, NpPillTone.neutral),
      SyncState.pending => throw StateError('Pending handled above'),
    };

    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: tone == NpPillTone.verified
                ? NpColors.white
                : NpColors.gray400,
          ),
          const SizedBox(width: 6),
          NpStatusPill(label: label, tone: tone),
        ],
      ),
    );
  }
}
