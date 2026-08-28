import 'package:flutter/foundation.dart';

import '../models/asset.dart';
import '../models/service_event.dart';
import '../models/turn.dart';
import '../models/unit.dart';
import '../models/work_order.dart';
import 'npid.dart';
import 'sync_status_service.dart';

class FieldTech {
  final String id;
  final String name;
  final String email;
  final String role;

  const FieldTech({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });
}

class OutboxOp {
  final String id;
  final String type;
  final String summary;
  final DateTime occurredAt;
  bool synced;

  OutboxOp({
    required this.id,
    required this.type,
    required this.summary,
    DateTime? occurredAt,
    this.synced = false,
  }) : occurredAt = occurredAt ?? DateTime.now();
}

class MintedTag {
  final String npid;
  final DateTime mintedAt;
  bool claimed;

  MintedTag({required this.npid, DateTime? mintedAt, this.claimed = false})
      : mintedAt = mintedAt ?? DateTime.now();
}

/// In-memory field working set. UI reads only from here (architecture.md §4.1).
/// Replace with Drift once the sync engine exists; screens should not care.
class FieldSession extends ChangeNotifier {
  FieldSession.demo() {
    _seed();
  }

  static const orgName = 'Sonoran Portfolio Management';

  late FieldTech tech;
  late List<FieldTech> roster;
  late List<Property> properties;
  late Set<String> assignedPropertyIds;
  late List<Unit> units;
  late List<Asset> assets;
  late List<Turn> turns;
  late List<WorkOrder> workOrders;
  final List<OutboxOp> outbox = [];
  final List<MintedTag> mintedTags = [];
  final List<String> offlinePreAllocatedPool = [];

  bool photoWifiOnly = true;
  bool offlineMode = false;
  bool syncing = false;
  DateTime? lastSyncedAt = DateTime.now().subtract(const Duration(minutes: 4));
  late final String deviceId;

  int get remainingOfflinePoolCount => offlinePreAllocatedPool.length;

  List<Unit> get visibleUnits =>
      units.where((u) => assignedPropertyIds.contains(u.propertyId)).toList();

  List<Turn> get visibleTurns =>
      turns.where((t) => visibleUnits.any((u) => u.id == t.unitId)).toList();

  List<WorkOrder> get visibleWorkOrders {
    final ids = visibleUnits.map((u) => u.id).toSet();
    return workOrders.where((wo) => wo.unitId == null || ids.contains(wo.unitId)).toList();
  }

  int get pendingCount => outbox.where((o) => !o.synced).length;

  DateTime? get oldestUnsyncedAt {
    final pending = outbox.where((o) => !o.synced).toList()
      ..sort((a, b) => a.occurredAt.compareTo(b.occurredAt));
    return pending.isEmpty ? null : pending.first.occurredAt;
  }

  SyncStatusSnapshot get syncSnapshot {
    if (offlineMode) {
      return SyncStatusSnapshot(
        state: SyncState.offline,
        pendingCount: pendingCount,
        oldestUnsyncedAt: oldestUnsyncedAt,
      );
    }
    if (pendingCount > 0 || syncing) {
      return SyncStatusSnapshot(
        state: SyncState.pending,
        pendingCount: pendingCount,
        oldestUnsyncedAt: oldestUnsyncedAt,
      );
    }
    return const SyncStatusSnapshot(state: SyncState.synced);
  }

  List<Asset> rosterForUnit(String unitId) =>
      assets.where((a) => a.unitId == unitId).toList();

  Asset? lookupAsset(String code) {
    final normalized = Npid.normalize(code);
    final core = normalized.startsWith('NP') ? normalized.substring(2) : normalized;
    for (final asset in assets) {
      final assetNorm = Npid.normalize(asset.npid);
      final assetCore = assetNorm.startsWith('NP') ? assetNorm.substring(2) : assetNorm;
      if (assetCore == core ||
          asset.npid.toUpperCase() == normalized ||
          (asset.serialNumber != null && Npid.normalize(asset.serialNumber!) == normalized)) {
        return asset;
      }
    }
    return null;
  }

