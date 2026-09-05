import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/work_order.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../../widgets/sync_status_badge.dart';
import '../service/log_service_event_screen.dart';

class WorkOrdersScreen extends ConsumerStatefulWidget {
  const WorkOrdersScreen({super.key});

  @override
  ConsumerState<WorkOrdersScreen> createState() => _WorkOrdersScreenState();
}

class _WorkOrdersScreenState extends ConsumerState<WorkOrdersScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(fieldSessionProvider);
    final orders = session.visibleWorkOrders;
    final filtered = orders.where((wo) {
      if (_filter == 'all') return wo.status != WorkOrderStatus.completed;
      if (_filter == 'urgent') {
        return wo.priority == WorkOrderPriority.urgent ||
            wo.priority == WorkOrderPriority.emergency;
      }
      if (_filter == 'in_progress') {
        return wo.status == WorkOrderStatus.inProgress;
      }
      return true;
    }).toList();
    final isTablet = context.isTablet;

    return Scaffold(
      appBar: NpBrandAppBar(
        title: 'My work orders',
        showLogo: true,
        actions: const [SyncStatusBadge()],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: context.npColors.bg,
              border: Border(
                bottom: BorderSide(color: context.npColors.lineStrong),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterTab(
                    icon: Icons.pending_actions_rounded,
                    label: 'Open',
                    count: orders
                        .where((w) => w.status != WorkOrderStatus.completed)
                        .length,
                    selected: _filter == 'all',
                    onTap: () => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterTab(
                    icon: Icons.warning_amber_rounded,
                    label: 'Urgent',
                    selected: _filter == 'urgent',
                    onTap: () => setState(() => _filter = 'urgent'),
                    accentRed: true,
                  ),
                  const SizedBox(width: 8),
                  _FilterTab(
                    icon: Icons.engineering_rounded,
                    label: 'In Progress',
                    selected: _filter == 'in_progress',
                    onTap: () => setState(() => _filter = 'in_progress'),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.assignment_turned_in_outlined,
                          size: 48,
                          color: context.npColors.gray700,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No work orders in this filter.',
                          style: NpType.mono.copyWith(
                            color: context.npColors.gray500,
                            fontSize: 12,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  )
                : isTablet
                ? GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      mainAxisExtent: 210,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) =>
                        _WorkOrderCard(wo: filtered[i]),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.only(bottom: 32),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox.shrink(),
                    itemBuilder: (context, i) =>
                        _WorkOrderCard(wo: filtered[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final int? count;
  final bool selected;
  final bool accentRed;
  final VoidCallback onTap;

  const _FilterTab({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.count,
    this.accentRed = false,
  });

  @override
  Widget build(BuildContext context) {
    final fg = selected
        ? context.npColors.bg
        : (accentRed ? NpColors.red : context.npColors.gray400);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        borderRadius: BorderRadius.circular(2),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: selected
                ? context.npColors.white
                : context.npColors.bgElevated,
            borderRadius: BorderRadius.circular(2),
            border: Border.all(
              color: selected
                  ? context.npColors.white
                  : (accentRed
                        ? NpColors.redBorder
                        : context.npColors.lineStrong),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: fg),
              const SizedBox(width: 6),
              Text(
                label.toUpperCase(),
                style: NpType.mono.copyWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: fg,
                ),
              ),
              if (count != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: selected
                        ? context.npColors.bg.withValues(alpha: 0.12)
                        : context.npColors.bgCard,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Text(
                    '$count',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: selected
                          ? context.npColors.bg
                          : context.npColors.gray400,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Simplified full-bleed Work Order card showing only key operational telemetry before choosing.
class _WorkOrderCard extends ConsumerWidget {
  final WorkOrder wo;
  const _WorkOrderCard({required this.wo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUrgent =
        wo.priority == WorkOrderPriority.urgent ||
        wo.priority == WorkOrderPriority.emergency;
    final schematic = NpAssets.schematicFor(wo.title);
    final session = ref.watch(fieldSessionProvider);

    Asset? asset = wo.assetNpid != null
        ? session.lookupAsset(wo.assetNpid!)
        : null;
    if (asset == null && wo.unitId != null) {
      final unitAssets = session.rosterForUnit(wo.unitId!);
      if (unitAssets.isNotEmpty) asset = unitAssets.first;
    }
    asset ??= Asset(
      id: 'asset-${wo.id.toLowerCase()}',
      npid: wo.assetNpid ?? 'NP-WO-${wo.id.replaceAll('WO-', '')}',
      categoryDisplayName: 'General Mechanical',
      manufacturer: 'Portfolio Equipment',
      modelNumber: 'Standard Spec',
      serialNumber: 'WO-${wo.id}',
      unitId: wo.unitId ?? 'unit-general',
      currentLocationLabel: wo.unitLabel,
    );

    void openServiceLogger() {
      HapticFeedback.lightImpact();
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => LogServiceEventScreen(asset: asset!, workOrder: wo),
        ),
      );
    }

    final blockColor = switch (wo.priority) {
      WorkOrderPriority.emergency =>
        const Color(0xFFC51F2D).withValues(alpha: 0.15),
      WorkOrderPriority.urgent =>
        const Color(0xFFF59E0B).withValues(alpha: 0.15),
      _ => context.npColors.bgElevated,
    };
    final blockIcon = switch (wo.priority) {
      WorkOrderPriority.emergency => Icons.warning_amber_rounded,
      WorkOrderPriority.urgent => Icons.priority_high_rounded,
      _ => Icons.build_outlined,
    };
    final blockIconColor = switch (wo.priority) {
      WorkOrderPriority.emergency => const Color(0xFFC51F2D),
      WorkOrderPriority.urgent => const Color(0xFFF59E0B),
      _ => context.npColors.gray400,
    };

    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: openServiceLogger,
        splashColor: NpColors.redSubtle,
        highlightColor: context.npColors.white08,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: context.npColors.line, width: 0.8),
            ),
          ),
          child: Stack(
            children: [
              // 64px left priority color-block
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 64,
                child: Container(
                  color: blockColor,
                  child: Center(
                    child: Icon(
                      blockIcon,
                      color: blockIconColor,
                      size: 24,
                    ),
                  ),
                ),
              ),
              // Right content
              Padding(
                padding: const EdgeInsets.only(left: 64),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Key row 1: Micro-header with soft tinted background
                    Container(
                      color: isUrgent ? NpColors.redSubtle : context.npColors.bgCard,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        children: [
                          Flexible(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isUrgent ? NpColors.red.withValues(alpha: 0.12) : context.npColors.bgElevated,
                                      border: Border.all(color: isUrgent ? NpColors.redBorder : context.npColors.lineStrong, width: 0.8),
                                      borderRadius: BorderRadius.circular(2),
                                    ),
                                    child: Text(
                                      wo.id,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: NpType.mono.copyWith(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 10,
                                        color: isUrgent ? NpColors.red : context.npColors.white,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ),
                                if (wo.status == WorkOrderStatus.inProgress) ...[
                                  const SizedBox(width: 6),
                                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: NpColors.red, shape: BoxShape.circle)),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            flex: 2,
                            child: Text(
                              wo.slaLabel.toUpperCase(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                              style: NpType.mono.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                                color: isUrgent ? NpColors.red : context.npColors.gray500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.arrow_forward_ios_rounded, size: 10, color: context.npColors.gray500),
                        ],
                      ),
                    ),
                      // Key row 2: compact thumbnail + title + location
                      Padding(
                        padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            if (schematic != null) ...[
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: context.npColors.bgElevated,
                                  border: Border.all(color: context.npColors.lineStrong, width: 0.8),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(2),
                                  child: Padding(
                                    padding: const EdgeInsets.all(3.0),
                                    child: NpApplianceArt(
                                      categoryOrTitle: wo.title,
                                      fit: BoxFit.contain,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    wo.title,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 11,
                                      color: context.npColors.white,
                                      height: 1.25,
                                      letterSpacing: -0.2,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.place_outlined,
                                        size: 12,
                                        color: context.npColors.gray500,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          wo.unitLabel,
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            color: context.npColors.gray400,
                                            fontWeight: FontWeight.w500,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
  }
}
