import 'package:flutter/material.dart';

import 'scan/scan_screen.dart';
import 'settings/settings_screen.dart';
import 'turn/turns_screen.dart';
import 'workorder/work_orders_screen.dart';

/// Root shell: bottom navigation across the field app's core V0 flows
/// (v0-scope.md §1.1). "Scan" is first and default — it's the sub-3-second
/// core loop the whole product depends on.
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Scan'),
          NavigationDestination(icon: Icon(Icons.assignment_outlined), label: 'Work Orders'),
          NavigationDestination(icon: Icon(Icons.checklist_outlined), label: 'Turns'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
        ],
      ),
    );
  }
}
