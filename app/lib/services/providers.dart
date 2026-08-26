import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'asset_repository.dart';
import 'service_event_repository.dart';
import 'sync_status_service.dart';
import 'turn_repository.dart';

/// Riverpod providers wiring the stubbed repository/service layer.
/// Swap the `Provider` bodies for real Drift/dio-backed implementations
/// as the sync engine (architecture.md §4) gets built out — screens should
/// not need to change since they only depend on these provider types.
final assetRepositoryProvider = Provider<AssetRepository>((ref) => AssetRepository());

final serviceEventRepositoryProvider =
    Provider<ServiceEventRepository>((ref) => ServiceEventRepository());

final turnRepositoryProvider = Provider<TurnRepository>((ref) => TurnRepository());

final syncStatusServiceProvider = Provider<SyncStatusService>((ref) => SyncStatusService());

final syncStatusProvider = StreamProvider<SyncStatusSnapshot>((ref) {
  return ref.watch(syncStatusServiceProvider).watch();
});
