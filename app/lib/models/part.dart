/// Mirrors `part` and `part_usage` in docs/data-model.md §5.
///
/// `Part` is a *specific physical part instance* worth tracing (salvaged,
/// high-value, or warrantied). The lineage link (`sourceAssetId`) is the
/// product's signature flow: "this control board came out of unit 4B's dead
/// fridge." Cheap consumables (a $4 door seal) don't need a Part instance —
/// they're recorded directly on PartUsage via `descriptionOnly`.
enum PartOrigin { newPurchase, salvaged, warrantyReplacement, vendorSupplied, unknown }

enum PartCondition { newCondition, testedGood, untested, refurbished, suspect }

class Part {
  final String id;
  final String? label;
  final String componentType;
  final PartOrigin origin;

  /// The lineage link — which asset this part was pulled from, if salvaged.
  final String? sourceAssetId;
  final String? sourceAssetLabel; // e.g. "Fridge NP-7K2M4QX9 (Unit 4B)"
  final DateTime? salvagedAt;
  final PartCondition condition;
  final double acquisitionCost;
  final double? imputedValue;

  const Part({
    required this.id,
    required this.componentType,
    this.label,
    this.origin = PartOrigin.unknown,
    this.sourceAssetId,
    this.sourceAssetLabel,
    this.salvagedAt,
    this.condition = PartCondition.untested,
    this.acquisitionCost = 0,
    this.imputedValue,
  });
}

enum PartUsageAction { installed, removed, swapped, tested, returned }

/// An installation/removal record tied to one ServiceEvent.
class PartUsage {
  final String id;
  final PartUsageAction action;
  final Part? part; // traced instance, if any
  final String? descriptionOnly; // uncatalogued consumable
  final double quantity;
  final double unitCost;
  final String? removedPartId; // on a swap, what came out

  const PartUsage({
    required this.id,
    required this.action,
    this.part,
    this.descriptionOnly,
    this.quantity = 1,
    this.unitCost = 0,
    this.removedPartId,
  });

  double get totalCost => quantity * unitCost;
}
