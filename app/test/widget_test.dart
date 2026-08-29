// Basic smoke test for the Nameplate Field app shell.
//
// TODO: expand with widget tests per feature (scan, asset detail, log
// service event, flag issue, turn walkthrough) as those flows get real
// data wiring per docs/architecture.md §4.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';

void main() {
  testWidgets('App shell renders navigation destinations on standard screen', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const ProviderScope(child: NameplateFieldApp()));
    await tester.pump();

    expect(find.text('SCAN'), findsOneWidget);
    expect(find.text('ORDERS'), findsOneWidget);
    expect(find.text('TURNS'), findsOneWidget);
    expect(find.text('SETTINGS'), findsOneWidget);
    expect(find.text('Scan the plate'), findsOneWidget);
    expect(find.text('SCAN WITH CAMERA'), findsOneWidget);

    await tester.tap(find.text('ORDERS'));
    await tester.pump();
    expect(find.text('My work orders'), findsOneWidget);

    await tester.tap(find.text('TURNS'));
    await tester.pump();
    expect(find.text('Unit turns'), findsOneWidget);

    await tester.tap(find.text('SETTINGS'));
    await tester.pump();
    expect(find.text('Field console'), findsOneWidget);
  });

  testWidgets(
    'App shell renders NavigationRail on 11-inch Kindle Fire tablet viewport',
    (WidgetTester tester) async {
      // 11-inch Kindle Fire Max 11 landscape resolution (approx 1200 x 800 dp)
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(const ProviderScope(child: NameplateFieldApp()));
      await tester.pump();

      expect(find.text('NP'), findsOneWidget);
      expect(find.text('SCAN'), findsOneWidget);
      expect(find.text('ORDERS'), findsOneWidget);
      expect(find.text('TURNS'), findsOneWidget);
      expect(find.text('SETTINGS'), findsOneWidget);
      expect(find.text('Manual NPID Lookup'), findsOneWidget);
    },
  );
}
