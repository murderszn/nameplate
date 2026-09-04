import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/services.dart';
import '../../widgets/np_action_buttons.dart';
import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/sync_status_badge.dart';
import '../asset/asset_detail_screen.dart';
import 'camera_scanner_screen.dart';

/// Scan and identify an asset by camera, NPID, or signed tag URL.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _controller = TextEditingController();
  NpidScanResult? _liveResult;
  String? _error;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      if (_liveResult != null) setState(() => _liveResult = null);
      return;
    }
    final res = Npid.parseAndVerify(text);
    setState(() {
      _liveResult = res;
      _error = null;
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    super.dispose();
  }

  Future<void> _lookup([String? explicitCode]) async {
    final code = (explicitCode ?? _controller.text).trim();
    if (code.isEmpty) return;

    final session = ref.read(fieldSessionProvider);
    final (scanRes, asset) = session.verifyAndLookup(code);

    setState(() {
      _liveResult = scanRes;
    });

    if (!mounted) return;

    if (asset != null) {
      setState(() => _error = null);
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => AssetDetailScreen(assetId: asset.id)),
      );
    } else {
      if (!scanRes.isValidFormat) {
        setState(() => _error = scanRes.message);
      } else {
        setState(() {
          _error =
              'Tag ${scanRes.npid} verified valid but not bound to an asset yet.';
        });
        _showUnassignedTagDialog(scanRes);
      }
    }
  }

  void _showUnassignedTagDialog(NpidScanResult res) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.npColors.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(4)),
          side: BorderSide(color: context.npColors.lineStrong),
        ),
        title: Row(
          children: [
            Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: NpColors.redSubtle,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: NpColors.redBorder),
              ),
              child: Icon(Icons.verified, color: NpColors.red, size: 18),
            ),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Unassigned Tag',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: context.npColors.white,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              res.npid,
              style: NpType.mono.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: NpColors.red,
                letterSpacing: 1.2,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Valid cryptographic proof. Ready to bind to a new asset record.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: context.npColors.gray400),
            ),
            SizedBox(height: 12),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.npColors.bgElevated,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: context.npColors.lineStrong),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verified tag',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      color: NpColors.red,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  SizedBox(height: 6),
                  _MetaRow('Batch', res.batchId ?? 'BATCH-01'),
                  _MetaRow('Org', res.orgId ?? Npid.defaultOrgId),
                ],
              ),
            ),
          ],
        ),
        actions: [
          NpButton.outline(
            size: NpButtonSize.sm,
            label: 'Dismiss',
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          NpButton.primary(
            size: NpButtonSize.sm,
            icon: Icons.verified_rounded,
            label: 'Claim tag',
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Claimed tag ${res.npid} for onboarding.'),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _openCameraScanner() async {
    if (_isScanning) return;
    setState(() => _isScanning = true);

    final code = await Navigator.of(
      context,
    ).push<String>(MaterialPageRoute(builder: (_) => CameraScannerScreen()));

    if (!mounted) return;
    setState(() => _isScanning = false);

    if (code == null || code.trim().isEmpty) return;
    _controller.text = code;
    await _lookup(code);
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim();
    if (text != null && text.isNotEmpty) {
      _controller.text = text;
      await _lookup(text);
    }
  }

  Widget _buildManualEntrySection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(
                '02 // IDENTIFICATION',
                style: NpType.mono.copyWith(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  color: context.npColors.gray400,
                  letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: context.npColors.bgElevated,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: context.npColors.lineStrong),
                ),
                child: Text(
                  'CROCKFORD BASE32',
                  style: NpType.mono.copyWith(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: context.npColors.gray500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Enter a tag ID',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: context.npColors.white,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Type a Nameplate ID or paste a tag link.',
            style: TextStyle(
              color: context.npColors.gray400,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            style: NpType.mono.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: 1.4,
              fontSize: 16,
              color: context.npColors.white,
            ),
            decoration: InputDecoration(
              hintText: 'NP-7K2M4QX9',
              errorText: _error,
              prefixIcon: Icon(Icons.tag_rounded, color: context.npColors.gray400),
              filled: true,
              fillColor: context.npColors.bgElevated,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(2),
                borderSide: BorderSide(color: context.npColors.lineStrong),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(2),
                borderSide: BorderSide(color: context.npColors.lineStrong),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(2),
                borderSide: const BorderSide(color: NpColors.red, width: 1.5),
              ),
              suffixIcon: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_controller.text.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
                      tooltip: 'Clear',
                      onPressed: () {
                        _controller.clear();
                        setState(() {
                          _error = null;
                          _liveResult = null;
                        });
                      },
                    ),
                  const SizedBox(width: 4),
                ],
              ),
            ),
            onSubmitted: (_) => _lookup(),
          ),
          if (_liveResult != null && _liveResult!.isValidFormat) ...[
            const SizedBox(height: 10),
            _VerificationBanner(result: _liveResult!),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: NpButton.primary(
                  icon: Icons.search_rounded,
                  label: 'Look up tag',
                  size: NpButtonSize.md,
                  isExpanded: true,
                  onPressed: () => _lookup(),
                ),
              ),
              const SizedBox(width: 10),
              NpIconButton(
                icon: Icons.content_paste_rounded,
                tooltip: 'Paste and look up',
                onPressed: _pasteFromClipboard,
                size: 44,
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Fast test plates ticker
          Row(
            children: [
              Icon(Icons.flash_on_rounded, size: 13, color: const Color(0xFFF59E0B)),
              const SizedBox(width: 5),
              Text(
                'QUICK DISPATCH TAGS',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: context.npColors.gray500,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _QuickTagChip(
                  tag: 'NP-WTRHTR-04',
                  label: 'Water Htr',
                  toneColor: NpColors.red,
                  onTap: () {
                    _controller.text = 'NP-WTRHTR-04';
                    _lookup('NP-WTRHTR-04');
                  },
                ),
                const SizedBox(width: 8),
                _QuickTagChip(
                  tag: 'NP-HVAC-09',
                  label: 'HVAC Air',
                  toneColor: NpColors.red,
                  onTap: () {
                    _controller.text = 'NP-HVAC-09';
                    _lookup('NP-HVAC-09');
                  },
                ),
                const SizedBox(width: 8),
                _QuickTagChip(
                  tag: 'NP-9P4T2WB1',
                  label: 'Washer Pump',
                  toneColor: const Color(0xFF3B82F6),
                  onTap: () {
                    _controller.text = 'NP-9P4T2WB1';
                    _lookup('NP-9P4T2WB1');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: NpBrandAppBar(
        title: 'Scan the plate',
        showLogo: true,
        actions: const [SyncStatusBadge()],
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // 01: Optical viewfinder stage
          _ScannerViewfinder(
            isScanning: _isScanning,
            onOpenScanner: _openCameraScanner,
          ),
          // Telemetry strip color block
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              border: Border(
                top: const BorderSide(color: Color(0xFF1E3A8A), width: 1),
                bottom: BorderSide(color: context.npColors.lineStrong),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'ZERO-SIGNAL READY',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF93C5FD),
                    letterSpacing: 0.8,
                  ),
                ),
                const Spacer(),
                Text(
                  'POOL: 48 TOKENS',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFFBBF24),
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'SYNC: LIVE',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF6EE7B7),
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
          // 02: Manual tag identification section
          _buildManualEntrySection(),
        ],
      ),
    );
  }
}

