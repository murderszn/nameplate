import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

/// Decoded result from an offline tag scan or manual input.
class NpidScanResult {
  final String npid;
  final String cleanNpid;
  final bool isValidFormat;
  final bool isChecksumValid;
  final bool hasSignature;
  final bool isSignatureAuthentic;
  final String? signature;
  final int? timestamp;
  final String? batchId;
  final String? orgId;
  final String message;

  const NpidScanResult({
    required this.npid,
    required this.cleanNpid,
    required this.isValidFormat,
    required this.isChecksumValid,
    required this.hasSignature,
    required this.isSignatureAuthentic,
    this.signature,
    this.timestamp,
    this.batchId,
    this.orgId,
    required this.message,
  });
}

/// Nameplate ID minting & Cryptographic Offline Verification Engine
/// - Crockford Base32 with Modulo-32/37 checksum validation.
/// - HMAC-SHA256 offline tag authentication (zero-signal environment).
/// - Matches scripts/nameplate_qr.py and docs/asset-tagging-strategy.md §6.1.
class Npid {
  Npid._();

  static const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static const checkAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ*~\$#=';
  static const defaultOrgSecret = 'nameplate_master_org_secret_v0_prod_2026';
  static const defaultOrgId = 'org_sonoran_fund4';
  static const baseUrl = 'https://np.app/a';

  static final _rng = Random.secure();

  /// Normalize raw string to standard uppercase Crockford (replaces I/L -> 1, O -> 0).
  static String normalize(String raw) {
    var s = raw.trim().toUpperCase().replaceAll('-', '').replaceAll(' ', '');
    s = s.replaceAll('I', '1').replaceAll('L', '1').replaceAll('O', '0');
    return s;
  }

  /// Compute Crockford check digit.
  static String calculateChecksum(String payloadDigits, {int modulo = 32}) {
    final norm = normalize(payloadDigits);
    var val = 0;
    for (var i = 0; i < norm.length; i++) {
      final ch = norm[i];
      final idx = alphabet.indexOf(ch);
      val = (val * 32 + (idx == -1 ? 0 : idx));
    }
    if (modulo == 37) {
      final checkIdx = val % 37;
      if (checkIdx < checkAlphabet.length) {
        return checkAlphabet[checkIdx];
      }
      return alphabet[checkIdx % 32];
    }
    return alphabet[val % 32];
  }

  /// Mint a standard 8-character Crockford Base32 NPID with check digit (NP-XXXXXXXC).
  static String mint({String prefix = 'NP-', int bodyLen = 7}) {
    final buf = StringBuffer();
    for (var i = 0; i < bodyLen; i++) {
      buf.write(alphabet[_rng.nextInt(alphabet.length)]);
    }
    final body = buf.toString();
    final check = calculateChecksum(body, modulo: 32);
    return '$prefix$body$check';
  }

  /// Generate HMAC-SHA256 signature for an NPID tag.
  static (String sig, int ts) generateSignature({
    required String npid,
    String orgId = defaultOrgId,
    String batchId = 'BATCH-01',
    int? issuedAt,
    String secretKey = defaultOrgSecret,
    int sigLen = 12,
  }) {
    final ts = issuedAt ?? (DateTime.now().millisecondsSinceEpoch ~/ 1000);
    var clean = normalize(npid);
    if (!clean.startsWith('NP')) {
      clean = 'NP$clean';
    }
    final payload = utf8.encode('NPID:$clean|ORG:$orgId|BATCH:$batchId|TS:$ts');
    final hmacSha256 = Hmac(sha256, utf8.encode(secretKey));
    final digest = hmacSha256.convert(payload);
    final sig = base64Url.encode(digest.bytes.sublist(0, sigLen)).replaceAll('=', '');
    return (sig, ts);
  }

  /// Verify cryptographic HMAC-SHA256 signature locally with zero network connection.
  static bool verifySignature({
    required String npid,
    required String signature,
    required int issuedAt,
    String orgId = defaultOrgId,
    String batchId = 'BATCH-01',
    String secretKey = defaultOrgSecret,
  }) {
    final expected = generateSignature(
      npid: npid,
      orgId: orgId,
      batchId: batchId,
      issuedAt: issuedAt,
      secretKey: secretKey,
      sigLen: 12,
    ).$1;
    return signature == expected;
  }

