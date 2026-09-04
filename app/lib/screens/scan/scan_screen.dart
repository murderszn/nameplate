import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/services.dart';
import '../../models/unit.dart';
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
  String? _selectedUnitId;
  String? _lastScanSummary;
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
      _lastScanSummary = asset != null
          ? '${asset.categoryDisplayName} · ${asset.npid}'
          : 'Tag ${scanRes.npid} · Unassigned';
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

  void _openManualEntry() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.npColors.bgCard,
      builder: (sheetContext) => SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(sheetContext).bottom,
          ),
          child: _buildManualEntrySection(),
        ),
      ),
    );
  }

  Unit? _selectedUnit(List<Unit> units) {
    if (_selectedUnitId != null) {
      for (final unit in units) {
        if (unit.id == _selectedUnitId) return unit;
      }
    }
    return units.isEmpty ? null : units.first;
  }

  void _chooseUnit(List<Unit> units) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.npColors.bgCard,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Text(
                'Scan location',
                style: NpType.mono.copyWith(
                  color: context.npColors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ),
            ...units.map(
              (unit) => ListTile(
                leading: Icon(
                  Icons.location_on_outlined,
                  color: context.npColors.gray400,
                ),
                title: Text(
                  unit.displayName,
                  style: TextStyle(color: context.npColors.white),
                ),
                subtitle: Text(
                  unit.propertyName,
                  style: TextStyle(color: context.npColors.gray500),
                ),
                trailing: unit.id == _selectedUnit(units)?.id
                    ? const Icon(Icons.check_rounded, color: NpColors.red)
                    : null,
                onTap: () {
                  setState(() => _selectedUnitId = unit.id);
                  Navigator.of(sheetContext).pop();
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildManualEntrySection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
            style: TextStyle(color: context.npColors.gray400, fontSize: 13),
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
              prefixIcon: Icon(
                Icons.tag_rounded,
                color: context.npColors.gray400,
              ),
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
              Icon(
                Icons.flash_on_rounded,
                size: 13,
                color: const Color(0xFFF59E0B),
              ),
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
                  toneColor: context.npColors.white,
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
    final session = ref.watch(fieldSessionProvider);
    final units = session.visibleUnits;
    final selectedUnit = _selectedUnit(units);

    return Scaffold(
      appBar: NpBrandAppBar(
        title: 'Scan the plate',
        showLogo: true,
        actions: const [SyncStatusBadge()],
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          const contextHeight = 72.0;
          const footerHeight = 72.0;
          const activityMinimumHeight = 72.0;
          final squareSize = math.max(
            0.0,
            math.min(
              constraints.maxWidth,
              constraints.maxHeight -
                  contextHeight -
                  footerHeight -
                  activityMinimumHeight,
            ),
          );

          return Column(
            children: [
              SizedBox(
                height: contextHeight,
                child: _ScanContextPanel(
                  unit: selectedUnit,
                  onChange: units.isEmpty ? null : () => _chooseUnit(units),
                ),
              ),
              SizedBox.square(
                dimension: squareSize,
                child: _ScannerViewfinder(
                  isScanning: _isScanning,
                  onOpenScanner: _openCameraScanner,
                ),
              ),
              Expanded(
                child: _RecentScanPanel(
                  lastScanSummary: _lastScanSummary,
                  pendingCount: session.pendingCount,
                ),
              ),
              SizedBox(
                height: footerHeight,
                child: _ManualEntryFooter(onPressed: _openManualEntry),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ScanContextPanel extends StatelessWidget {
  final Unit? unit;
  final VoidCallback? onChange;

  const _ScanContextPanel({required this.unit, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(bottom: BorderSide(color: context.npColors.lineStrong)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.location_on_outlined,
            size: 19,
            color: unit == null ? context.npColors.gray500 : NpColors.red,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  unit == null
                      ? 'SCANNING INTO'
                      : 'SCANNING INTO · ${unit!.propertyName.toUpperCase()}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: NpType.mono.copyWith(
                    color: context.npColors.gray500,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  unit?.displayName ?? 'Choose a unit',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: NpType.mono.copyWith(
                    color: context.npColors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          NpButton.outline(
            size: NpButtonSize.sm,
            label: unit == null ? 'Choose' : 'Change',
            onPressed: onChange,
          ),
        ],
      ),
    );
  }
}

class _RecentScanPanel extends StatelessWidget {
  final String? lastScanSummary;
  final int pendingCount;

  const _RecentScanPanel({
    required this.lastScanSummary,
    required this.pendingCount,
  });

  @override
  Widget build(BuildContext context) {
    final syncLabel = pendingCount == 0 ? 'SYNCED' : '$pendingCount PENDING';
    final syncColor = pendingCount == 0
        ? context.npColors.gray500
        : NpColors.pending;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(bottom: BorderSide(color: context.npColors.lineStrong)),
      ),
      child: Row(
        children: [
          Icon(
            lastScanSummary == null
                ? Icons.center_focus_weak_rounded
                : Icons.check_circle_outline_rounded,
            size: 20,
            color: lastScanSummary == null
                ? context.npColors.gray400
                : context.npSuccessFg,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LAST SCAN',
                  style: NpType.mono.copyWith(
                    color: context.npColors.gray500,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  lastScanSummary ?? 'No scans yet · ready when you are',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: NpType.mono.copyWith(
                    color: context.npColors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Text(
            syncLabel,
            style: NpType.mono.copyWith(
              color: syncColor,
              fontSize: 9,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

class _ManualEntryFooter extends StatelessWidget {
  final VoidCallback onPressed;

  const _ManualEntryFooter({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 9, 16, 12),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(top: BorderSide(color: context.npColors.lineStrong)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.keyboard_rounded,
            size: 17,
            color: context.npColors.gray400,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Enter a tag ID',
                  style: NpType.mono.copyWith(
                    color: context.npColors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Use a Nameplate ID or tag link',
                  style: TextStyle(
                    color: context.npColors.gray500,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          NpButton.outline(
            size: NpButtonSize.sm,
            label: 'Manual',
            onPressed: onPressed,
          ),
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
              style: TextStyle(fontSize: 11, color: context.npColors.gray400),
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

// ── Square Scanner viewfinder ──────────────────────────────────────────────────

class _ScannerViewfinder extends StatelessWidget {
  final bool isScanning;
  final VoidCallback? onOpenScanner;

  const _ScannerViewfinder({this.isScanning = false, this.onOpenScanner});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: ColoredBox(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const IgnorePointer(
              child: CustomPaint(painter: _CrosshairPainter()),
            ),
            Center(
              child: _CenterScanButton(
                isScanning: isScanning,
                onPressed: isScanning ? null : onOpenScanner,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CenterScanButton extends StatelessWidget {
  final bool isScanning;
  final VoidCallback? onPressed;

  const _CenterScanButton({required this.isScanning, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Scan with camera',
      child: Material(
        color: onPressed == null ? const Color(0xFF6B6B6B) : NpColors.red,
        borderRadius: BorderRadius.circular(3),
        elevation: 6,
        shadowColor: Colors.black.withValues(alpha: 0.45),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(3),
          child: SizedBox(
            width: 236,
            height: 56,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isScanning)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                else
                  const Icon(
                    Icons.camera_alt_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                const SizedBox(width: 10),
                Text(
                  isScanning ? 'Opening camera…' : 'Scan with camera',
                  style: NpType.mono.copyWith(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CrosshairPainter extends CustomPainter {
  const _CrosshairPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final framePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.72)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.square;
    final guidePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.28)
      ..strokeWidth = 1;

    final inset = size.width * 0.09;
    final frame = Rect.fromLTWH(
      inset,
      inset,
      size.width - inset * 2,
      size.height - inset * 2,
    );
    const cornerLength = 42.0;

    final corners = <Path>[
      Path()
        ..moveTo(frame.left, frame.top + cornerLength)
        ..lineTo(frame.left, frame.top)
        ..lineTo(frame.left + cornerLength, frame.top),
      Path()
        ..moveTo(frame.right - cornerLength, frame.top)
        ..lineTo(frame.right, frame.top)
        ..lineTo(frame.right, frame.top + cornerLength),
      Path()
        ..moveTo(frame.left, frame.bottom - cornerLength)
        ..lineTo(frame.left, frame.bottom)
        ..lineTo(frame.left + cornerLength, frame.bottom),
      Path()
        ..moveTo(frame.right - cornerLength, frame.bottom)
        ..lineTo(frame.right, frame.bottom)
        ..lineTo(frame.right, frame.bottom - cornerLength),
    ];
    for (final path in corners) {
      canvas.drawPath(path, framePaint);
    }

    final center = Offset(size.width / 2, size.height / 2);
    const crosshairLength = 32.0;
    canvas.drawLine(
      Offset(center.dx - crosshairLength, center.dy),
      Offset(center.dx + crosshairLength, center.dy),
      guidePaint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy - crosshairLength),
      Offset(center.dx, center.dy + crosshairLength),
      guidePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
