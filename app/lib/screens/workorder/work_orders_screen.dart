import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/work_order.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../../widgets/sync_status_badge.dart';

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
        return wo.priority == WorkOrderPriority.urgent || wo.priority == WorkOrderPriority.emergency;
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
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: NpColors.bg,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ChoiceChip(
                    label: Text('Open (${orders.where((w) => w.status != WorkOrderStatus.completed).length})'),
                    selected: _filter == 'all',
                    onSelected: (_) => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('Urgent & emergency'),
                    selected: _filter == 'urgent',
                    onSelected: (_) => setState(() => _filter = 'urgent'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('In progress'),
                    selected: _filter == 'in_progress',
                    onSelected: (_) => setState(() => _filter = 'in_progress'),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text('No work orders in this filter.', style: TextStyle(color: NpColors.gray500)))
                : isTablet
                    ? GridView.builder(
                        padding: const EdgeInsets.all(20),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          mainAxisExtent: 200,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) => _WorkOrderCard(wo: filtered[i]),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, i) => _WorkOrderCard(wo: filtered[i]),
                      ),
          ),
        ],
      ),
    );
  }
}

class _WorkOrderCard extends ConsumerWidget {
  final WorkOrder wo;
  const _WorkOrderCard({required this.wo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tone = switch (wo.priority) {
      WorkOrderPriority.emergency => NpPillTone.fault,
      WorkOrderPriority.urgent => NpPillTone.caution,
      _ => NpPillTone.neutral,
    };
    final schematic = NpAssets.schematicFor(wo.title);

    return Card(
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
                    fontSize: 13,
                    color: NpColors.red,
                    letterSpacing: 0.4,
                  ),
                ),
                const Spacer(),
                NpStatusPill(label: wo.priority.label, tone: tone),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (schematic != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: Image.asset(schematic, width: 40, height: 40, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    wo.title,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: NpColors.white),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.place_outlined, size: 14, color: NpColors.gray500),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(wo.unitLabel, style: const TextStyle(fontSize: 12, color: NpColors.gray400), overflow: TextOverflow.ellipsis),
                ),
                Text(
                  wo.status.label,
                  style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray400),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (wo.status == WorkOrderStatus.assigned)
                  TextButton(
                    onPressed: () => ref.read(fieldSessionProvider).updateWorkOrderStatus(wo, WorkOrderStatus.inProgress),
                    style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                    child: const Text('Start'),
                  ),
                if (wo.status == WorkOrderStatus.inProgress)
                  TextButton(
                    onPressed: () => ref.read(fieldSessionProvider).updateWorkOrderStatus(wo, WorkOrderStatus.completed),
                    style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                    child: const Text('Complete'),
                  ),
                const Spacer(),
                Text(wo.slaLabel, style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray400)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
