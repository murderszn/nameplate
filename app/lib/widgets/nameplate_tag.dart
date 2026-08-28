import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../services/npid.dart';
import '../theme/app_theme.dart';
import 'np_brand.dart';

/// Physical Nameplate Tag preview — same plate language as the marketing
/// QR studio (white QR, red rivets, mono NPID).
class NameplateTag extends StatelessWidget {
  final String npid;
  const NameplateTag({super.key, required this.npid});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: NpColors.bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NpColors.white, width: 2),
        boxShadow: const [
          BoxShadow(color: NpColors.redGlow, blurRadius: 28, spreadRadius: -4),
        ],
      ),
      child: Stack(
        children: [
          const _Rivet(alignment: Alignment.topLeft),
          const _Rivet(alignment: Alignment.topRight),
          const _Rivet(alignment: Alignment.bottomLeft),
          const _Rivet(alignment: Alignment.bottomRight),
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 28, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const NpLogo(height: 28),
                    const SizedBox(width: 8),
                    Text(
                      'NAMEPLATE',
                      style: NpType.mono.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        fontSize: 12,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: NpColors.red,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'SPEC 01',
                        style: NpType.mono.copyWith(
                          color: NpColors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: NpColors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: QrImageView(
                      data: Npid.payloadUrl(npid),
                      version: QrVersions.auto,
                      size: 196,
                      gapless: true,
                      backgroundColor: NpColors.white,
                      eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: NpColors.bg),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: NpColors.bg,
                      ),
                      errorCorrectionLevel: QrErrorCorrectLevel.H,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'NAMEPLATE ID',
                  style: NpType.mono.copyWith(
                    color: NpColors.gray400,
                    fontSize: 10,
                    letterSpacing: 1.6,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  npid,
                  style: NpType.mono.copyWith(
                    color: NpColors.red,
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'PROPERTY RECORD · DO NOT REMOVE\nSCAN TO RESOLVE TELEMETRY',
                  style: NpType.mono.copyWith(
                    color: NpColors.gray500,
                    fontSize: 9,
                    height: 1.45,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Rivet extends StatelessWidget {
  final Alignment alignment;
  const _Rivet({required this.alignment});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: Container(
        width: 10,
        height: 10,
        margin: const EdgeInsets.all(12),
        decoration: const BoxDecoration(
          color: NpColors.red,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: NpColors.redGlow, blurRadius: 10)],
        ),
      ),
    );
  }
}
