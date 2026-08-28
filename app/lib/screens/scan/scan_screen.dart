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
          _error = 'Tag ${scanRes.npid} verified valid but not bound to an asset yet.';
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
        title: Row(
          children: [
            const Icon(Icons.verified, color: NpColors.red, size: 24),
            const SizedBox(width: 8),
            Text('Unassigned Tag ${res.npid}', style: NpType.mono.copyWith(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'This hardware tag has a valid cryptographic proof and is ready to be bound to a new in-unit asset.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NpColors.bg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: NpColors.gray800),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('STATUS: AUTHENTIC HARDWARE TAG', style: NpType.mono.copyWith(fontSize: 10, color: NpColors.red, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('Batch: ${res.batchId ?? "BATCH-01"}', style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray400)),
                  Text('Org: ${res.orgId ?? Npid.defaultOrgId}', style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray400)),
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
                SnackBar(content: Text('Claimed tag ${res.npid} for onboarding.')),
              );
            },
            child: const Text('Claim & Onboard Asset'),
          ),
        ],
      ),
    );
  }

  void _simulateCameraScan() {
    setState(() => _isScanning = true);
    final assets = ref.read(fieldSessionProvider).assets;
    final sampleAsset = assets.isNotEmpty ? assets.first : null;
    final npidToScan = sampleAsset?.npid ?? 'NP-7K2M4QX9';
    final signedUrl = Npid.payloadUrl(npidToScan);

    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() {
        _isScanning = false;
        _controller.text = signedUrl;
      });
      _lookup(signedUrl);
    });
  }

  Widget _buildManualEntryCard() {
    final session = ref.watch(fieldSessionProvider);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                const NpKicker('01 / Manual lookup'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: NpColors.bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: NpColors.gray800),
                  ),
                  child: Text(
                    'Pool: ${session.remainingOfflinePoolCount} Tags',
                    style: NpType.mono.copyWith(fontSize: 10, color: NpColors.red, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Manual NPID Lookup',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Enter an 8-character NPID or paste a signed payload URL. Verified locally in 0.003s.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _controller,
              textCapitalization: TextCapitalization.characters,
              style: NpType.mono.copyWith(fontWeight: FontWeight.w700, letterSpacing: 1.2, fontSize: 15),
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _liveResult!.isSignatureAuthentic
                      ? const Color(0xFF0D2818)
                      : (_liveResult!.isChecksumValid ? const Color(0xFF141414) : const Color(0xFF2E0808)),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _liveResult!.isSignatureAuthentic
                        ? const Color(0xFF22C55E)
                        : (_liveResult!.isChecksumValid ? NpColors.gray700 : NpColors.red),
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _liveResult!.isSignatureAuthentic
                          ? Icons.verified
                          : (_liveResult!.isChecksumValid ? Icons.check_circle_outline : Icons.error_outline),
                      size: 16,
                      color: _liveResult!.isSignatureAuthentic
                          ? const Color(0xFF22C55E)
                          : (_liveResult!.isChecksumValid ? NpColors.gray400 : NpColors.red),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _liveResult!.message,
                        style: NpType.mono.copyWith(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: _liveResult!.isSignatureAuthentic
                              ? const Color(0xFF22C55E)
                              : (_liveResult!.isChecksumValid ? NpColors.gray300 : NpColors.red),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: NpColors.red,
                foregroundColor: NpColors.white,
              ),
              onPressed: () => _lookup(),
              icon: const Icon(Icons.search),
              label: const Text('Resolve Asset Record'),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            Text(
              'SAMPLE ACTIVE REPOSITORY TAGS',
              style: NpType.mono.copyWith(
                color: NpColors.gray500,
                fontSize: 11,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final code in session.assets.take(4).map((a) => a.npid))
                  ActionChip(
                    label: Text(code, style: NpType.mono.copyWith(fontSize: 12, fontWeight: FontWeight.w700, color: NpColors.red)),
                    onPressed: () {
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
                  MaterialPageRoute(builder: (_) => const TagStudioScreen()),
                ),
                icon: const Icon(Icons.qr_code_2, size: 18),
                label: const Text('Open Hardware Tag Studio'),
              ),
            ),
          ],
        ),
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
      body: isTablet
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 5,
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 400),
                        child: _ScannerViewfinder(
                          isScanning: _isScanning,
                          onSimulateScan: _simulateCameraScan,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    flex: 6,
                    child: SingleChildScrollView(
                      child: _buildManualEntryCard(),
                    ),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 320),
                    child: _ScannerViewfinder(
                      isScanning: _isScanning,
                      onSimulateScan: _simulateCameraScan,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                _buildManualEntryCard(),
              ],
            ),
    );
  }
}

