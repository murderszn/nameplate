import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';
import 'package:nameplate_field/models/turn.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/services/npid.dart';

void main() {
  Future<void> pumpApp(WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: NameplateFieldApp()));
    await tester.pump();
  }

  testWidgets('Turns lists units and starts a walkthrough', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.text('TURNS'));
    await tester.pump();
    expect(find.text('Unit turns'), findsOneWidget);
    expect(find.text('Start turn'), findsWidgets);

    await tester.tap(find.text('Start turn').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Move-out'), findsOneWidget);

    await tester.ensureVisible(find.text('Move-out'));
    await tester.tap(find.text('Move-out'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('Complete turn (0/6)'), findsOneWidget);
    expect(find.textContaining('Unit 4B'), findsWidgets);
  });

  testWidgets('Settings identity, offline toggle, and tag studio open', (
    tester,
  ) async {
    await pumpApp(tester);

    await tester.tap(find.text('SETTINGS'));
    await tester.pump();
    expect(find.text('Settings'), findsWidgets);
    expect(find.textContaining('J. Morales'), findsOneWidget);
    expect(find.text('Nameplate Tag studio'), findsOneWidget);

    await tester.tap(find.text('Work offline'));
    await tester.pump();
    expect(find.textContaining('Offline'), findsWidgets);

    final studio = find.text('Nameplate Tag studio');
    await tester.ensureVisible(studio);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(studio);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('Tag studio'), findsOneWidget);
    expect(find.text('Create a tag'), findsOneWidget);
  });

  test('NPID mint is Crockford Base32 with NP- prefix', () {
    final id = Npid.mint();
    expect(id, matches(RegExp(r'^NP-[0-9A-HJKMNP-TV-Z]{8}$')));
    expect(Npid.payloadUrl(id), startsWith('https://np.app/a/NP'));
  });

  test(
    'startTurn builds the unit roster and completeTurn emits work orders',
    () {
      final session = FieldSession.demo();
      final unit = session.units.firstWhere((u) => u.id == 'unit-4b');
      final turn = session.startTurn(unit: unit, type: TurnType.moveOut);
      expect(turn.items.length, 6);
      expect(turn.items.map((i) => i.category), contains('Refrigerator'));

      for (final item in turn.items) {
        item.finding = TurnItemFinding.presentOk;
      }
      turn.items.first.finding = TurnItemFinding.presentDamaged;
      turn.items.first.decision = TurnItemDecision.repair;

      final result = session.completeTurn(turn);
      expect(result.workOrdersCreated, 1);
      expect(session.workOrders.any((w) => w.sourceTurnId == turn.id), isTrue);
      expect(unit.occupancyStatus.name, 'vacant');
      expect(session.pendingCount, greaterThan(0));
    },
  );
}
