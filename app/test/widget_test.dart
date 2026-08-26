// Basic smoke test for the Nameplate Field app shell.
//
// TODO: expand with widget tests per feature (scan, asset detail, log
// service event, flag issue, turn walkthrough) as those flows get real
// data wiring per docs/architecture.md §4.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';

void main() {
  testWidgets('App shell renders the bottom navigation destinations', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: NameplateFieldApp()));
    await tester.pumpAndSettle();

    expect(find.text('Scan'), findsOneWidget);
    expect(find.text('Work Orders'), findsOneWidget);
    expect(find.text('Turns'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Scan Asset'), findsOneWidget);
  });
}
