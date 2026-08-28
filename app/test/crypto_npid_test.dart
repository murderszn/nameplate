import 'package:flutter_test/flutter_test.dart';
import 'package:nameplate_field/services/field_session.dart';
import 'package:nameplate_field/services/npid.dart';

void main() {
  group('Cryptographic NPID & Offline Tag Verification Engine', () {
    test('Mints canonical 8-character Crockford Base32 NPID with valid checksum', () {
      for (var i = 0; i < 50; i++) {
        final npid = Npid.mint();
        expect(npid.startsWith('NP-'), isTrue);
        expect(npid.length, 11); // NP- + 8 characters
        
        final res = Npid.parseAndVerify(npid);
        expect(res.isValidFormat, isTrue);
        expect(res.isChecksumValid, isTrue);
      }
    });

    test('Cryptographically signs and verifies offline tag scan in zero-signal mode', () {
      final npid = Npid.mint();
      final signedUrl = Npid.payloadUrl(npid, orgId: 'org_sonoran_fund4', batchId: 'BATCH-01');

      expect(signedUrl, contains('https://np.app/a/NP'));
      expect(signedUrl, contains('s='));
      expect(signedUrl, contains('t='));

      final scanResult = Npid.parseAndVerify(signedUrl, orgId: 'org_sonoran_fund4', batchId: 'BATCH-01');
      expect(scanResult.isValidFormat, isTrue);
      expect(scanResult.hasSignature, isTrue);
      expect(scanResult.isSignatureAuthentic, isTrue);
      expect(scanResult.message, contains('Cryptographic Proof: 100% Authentic'));
    });

    test('Parses and verifies compact offline URI format (np://t/...)', () {
      const npid = 'NP-7K2M4QX9';
      const ts = 1787952258;
      final (sig, _) = Npid.generateSignature(npid: npid, issuedAt: ts, batchId: 'VAULT-01');
      final compactUri = 'np://t/NP7K2M4QX9/$sig.$ts.VAULT-01';

      final scanResult = Npid.parseAndVerify(compactUri, batchId: 'VAULT-01');
      expect(scanResult.isValidFormat, isTrue);
      expect(scanResult.hasSignature, isTrue);
      expect(scanResult.isSignatureAuthentic, isTrue);
      expect(scanResult.cleanNpid, '7K2M4QX9');
    });

    test('Detects forged or tampered signatures', () {
      final npid = Npid.mint();
      final tamperedUrl = 'https://np.app/a/$npid?s=FORGED_SIG_123&t=1787952258&b=BATCH-01&o=org_sonoran_fund4';
      
      final scanResult = Npid.parseAndVerify(tamperedUrl, orgId: 'org_sonoran_fund4', batchId: 'BATCH-01');
      expect(scanResult.isValidFormat, isTrue);
      expect(scanResult.hasSignature, isTrue);
      expect(scanResult.isSignatureAuthentic, isFalse);
      expect(scanResult.message, contains('mismatch'));
    });

    test('Normalizes ambiguous characters like 0/O, 1/I/L correctly', () {
      expect(Npid.normalize('np-1i1l-00oo'), 'NP11110000');
    });

    test('FieldSession offline verification resolves assigned assets and updates confirmed_at', () {
      final session = FieldSession.demo();
      final targetAsset = session.assets.firstWhere((a) => a.npid == 'NP-7K2M4QX9');
      final signedUrl = Npid.payloadUrl(targetAsset.npid);

      final (scanResult, foundAsset) = session.verifyAndLookup(signedUrl);
      expect(scanResult.isValidFormat, isTrue);
      expect(scanResult.isSignatureAuthentic, isTrue);
      expect(foundAsset, isNotNull);
      expect(foundAsset!.id, targetAsset.id);
      expect(foundAsset.currentLocationConfirmedAt, isNotNull);
    });

    test('FieldSession offline pre-allocated pool mints tags and refills on sync', () async {
      final session = FieldSession.demo();
      expect(session.remainingOfflinePoolCount, 500);

      // Mint 5 tags offline
      for (var i = 0; i < 5; i++) {
        final tag = session.mintTag();
        expect(tag.startsWith('NP-'), isTrue);
      }
      expect(session.remainingOfflinePoolCount, 495);
      expect(session.mintedTags.length, 5);

      // Perform cloud sync
      await session.forceSync();
      expect(session.remainingOfflinePoolCount, 500);
    });
  });
}
