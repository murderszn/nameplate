// Basic smoke test for the Nameplate Field app shell.
//
// TODO: expand with widget tests per feature (scan, asset detail, log
// service event, flag issue, turn walkthrough) as those flows get real
// data wiring per docs/architecture.md §4.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';
import 'package:nameplate_field/screens/splash_screen.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/services/providers.dart';
import 'package:nameplate_field/theme/theme_controller.dart';

void main() {
  testWidgets('App shell renders navigation destinations on standard screen', (
    WidgetTester tester,
  ) async {
    final techSession = FieldSession.demo()..setRole(AppRole.technician);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [fieldSessionProvider.overrideWith((ref) => techSession)],
        child: const NameplateFieldApp(),
      ),
    );
    await tester.pump();

    expect(find.text('SCAN'), findsOneWidget);
    expect(find.text('ORDERS'), findsOneWidget);
    expect(find.text('TURNS'), findsOneWidget);
    expect(find.text('SETTINGS'), findsOneWidget);
    expect(find.text('Scan the plate'), findsOneWidget);
    expect(find.text('Scan with camera'), findsOneWidget);

    await tester.tap(find.text('ORDERS'));
    await tester.pump();
    expect(find.text('My work orders'), findsOneWidget);

    await tester.tap(find.text('TURNS'));
    await tester.pump();
    expect(find.text('Unit turns'), findsOneWidget);

    await tester.tap(find.text('SETTINGS'));
    await tester.pump();
    expect(find.text('Settings'), findsWidgets);
  });

  testWidgets('App defaults to light mode and can switch to dark mode', (
    WidgetTester tester,
  ) async {
    final techSession = FieldSession.demo()..setRole(AppRole.technician);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [fieldSessionProvider.overrideWith((ref) => techSession)],
        child: const NameplateFieldApp(),
      ),
    );
    await tester.pump();

    final container = ProviderScope.containerOf(
      tester.element(find.byType(NameplateFieldApp)),
    );
    expect(container.read(themeModeProvider), ThemeMode.light);

    await tester.tap(find.text('SETTINGS'));
    await tester.pump();
    expect(find.text('White Nameplate theme · default'), findsOneWidget);

    await tester.tap(find.text('Dark mode'));
    await tester.pump();
    expect(container.read(themeModeProvider), ThemeMode.dark);
    expect(find.text('Dark Nameplate theme'), findsOneWidget);
  });

  testWidgets(
    'App shell renders NavigationRail on 11-inch Kindle Fire tablet viewport',
    (WidgetTester tester) async {
      // 11-inch Kindle Fire Max 11 landscape resolution (approx 1200 x 800 dp)
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final techSession2 = FieldSession.demo()..setRole(AppRole.technician);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [fieldSessionProvider.overrideWith((ref) => techSession2)],
          child: const NameplateFieldApp(),
        ),
      );
      await tester.pump();

      expect(find.text('SCAN'), findsOneWidget);
      expect(find.text('ORDERS'), findsOneWidget);
      expect(find.text('TURNS'), findsOneWidget);
      expect(find.text('SETTINGS'), findsOneWidget);
      expect(find.text('Enter a tag ID'), findsOneWidget);
    },
  );

  testWidgets('Splash screen renders brand logo and transitions', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: NameplateFieldApp(
          home: SplashScreen(duration: Duration(milliseconds: 100)),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('NAMEPLATE'), findsOneWidget);
    expect(find.text('Every appliance accounted for.'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 150));
    await tester.pump(const Duration(milliseconds: 500));
    // No role yet → splash routes to role selector, not directly to scan.
    expect(find.text('Who are you signing in as?'), findsOneWidget);
    expect(find.text('I’m a tech'), findsOneWidget);
    expect(find.text('I’m a renter'), findsOneWidget);
  });
}
