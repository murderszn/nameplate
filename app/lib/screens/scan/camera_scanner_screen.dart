import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../theme/app_theme.dart';

/// Full-screen hardware scanner. Returns the first decoded QR payload to the
/// Scan screen, where the existing offline NPID verification and lookup run.
class CameraScannerScreen extends StatefulWidget {
  const CameraScannerScreen({super.key});

  @override
  State<CameraScannerScreen> createState() => _CameraScannerScreenState();
}

class _CameraScannerScreenState extends State<CameraScannerScreen>
    with WidgetsBindingObserver {
  late final MobileScannerController _scannerController;
  bool _handledCode = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      formats: [BarcodeFormat.qrCode],
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_scannerController.value.hasCameraPermission) return;

    switch (state) {
      case AppLifecycleState.resumed:
        if (!_handledCode) unawaited(_scannerController.start());
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        unawaited(_scannerController.stop());
    }
  }

  Future<void> _handleCapture(BarcodeCapture capture) async {
    if (_handledCode) return;

    String? payload;
    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue?.trim();
      if (raw != null && raw.isNotEmpty) {
        payload = raw;
        break;
      }
    }
    if (payload == null) return;

    _handledCode = true;
    await HapticFeedback.mediumImpact();
    await _scannerController.stop();

    if (mounted) Navigator.of(context).pop(payload);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_scannerController.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: NpColors.onSolid,
        title: Text(
          'Scan nameplate',
          style: NpType.mono.copyWith(
            color: NpColors.onSolid,
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _scannerController,
            builder: (context, state, _) {
              final torchAvailable = state.torchState != TorchState.unavailable;
              final torchOn = state.torchState == TorchState.on;
              return IconButton(
                tooltip: torchOn ? 'Turn flashlight off' : 'Turn flashlight on',
                onPressed: torchAvailable
                    ? () => unawaited(_scannerController.toggleTorch())
                    : null,
                icon: Icon(torchOn ? Icons.flash_on : Icons.flash_off),
              );
            },
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: _handleCapture,
            errorBuilder: (context, error) => _ScannerError(error: error),
          ),
          IgnorePointer(
            child: Center(
              child: AspectRatio(
                aspectRatio: 1,
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: CustomPaint(painter: _ScannerFramePainter()),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              minimum: EdgeInsets.fromLTRB(20, 20, 20, 28),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.78),
                  border: Border.all(color: context.npColors.lineStrong),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Center the QR code in the frame',
                  textAlign: TextAlign.center,
                  style: NpType.mono.copyWith(
                    color: context.npColors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScannerError extends StatelessWidget {
  final MobileScannerException error;

  const _ScannerError({required this.error});

  @override
  Widget build(BuildContext context) {
    final permissionDenied =
        error.errorCode == MobileScannerErrorCode.permissionDenied;
    return ColoredBox(
      color: context.npColors.bg,
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.no_photography_outlined,
                color: NpColors.red,
                size: 44,
              ),
              SizedBox(height: 16),
              Text(
                permissionDenied
                    ? 'Camera access required'
                    : 'Camera unavailable',
                style: NpType.mono.copyWith(
                  color: context.npColors.white,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                ),
              ),
              SizedBox(height: 10),
              Text(
                permissionDenied
                    ? 'Enable Camera for Nameplate Field in iPhone Settings, then reopen the scanner.'
                    : error.errorDetails?.message ?? error.errorCode.message,
                textAlign: TextAlign.center,
                style: TextStyle(color: context.npColors.gray400),
              ),
              SizedBox(height: 18),
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text('Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScannerFramePainter extends CustomPainter {
  _ScannerFramePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = NpColors.red
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square;
    const length = 48.0;

    final paths = <Path>[
      Path()
        ..moveTo(0, length)
        ..lineTo(0, 0)
        ..lineTo(length, 0),
      Path()
        ..moveTo(size.width - length, 0)
        ..lineTo(size.width, 0)
        ..lineTo(size.width, length),
      Path()
        ..moveTo(0, size.height - length)
        ..lineTo(0, size.height)
        ..lineTo(length, size.height),
      Path()
        ..moveTo(size.width - length, size.height)
        ..lineTo(size.width, size.height)
        ..lineTo(size.width, size.height - length),
    ];
    for (final path in paths) {
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