class _QuickTagChip extends StatelessWidget {
  final String tag;
  final String label;
  final Color toneColor;
  final VoidCallback onTap;

  const _QuickTagChip({
    required this.tag,
    required this.label,
    required this.toneColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(2),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: context.npColors.bgElevated,
          border: Border.all(color: context.npColors.lineStrong),
          borderRadius: BorderRadius.circular(2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: toneColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              tag,
              style: NpType.mono.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: context.npColors.white,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: context.npColors.gray400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ────────────────────────────────────────────────────────────────

class _MetaRow extends StatelessWidget {
  final String label;
  final String value;
  const _MetaRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Text(
            '$label: ',
            style: NpType.mono.copyWith(
              fontSize: 11,
              color: context.npColors.gray500,
            ),
          ),
          Text(
            value,
            style: NpType.mono.copyWith(
              fontSize: 11,
              color: context.npColors.gray300,
            ),
          ),
        ],
      ),
    );
  }
}

class _VerificationBanner extends StatelessWidget {
  final NpidScanResult result;
  const _VerificationBanner({required this.result});

  @override
  Widget build(BuildContext context) {
    final authentic = result.isSignatureAuthentic;
    final checksumOk = result.isChecksumValid;

    final color = authentic
        ? context.npSuccessFg
        : (checksumOk ? context.npColors.gray400 : context.npDangerFg);
    final bg = authentic
        ? context.npSuccessBg
        : (checksumOk ? context.npColors.bgElevated : context.npDangerBg);
    final icon = authentic
        ? Icons.verified
        : (checksumOk ? Icons.check_circle_outline : Icons.error_outline);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              result.message,
              style: NpType.mono.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Full-Bleed Scanner viewfinder ──────────────────────────────────────────────

class _ScannerViewfinder extends StatelessWidget {
  final bool isScanning;
  final VoidCallback? onOpenScanner;

  const _ScannerViewfinder({this.isScanning = false, this.onOpenScanner});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFF080A0F),
      ),
      child: Stack(
        children: [
          // Background technical grid texture
          Positioned.fill(
            child: Opacity(
              opacity: 0.08,
              child: CustomPaint(painter: _GridPainter()),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top registration header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        border: Border.all(color: const Color(0xFF334155)),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'OPTICAL SCANNER // ACTIVE',
                            style: NpType.mono.copyWith(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF38BDF8),
                              letterSpacing: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'ED25519 VERIFIED',
                      style: NpType.mono.copyWith(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF64748B),
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                // Optical Targeting Reticle Frame
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Outer bracket container
                      Container(
                        width: 190,
                        height: 120,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: const Color(0xFF1E293B),
                            width: 1,
                          ),
                        ),
                      ),
                      // Corner brackets
                      SizedBox(
                        width: 190,
                        height: 120,
                        child: CustomPaint(
                          painter: _CornerBracketsPainter(
                            color: const Color(0xFF38BDF8),
                          ),
                        ),
                      ),
                      // Center laser line
                      Positioned(
                        top: 59,
                        left: 10,
                        right: 10,
                        child: Container(
                          height: 1.5,
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.transparent,
                                NpColors.red,
                                NpColors.redHover,
                                Colors.transparent,
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Center QR icon
                      isScanning
                          ? const SizedBox(
                              width: 32,
                              height: 32,
                              child: CircularProgressIndicator(
                                color: NpColors.red,
                                strokeWidth: 2.5,
                              ),
                            )
                          : Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.qr_code_scanner_rounded,
                                  color: Colors.white,
                                  size: 38,
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'AIM AT PHYSICAL NAMEPLATE',
                                  style: NpType.mono.copyWith(
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF94A3B8),
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
                            ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                // Camera action button
                NpButton.primary(
                  icon: Icons.camera_alt_rounded,
                  label: isScanning ? 'Opening camera…' : 'Scan with camera',
                  isLoading: isScanning,
                  size: NpButtonSize.lg,
                  isExpanded: true,
                  onPressed: isScanning ? null : onOpenScanner,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 0.5;
    const step = 20.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CornerBracketsPainter extends CustomPainter {
  final Color color;
  const _CornerBracketsPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    const len = 14.0;

    // Top-left
    canvas.drawLine(const Offset(0, 0), const Offset(len, 0), paint);
    canvas.drawLine(const Offset(0, 0), const Offset(0, len), paint);

    // Top-right
    canvas.drawLine(Offset(size.width, 0), Offset(size.width - len, 0), paint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, len), paint);

    // Bottom-left
    canvas.drawLine(Offset(0, size.height), Offset(len, size.height), paint);
    canvas.drawLine(Offset(0, size.height), Offset(0, size.height - len), paint);

    // Bottom-right
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width - len, size.height), paint);
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width, size.height - len), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
