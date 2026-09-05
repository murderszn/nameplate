import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';
import 'np_brand.dart';

/// Interactive modal sheet displaying the full continuous triptych and
/// the three operational field stages: Scan it. Trace it. Account for it.
void showFieldWorkflowSheet(BuildContext context) {
  HapticFeedback.lightImpact();
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: context.npColors.bg,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) => const _FieldWorkflowSheetContent(),
  );
}

class _FieldWorkflowSheetContent extends StatefulWidget {
  const _FieldWorkflowSheetContent();

  @override
  State<_FieldWorkflowSheetContent> createState() => _FieldWorkflowSheetContentState();
}

class _FieldWorkflowSheetContentState extends State<_FieldWorkflowSheetContent> {
  int _selectedStage = 0;

  static const _stages = [
    _WorkflowStageData(
      stageNumber: '01',
      stageTitle: 'Scan it.',
      stageSub: 'Instant hardware recognition & tamper-proof tag verification.',
      imageAsset: NpAssets.triptychScan,
      bulletPoints: [
        'Sub-second camera scan locks onto physical QR plate',
        'Local cryptographic NPID check with zero signal needed',
        'Tamper-evident vinyl tags prevent asset swap fraud',
      ],
    ),
    _WorkflowStageData(
      stageNumber: '02',
      stageTitle: 'Trace it.',
      stageSub: 'Full service history & chain-of-custody ledger.',
      imageAsset: NpAssets.triptychTrace,
      bulletPoints: [
        'Complete lifecycle lineage and component repairs',
        'Log parts and service events directly in the field',
        'Immutable audit trail bound to serial & model specs',
      ],
    ),
    _WorkflowStageData(
      stageNumber: '03',
      stageTitle: 'Account for it.',
      stageSub: '100% unit turnover verification & zero shrinkage.',
      imageAsset: NpAssets.triptychAccount,
      bulletPoints: [
        'Room-by-room turnover walkthrough audits',
        'Automated exception alerts for missing or moved units',
        'Instant make-ready signoff before resident move-in',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final activeStage = _stages[_selectedStage];

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Drag handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 10, bottom: 8),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: context.npColors.lineStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: NpColors.redSubtle,
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(color: NpColors.redBorder),
                    ),
                    child: Text(
                      'FIELD STANDARD',
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: NpColors.red,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    color: context.npColors.gray400,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                children: [
                  Text(
                    'Scan it. Trace it. Account for it.',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: context.npColors.white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Every appliance accounted for — from physical hardware tag to portfolio ledger.',
                    style: TextStyle(
                      fontSize: 13,
                      color: context.npColors.gray400,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Full Continuous Panorama Card ───────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: context.npColors.lineStrong),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x33000000),
                          blurRadius: 16,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: AspectRatio(
                        aspectRatio: 16 / 9,
                        child: Image.asset(
                          NpAssets.triptychPanorama,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── 3 Panels ALWAYS Side-by-Side ─────────────────────────
                  Row(
                    children: List.generate(_stages.length, (index) {
                      final s = _stages[index];
                      final isSelected = _selectedStage == index;
                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                            right: index < _stages.length - 1 ? 8 : 0,
                          ),
                          child: GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _selectedStage = index);
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              decoration: BoxDecoration(
                                color: Colors.black,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected ? NpColors.red : context.npColors.lineStrong,
                                  width: isSelected ? 2 : 1,
                                ),
                                boxShadow: isSelected
                                    ? const [
                                        BoxShadow(
                                          color: Color(0x4DEB2B2B),
                                          blurRadius: 10,
                                          offset: Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Stack(
                                  children: [
                                    AspectRatio(
                                      aspectRatio: 9 / 16,
                                      child: Image.asset(
                                        s.imageAsset,
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 4,
                                      left: 4,
                                      right: 4,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xD1000000),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: isSelected ? NpColors.red : Colors.white24,
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Text(
                                          '${s.stageNumber} ${s.stageTitle}',
                                          textAlign: TextAlign.center,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: NpType.mono.copyWith(
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.w800,
                                            color: isSelected ? NpColors.red : Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 16),

                  // ── Selected Stage Detail Card ───────────────────────────
                  _WorkflowStageDetailCard(
                    stageNumber: activeStage.stageNumber,
                    stageTitle: activeStage.stageTitle,
                    stageSub: activeStage.stageSub,
                    bulletPoints: activeStage.bulletPoints,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _WorkflowStageData {
  final String stageNumber;
  final String stageTitle;
  final String stageSub;
  final String imageAsset;
  final List<String> bulletPoints;

  const _WorkflowStageData({
    required this.stageNumber,
    required this.stageTitle,
    required this.stageSub,
    required this.imageAsset,
    required this.bulletPoints,
  });
}

class _WorkflowStageDetailCard extends StatelessWidget {
  final String stageNumber;
  final String stageTitle;
  final String stageSub;
  final List<String> bulletPoints;

  const _WorkflowStageDetailCard({
    required this.stageNumber,
    required this.stageTitle,
    required this.stageSub,
    required this.bulletPoints,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.npColors.lineStrong),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: NpColors.red,
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Text(
                  stageNumber,
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                stageTitle,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.npColors.white,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            stageSub,
            style: TextStyle(
              fontSize: 12.5,
              color: context.npColors.gray400,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 12),
          Divider(height: 1, color: context.npColors.line),
          const SizedBox(height: 12),
          ...bulletPoints.map(
            (pt) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.check_circle_rounded,
                    size: 14,
                    color: NpColors.red,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pt,
                      style: TextStyle(
                        fontSize: 12,
                        color: context.npColors.gray300,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Standalone full-bleed banner widget to embed anywhere in settings or tag studio.
class FieldMissionBanner extends StatelessWidget {
  final VoidCallback? onTap;

  const FieldMissionBanner({super.key, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap ?? () => showFieldWorkflowSheet(context),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.black,
            border: Border(
              top: BorderSide(color: context.npColors.lineStrong),
              bottom: BorderSide(color: context.npColors.lineStrong),
              left: const BorderSide(color: NpColors.red, width: 3.5),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.asset(
                  NpAssets.triptychPanorama,
                  fit: BoxFit.cover,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'FIELD OPERATING STANDARD',
                            style: NpType.mono.copyWith(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: NpColors.red,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Scan it. Trace it. Account for it.',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: context.npColors.white,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 12,
                      color: context.npColors.gray400,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
