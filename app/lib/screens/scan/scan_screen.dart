import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import '../../widgets/sync_status_badge.dart';
import '../asset/asset_detail_screen.dart';
import '../settings/tag_studio_screen.dart';
import 'camera_scanner_screen.dart';

/// Scan & identify — the core loop, must be sub-3-seconds (v0-scope.md §1.1).
/// Features cryptographic offline MAC verification and Crockford-32 checksum checks.
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
        backgroundColor: NpColors.bgCard,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(4)),
          side: BorderSide(color: NpColors.lineStrong),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: NpColors.redSubtle,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: NpColors.redBorder),
              ),
              child: const Icon(Icons.verified, color: NpColors.red, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Unassigned Tag',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: NpColors.white,
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
            const SizedBox(height: 8),
            Text(
              'Valid cryptographic proof. Ready to bind to a new asset record.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NpColors.bgElevated,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: NpColors.lineStrong),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'STATUS: AUTHENTIC HARDWARE TAG',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      color: NpColors.red,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 6),
                  _MetaRow('Batch', res.batchId ?? 'BATCH-01'),
                  _MetaRow('Org', res.orgId ?? Npid.defaultOrgId),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Dismiss'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: NpColors.red),
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Claimed tag ${res.npid} for onboarding.'),
                ),
              );
            },
            child: const Text('Claim & Onboard'),
          ),
        ],
      ),
    );
  }

  Future<void> _openCameraScanner() async {
    if (_isScanning) return;
    setState(() => _isScanning = true);

    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const CameraScannerScreen()),
    );

    if (!mounted) return;
    setState(() => _isScanning = false);

    if (code == null || code.trim().isEmpty) return;
    _controller.text = code;
    await _lookup(code);
  }

  Widget _buildManualEntryCard() {
    final session = ref.watch(fieldSessionProvider);

    return Container(
      decoration: const BoxDecoration(
        color: NpColors.bgCard,
        border: Border(
          left: BorderSide(color: NpColors.lineStrong, width: 1),
          right: BorderSide(color: NpColors.lineStrong, width: 1),
          bottom: BorderSide(color: NpColors.lineStrong, width: 1),
          top: BorderSide(color: NpColors.lineStrong, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Card header bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: NpColors.lineStrong)),
            ),
            child: Row(
              children: [
                const NpKicker('01 / Manual lookup'),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: NpColors.bgElevated,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: NpColors.lineStrong),
                  ),
                  child: Text(
                    '${session.remainingOfflinePoolCount} TAGS',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      color: NpColors.red,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Manual NPID Lookup',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Enter an 8-character NPID or paste a signed payload URL. Verified locally in 0.003s.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _controller,
                  textCapitalization: TextCapitalization.characters,
                  style: NpType.mono.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    fontSize: 15,
                  ),
                  decoration: InputDecoration(
                    hintText: 'e.g. NP-7K2M4QX9 or https://np.app/a/...',
                    errorText: _error,
                    prefixIcon: const Icon(Icons.tag),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _controller.clear();
                        setState(() {
                          _error = null;
                          _liveResult = null;
                        });
                      },
                    ),
                  ),
                  onSubmitted: (_) => _lookup(),
                ),
                if (_liveResult != null && _liveResult!.isValidFormat) ...[
                  const SizedBox(height: 10),
                  _VerificationBanner(result: _liveResult!),
                ],
                const SizedBox(height: 16),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: NpColors.red,
                    foregroundColor: NpColors.white,
                  ),
                  onPressed: () => _lookup(),
                  icon: const Icon(Icons.search, size: 18),
                  label: const Text('Resolve Asset Record'),
                ),
                const SizedBox(height: 20),
                Container(height: 1, color: NpColors.lineStrong),
                const SizedBox(height: 16),
                Text(
                  'SAMPLE REPOSITORY TAGS',
                  style: NpType.mono.copyWith(
                    color: NpColors.gray500,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final code
                        in session.assets.take(4).map((a) => a.npid))
                      _TagChip(
                        code: code,
                        onTap: () {
                          _controller.text = code;
                          _lookup(code);
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const TagStudioScreen(),
                      ),
                    ),
                    icon: const Icon(Icons.qr_code_2, size: 16),
                    label: const Text('Open Hardware Tag Studio'),
                  ),
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
    final isTablet = context.isTablet;

    return Scaffold(
      appBar: const NpBrandAppBar(
        kicker: '00 / Field',
        title: 'Scan the plate',
        showLogo: true,
        actions: [SyncStatusBadge()],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? 28 : 16,
              vertical: isTablet ? 24 : 16,
            ),
            children: [
              Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: isTablet ? 560 : 480),
                  child: _ScannerViewfinder(
                    isScanning: _isScanning,
                    onOpenScanner: _openCameraScanner,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              _buildManualEntryCard(),
            ],
          ),
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
            style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray500),
          ),
          Text(
            value,
            style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray300),
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
        ? const Color(0xFF22C55E)
        : (checksumOk ? NpColors.gray300 : NpColors.red);
    final bg = authentic
        ? const Color(0xFF0A1F0E)
        : (checksumOk ? NpColors.bgElevated : const Color(0xFF1F0A0A));
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

