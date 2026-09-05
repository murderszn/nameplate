import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nameplate_field/screens/settings/fleet_gallery_screen.dart';
import 'package:nameplate_field/theme/app_theme.dart';
import 'package:nameplate_field/widgets/np_brand.dart';

void main() {
  group('The Fleet — Line Art Gallery & NpApplianceArt', () {
    testWidgets('Fleet gallery renders all 10 fleet items from iso.html',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const FleetGalleryScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Check header
      expect(find.text('The Fleet'), findsOneWidget);
      expect(find.text('10 UNITS // LINE ART'), findsOneWidget);

      // Check that appliances from iso.html are present in the fleet list
      expect(find.text('001'), findsOneWidget);
      expect(find.text('FRIDGE'), findsOneWidget);
      expect(find.text('002'), findsOneWidget);
      expect(find.text('RANGE'), findsOneWidget);

      // Check NpApplianceArt is rendered for cells
      expect(find.byType(NpApplianceArt), findsWidgets);
    });

    testWidgets('Tapping a fleet item opens bottom sheet with details',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.dark(),
          home: const FleetGalleryScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Tap FRIDGE (001)
      await tester.tap(find.text('FRIDGE'));
      await tester.pumpAndSettle();

      // Verify bottom sheet content
      expect(find.text('French-Door Refrigerator'), findsOneWidget);
      expect(find.text('001 // FRIDGE'), findsOneWidget);
      expect(find.text('STANDARD CATEGORY'), findsOneWidget);
      expect(find.text('Refrigerator'), findsOneWidget);
      expect(find.text('VECTOR ASSET PATH'), findsOneWidget);
      expect(find.text(NpAssets.isoFridge), findsOneWidget);
    });

    testWidgets('NpAssets.svgFor accurately resolves appliance queries',
        (tester) async {
      expect(NpAssets.svgFor('Refrigerator'), NpAssets.isoFridge);
      expect(NpAssets.svgFor('fridge repair'), NpAssets.isoFridge);
      expect(NpAssets.svgFor('Electric Range'), NpAssets.isoRange);
      expect(NpAssets.svgFor('Stove burner'), NpAssets.isoRange);
      expect(NpAssets.svgFor('Washer drain pump'), NpAssets.isoWasher);
      expect(NpAssets.svgFor('Dryer belt'), NpAssets.isoDryer);
      expect(NpAssets.svgFor('Dishwasher leak'), NpAssets.isoDishwasher);
      expect(NpAssets.svgFor('Microwave magnetron'), NpAssets.isoMicrowave);
      expect(NpAssets.svgFor('Water heater pilot'), NpAssets.isoWaterHeater);
      expect(NpAssets.svgFor('HVAC air handler'), NpAssets.isoHvac);
      expect(NpAssets.svgFor('Smart Thermostat'), NpAssets.isoThermostat);
      expect(NpAssets.svgFor('Outdoor Condenser'), NpAssets.isoCondenser);
    });
  });
}
