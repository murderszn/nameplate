import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/services.dart';
import '../../widgets/np_action_buttons.dart';
import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
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

  Widget _buildManualEntryCard() {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          left: BorderSide(color: context.npColors.lineStrong, width: 1),
          right: BorderSide(color: context.npColors.lineStrong, width: 1),
          bottom: BorderSide(color: context.npColors.lineStrong, width: 1),
          top: BorderSide(color: context.npColors.lineStrong, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Enter a tag ID',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                SizedBox(height: 6),
                Text(
                  'Type a Nameplate ID or paste a tag link.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: context.npColors.gray400,
                  ),
                ),
                SizedBox(height: 16),
                TextField(
                  controller: _controller,
                  textCapitalization: TextCapitalization.characters,
                  style: NpType.mono.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    fontSize: 15,
                  ),
                  decoration: InputDecoration(
                    hintText: 'NP-7K2M4QX9',
                    errorText: _error,
                    prefixIcon: Icon(Icons.tag),
                    suffixIcon: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_controller.text.isNotEmpty)
                          IconButton(
                            icon: Icon(Icons.clear, size: 18),
                            tooltip: 'Clear',
                            onPressed: () {
                              _controller.clear();
                              setState(() {
                                _error = null;
                                _liveResult = null;
                              });
                            },
                          ),
                        SizedBox(width: 4),
                      ],
                    ),
                  ),
                  onSubmitted: (_) => _lookup(),
                ),
                if (_liveResult != null && _liveResult!.isValidFormat) ...[
                  SizedBox(height: 10),
                  _VerificationBanner(result: _liveResult!),
                ],
                SizedBox(height: 16),
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
                    SizedBox(width: 10),
                    NpIconButton(
                      icon: Icons.content_paste_rounded,
                      tooltip: 'Paste and look up',
                      onPressed: _pasteFromClipboard,
                      size: 44,
                    ),
                  ],
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
      appBar: NpBrandAppBar(
        title: 'Scan the plate',
        showLogo: true,
        actions: [SyncStatusBadge()],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 720),
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
              SizedBox(height: 18),
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
      padding: EdgeInsets.only(top: 4),
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
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          SizedBox(width: 8),
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

// ── Scanner viewfinder ─────────────────────────────────────────────────────────

class _ScannerViewfinder extends StatelessWidget {
  final bool isScanning;
  final VoidCallback? onOpenScanner;

  const _ScannerViewfinder({this.isScanning = false, this.onOpenScanner});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border.all(color: context.npColors.lineStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: NpColors.redSubtle,
                  border: Border.all(color: NpColors.redBorder),
                ),
                child: isScanning
                    ? SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: NpColors.red,
                          strokeWidth: 2,
                        ),
                      )
                    : Icon(
                        Icons.qr_code_scanner_rounded,
                        color: NpColors.red,
                        size: 24,
                      ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Scan a tag',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Open the camera and center the QR code.',
                      style: TextStyle(
                        color: context.npColors.gray400,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 14),
          NpButton.primary(
            icon: Icons.camera_alt_rounded,
            label: isScanning ? 'Opening camera…' : 'Scan with camera',
            isLoading: isScanning,
            size: NpButtonSize.md,
            isExpanded: true,
            onPressed: isScanning ? null : onOpenScanner,
          ),
        ],
      ),
    );
  }
}
