import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter/material.dart';

void main() {
  final svgs = [
    'assets/images/iso/fridge.svg',
    'assets/images/iso/range.svg',
    'assets/images/iso/washer.svg',
    'assets/images/iso/dryer.svg',
    'assets/images/iso/dishwasher.svg',
    'assets/images/iso/microwave.svg',
    'assets/images/iso/water-heater.svg',
    'assets/images/iso/hvac.svg',
    'assets/images/iso/thermostat.svg',
    'assets/images/iso/condenser.svg',
    'assets/images/iso/light/fridge.svg',
    'assets/images/iso/light/range.svg',
    'assets/images/iso/light/washer.svg',
    'assets/images/iso/light/dryer.svg',
    'assets/images/iso/light/dishwasher.svg',
    'assets/images/iso/light/microwave.svg',
    'assets/images/iso/light/water-heater.svg',
    'assets/images/iso/light/hvac.svg',
    'assets/images/iso/light/thermostat.svg',
    'assets/images/iso/light/condenser.svg',
  ];

  for (final path in svgs) {
    testWidgets('SvgPicture.asset loads $path', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SvgPicture.asset(path),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(SvgPicture), findsOneWidget);
    });
  }
}

