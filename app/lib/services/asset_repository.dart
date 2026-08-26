import '../models/asset.dart';

/// Repository for Asset data.
///
/// TODO(sync): per architecture.md §4.1, this must become the ONLY layer the
/// UI talks to. It should read exclusively from the local Drift/SQLite mirror
/// (app/lib/data/local/) and never call the network directly — the network's
/// sole job is to keep SQLite fresh via /v1/sync/pull and /v1/sync/push
/// (architecture.md §4.2, §4.4). Every screen must render identically online
/// or offline.
///
/// TODO(scan): `lookupByCode` must resolve fully offline against the local
/// mirror (v0-scope.md §1.1 "Scan & identify"). A code outside the local
/// working set should be queued as an UnresolvedScan / asset_identifier_scan
/// row (architecture.md §4.6, data-model.md §3 `asset_identifier_scan`) —
/// do not silently drop it; it's a shrinkage-detection signal.
///
/// TODO(outbox): all mutating calls here (move, retire, updateAttributes)
/// must write to the local mirror immediately AND enqueue an outbox row
/// `{op_id: uuidv7, entity_type, entity_id, op_type, payload, occurred_at,
/// device_id, attempts, state}` per architecture.md §4.2. UI reflects the
/// change immediately, badged `--np-offline-500` "pending sync."
class AssetRepository {
  /// In-memory placeholder store for this scaffold. Replace with Drift DAOs.
  final List<Asset> _demoAssets = _seedDemoAssets();

  Future<List<Asset>> getWorkingSet() async {
    // TODO: read from Drift local mirror (scoped to assigned properties).
    return _demoAssets;
  }

  Future<Asset?> lookupByCode(String code) async {
    // TODO: resolve NPID / manufacturer serial / legacy tag against local
    // SQLite mirror per GET /v1/assets/lookup?code= (architecture.md §3).
    // Must work fully offline (architecture.md §4.6).
    final normalized = code.trim().toUpperCase();
    for (final asset in _demoAssets) {
      if (asset.npid.toUpperCase() == normalized ||
          (asset.serialNumber?.toUpperCase() == normalized)) {
        return asset;
      }
    }
    return null;
  }

  Future<Asset?> getById(String id) async {
    // TODO: read from local mirror.
    for (final asset in _demoAssets) {
      if (asset.id == id) return asset;
    }
    return null;
  }

  Future<void> flagMissingOrBroken({
    required String assetId,
    required String reason,
    String? notes,
  }) async {
    // TODO: writes an outbox op that server-side maps to a status change
    // (`asset.status = 'unaccounted_for'` or 'needs_repair') and, per
    // data-model.md §6, a `finding='missing'` never immediately declares
    // theft — it opens an investigation work order and starts the 30-day
    // grace-window clock (data-model.md §9.4).
  }

  static List<Asset> _seedDemoAssets() {
    return [
      Asset(
        id: '018f2f3a-0000-7000-8000-000000000001',
        npid: 'NP-7K2M4QX9',
        categoryDisplayName: 'Refrigerator',
        manufacturer: 'Whirlpool',
        modelNumber: 'WRT318FZDW',
        serialNumber: 'K33512847',
        status: AssetStatus.active,
        condition: AssetCondition.good,
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Building C — Unit 4B',
        currentLocationConfirmedAt: DateTime(2026, 6, 12),
        installDate: DateTime(2019, 3, 3),
        lastServiceAt: DateTime(2026, 3, 3),
        lifetimeServiceCost: 214.50,
      ),
      Asset(
        id: '018f2f3a-0000-7000-8000-000000000002',
        npid: 'NP-9P4T2WB1',
        categoryDisplayName: 'Washer',
        manufacturer: 'GE',
        modelNumber: 'GTW465ASNWW',
        serialNumber: 'ZM445218',
        status: AssetStatus.needsRepair,
        condition: AssetCondition.fair,
        currentLocationType: LocationType.unit,
        currentLocationLabel: 'Main — Unit 12C',
        currentLocationConfirmedAt: DateTime(2026, 5, 28),
        installDate: DateTime(2021, 7, 15),
        lastServiceAt: DateTime(2026, 8, 1),
        lifetimeServiceCost: 89.00,
      ),
    ];
  }
}
