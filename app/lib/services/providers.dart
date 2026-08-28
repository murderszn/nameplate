import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'asset_repository.dart';
import 'field_session.dart';
import 'service_event_repository.dart';
import 'sync_status_service.dart';
import 'turn_repository.dart';

final fieldSessionProvider = ChangeNotifierProvider<FieldSession>((ref) {
  return FieldSession.demo();
});

final assetRepositoryProvider = Provider<AssetRepository>((ref) {
  return AssetRepository(ref.watch(fieldSessionProvider));
});

final serviceEventRepositoryProvider = Provider<ServiceEventRepository>((ref) {
  return ServiceEventRepository(ref.watch(fieldSessionProvider));
});

final turnRepositoryProvider = Provider<TurnRepository>((ref) {
  return TurnRepository(ref.watch(fieldSessionProvider));
});

final syncStatusProvider = Provider<SyncStatusSnapshot>((ref) {
  return ref.watch(fieldSessionProvider).syncSnapshot;
});
