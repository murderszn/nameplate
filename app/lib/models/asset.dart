/// Mirrors the `asset` table in docs/data-model.md §3.
///
/// This is a trimmed field-app view — only what Nameplate Field needs to
/// render scan results, asset detail, and logging flows offline. The full
/// server-side model has many more columns (lineage, rollups, etc.); the
/// generated Dart client (see app/lib/data/remote/, not yet scaffolded) will
/// eventually supersede this hand-written class per architecture.md §6.
enum AssetStatus {
  active,
  needsRepair,
  awaitingParts,
  inRepair,
  inStorage,
  unaccountedFor,
  retired,
  disposed,
  salvage,
}

enum AssetCondition { newCondition, good, fair, poor, failed }

enum LocationType { unit, storage, vendor, inTransit, disposed, unknown }

class Asset {
  /// UUIDv7, client-generatable offline (architecture.md §3).
  final String id;

  /// Canonical scannable key: `NP-XXXXXXXX`. See docs/branding.md "Nameplate ID".
  final String npid;

  final String categoryDisplayName;
  final String? manufacturer;
  final String? modelNumber;
  final String? serialNumber;

  final AssetStatus status;
  final AssetCondition? condition;

  final LocationType currentLocationType;
  final String? currentLocationLabel; // e.g. "Unit 4B" or "Shop — Copper Ridge"
  final DateTime? currentLocationConfirmedAt;

  final DateTime? installDate;
  final DateTime? lastServiceAt;
  final double lifetimeServiceCost;

  const Asset({
    required this.id,
    required this.npid,
    required this.categoryDisplayName,
    this.manufacturer,
    this.modelNumber,
    this.serialNumber,
    this.status = AssetStatus.active,
    this.condition,
    this.currentLocationType = LocationType.unknown,
    this.currentLocationLabel,
    this.currentLocationConfirmedAt,
    this.installDate,
    this.lastServiceAt,
    this.lifetimeServiceCost = 0,
  });
}
