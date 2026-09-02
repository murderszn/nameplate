enum WorkOrderPriority { emergency, urgent, standard, low }

enum WorkOrderStatus { assigned, inProgress, awaitingParts, completed }

class WorkOrder {
  final String id;
  final String title;
  final String? assetNpid;
  final String unitLabel;
  final String? unitId;
  WorkOrderPriority priority;
  WorkOrderStatus status;
  final String slaLabel;
  final String? sourceTurnId;
  final DateTime createdAt;

  WorkOrder({
    required this.id,
    required this.title,
    required this.unitLabel,
    this.unitId,
    required this.priority,
    required this.status,
    required this.slaLabel,
    this.assetNpid,
    this.sourceTurnId,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

extension WorkOrderPriorityX on WorkOrderPriority {
  String get label => switch (this) {
    WorkOrderPriority.emergency => 'Emergency',
    WorkOrderPriority.urgent => 'Urgent',
    WorkOrderPriority.standard => 'Standard',
    WorkOrderPriority.low => 'Low',
  };
}

extension WorkOrderStatusX on WorkOrderStatus {
  String get label => switch (this) {
        WorkOrderStatus.assigned => 'Assigned',
        WorkOrderStatus.inProgress => 'In progress',
        WorkOrderStatus.awaitingParts => 'Awaiting parts',
        WorkOrderStatus.completed => 'Completed',
      };
}