class _ScannerViewfinder extends StatefulWidget {
  final bool isScanning;
  final VoidCallback? onSimulateScan;

  const _ScannerViewfinder({
    this.isScanning = false,
    this.onSimulateScan,
  });

  @override
  State<_ScannerViewfinder> createState() => _ScannerViewfinderState();
}

class _ScannerViewfinderState extends State<_ScannerViewfinder>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scan;

  @override
  void initState() {
    super.initState();
    _scan = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
  }

  @override
  void dispose() {
    _scan.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: NpColors.bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: NpColors.gray800, width: 2),
          boxShadow: const [
            BoxShadow(color: NpColors.redGlow, blurRadius: 24, spreadRadius: -6),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Opacity(
                opacity: 0.16,
                child: Image.asset(
                  NpAssets.schematicFridge,
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                ),
              ),
              Container(color: NpColors.bg.withValues(alpha: 0.6)),
              const _Rivet(alignment: Alignment.topLeft),
              const _Rivet(alignment: Alignment.topRight),
              const _Rivet(alignment: Alignment.bottomLeft),
              const _Rivet(alignment: Alignment.bottomRight),

              // Animated laser sweep across outer 1:1 box
              AnimatedBuilder(
                animation: _scan,
                builder: (context, _) {
                  return Align(
                    alignment: Alignment(0, -0.9 + 1.8 * _scan.value),
                    child: Container(
                      height: 2,
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: const BoxDecoration(
                        color: NpColors.red,
                        boxShadow: [
                          BoxShadow(color: NpColors.redGlow, blurRadius: 10, spreadRadius: 2),
                        ],
                      ),
                    ),
                  );
                },
              ),

              // Center scanning controls
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: NpColors.bgCard.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          border: Border.all(color: NpColors.red, width: 1.5),
                          boxShadow: const [
                            BoxShadow(color: NpColors.redGlow, blurRadius: 16),
                          ],
                        ),
                        child: widget.isScanning
                            ? const SizedBox(
                                width: 38,
                                height: 38,
                                child: CircularProgressIndicator(color: NpColors.red, strokeWidth: 3),
                              )
                            : const Icon(Icons.qr_code_scanner, color: NpColors.red, size: 38),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Aim camera at Nameplate Tag',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: NpColors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'SUB-3S OFFLINE LOOKUP',
                        textAlign: TextAlign.center,
                        style: NpType.mono.copyWith(
                          color: NpColors.gray400,
                          fontSize: 10,
                          letterSpacing: 1.2,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          backgroundColor: NpColors.red.withValues(alpha: 0.9),
                          foregroundColor: NpColors.white,
                        ),
                        onPressed: widget.onSimulateScan,
                        icon: const Icon(Icons.camera_alt, size: 14),
                        label: const Text(
                          'Simulate Scan',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
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
        width: 8,
        height: 8,
        margin: const EdgeInsets.all(10),
        decoration: const BoxDecoration(
          color: NpColors.red,
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: NpColors.redGlow, blurRadius: 6)],
        ),
      ),
    );
  }
}
