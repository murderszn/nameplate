import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/work_order.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../../widgets/sync_status_badge.dart';
import '../asset/asset_detail_screen.dart';
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
        actions: [SyncStatusBadge()],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter bar
          Container(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                  SizedBox(width: 6),
                  _FilterTab(
                    icon: Icons.warning_amber_rounded,
                    label: 'Urgent',
                    selected: _filter == 'urgent',
                    onTap: () => setState(() => _filter = 'urgent'),
                    accentRed: true,
                  ),
                  SizedBox(width: 6),
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
                        SizedBox(height: 12),
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
                    padding: EdgeInsets.all(20),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      mainAxisExtent: 216,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) =>
                        _WorkOrderCard(wo: filtered[i]),
                  )
                : ListView.separated(
                    padding: EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => SizedBox(height: 10),
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
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 7),
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
              SizedBox(width: 6),
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
                SizedBox(width: 6),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 5, vertical: 1),
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

class _WorkOrderCard extends ConsumerWidget {
  final WorkOrder wo;
  const _WorkOrderCard({required this.wo});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUrgent =
        wo.priority == WorkOrderPriority.urgent ||
        wo.priority == WorkOrderPriority.emergency;
    final tone = switch (wo.priority) {
      WorkOrderPriority.emergency => NpPillTone.fault,
      WorkOrderPriority.urgent => NpPillTone.caution,
      _ => NpPillTone.neutral,
    };
    final schematic = NpAssets.schematicFor(wo.title);
    final session = ref.watch(fieldSessionProvider);
    final asset = wo.assetNpid != null
        ? session.lookupAsset(wo.assetNpid!)
        : null;

    void openServiceLogger() {
      if (asset != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => LogServiceEventScreen(asset: asset, workOrder: wo),
          ),
        );
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('No asset bound to ${wo.id}')));
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          left: BorderSide(
            color: isUrgent ? NpColors.red : context.npColors.lineStrong,
            width: isUrgent ? 3 : 1,
          ),
          top: BorderSide(color: context.npColors.lineStrong),
          right: BorderSide(color: context.npColors.lineStrong),
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                Spacer(),
                NpStatusPill(label: wo.priority.label, tone: tone),
                SizedBox(width: 6),
                NpMenuButton<String>(
                  size: 28,
                  items: [
                    if (asset != null)
                      NpMenuItem(
                        value: 'asset',
                        label: 'Asset Specs (${asset.npid})',
                        icon: Icons.inventory_2_outlined,
                      ),
                    NpMenuItem(
                      value: 'copy',
                      label: 'Copy WO Reference',
                      icon: Icons.copy_rounded,
                    ),
                  ],
                  onSelected: (val) {
                    if (val == 'asset' && asset != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => AssetDetailScreen(assetId: asset.id),
                        ),
                      );
                    } else if (val == 'copy') {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Copied ${wo.id} to clipboard')),
                      );
                    }
                  },
                ),
              ],
            ),
            SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (schematic != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: Image.asset(
                      schematic,
                      width: 38,
                      height: 38,
                      fit: BoxFit.cover,
                    ),
                  ),
                  SizedBox(width: 10),
                ],
                Expanded(
                  child: Text(
                    wo.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      color: context.npColors.white,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.place_outlined,
                  size: 13,
                  color: context.npColors.gray500,
                ),
                SizedBox(width: 4),
                Expanded(
                  child: Text(
                    wo.unitLabel,
                    style: TextStyle(
                      fontSize: 12,
                      color: context.npColors.gray400,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  wo.slaLabel,
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    color: context.npColors.gray500,
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            NpButton.primary(
              icon: Icons.build_rounded,
              label: wo.status == WorkOrderStatus.inProgress
                  ? 'Log service event'
                  : 'Start work order',
              size: NpButtonSize.sm,
              isExpanded: true,
              onPressed: openServiceLogger,
            ),
          ],
        ),
      ),
    );
  }
}
