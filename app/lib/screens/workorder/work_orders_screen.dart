import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import '../../widgets/sync_status_badge.dart';

/// "My work orders" — v0-scope.md §1.1. Assigned queue with priority and
/// due date; open/start/complete; attach service events.
///
/// TODO: back with a WorkOrderRepository reading the local mirror, scoped to
/// `assigned_to = current membership` (data-model.md §4 `work_order`).
class WorkOrdersScreen extends StatelessWidget {
  const WorkOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Work Orders'), actions: const [SyncStatusBadge()]),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.assignment_outlined, size: 48, color: NpColors.steel500),
              const SizedBox(height: 12),
              Text(
                'Work order queue placeholder.\nTODO: wire to WorkOrderRepository / local mirror.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
