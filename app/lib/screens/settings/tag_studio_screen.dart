import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/nameplate_tag.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';

/// Field-side Nameplate Tag minting studio — sister of the marketing QR studio.
/// Full-bleed industrial physical plate staging bay with offline entropy telemetry.
class TagStudioScreen extends ConsumerStatefulWidget {
  const TagStudioScreen({super.key});

  @override
  ConsumerState<TagStudioScreen> createState() => _TagStudioScreenState();
}

class _TagStudioScreenState extends ConsumerState<TagStudioScreen> {
  late String _npid;

  @override
  void initState() {
    super.initState();
    _npid = Npid.mint();
  }

  void _mint() {
    setState(() => _npid = ref.read(fieldSessionProvider).mintTag());
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(fieldSessionProvider);

    return Scaffold(
      appBar: const NpBrandAppBar(title: 'Tag studio'),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          // ── 00 // Header & Mission Guidance ────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create a tag',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Create a Nameplate ID you can print, even when this device is offline.',
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),

          // ── 01 // Full-Bleed Physical Tag Staging Bay ──────────────────────
          _TagStagingBay(
            npid: _npid,
            onMint: _mint,
          ),

          // ── Telemetry Ribbon: Offline Entropy Pool ─────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              color: context.npColors.bgElevated,
              border: Border(
                bottom: BorderSide(color: context.npColors.lineStrong),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'OFFLINE ENTROPY POOL // SECURE',
                        style: NpType.mono.copyWith(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF10B981),
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${session.remainingOfflinePoolCount} tags available offline · Ed25519 verified',
                        style: TextStyle(
                          fontSize: 12,
                          color: context.npColors.gray400,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: context.npColors.bgCard,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.npColors.lineStrong),
                  ),
                  child: Text(
                    'CROCKFORD B32',
                    style: NpType.mono.copyWith(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: context.npColors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── 02 // Commissioning Action Controls ────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NpButton.primary(
                  icon: Icons.offline_bolt_rounded,
                  label: 'Create next tag',
                  size: NpButtonSize.lg,
                  isExpanded: true,
                  onPressed: _mint,
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: NpButton.secondary(
                        icon: Icons.copy_rounded,
                        label: 'Copy NPID',
                        size: NpButtonSize.md,
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: _npid));
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Copied $_npid to clipboard')),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: NpButton.secondary(
                        icon: Icons.link_rounded,
                        label: 'Copy URL',
                        size: NpButtonSize.md,
                        onPressed: () async {
                          await Clipboard.setData(
                            ClipboardData(text: Npid.payloadUrl(_npid)),
                          );
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Copied scan payload URL')),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── 02 // Shift Mint Reel ──────────────────────────────────────────
          if (session.mintedTags.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
              child: Row(
                children: [
                  Text(
                    '02 //',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: NpColors.red,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'CREATED THIS SHIFT (${session.mintedTags.length})',
                    style: NpType.mono.copyWith(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: context.npColors.gray500,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
            ...session.mintedTags.take(12).map(
                  (t) => _MintedTagTile(
                    tag: t,
                    isSelected: t.npid == _npid,
                    onSelect: () => setState(() => _npid = t.npid),
                  ),
                ),
          ],
        ],
      ),
    );
  }
}

// ── Physical Tag Staging Bay ──────────────────────────────────────────────────

class _TagStagingBay extends StatelessWidget {
  final String npid;
  final VoidCallback onMint;

  const _TagStagingBay({
    required this.npid,
    required this.onMint,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Stack(
        children: [
          // Background technical grid
          Positioned.fill(
            child: Opacity(
              opacity: 0.05,
              child: CustomPaint(painter: _StudioGridPainter()),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Column(
              children: [
                // Top staging status pips (Fixed flex overflow)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: context.npColors.bgElevated,
                          borderRadius: BorderRadius.circular(2),
                          border: Border.all(color: context.npColors.lineStrong),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: NpColors.red,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                'SPEC // 30-UP PHYSICAL PLATE',
                                style: NpType.mono.copyWith(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: context.npColors.gray400,
                                  letterSpacing: 0.8,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '1:1 STAGE',
                      style: NpType.mono.copyWith(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: context.npColors.white,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Physical Nameplate Tag
                Center(
                  child: Container(
                    decoration: BoxDecoration(
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.6),
                          blurRadius: 24,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: NameplateTag(npid: npid),
                  ),
                ),
                const SizedBox(height: 16),

                // Monospace NPID callout
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: context.npColors.bgElevated,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.npColors.lineStrong),
                  ),
                  child: Text(
                    'NPID // $npid',
                    style: NpType.mono.copyWith(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: NpColors.red,
                      letterSpacing: 1.4,
                    ),
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

// ── Minted Tag Tile ───────────────────────────────────────────────────────────

class _MintedTagTile extends StatelessWidget {
  final dynamic tag;
  final bool isSelected;
  final VoidCallback onSelect;

  const _MintedTagTile({
    required this.tag,
    required this.isSelected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected
          ? context.npColors.bgElevated
          : context.npColors.bgCard,
      child: InkWell(
        onTap: onSelect,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: context.npColors.lineStrong),
              left: BorderSide(
                color: isSelected ? NpColors.red : Colors.transparent,
                width: 3.5,
              ),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: context.npColors.bgElevated,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: isSelected
                        ? NpColors.red
                        : context.npColors.lineStrong,
                  ),
                ),
                child: const Icon(
                  Icons.qr_code_2_rounded,
                  color: NpColors.red,
                  size: 16,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tag.npid,
                      style: NpType.mono.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                        color: isSelected
                            ? Colors.white
                            : NpColors.red,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Minted ${tag.mintedAt.hour.toString().padLeft(2, '0')}:${tag.mintedAt.minute.toString().padLeft(2, '0')}',
                      style: TextStyle(
                        color: context.npColors.gray400,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFC51F2D).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: const Color(0xFFC51F2D)),
                  ),
                  child: Text(
                    'STAGED',
                    style: NpType.mono.copyWith(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFFC51F2D),
                    ),
                  ),
                )
              else
                Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: context.npColors.gray500,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Technical Background Grid ─────────────────────────────────────────────────

class _StudioGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 0.5;

    const step = 24.0;
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