  /// Cryptographically verify and resolve an offline scan code.
  (NpidScanResult result, Asset? asset) verifyAndLookup(String rawCode) {
    final scanResult = Npid.parseAndVerify(rawCode);
    final foundAsset = lookupAsset(scanResult.npid);
    if (foundAsset != null) {
      foundAsset.currentLocationConfirmedAt = DateTime.now();
      _enqueue('scan.verified', 'Scanned ${foundAsset.npid} (${foundAsset.categoryDisplayName})');
    } else {
      _enqueue('scan.unresolved', 'Scanned tag ${scanResult.npid} (unbound / pending assignment)');
    }
    notifyListeners();
    return (scanResult, foundAsset);
  }

  Unit? unitById(String id) {
    for (final u in units) {
      if (u.id == id) return u;
    }
    return null;
  }

  Turn? inProgressTurnForUnit(String unitId) {
    for (final t in turns) {
      if (t.unitId == unitId && t.status == TurnStatus.inProgress) return t;
    }
    return null;
  }

  void selectTech(FieldTech next) {
    tech = next;
    _enqueue('identity', 'Signed in as ${next.name}');
    notifyListeners();
  }

  void setAssignedProperties(Set<String> ids) {
    assignedPropertyIds = ids.isEmpty ? {properties.first.id} : ids;
    _enqueue('scope', 'Property scope updated (${assignedPropertyIds.length})');
    notifyListeners();
  }

  void setPhotoWifiOnly(bool value) {
    photoWifiOnly = value;
    notifyListeners();
  }

  void setOfflineMode(bool value) {
    offlineMode = value;
    notifyListeners();
  }

