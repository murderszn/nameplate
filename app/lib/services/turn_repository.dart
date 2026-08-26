import '../models/turn.dart';

/// Repository for unit "turn" inspection walkthroughs.
///
/// TODO(offline): the entire turn workflow must work fully offline
/// (v0-scope.md §1.1 "Turn walkthrough"). Starting a turn against a unit
/// that's in the local working set generates the checklist locally from the
/// unit's current asset roster already mirrored in Drift, rather than
/// calling POST /v1/turns synchronously.
///
/// TODO(sync): completing a turn enqueues an outbox op that, once synced,
/// causes the server to auto-generate work orders for flagged items and
/// update unit occupancy status (data-model.md §6, v0-scope.md §1.1).
class TurnRepository {
  final List<Turn> _demoTurns = [];

  Future<Turn> startTurn({required String unitId, required String unitLabel, required TurnType type}) async {
    // TODO: generate checklist from the unit's current asset roster in the
    // local mirror (data-model.md §6 turn_item).
    final turn = Turn(
      id: 'demo-turn-${DateTime.now().microsecondsSinceEpoch}',
      unitId: unitId,
      unitLabel: unitLabel,
      type: type,
      status: TurnStatus.inProgress,
      startedAt: DateTime.now(),
      items: [
        TurnItem(id: 'ti-1', assetLabel: 'Refrigerator — NP-7K2M4QX9'),
        TurnItem(id: 'ti-2', assetLabel: 'Range — NP-4B2X91QQ'),
        TurnItem(id: 'ti-3', assetLabel: 'HVAC Air Handler — NP-22ZK88LM'),
      ],
    );
    _demoTurns.add(turn);
    return turn;
  }

  Future<void> completeTurn(Turn turn) async {
    // TODO: enqueue outbox op; server emits work orders for flagged items.
    turn.status = TurnStatus.completed;
  }
}
