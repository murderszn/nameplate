import '../models/service_event.dart';
import 'field_session.dart';

class ServiceEventRepository {
  final FieldSession? _session;
  final List<ServiceEvent> _demoEvents = [];

  ServiceEventRepository([this._session]);

  Future<List<ServiceEvent>> historyForAsset(String assetId) async {
    return _demoEvents.where((e) => e.assetId == assetId).toList()
      ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
  }

  Future<void> logServiceEvent(ServiceEvent event) async {
    _demoEvents.add(event);
    if (_session != null) {
      await _session.logServiceEvent(event);
    }
  }
}
