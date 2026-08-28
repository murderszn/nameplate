import '../models/asset.dart';
import 'field_session.dart';

/// Repository for Asset data. Reads the in-memory field session (the stand-in
/// for the Drift local mirror until architecture.md §4 is wired).
class AssetRepository {
  AssetRepository(this.session);
  final FieldSession session;

  Future<List<Asset>> getWorkingSet() async => session.assets;

  Future<Asset?> lookupByCode(String code) async => session.lookupAsset(code);

  Future<Asset?> getById(String id) async {
    for (final asset in session.assets) {
      if (asset.id == id) return asset;
    }
    return null;
  }

  Future<void> flagMissingOrBroken({
    required String assetId,
    required String reason,
    String? notes,
  }) async {
    session.flagAsset(assetId: assetId, reason: reason, notes: notes);
  }
}
