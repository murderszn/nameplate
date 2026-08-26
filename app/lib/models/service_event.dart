import 'part.dart';

/// Mirrors the `service_event` table in docs/data-model.md §4.
/// Append-only in the real system: "the atomic record of a human touched
/// this asset." symptomCodes are required on repair events (v0-scope.md §3.6).
enum ServiceEventType {
  inspection,
  diagnostic,
  repair,
  partReplacement,
  fullReplacement,
  installation,
  removal,
  cleaning,
  preventiveMaintenance,
  warrantyService,
  decommission,
}

enum ResolutionCode {
  fixed,
  partReplaced,
  assetReplaced,
  noFaultFound,
  deferred,
  needsVendor,
  unrepairable,
}

enum RepairVsReplaceDecision { repaired, replaced, deferred }

class ServiceEvent {
  final String id; // UUIDv7, client-generated offline
  final String assetId;
  final ServiceEventType eventType;
  final List<String> symptomCodes;
  final String? findings;
  final ResolutionCode? resolutionCode;
  final RepairVsReplaceDecision? repairVsReplaceDecision;
  final double? estimatedRepairCostIfDeferred;
  final int? laborMinutes;
  final double partsCost;
  final double otherCost;
  final List<PartUsage> partsUsed;
  final DateTime occurredAt; // tech-asserted, offline-safe
  final bool followUpRequired;

  const ServiceEvent({
    required this.id,
    required this.assetId,
    required this.eventType,
    required this.occurredAt,
    this.symptomCodes = const [],
    this.findings,
    this.resolutionCode,
    this.repairVsReplaceDecision,
    this.estimatedRepairCostIfDeferred,
    this.laborMinutes,
    this.partsCost = 0,
    this.otherCost = 0,
    this.partsUsed = const [],
    this.followUpRequired = false,
  });

  double get totalCost => partsCost + otherCost;
}
