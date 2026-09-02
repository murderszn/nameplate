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
        color: context.npColors.bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.npColors.white, width: 2),
      ),
      child: Stack(
        children: [
          _Rivet(alignment: Alignment.topLeft),
          _Rivet(alignment: Alignment.topRight),
          _Rivet(alignment: Alignment.bottomLeft),
          _Rivet(alignment: Alignment.bottomRight),
          Padding(
            padding: EdgeInsets.fromLTRB(22, 28, 22, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    NpLogo(height: 28),
                    SizedBox(width: 8),
                    Text(
                      'NAMEPLATE',
                      style: NpType.mono.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 18),
                Center(
                  child: Container(
                    padding: EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: context.npColors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: QrImageView(
                      data: Npid.payloadUrl(npid),
                      version: QrVersions.auto,
                      size: 196,
                      gapless: true,
                      backgroundColor: context.npColors.white,
                      eyeStyle: QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: context.npColors.bg,
                      ),
                      dataModuleStyle: QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: context.npColors.bg,
                      ),
                      errorCorrectionLevel: QrErrorCorrectLevel.H,
                    ),
                  ),
                ),
                SizedBox(height: 16),
                Text(
                  'NAMEPLATE ID',
                  style: NpType.mono.copyWith(
                    color: context.npColors.gray400,
                    fontSize: 10,
                    letterSpacing: 1.6,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  npid,
                  style: NpType.mono.copyWith(
                    color: NpColors.red,
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                SizedBox(height: 12),
                Text(
                  'PROPERTY RECORD · DO NOT REMOVE\nSCAN TO RESOLVE TELEMETRY',
                  style: NpType.mono.copyWith(
                    color: context.npColors.gray500,
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
        margin: EdgeInsets.all(12),
        decoration: BoxDecoration(color: NpColors.red, shape: BoxShape.circle),
      ),
    );
  }
}
