import '../models/service_event.dart';

/// Repository for logging service events.
///
/// TODO(outbox): `logServiceEvent` must:
///   1. Write the event to the local Drift mirror immediately (optimistic).
///   2. Enqueue an outbox row (op_id = UUIDv7, matches the event id so the
///      id doubles as the idempotency key — architecture.md §4.2).
///   3. Never block on network. The background sync worker drains the
///      outbox in strict op_id order via POST /v1/sync/push in batches of
///      up to 100 (architecture.md §4.2).
///
/// TODO(server-txn): the server applies event + part usages + asset status
/// change + work-order update atomically (v0-scope.md §1.3, data-model.md
/// §4/§5) — the client doesn't need to replicate that transaction locally,
/// but it should write all the local rows involved (event, part_usage,
/// asset status) in one local DB transaction so local reads stay consistent
/// before the round trip completes.
///
/// TODO(non-negotiable): symptom_codes are required on repair events
/// (v0-scope.md §3 non-negotiable #6) — enforce in the form, not just here.
class ServiceEventRepository {
  final List<ServiceEvent> _demoEvents = [];

  Future<List<ServiceEvent>> historyForAsset(String assetId) async {
    // TODO: read from local mirror; server keeps last 10 per asset in the
    // working set (architecture.md §4.1), older history is fetched on
    // demand and shown as "requires connection."
    return _demoEvents.where((e) => e.assetId == assetId).toList()
      ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
  }

  Future<void> logServiceEvent(ServiceEvent event) async {
    // TODO: write-through to Drift + enqueue outbox row. See class doc.
    _demoEvents.add(event);
  }
}
