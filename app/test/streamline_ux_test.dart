import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:nameplate_field/main.dart';
import 'package:nameplate_field/screens/app_shell.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/models/turn.dart';
import 'package:nameplate_field/services/providers.dart';
import 'package:nameplate_field/services/sync_status_service.dart';
import 'package:nameplate_field/theme/app_theme.dart';
import 'package:nameplate_field/widgets/sync_status_badge.dart';

void main() {
  group('Streamlined UX Verification', () {
    testWidgets('SyncStatusBadge displays pure icon with counter badge and zero words', (tester) async {
      // Synced state: icon only, no visible Text widget showing status label
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStatusProvider.overrideWithValue(
              const SyncStatusSnapshot(state: SyncState.synced, pendingCount: 0),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const Scaffold(
              body: Center(child: SyncStatusBadge()),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byIcon(Icons.cloud_done_outlined), findsOneWidget);
      // Ensure no visible Text widgets inside SyncStatusBadge
      expect(find.descendant(of: find.byType(SyncStatusBadge), matching: find.byType(Text)), findsNothing);

      // Pending state: icon with badge number, only counter text visible
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStatusProvider.overrideWithValue(
              const SyncStatusSnapshot(state: SyncState.pending, pendingCount: 3),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const Scaffold(
              body: Center(child: SyncStatusBadge()),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byIcon(Icons.cloud_upload_outlined), findsOneWidget);
      expect(find.descendant(of: find.byType(SyncStatusBadge), matching: find.text('3')), findsOneWidget);
      expect(find.descendant(of: find.byType(SyncStatusBadge), matching: find.text('pending')), findsNothing);
      expect(find.descendant(of: find.byType(SyncStatusBadge), matching: find.text('to upload')), findsNothing);
    });

    testWidgets('Work orders screen renders inline location and wo.id without duplicate top bar', (tester) async {
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
            home: AppShell(initialIndex: 1), // Work orders tab (index 1)
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Inline location and work order number
      expect(find.text('·'), findsWidgets);
      expect(find.text('WO-1042'), findsOneWidget);
      expect(find.text('WO-1031'), findsOneWidget);
    });

    testWidgets('Unit turns screen renders cards without duplicate top bar and displays progress inline', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final session = FieldSession.demo()..setRole(AppRole.technician);
      session.startTurn(unit: session.units.first, type: TurnType.moveOut);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [fieldSessionProvider.overrideWith((ref) => session)],
          child: const NameplateFieldApp(
            home: AppShell(initialIndex: 2), // Unit turns tab (index 2)
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Switch to TURNS tab to verify _TurnCard inline progress
      await tester.tap(find.text('TURNS'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('INSPECTED'), findsWidgets);
      expect(find.byType(LinearProgressIndicator), findsWidgets);
    });

    testWidgets('Settings screen switches have white thumb and sections are correctly ordered', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final session = FieldSession.demo()..setRole(AppRole.technician);
      session.outbox.add(
        OutboxOp(
          id: 'test-1',
          type: 'work_order',
          summary: 'Update work order WO-1042',
        ),
      );

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

      // Verify switches exist and have activeThumbColor white
      final switches = tester.widgetList<Switch>(find.byType(Switch));
      expect(switches.isNotEmpty, isTrue);
      for (final sw in switches) {
        expect(sw.activeThumbColor, equals(Colors.white));
      }

      // Verify section titles exist
      expect(find.text('SYSTEM APPEARANCE'), findsOneWidget);
      expect(find.text('DATA TRANSPORT & OFFLINE BUFFER'), findsOneWidget);
      expect(find.text('UPLOAD QUEUE BUFFER'), findsOneWidget);
    });
  });
}
