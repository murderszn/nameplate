import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
      if (_filter == 'in_progress') return wo.status == WorkOrderStatus.inProgress;
      return true;
    }).toList();
    final isTablet = context.isTablet;

    return Scaffold(
      appBar: const NpBrandAppBar(
        kicker: '01 / Dispatch',
        title: 'My work orders',
        showLogo: true,
        actions: [SyncStatusBadge()],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: NpColors.bg,
              border: Border(bottom: BorderSide(color: NpColors.lineStrong)),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterTab(
                    label: 'Open',
                    count: orders.where((w) => w.status != WorkOrderStatus.completed).length,
                    selected: _filter == 'all',
                    onTap: () => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 2),
                  _FilterTab(
                    label: 'Urgent',
                    selected: _filter == 'urgent',
                    onTap: () => setState(() => _filter = 'urgent'),
                    accentRed: true,
                  ),
                  const SizedBox(width: 2),
                  _FilterTab(
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
                        Icon(Icons.assignment_turned_in_outlined,
                            size: 48, color: NpColors.gray700),
                        const SizedBox(height: 12),
                        Text(
                          'No work orders in this filter.',
                          style: NpType.mono.copyWith(
                            color: NpColors.gray500,
                            fontSize: 12,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                  )
                : isTablet
                    ? GridView.builder(
                        padding: const EdgeInsets.all(20),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          mainAxisExtent: 192,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) =>
                            _WorkOrderCard(wo: filtered[i]),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
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
  final String label;
  final int? count;
  final bool selected;
  final bool accentRed;
  final VoidCallback onTap;

  const _FilterTab({
    required this.label,
    required this.selected,
    required this.onTap,
    this.count,
    this.accentRed = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? NpColors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(
            color: selected
                ? NpColors.white
                : (accentRed ? NpColors.redBorder : NpColors.lineStrong),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (accentRed && !selected)
              Container(
                width: 6,
                height: 6,
                margin: const EdgeInsets.only(right: 6),
                decoration: const BoxDecoration(
                  color: NpColors.red,
                  shape: BoxShape.circle,
                ),
              ),
            Text(
              label.toUpperCase(),
              style: NpType.mono.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
                color: selected
                    ? NpColors.bg
                    : (accentRed ? NpColors.red : NpColors.gray400),
              ),
            ),
            if (count != null) ...[
              const SizedBox(width: 6),
              Text(
                '$count',
                style: NpType.mono.copyWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: selected ? NpColors.bg : NpColors.gray500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WorkOrderCard extends ConsumerWidget {
  final WorkOrder wo;
  const _WorkOrderCard({required this.wo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUrgent = wo.priority == WorkOrderPriority.urgent ||
        wo.priority == WorkOrderPriority.emergency;
    final tone = switch (wo.priority) {
      WorkOrderPriority.emergency => NpPillTone.fault,
      WorkOrderPriority.urgent => NpPillTone.caution,
      _ => NpPillTone.neutral,
    };
    final schematic = NpAssets.schematicFor(wo.title);
    final session = ref.watch(fieldSessionProvider);
    final asset = wo.assetNpid != null ? session.lookupAsset(wo.assetNpid!) : null;

    void openServiceLogger() {
      if (asset != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => LogServiceEventScreen(asset: asset, workOrder: wo),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No asset bound to ${wo.id}')),
        );
      }
    }

    return GestureDetector(
      onTap: openServiceLogger,
      child: Container(
        decoration: BoxDecoration(
          color: NpColors.bgCard,
          border: Border(
            left: BorderSide(
              color: isUrgent ? NpColors.red : NpColors.lineStrong,
              width: isUrgent ? 3 : 1,
            ),
            top: const BorderSide(color: NpColors.lineStrong),
            right: const BorderSide(color: NpColors.lineStrong),
            bottom: const BorderSide(color: NpColors.lineStrong),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    wo.id,
                    style: NpType.mono.copyWith(
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      color: NpColors.red,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const Spacer(),
                  NpStatusPill(label: wo.priority.label, tone: tone),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (schematic != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: Image.asset(schematic, width: 38, height: 38, fit: BoxFit.cover),
                    ),
                    const SizedBox(width: 10),
                  ],
                  Expanded(
                    child: Text(
                      wo.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: NpColors.white,
                        height: 1.3,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.place_outlined, size: 13, color: NpColors.gray500),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      wo.unitLabel,
                      style: const TextStyle(fontSize: 12, color: NpColors.gray400),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      wo.status == WorkOrderStatus.assigned
                          ? '↗ TAP TO START & LOG'
                          : (wo.status == WorkOrderStatus.inProgress
                              ? '↗ TAP TO LOG SERVICE'
                              : ''),
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        color: NpColors.red,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    wo.slaLabel,
                    style: NpType.mono.copyWith(fontSize: 10, color: NpColors.gray500),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
