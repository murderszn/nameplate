/// Stub for the sync status indicator required by v0-scope.md §1.1
/// ("Sync status indicator always visible: synced / N pending / offline").
///
/// TODO(sync engine): replace with the real outbox-depth query against
/// Drift once app/lib/sync/ exists (architecture.md §6). Should surface:
///   - pendingCount: rows in the outbox not yet applied=true
///   - oldestUnsyncedAt: for the diagnostics screen (v0-scope.md §1.1)
///   - lastPushError: for the sync-health dashboard signal (architecture.md §7)
enum SyncState { synced, pending, offline }

class SyncStatusSnapshot {
  final SyncState state;
  final int pendingCount;
  final DateTime? oldestUnsyncedAt;

  const SyncStatusSnapshot({
    required this.state,
    this.pendingCount = 0,
    this.oldestUnsyncedAt,
  });
}

class SyncStatusService {
  /// TODO: stream from the outbox DAO + connectivity_plus, per
  /// architecture.md §4.4 ("Sync triggers: app foreground, pull-to-refresh,
  /// after every push, on network regain, every 15 minutes while
  /// foregrounded").
  Stream<SyncStatusSnapshot> watch() async* {
    yield const SyncStatusSnapshot(state: SyncState.synced, pendingCount: 0);
  }
}
