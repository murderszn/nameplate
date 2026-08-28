import 'asset.dart';

/// Mirrors `turn` and `turn_item` in docs/data-model.md §6.
/// Server generates one TurnItem per asset currently assigned to the unit
/// when the turn starts, so the checklist *is* the expected asset roster.
enum TurnType { moveOut, moveIn, annualInspection, spotAudit, onboarding }

enum TurnStatus { scheduled, inProgress, completed, cancelled }

enum TurnItemFinding {
  presentOk,
  presentDamaged,
  presentNeedsService,
  missing,
  unexpectedFound,
  notApplicable,
  inaccessible,
}

enum TurnItemDecision { none, repair, replace, clean, monitor, investigate }

class TurnItem {
  final String id;
  final String? assetId; // null when tech finds an untagged asset
  final String assetLabel; // display label, e.g. category + model
  final String? npid;
  final String? category;
  TurnItemFinding? finding;
  TurnItemDecision decision;
  AssetCondition? condition;
  bool verifiedByScan;
  String? notes;
  String? generatedWorkOrderId;
  List<String> photos;

  TurnItem({
    required this.id,
    required this.assetLabel,
    this.assetId,
    this.npid,
    this.category,
    this.finding,
    this.decision = TurnItemDecision.none,
    this.condition,
    this.verifiedByScan = false,
    this.notes,
    this.generatedWorkOrderId,
    this.photos = const [],
  });

  bool get inspected => finding != null;
  bool get flagged =>
      finding == TurnItemFinding.presentDamaged ||
      finding == TurnItemFinding.presentNeedsService ||
      finding == TurnItemFinding.missing;
  bool get hasPhotos => photos.isNotEmpty;
}

class Turn {
  final String id;
  final String unitId;
  final String unitLabel;
  final TurnType type;
  TurnStatus status;
  final DateTime? startedAt;
  DateTime? completedAt;
  final List<TurnItem> items;
  int workOrdersEmitted;

  Turn({
    required this.id,
    required this.unitId,
    required this.unitLabel,
    required this.type,
    this.status = TurnStatus.scheduled,
    this.startedAt,
    this.completedAt,
    this.items = const [],
    this.workOrdersEmitted = 0,
  });

  int get inspectedCount => items.where((i) => i.inspected).length;
  bool get allInspected => items.isNotEmpty && items.every((i) => i.inspected);
  int get missingCount => items.where((i) => i.finding == TurnItemFinding.missing).length;
  int get damagedCount => items.where((i) => i.finding == TurnItemFinding.presentDamaged || i.finding == TurnItemFinding.presentNeedsService).length;
}

extension TurnTypeX on TurnType {
  String get label => switch (this) {
        TurnType.moveOut => 'Move-out',
        TurnType.moveIn => 'Move-in',
        TurnType.annualInspection => 'Annual inspection',
        TurnType.spotAudit => 'Spot audit',
        TurnType.onboarding => 'Onboarding inventory',
      };
}

extension TurnStatusX on TurnStatus {
  String get label => switch (this) {
        TurnStatus.scheduled => 'Scheduled',
        TurnStatus.inProgress => 'In progress',
        TurnStatus.completed => 'Completed',
        TurnStatus.cancelled => 'Cancelled',
      };
}

extension TurnItemFindingX on TurnItemFinding {
  String get label => switch (this) {
        TurnItemFinding.presentOk => 'Present · OK',
        TurnItemFinding.presentDamaged => 'Damaged',
        TurnItemFinding.presentNeedsService => 'Needs service',
        TurnItemFinding.missing => 'Unaccounted for',
        TurnItemFinding.unexpectedFound => 'Found untagged',
        TurnItemFinding.notApplicable => 'N/A',
        TurnItemFinding.inaccessible => 'Inaccessible',
      };
}

extension TurnItemDecisionX on TurnItemDecision {
  String get label => switch (this) {
        TurnItemDecision.none => 'No action',
        TurnItemDecision.repair => 'Repair',
        TurnItemDecision.replace => 'Replace',
        TurnItemDecision.clean => 'Clean',
        TurnItemDecision.monitor => 'Monitor',
        TurnItemDecision.investigate => 'Investigate',
      };
}
