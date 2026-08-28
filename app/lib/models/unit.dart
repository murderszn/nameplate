/// Mirrors `property`, `building`, and `unit` in docs/data-model.md §2.
/// Deliberately four fixed hierarchy levels — see data-model.md §2 for why
/// a generic tree was rejected.
enum OccupancyStatus { occupied, vacant, turning, offline, model }

class Property {
  final String id;
  final String name;
  final String? code;

  const Property({required this.id, required this.name, this.code});
}

class Unit {
  final String id;
  final String propertyId;
  final String propertyName;
  final String buildingName;
  final String label; // "4B", "112"
  OccupancyStatus occupancyStatus;
  DateTime? lastTurnCompletedAt;

  Unit({
    required this.id,
    required this.propertyId,
    required this.propertyName,
    required this.buildingName,
    required this.label,
    this.occupancyStatus = OccupancyStatus.occupied,
    this.lastTurnCompletedAt,
  });

  String get displayName => '$buildingName — $label';
}

extension OccupancyStatusX on OccupancyStatus {
  String get label => switch (this) {
        OccupancyStatus.occupied => 'Occupied',
        OccupancyStatus.vacant => 'Vacant',
        OccupancyStatus.turning => 'Turning',
        OccupancyStatus.offline => 'Offline',
        OccupancyStatus.model => 'Model',
      };
}