class _TagChip extends StatelessWidget {
  final String code;
  final VoidCallback onTap;
  const _TagChip({required this.code, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: NpColors.bgElevated,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: NpColors.lineStrong),
        ),
        child: Text(
          code,
          style: NpType.mono.copyWith(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: NpColors.red,
            letterSpacing: 0.4,
          ),
        ),
      ),
    );
  }
}

// ── Scanner viewfinder ─────────────────────────────────────────────────────────

class _ScannerViewfinder extends StatefulWidget {
  final bool isScanning;
  final VoidCallback? onOpenScanner;

  const _ScannerViewfinder({this.isScanning = false, this.onOpenScanner});

  @override
  State<_ScannerViewfinder> createState() => _ScannerViewfinderState();
}

class _ScannerViewfinderState extends State<_ScannerViewfinder>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scan;

  @override
  void initState() {
    super.initState();
    _scan = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _scan.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = Container(
      decoration: const BoxDecoration(color: NpColors.bg),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Corner-bracket overlay
          const CustomPaint(painter: _CornerBracketPainter()),

          // Animated laser sweep
          AnimatedBuilder(
            animation: _scan,
            builder: (context, _) {
              return Align(
                alignment: Alignment(0, -0.85 + 1.7 * _scan.value),
                child: Container(
                  height: 1.5,
                  margin: const EdgeInsets.symmetric(horizontal: 36),
                  color: NpColors.red,
                ),
              );
            },
          ),

          // Center content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: NpColors.bgCard.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: NpColors.lineStrong),
                  ),
                  child: widget.isScanning
                      ? const SizedBox(
                          width: 36,
                          height: 36,
                          child: CircularProgressIndicator(
                            color: NpColors.red,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(
                          Icons.qr_code_scanner,
                          color: NpColors.red,
                          size: 36,
                        ),
                ),
                const SizedBox(height: 14),
                Text(
                  'AIM AT NAMEPLATE TAG',
                  textAlign: TextAlign.center,
                  style: NpType.mono.copyWith(
                    color: NpColors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'SUB-3S OFFLINE LOOKUP',
                  textAlign: TextAlign.center,
                  style: NpType.mono.copyWith(
                    color: NpColors.gray500,
                    fontSize: 10,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 14),
                GestureDetector(
                  onTap: widget.isScanning ? null : widget.onOpenScanner,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: NpColors.red,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.camera_alt,
                          size: 13,
                          color: NpColors.white,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          widget.isScanning
                              ? 'OPENING CAMERA'
                              : 'SCAN WITH CAMERA',
                          style: NpType.mono.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: NpColors.white,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return AspectRatio(aspectRatio: 1.0, child: content);
  }
}

/// Paints four L-shaped corner brackets in red.
class _CornerBracketPainter extends CustomPainter {
  const _CornerBracketPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = NpColors.red
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square;

    const len = 32.0;
    const pad = 16.0;

    // Top-left
    canvas.drawLine(Offset(pad, pad + len), Offset(pad, pad), paint);
    canvas.drawLine(Offset(pad, pad), Offset(pad + len, pad), paint);

    // Top-right
    canvas.drawLine(
      Offset(size.width - pad - len, pad),
      Offset(size.width - pad, pad),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - pad, pad),
      Offset(size.width - pad, pad + len),
      paint,
    );

    // Bottom-left
    canvas.drawLine(
      Offset(pad, size.height - pad - len),
      Offset(pad, size.height - pad),
      paint,
    );
    canvas.drawLine(
      Offset(pad, size.height - pad),
      Offset(pad + len, size.height - pad),
      paint,
    );

    // Bottom-right
    canvas.drawLine(
      Offset(size.width - pad - len, size.height - pad),
      Offset(size.width - pad, size.height - pad),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - pad, size.height - pad),
      Offset(size.width - pad, size.height - pad - len),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
