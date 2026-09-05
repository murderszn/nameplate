import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';
import '../widgets/np_brand.dart';
import '../widgets/responsive_layout.dart';
import 'scan/scan_screen.dart';
import 'settings/settings_screen.dart';
import 'turn/turns_screen.dart';
import 'workorder/work_orders_screen.dart';
import 'role_selector_screen.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/providers.dart';

/// Root shell: adaptive navigation across the field app's core V0 flows
/// (v0-scope.md §1.1). Now role-aware: tech → full toolkit, renter → scan + status + report.
class AppShell extends ConsumerStatefulWidget {
  final int initialIndex;
  const AppShell({super.key, this.initialIndex = 0});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // If no role chosen yet, push selector (web direct launch bypasses splash).
    final session = ref.read(fieldSessionProvider);
    if (!session.hasSelectedRole) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !session.hasSelectedRole) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const RoleSelectorScreen()),
          );
        }
      });
    }
  }

  // Tech: full field toolkit. Renter: scan + requests + appliances against identified nameplates.
  List<Widget> get _screens {
    final session = ref.watch(fieldSessionProvider);
    if (session.isRenter) {
      return const [
        ScanScreen(),
        WorkOrdersScreen(), // auto-filtered via visibleWorkOrders → renterWorkOrders
        _RenterAppliancesScreen(),
        SettingsScreen(),
      ];
    }
    return const [
      ScanScreen(),
      WorkOrdersScreen(),
      TurnsScreen(),
      SettingsScreen(),
    ];
  }

  List<({IconData icon, IconData activeIcon, String label})> get _destinations {
    final session = ref.watch(fieldSessionProvider);
    if (session.isRenter) {
      return const [
        (icon: Icons.qr_code_scanner_outlined, activeIcon: Icons.qr_code_scanner, label: 'Scan'),
        (icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long, label: 'Requests'),
        (icon: Icons.kitchen_outlined, activeIcon: Icons.kitchen, label: 'Appliances'),
        (icon: Icons.settings_outlined, activeIcon: Icons.settings, label: 'Settings'),
      ];
    }
    return const [
      (icon: Icons.qr_code_scanner_outlined, activeIcon: Icons.qr_code_scanner, label: 'Scan'),
      (icon: Icons.assignment_outlined, activeIcon: Icons.assignment, label: 'Orders'),
      (icon: Icons.checklist_outlined, activeIcon: Icons.checklist, label: 'Turns'),
      (icon: Icons.settings_outlined, activeIcon: Icons.settings, label: 'Settings'),
    ];
  }

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
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
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
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOutCubic,
              width: 3,
              height: selected ? 32 : 0,
              decoration: const BoxDecoration(
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
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: SizedBox(
              width: double.infinity,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  AnimatedScale(
                    scale: selected ? 1.08 : 1.0,
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                    child: Icon(
                      selected ? activeIcon : icon,
                      size: 22,
                      color: selected
                          ? context.npColors.white
                          : context.npColors.gray500,
                    ),
                  ),
                  const SizedBox(height: 5),
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

/// Phone bottom bar — high-precision hardware dock with OLED frosted glass blur,
/// tactile capsule active state, and haptic feedback.
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
    return ClipRect(
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          decoration: BoxDecoration(
            color: context.npColors.bg.withValues(alpha: 0.85),
            border: Border(
              top: BorderSide(
                color: context.npColors.lineStrong,
                width: 0.8,
              ),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 62,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: destinations.asMap().entries.map((entry) {
                  final i = entry.key;
                  final d = entry.value;
                  final selected = selectedIndex == i;
                  return Expanded(
                    child: _BottomBarItem(
                      icon: d.icon,
                      activeIcon: d.activeIcon,
                      label: d.label,
                      selected: selected,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        onDestinationSelected(i);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BottomBarItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _BottomBarItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: selected
                ? context.npColors.bgElevated.withValues(alpha: 0.85)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? context.npColors.lineStrong.withValues(alpha: 0.9)
                  : Colors.transparent,
              width: 0.8,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedScale(
                scale: selected ? 1.08 : 1.0,
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                child: Icon(
                  selected ? activeIcon : icon,
                  size: 21,
                  color: selected
                      ? context.npColors.white
                      : context.npColors.gray500,
                ),
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label.toUpperCase(),
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                    color: selected
                        ? context.npColors.white
                        : context.npColors.gray500,
                    letterSpacing: 0.7,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RenterAppliancesScreen extends ConsumerWidget {
  const _RenterAppliancesScreen();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(fieldSessionProvider);
    final assets = session.renterAssets;
    if (assets.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Appliances')),
        body: Center(
          child: Text('No appliances found for your unit.', style: TextStyle(color: context.npColors.gray400)),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appliances'),
        centerTitle: false,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(32),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'UNIT 214 · SCOTTSDALE VISTA — ${assets.length} NAMEPLATES',
                style: NpType.mono.copyWith(fontSize: 10, color: context.npColors.gray500, fontWeight: FontWeight.w700, letterSpacing: 0.8),
              ),
            ),
          ),
        ),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: assets.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          final a = assets[i];
          return Container(
            decoration: BoxDecoration(
              color: context.npColors.bgCard,
              border: Border.all(color: context.npColors.line),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: context.npColors.bgElevated,
                    border: Border.all(color: context.npColors.lineLight),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.kitchen_outlined, size: 20, color: context.npColors.gray400),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a.categoryDisplayName, style: TextStyle(color: context.npColors.white, fontSize: 14, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 2),
                      Text('${a.manufacturer ?? ''} ${a.modelNumber ?? ''}'.trim(), style: TextStyle(color: context.npColors.gray400, fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(a.npid, style: NpType.mono.copyWith(fontSize: 11, color: NpColors.red, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {
                    // File work order against already-identified nameplate.
                    final woId = 'WO-RT-${DateTime.now().millisecondsSinceEpoch % 10000}';
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Request $woId filed for ${a.npid} — we’ll keep you updated.')),
                    );
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: context.npColors.white,
                    foregroundColor: context.npColors.bg,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Report', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
