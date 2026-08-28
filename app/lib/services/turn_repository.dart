import '../models/turn.dart';
import '../models/unit.dart';
import 'field_session.dart';

class TurnRepository {
  TurnRepository(this.session);
  final FieldSession session;

  Future<List<Turn>> listTurns() async => session.visibleTurns;

  Future<Turn> startTurn({
    required Unit unit,
    required TurnType type,
  }) async {
    return session.startTurn(unit: unit, type: type);
  }

  Future<TurnCompletion> completeTurn(Turn turn) async {
    return session.completeTurn(turn);
  }
}
