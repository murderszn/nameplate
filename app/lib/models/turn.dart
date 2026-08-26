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
  TurnItemFinding? finding;
  TurnItemDecision decision;
  bool verifiedByScan;
  String? notes;

  TurnItem({
    required this.id,
    required this.assetLabel,
    this.assetId,
    this.finding,
    this.decision = TurnItemDecision.none,
    this.verifiedByScan = false,
    this.notes,
  });
}

class Turn {
  final String id;
  final String unitId;
  final String unitLabel;
  final TurnType type;
  TurnStatus status;
  final DateTime? startedAt;
  final List<TurnItem> items;

  Turn({
    required this.id,
    required this.unitId,
    required this.unitLabel,
    required this.type,
    this.status = TurnStatus.scheduled,
    this.startedAt,
    this.items = const [],
  });
}
