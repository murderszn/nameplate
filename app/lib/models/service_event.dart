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

extension ServiceEventTypeX on ServiceEventType {
  String get label => switch (this) {
    ServiceEventType.inspection => 'Inspection',
    ServiceEventType.diagnostic => 'Diagnostic',
    ServiceEventType.repair => 'Repair',
    ServiceEventType.partReplacement => 'Part replacement',
    ServiceEventType.fullReplacement => 'Full replacement',
    ServiceEventType.installation => 'Installation',
    ServiceEventType.removal => 'Removal',
    ServiceEventType.cleaning => 'Cleaning',
    ServiceEventType.preventiveMaintenance => 'Preventive maintenance',
    ServiceEventType.warrantyService => 'Warranty service',
    ServiceEventType.decommission => 'Decommission',
  };
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

extension ResolutionCodeX on ResolutionCode {
  String get label => switch (this) {
    ResolutionCode.fixed => 'Fixed',
    ResolutionCode.partReplaced => 'Part replaced',
    ResolutionCode.assetReplaced => 'Asset replaced',
    ResolutionCode.noFaultFound => 'No fault found',
    ResolutionCode.deferred => 'Deferred',
    ResolutionCode.needsVendor => 'Needs vendor',
    ResolutionCode.unrepairable => 'Unrepairable',
  };
}

enum RepairVsReplaceDecision { repaired, replaced, deferred }

extension RepairVsReplaceDecisionX on RepairVsReplaceDecision {
  String get label => switch (this) {
    RepairVsReplaceDecision.repaired => 'Repaired',
    RepairVsReplaceDecision.replaced => 'Replaced',
    RepairVsReplaceDecision.deferred => 'Deferred',
  };
}

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