  Future<void> forceSync() async {
    if (offlineMode) return;
    syncing = true;
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 700));
    for (final op in outbox) {
      op.synced = true;
    }
    // Refill offline allocation pool to 500 tags on sync
    _refillOfflinePool();
    lastSyncedAt = DateTime.now();
    syncing = false;
    notifyListeners();
  }

  String mintTag() {
    String id;
    if (offlinePreAllocatedPool.isNotEmpty) {
      id = offlinePreAllocatedPool.removeAt(0);
    } else {
      id = Npid.mint();
    }
    mintedTags.insert(0, MintedTag(npid: id));
    _enqueue('npid.mint', 'Minted $id (Offline block: ${offlinePreAllocatedPool.length} remaining)');
    notifyListeners();
    return id;
  }

  void _refillOfflinePool() {
    while (offlinePreAllocatedPool.length < 500) {
      offlinePreAllocatedPool.add(Npid.mint());
    }
  }

  Turn startTurn({required Unit unit, required TurnType type}) {
    final existing = inProgressTurnForUnit(unit.id);
    if (existing != null) return existing;

    final roster = rosterForUnit(unit.id);
    final existingCategories = roster.map((a) => a.categoryDisplayName).toSet();
    const standardSuite = [
      'Refrigerator',
      'Range',
      'Dishwasher',
      'Microwave',
      'Washer',
      'Dryer',
      'HVAC',
      'Thermostat',
    ];

    final items = <TurnItem>[
      for (final asset in roster)
        TurnItem(
          id: 'ti-${asset.id}',
          assetId: asset.id,
          assetLabel: '${asset.categoryDisplayName} — ${asset.npid}',
          npid: asset.npid,
          category: asset.categoryDisplayName,
        ),
    ];

    if (items.length < 6) {
      for (final cat in standardSuite) {
        if (!existingCategories.contains(cat) && items.length < 6) {
          items.add(
            TurnItem(
              id: 'ti-exp-${unit.id}-${cat.toLowerCase()}',
              assetLabel: '$cat (Expected)',
              category: cat,
            ),
          );
        }
      }
    }

    final turn = Turn(
      id: 'turn-${DateTime.now().microsecondsSinceEpoch}',
      unitId: unit.id,
      unitLabel: unit.displayName,
      type: type,
      status: TurnStatus.inProgress,
      startedAt: DateTime.now(),
      items: items,
    );
    turns.insert(0, turn);
    unit.occupancyStatus = OccupancyStatus.turning;
    _enqueue('turn.start', 'Started ${type.label} on ${unit.displayName} (${items.length} items)');
    notifyListeners();
    return turn;
  }

  void saveTurnItem(TurnItem item) {
    notifyListeners();
  }

  Future<void> logServiceEvent(ServiceEvent event) async {
    final asset = lookupAsset(event.assetId);
    _enqueue(
      'service_event.create',
      'Logged ${event.eventType.name} on ${asset?.npid ?? event.assetId} (${event.resolutionCode?.name ?? "resolved"})',
    );
    notifyListeners();
  }

  TurnItem addUnexpectedAsset({
    required Turn turn,
    required String category,
    String? npid,
    String? notes,
  }) {
    final minted = npid ?? Npid.mint();
    final item = TurnItem(
      id: 'ti-found-${DateTime.now().microsecondsSinceEpoch}',
      assetLabel: '$category — $minted',
      npid: minted,
      category: category,
      finding: TurnItemFinding.unexpectedFound,
      notes: notes,
    );
    turn.items.add(item);
    _enqueue('turn.unexpected', 'Found untagged $category ($minted)');
    notifyListeners();
    return item;
  }

  bool verifyItemScan(TurnItem item, String code) {
    final normalized = Npid.normalize(code);
    final expected = item.npid == null ? null : Npid.normalize(item.npid!);
    final hit = expected != null && expected == normalized;
    if (hit) {
      item.verifiedByScan = true;
      final asset = lookupAsset(normalized);
      if (asset != null) {
        asset.currentLocationConfirmedAt = DateTime.now();
      }
      notifyListeners();
    }
    return hit;
  }

  TurnCompletion completeTurn(Turn turn) {
    if (!turn.allInspected) {
      throw StateError('Every item needs a finding before complete.');
    }
    var woCount = 0;
    for (final item in turn.items) {
      if (item.finding == TurnItemFinding.missing && item.assetId != null) {
        final asset = _assetById(item.assetId!);
        if (asset != null) asset.status = AssetStatus.unaccountedFor;
      }
      if (item.finding == TurnItemFinding.unexpectedFound && item.npid != null) {
        final unit = unitById(turn.unitId);
        assets.add(
          Asset(
            id: 'asset-${item.id}',
            npid: item.npid!,
            categoryDisplayName: item.category ?? 'Asset',
            status: AssetStatus.active,
            condition: item.condition,
            unitId: turn.unitId,
            currentLocationType: LocationType.unit,
            currentLocationLabel: unit?.displayName,
            currentLocationConfirmedAt: DateTime.now(),
          ),
        );
      }
      if (item.flagged) {
        woCount += 1;
        final wo = _workOrderForFinding(turn, item, woCount);
        item.generatedWorkOrderId = wo.id;
        workOrders.insert(0, wo);
      }
    }

    turn.status = TurnStatus.completed;
    turn.completedAt = DateTime.now();
    turn.workOrdersEmitted = woCount;
    final unit = unitById(turn.unitId);
    if (unit != null) {
      unit.lastTurnCompletedAt = turn.completedAt;
      unit.occupancyStatus = turn.type == TurnType.moveIn || turn.type == TurnType.onboarding
          ? OccupancyStatus.occupied
          : OccupancyStatus.vacant;
    }
    _enqueue(
      'turn.complete',
      'Completed ${turn.unitLabel} · ${turn.items.length} items · $woCount work orders',
    );
    notifyListeners();
    return TurnCompletion(turn: turn, workOrdersCreated: woCount);
  }

  void updateWorkOrderStatus(WorkOrder wo, WorkOrderStatus status) {
    wo.status = status;
    _enqueue('work_order.${status.name}', '${wo.id} → ${status.label}');
    notifyListeners();
  }

  void flagAsset({required String assetId, required String reason, String? notes}) {
    final asset = _assetById(assetId);
    if (asset == null) return;
    asset.status = reason == 'broken' ? AssetStatus.needsRepair : AssetStatus.unaccountedFor;
    _enqueue('asset.flag', 'Flagged ${asset.npid} ($reason)');
    notifyListeners();
  }

  void addPhotoToTurnItem(TurnItem item, String photoPath) {
    item.photos = [...item.photos, photoPath];
    _enqueue('turn.photo', 'Attached inspection photo to ${item.assetLabel}');
    notifyListeners();
  }

  void removePhotoFromTurnItem(TurnItem item, int index) {
    if (index >= 0 && index < item.photos.length) {
      final updated = List<String>.from(item.photos)..removeAt(index);
      item.photos = updated;
      notifyListeners();
    }
  }

  WorkOrder _workOrderForFinding(Turn turn, TurnItem item, int n) {
    final isCritical = (item.category == 'Refrigerator' || item.category == 'HVAC' || item.category == 'Range');
    final (priority, sla) = switch (item.finding) {
      TurnItemFinding.missing => (WorkOrderPriority.urgent, '24h SLA · High Priority'),
      TurnItemFinding.presentDamaged => isCritical ? (WorkOrderPriority.urgent, '4h SLA · Immediate') : (WorkOrderPriority.standard, '48h SLA · Standard'),
      TurnItemFinding.presentNeedsService => (WorkOrderPriority.standard, '72h SLA · Standard'),
      _ => (WorkOrderPriority.low, '168h SLA · Routine'),
    };
    final action = item.decision == TurnItemDecision.none
        ? (item.finding == TurnItemFinding.missing ? 'Investigate Missing' : 'Service & Repair')
        : item.decision.label;
    final photoNote = item.photos.isNotEmpty ? ' [${item.photos.length} Photo Evidence Attached]' : '';
    final notesText = item.notes != null && item.notes!.isNotEmpty ? ' — ${item.notes}' : '';

    return WorkOrder(
      id: 'WO-T${turn.id.hashCode.abs() % 900 + 100}-$n',
      title: '$action · ${item.category ?? item.assetLabel}$photoNote$notesText',
      assetNpid: item.npid,
      unitLabel: turn.unitLabel,
      unitId: turn.unitId,
      priority: priority,
      status: WorkOrderStatus.assigned,
      slaLabel: sla,
      sourceTurnId: turn.id,
    );
  }

  void _enqueue(String type, String summary) {
    outbox.insert(
      0,
      OutboxOp(
        id: 'op-${DateTime.now().microsecondsSinceEpoch}',
        type: type,
        summary: summary,
      ),
    );
  }

  void _seed() {
    deviceId = 'fld-sim-${DateTime.now().millisecondsSinceEpoch % 100000}';
    _refillOfflinePool();
    roster = const [
      FieldTech(
        id: 'tech-morales',
        name: 'J. Morales',
        email: 'j.morales@sonoran.example',
        role: 'Technician',
      ),
      FieldTech(
        id: 'tech-vance',
        name: 'D. Vance',
        email: 'd.vance@sonoran.example',
        role: 'Technician',
      ),
      FieldTech(
        id: 'tech-chen',
        name: 'Marcus Chen',
        email: 'marcus.chen@sonoran.example',
        role: 'Lead tech',
      ),
    ];
    tech = roster.first;

    properties = [
      const Property(id: 'prop-scottsdale', name: 'Scottsdale Vista', code: 'SV'),
      const Property(id: 'prop-ridge', name: 'Desert Ridge Commons', code: 'DR'),
      const Property(id: 'prop-camelback', name: 'Camelback Towers', code: 'CT'),
    ];
    assignedPropertyIds = properties.map((p) => p.id).toSet();

    units = [
      Unit(
        id: 'unit-4b',
        propertyId: 'prop-scottsdale',
        propertyName: 'Scottsdale Vista',
        buildingName: 'Building C',
        label: 'Unit 4B',
        occupancyStatus: OccupancyStatus.turning,
      ),
      Unit(
        id: 'unit-12c',
        propertyId: 'prop-ridge',
        propertyName: 'Desert Ridge Commons',
        buildingName: 'Main',
        label: 'Unit 12C',
        occupancyStatus: OccupancyStatus.vacant,
      ),
      Unit(
        id: 'unit-112',
        propertyId: 'prop-camelback',
        propertyName: 'Camelback Towers',
        buildingName: 'Building A',
        label: 'Unit 112',
        occupancyStatus: OccupancyStatus.occupied,
      ),
      Unit(
        id: 'unit-204',
        propertyId: 'prop-scottsdale',
        propertyName: 'Scottsdale Vista',
        buildingName: 'Building B',
        label: 'Unit 204',
        occupancyStatus: OccupancyStatus.occupied,
      ),
    ];

    assets = [
      Asset(
        id: 'asset-fridge',
        npid: 'NP-7K2M4QX9',
        categoryDisplayName: 'Refrigerator',
        manufacturer: 'Whirlpool',
        modelNumber: 'WRT318FZDW',
        serialNumber: 'K33512847',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
        currentLocationConfirmedAt: DateTime(2026, 6, 12),
        installDate: DateTime(2019, 3, 3),
        lastServiceAt: DateTime(2026, 3, 3),
        lifetimeServiceCost: 214.50,
      ),
      Asset(
        id: 'asset-washer-4b',
        npid: 'NP-3W9Q5R71',
        categoryDisplayName: 'Washer',
        manufacturer: 'Speed Queen',
        modelNumber: 'FF7005WN',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
      ),
      Asset(
        id: 'asset-dryer-4b',
        npid: 'NP-6K8L2P44',
        categoryDisplayName: 'Dryer',
        manufacturer: 'Speed Queen',
        modelNumber: 'DF7000WE',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
      ),
      Asset(
        id: 'asset-dw-4b',
        npid: 'NP-8V3Z6K19',
        categoryDisplayName: 'Dishwasher',
        manufacturer: 'GE',
        modelNumber: 'PDT715SYNFS',
        status: AssetStatus.active,
        condition: AssetCondition.fair,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
      ),
      Asset(
        id: 'asset-hvac-4b',
        npid: 'NP-1M4K9X23',
        categoryDisplayName: 'HVAC',
        manufacturer: 'Carrier',
        modelNumber: 'FE4ANF002',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
      ),
      Asset(
        id: 'asset-thermo-4b',
        npid: 'NP-2N7V9X65',
        categoryDisplayName: 'Thermostat',
        manufacturer: 'Honeywell',
        modelNumber: 'T9',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-4b',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
      ),
      Asset(
        id: 'asset-fridge-12c',
        npid: 'NP-5R2T8W11',
        categoryDisplayName: 'Refrigerator',
        manufacturer: 'Whirlpool',
        modelNumber: 'WRT518SZFM',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
      ),
      Asset(
        id: 'asset-washer-12c',
        npid: 'NP-9P4T2WB1',
        categoryDisplayName: 'Washer',
        manufacturer: 'GE',
        modelNumber: 'GTW465ASNWW',
        serialNumber: 'ZM445218',
        status: AssetStatus.needsRepair,
        condition: AssetCondition.fair,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
        lastServiceAt: DateTime(2026, 8, 1),
      ),
      Asset(
        id: 'asset-dryer-12c',
        npid: 'NP-4X7L3K92',
        categoryDisplayName: 'Dryer',
        manufacturer: 'GE',
        modelNumber: 'GTD42EASJWW',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
      ),
      Asset(
        id: 'asset-range-12c',
        npid: 'NP-1H8K6P34',
        categoryDisplayName: 'Range',
        manufacturer: 'Whirlpool',
        modelNumber: 'WGE745C0FS',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
      ),
      Asset(
        id: 'asset-micro-12c',
        npid: 'NP-5K9L1P88',
        categoryDisplayName: 'Microwave',
        manufacturer: 'GE',
        modelNumber: 'PVM9005SJSS',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
      ),
      Asset(
        id: 'asset-hvac-12c',
        npid: 'NP-8C2M7Q49',
        categoryDisplayName: 'HVAC',
        manufacturer: 'Trane',
        modelNumber: 'XR14',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-12c',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
      ),
      Asset(
        id: 'asset-fridge-112',
        npid: 'NP-2J6B8N44',
        categoryDisplayName: 'Refrigerator',
        manufacturer: 'Samsung',
        modelNumber: 'RS27T5200SR',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-range-112',
        npid: 'NP-7V4K9P12',
        categoryDisplayName: 'Range',
        manufacturer: 'GE',
        modelNumber: 'JB645RKSS',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-dw-112',
        npid: 'NP-3D9W5T67',
        categoryDisplayName: 'Dishwasher',
        manufacturer: 'Bosch',
        modelNumber: 'SHEM3AY52N',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-micro-112',
        npid: 'NP-6R1L8M33',
        categoryDisplayName: 'Microwave',
        manufacturer: 'Samsung',
        modelNumber: 'ME19R7041FS',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-hvac-112',
        npid: 'NP-HVAC-09',
        categoryDisplayName: 'HVAC',
        manufacturer: 'Goodman',
        modelNumber: 'GSX140241',
        status: AssetStatus.needsRepair,
        condition: AssetCondition.fair,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-wh-112',
        npid: 'NP-4T8K2W90',
        categoryDisplayName: 'Water heater',
        manufacturer: 'Rheem',
        modelNumber: 'PROG50-38N',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-112',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building A — Unit 112',
      ),
      Asset(
        id: 'asset-fridge-204',
        npid: 'NP-8M3K5Q71',
        categoryDisplayName: 'Refrigerator',
        manufacturer: 'LG',
        modelNumber: 'LFXS26973S',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
      Asset(
        id: 'asset-washer-204',
        npid: 'NP-1W7T9P44',
        categoryDisplayName: 'Washer',
        manufacturer: 'Whirlpool',
        modelNumber: 'WTW5000DW',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
      Asset(
        id: 'asset-dryer-204',
        npid: 'NP-5D2K8L19',
        categoryDisplayName: 'Dryer',
        manufacturer: 'Whirlpool',
        modelNumber: 'WED5000DW',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
      Asset(
        id: 'asset-range-204',
        npid: 'NP-6R4P2W88',
        categoryDisplayName: 'Range',
        manufacturer: 'Frigidaire',
        modelNumber: 'FFEF3054TS',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
      Asset(
        id: 'asset-hvac-204',
        npid: 'NP-3H9V1X22',
        categoryDisplayName: 'HVAC',
        manufacturer: 'Carrier',
        modelNumber: 'Comfort 14',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
      Asset(
        id: 'asset-wh-204',
        npid: 'NP-WTRHTR-04',
        categoryDisplayName: 'Water heater',
        manufacturer: 'Rheem',
        modelNumber: 'Performance 40',
        status: AssetStatus.needsRepair,
        condition: AssetCondition.fair,
        unitId: 'unit-204',
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building B — Unit 204',
      ),
    ];

    workOrders = [
      WorkOrder(
        id: 'WO-1042',
        title: 'Water heater pilot ignition failure',
        assetNpid: 'NP-WTRHTR-04',
        unitLabel: 'Building B — Unit 204',
        unitId: 'unit-204',
        priority: WorkOrderPriority.urgent,
        status: WorkOrderStatus.inProgress,
        slaLabel: '4h remaining',
      ),
      WorkOrder(
        id: 'WO-1031',
        title: 'HVAC air handler blower inspection',
        assetNpid: 'NP-HVAC-09',
        unitLabel: 'Building A — Unit 112',
        unitId: 'unit-112',
        priority: WorkOrderPriority.emergency,
        status: WorkOrderStatus.inProgress,
        slaLabel: '1h remaining',
      ),
      WorkOrder(
        id: 'WO-1039',
        title: 'Washer drain pump noise sweep',
        assetNpid: 'NP-9P4T2WB1',
        unitLabel: 'Main — Unit 12C',
        unitId: 'unit-12c',
        priority: WorkOrderPriority.standard,
        status: WorkOrderStatus.assigned,
        slaLabel: '28h remaining',
      ),
    ];

    turns = [];
  }

  Asset? _assetById(String id) {
    for (final a in assets) {
      if (a.id == id) return a;
    }
    return null;
  }
}

class TurnCompletion {
  final Turn turn;
  final int workOrdersCreated;
  const TurnCompletion({required this.turn, required this.workOrdersCreated});
}
