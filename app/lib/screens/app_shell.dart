import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/np_brand.dart';
import '../widgets/responsive_layout.dart';
import 'scan/scan_screen.dart';
import 'settings/settings_screen.dart';
import 'turn/turns_screen.dart';
import 'workorder/work_orders_screen.dart';

/// Root shell: adaptive navigation across the field app's core V0 flows
/// (v0-scope.md §1.1).
/// On tablets, renders an HQ-style side rail. On phones, a bottom NavigationBar.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _screens = [
    ScanScreen(),
    WorkOrdersScreen(),
    TurnsScreen(),
    SettingsScreen(),
  ];

  static const _destinations = [
    (icon: Icons.qr_code_scanner, label: 'Scan'),
    (icon: Icons.assignment_outlined, label: 'Work Orders'),
    (icon: Icons.checklist_outlined, label: 'Turns'),
    (icon: Icons.settings_outlined, label: 'Settings'),
  ];

  @override
  Widget build(BuildContext context) {
    final useRail = context.isTablet;

    if (useRail) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: _index,
              onDestinationSelected: (i) => setState(() => _index = i),
              labelType: NavigationRailLabelType.all,
              leading: const Padding(
                padding: EdgeInsets.fromLTRB(8, 20, 8, 28),
                child: Column(
                  children: [
                    NpLogo(height: 44),
                    SizedBox(height: 10),
                    Text(
                      'NAMEPLATE',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        letterSpacing: -0.2,
                        color: NpColors.white,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'FIELD',
                      style: TextStyle(
                        fontFamily: NpType.monoFamily,
                        fontFamilyFallback: NpType.monoFallbacks,
                        fontWeight: FontWeight.w700,
                        fontSize: 10,
                        letterSpacing: 1.8,
                        color: NpColors.red,
                      ),
                    ),
                  ],
                ),
              ),
              destinations: _destinations
                  .map(
                    (d) => NavigationRailDestination(
                      icon: Icon(d.icon),
                      label: Text(d.label),
                    ),
                  )
                  .toList(),
            ),
            const VerticalDivider(thickness: 1, width: 1, color: NpColors.lineLight),
            Expanded(
              child: IndexedStack(index: _index, children: _screens),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Divider(height: 1, color: NpColors.lineLight),
          NavigationBar(
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            destinations: _destinations
                .map(
                  (d) => NavigationDestination(
                    icon: Icon(d.icon),
                    label: d.label,
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}
