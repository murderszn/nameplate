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
    (
      icon: Icons.qr_code_scanner_outlined,
      activeIcon: Icons.qr_code_scanner,
      label: 'Scan',
    ),
    (
      icon: Icons.assignment_outlined,
      activeIcon: Icons.assignment,
      label: 'Orders',
    ),
    (
      icon: Icons.checklist_outlined,
      activeIcon: Icons.checklist,
      label: 'Turns',
    ),
    (
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings,
      label: 'Settings',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final useRail = context.isTablet;

    if (useRail) {
      return Scaffold(
        body: Row(
          children: [
            _SideRail(
              selectedIndex: _index,
              onDestinationSelected: (i) => setState(() => _index = i),
              destinations: _destinations,
            ),
            Container(width: 1, color: context.npColors.lineStrong),
            Expanded(
              child: IndexedStack(index: _index, children: _screens),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: _BottomBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations,
      ),
    );
  }
}

/// Tablet side rail — editorial black column with red active indicator.
class _SideRail extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<({IconData icon, IconData activeIcon, String label})> destinations;

  const _SideRail({
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 72,
      color: context.npColors.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top logo block aligned to exact 72px app bar height
          SizedBox(
            height: 71,
            child: Center(
              child: NpLogo(height: 30),
            ),
          ),
          Container(height: 1, color: context.npColors.lineStrong),
          SizedBox(height: 12),
          ...destinations.asMap().entries.map((entry) {
            final i = entry.key;
            final d = entry.value;
            final selected = selectedIndex == i;
            return _RailItem(
              icon: d.icon,
              activeIcon: d.activeIcon,
              label: d.label,
              selected: selected,
              onTap: () => onDestinationSelected(i),
            );
          }),
          Spacer(),
          Container(height: 1, color: context.npColors.lineStrong),
          SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _RailItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _RailItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      hoverColor: context.npColors.bgCard.withValues(alpha: 0.5),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Red left indicator bar
          Positioned(
            left: 0,
            child: AnimatedContainer(
              duration: Duration(milliseconds: 180),
              width: 3,
              height: selected ? 32 : 0,
              decoration: BoxDecoration(
                color: NpColors.red,
                borderRadius: BorderRadius.only(
                  topRight: Radius.circular(2),
                  bottomRight: Radius.circular(2),
                ),
              ),
            ),
          ),
          // Centered Icon & Label
          Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: SizedBox(
              width: double.infinity,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Icon(
                    selected ? activeIcon : icon,
                    size: 22,
                    color: selected
                        ? context.npColors.white
                        : context.npColors.gray500,
                  ),
                  SizedBox(height: 5),
                  Text(
                    label.toUpperCase(),
                    style: NpType.mono.copyWith(
                      fontSize: 8.5,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                      color: selected
                          ? context.npColors.white
                          : context.npColors.gray500,
                      letterSpacing: 0.8,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Phone bottom bar — sharp editorial style with red top-line on selected item.
class _BottomBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<({IconData icon, IconData activeIcon, String label})> destinations;

  const _BottomBar({
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(top: BorderSide(color: context.npColors.lineStrong)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: destinations.asMap().entries.map((entry) {
              final i = entry.key;
              final d = entry.value;
              final selected = selectedIndex == i;
              return Expanded(
                child: GestureDetector(
                  onTap: () => onDestinationSelected(i),
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: Duration(milliseconds: 180),
                        height: 2,
                        color: selected ? NpColors.red : Colors.transparent,
                      ),
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              selected ? d.activeIcon : d.icon,
                              size: 22,
                              color: selected
                                  ? context.npColors.white
                                  : context.npColors.gray500,
                            ),
                            SizedBox(height: 3),
                            Text(
                              d.label.toUpperCase(),
                              style: NpType.mono.copyWith(
                                fontSize: 9,
                                fontWeight: selected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                color: selected
                                    ? context.npColors.white
                                    : context.npColors.gray500,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
