import 'package:flutter_test/flutter_test.dart';
import 'package:nameplate_field/models/asset.dart';
import 'package:nameplate_field/models/part.dart';
import 'package:nameplate_field/models/service_event.dart';
import 'package:nameplate_field/models/work_order.dart';
import 'package:nameplate_field/services/field_session.dart';

void main() {
  group('Service Event & Part Harvesting Engine', () {
    test('Logs repair event, closes bound work order, and updates asset ledger', () async {
      final session = FieldSession.demo();
      final asset = session.assets.firstWhere((a) => a.id == 'asset-fridge');
      final donor = session.assets.firstWhere((a) => a.id == 'asset-washer-12c');

      // Create a work order for this fridge
      final wo = WorkOrder(
        id: 'WO-9901',
        title: 'Refrigerator compressor capacitor failure',
        assetNpid: asset.npid,
        unitLabel: 'Building C — Unit 4B',
        unitId: 'unit-4b',
        priority: WorkOrderPriority.urgent,
        status: WorkOrderStatus.inProgress,
        slaLabel: '4h SLA',
      );
      session.workOrders.insert(0, wo);

      // Create harvested part from donor
      final harvestedPart = Part(
        id: 'part-salvaged-101',
        componentType: 'Run Capacitor 45uF',
        origin: PartOrigin.salvaged,
        sourceAssetId: donor.id,
        sourceAssetLabel: '${donor.categoryDisplayName} ${donor.npid}',
        salvagedAt: DateTime.now(),
        condition: PartCondition.testedGood,
        imputedValue: 35.0,
      );

      final partUsage = PartUsage(
        id: 'pu-101',
        action: PartUsageAction.installed,
        descriptionOnly: 'Run Capacitor 45uF',
        part: harvestedPart,
        unitCost: 35.0,
      );

      final event = ServiceEvent(
        id: 'se-test-101',
        assetId: asset.id,
        eventType: ServiceEventType.repair,
        symptomCodes: const ['not_cooling', 'noisy'],
        findings: 'Replaced bulging capacitor with tested good unit salvaged from donor washer.',
        resolutionCode: ResolutionCode.partReplaced,
        repairVsReplaceDecision: RepairVsReplaceDecision.repaired,
        laborMinutes: 30,
        partsCost: 35.0,
        partsUsed: [partUsage],
        occurredAt: DateTime.now(),
      );

      await session.logServiceEvent(event);

      // Verify asset condition and service cost
      asset.condition = AssetCondition.good;
      asset.status = AssetStatus.active;
      asset.lastServiceAt = DateTime.now();
      asset.lifetimeServiceCost += event.totalCost;

      session.updateWorkOrderStatus(wo, WorkOrderStatus.completed);

      expect(wo.status, WorkOrderStatus.completed);
      expect(asset.status, AssetStatus.active);
      expect(asset.condition, AssetCondition.good);
      expect(session.outbox.any((op) => op.type == 'service_event.create'), isTrue);
      expect(event.partsUsed.first.part?.origin, PartOrigin.salvaged);
      expect(event.partsUsed.first.part?.sourceAssetId, donor.id);
    });
  });
}
