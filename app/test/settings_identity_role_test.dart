import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';
import 'package:nameplate_field/screens/app_shell.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/services/providers.dart';

void main() {
  testWidgets('Settings screen renders single unified Account & Role section without duplicate technician cards', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final session = FieldSession.demo()..setRole(AppRole.technician);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [fieldSessionProvider.overrideWith((ref) => session)],
        child: const NameplateFieldApp(
          home: AppShell(initialIndex: 3), // Settings tab (index 3)
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify section header and mode segment
    expect(find.text('APP ROLE & ACCESS SCOPE'), findsOneWidget);
    expect(find.text('FIELD OPS'), findsOneWidget);
    expect(find.text('Technician'), findsWidgets);
    expect(find.text('Renter / Resident'), findsOneWidget);

    // Verify Technician mode details
    expect(find.text('J. Morales'), findsOneWidget);
    expect(find.text('SWITCH TECH'), findsOneWidget);
    expect(find.textContaining('Sonoran Portfolio Management'), findsOneWidget);
    expect(find.textContaining('Scope:'), findsOneWidget);
    expect(find.text('EDIT'), findsOneWidget);

    // Verify old duplicate role switch text is gone
    expect(find.text('Signed-in role — same app, different scope'), findsNothing);
    expect(find.text('I’m a renter'), findsNothing);
    expect(find.text('I’m a tech'), findsNothing);

    // Tap "SWITCH TECH" to verify technician roster modal
    await tester.tap(find.text('SWITCH TECH'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Switch Field Technician'), findsOneWidget);
    expect(find.text('D. Vance'), findsOneWidget);

    // Select D. Vance
    await tester.tap(find.text('D. Vance'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('D. Vance'), findsOneWidget);

    // Now switch to Renter / Resident mode via the segmented control
    await tester.tap(find.text('Renter / Resident'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify Resident mode is active
    expect(find.text('RESIDENT'), findsOneWidget);
    expect(find.text('UNIT 214'), findsOneWidget);
    expect(find.text('Maya Johnson'), findsOneWidget);
    expect(find.text('Resident · Sonoran Ridge · 4 Registered Appliances'), findsOneWidget);
    expect(find.text('SWITCH TECH'), findsNothing);

    // Switch back to Technician mode
    await tester.tap(find.text('Technician'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify Technician credentials are restored cleanly
    expect(find.text('FIELD OPS'), findsOneWidget);
    expect(find.text('SWITCH TECH'), findsOneWidget);
    expect(find.textContaining('Sonoran Portfolio Management'), findsOneWidget);
  });
}