  /// Build full signed public URL payload (e.g. https://np.app/a/NP7K2M4QX9?s=...).
  static String payloadUrl(
    String npid, {
    bool includeCrypto = true,
    String orgId = defaultOrgId,
    String batchId = 'BATCH-01',
    String secretKey = defaultOrgSecret,
  }) {
    var clean = normalize(npid);
    if (!clean.startsWith('NP')) {
      clean = 'NP$clean';
    }
    if (!includeCrypto) {
      return '$baseUrl/$clean';
    }
    final (sig, ts) = generateSignature(
      npid: clean,
      orgId: orgId,
      batchId: batchId,
      secretKey: secretKey,
    );
    return '$baseUrl/$clean?s=$sig&t=$ts&b=$batchId&o=$orgId';
  }

  /// Parse and cryptographically verify any raw scan input (URL, URI, or manual text).
  static NpidScanResult parseAndVerify(
    String raw, {
    String orgId = defaultOrgId,
    String batchId = 'BATCH-01',
    String secretKey = defaultOrgSecret,
  }) {
    final trimmed = raw.trim();
    String candidateNpid = trimmed;
    String? sig;
    int? ts;
    String parsedBatch = batchId;
    String parsedOrg = orgId;

    if (trimmed.contains('np.app/a/')) {
      final part = trimmed.split('np.app/a/')[1];
      if (part.contains('?')) {
        final pieces = part.split('?');
        candidateNpid = pieces[0];
        final query = pieces[1];
        for (final param in query.split('&')) {
          if (param.startsWith('s=')) {
            sig = param.substring(2);
          } else if (param.startsWith('t=')) {
            ts = int.tryParse(param.substring(2));
          } else if (param.startsWith('b=')) {
            parsedBatch = param.substring(2);
          } else if (param.startsWith('o=')) {
            parsedOrg = param.substring(2);
          }
        }
      } else {
        candidateNpid = part;
      }
    } else if (trimmed.startsWith('np://t/')) {
      final sub = trimmed.substring(7);
      final parts = sub.split('/');
      candidateNpid = parts[0];
      if (parts.length > 1) {
        final tokenParts = parts[1].split('.');
        sig = tokenParts[0];
        if (tokenParts.length > 1) ts = int.tryParse(tokenParts[1]);
        if (tokenParts.length > 2) parsedBatch = tokenParts[2];
      }
    }

    final clean = normalize(candidateNpid);
    final core = clean.startsWith('NP') ? clean.substring(2) : clean;
    final formatted = 'NP-$core';

    if (core.length != 8) {
      return NpidScanResult(
        npid: formatted,
        cleanNpid: core,
        isValidFormat: false,
        isChecksumValid: false,
        hasSignature: false,
        isSignatureAuthentic: false,
        message: 'Invalid length: expected 8 characters (got ${core.length})',
      );
    }

    // Check characters
    for (var i = 0; i < core.length; i++) {
      final ch = core[i];
      if (!alphabet.contains(ch) && !checkAlphabet.contains(ch)) {
        return NpidScanResult(
          npid: formatted,
          cleanNpid: core,
          isValidFormat: false,
          isChecksumValid: false,
          hasSignature: false,
          isSignatureAuthentic: false,
          message: 'Invalid character "$ch" in NPID',
        );
      }
    }

    // Checksum verification
    final body = core.substring(0, 7);
    final checkChar = core[7];
    final expected32 = calculateChecksum(body, modulo: 32);
    final expected37 = calculateChecksum(body, modulo: 37);
    final isChecksumOk = (checkChar == expected32 || checkChar == expected37);

    // Cryptographic signature check
    final hasSig = sig != null && ts != null;
    var isSigOk = false;
    if (hasSig) {
      isSigOk = verifySignature(
        npid: core,
        signature: sig,
        issuedAt: ts,
        orgId: parsedOrg,
        batchId: parsedBatch,
        secretKey: secretKey,
      );
    }

    final msg = isSigOk
        ? '✓ Cryptographic Proof: 100% Authentic (Local)'
        : (hasSig
            ? '✗ Cryptographic signature mismatch'
            : (isChecksumOk ? '✓ Valid Crockford-32 Checksum' : 'Checksum Unverified'));

    return NpidScanResult(
      npid: formatted,
      cleanNpid: core,
      isValidFormat: true,
      isChecksumValid: isChecksumOk,
      hasSignature: hasSig,
      isSignatureAuthentic: isSigOk,
      signature: sig,
      timestamp: ts,
      batchId: parsedBatch,
      orgId: parsedOrg,
      message: msg,
    );
  }
}
