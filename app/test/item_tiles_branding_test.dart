import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';
import 'package:nameplate_field/screens/app_shell.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/services/providers.dart';
import 'package:nameplate_field/widgets/np_brand.dart';

void main() {
  testWidgets('Work orders use NpApplianceArt as leading item tile without wrench/caution icons', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final techSession = FieldSession.demo()..setRole(AppRole.technician);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [fieldSessionProvider.overrideWith((ref) => techSession)],
        child: const NameplateFieldApp(
          home: AppShell(initialIndex: 1),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify NpApplianceArt widgets are present for work orders in the list
    expect(find.descendant(of: find.byType(ListView), matching: find.byType(NpApplianceArt)), findsWidgets);

    // Verify wrench and priority warning icons are removed from the work order items in the list
    expect(find.descendant(of: find.byType(ListView), matching: find.byIcon(Icons.build_outlined)), findsNothing);
    expect(find.descendant(of: find.byType(ListView), matching: find.byIcon(Icons.warning_amber_rounded)), findsNothing);
    expect(find.descendant(of: find.byType(ListView), matching: find.byIcon(Icons.priority_high_rounded)), findsNothing);
  });

  testWidgets('Unit turns use property images as leading item tile without house/key icons', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final techSession = FieldSession.demo()..setRole(AppRole.technician);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [fieldSessionProvider.overrideWith((ref) => techSession)],
        child: const NameplateFieldApp(
          home: AppShell(initialIndex: 2),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify property images are rendered in leading tiles
    expect(find.byType(Image), findsWidgets);

    // Verify generic house and key icons are removed from unit tiles
    expect(find.byIcon(Icons.home_work_outlined), findsNothing);
    expect(find.byIcon(Icons.key_rounded), findsNothing);
    expect(find.byIcon(Icons.sync_rounded), findsNothing);
  });
}
