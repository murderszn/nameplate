import 'package:flutter_test/flutter_test.dart';
import 'package:nameplate_field/models/turn.dart';
import 'package:nameplate_field/models/work_order.dart';
import 'package:nameplate_field/services/field_session.dart';

void main() {
  group('Turn Walkthrough & Photo Tagging Loop', () {
    test('Attaches and removes inspection photos from turn items', () {
      final session = FieldSession.demo();
      final unit = session.units.first;
      final turn = session.startTurn(unit: unit, type: TurnType.moveOut);
      final item = turn.items.first;

      expect(item.photos.length, 0);
      expect(item.hasPhotos, isFalse);

      session.addPhotoToTurnItem(item, 'assets/images/schematics/fridge.png');
      expect(item.photos.length, 1);
      expect(item.hasPhotos, isTrue);

      session.addPhotoToTurnItem(item, 'assets/images/schematics/washer.png');
      expect(item.photos.length, 2);

      session.removePhotoFromTurnItem(item, 0);
      expect(item.photos.length, 1);
      expect(item.photos.first, 'assets/images/schematics/washer.png');
    });

    test('Emits prioritized work orders with photo evidence notes upon turn completion', () {
      final session = FieldSession.demo();
      final unit = session.units.first;
      final turn = session.startTurn(unit: unit, type: TurnType.moveOut);

      for (final item in turn.items) {
        item.finding = TurnItemFinding.presentOk;
      }

      // Flag a critical refrigerator as damaged with 2 photos
      final fridge = turn.items.firstWhere((i) => i.category == 'Refrigerator');
      fridge.finding = TurnItemFinding.presentDamaged;
      fridge.decision = TurnItemDecision.repair;
      session.addPhotoToTurnItem(fridge, 'assets/images/schematics/fridge.png');
      session.addPhotoToTurnItem(fridge, 'assets/images/schematics/hvac.png');

      final completion = session.completeTurn(turn);
      expect(completion.workOrdersCreated, 1);

      final wo = session.workOrders.firstWhere((w) => w.sourceTurnId == turn.id);
      expect(wo.priority, WorkOrderPriority.urgent); // Critical Refrigerator = urgent
      expect(wo.slaLabel, contains('4h SLA'));
      expect(wo.title, contains('[2 Photo Evidence Attached]'));
    });
  });
}
