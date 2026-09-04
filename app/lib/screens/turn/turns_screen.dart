import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/turn.dart';
import '../../models/unit.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/sync_status_badge.dart';
import 'turn_walkthrough_screen.dart';

class TurnsScreen extends ConsumerWidget {
  const TurnsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(fieldSessionProvider);
    final inProgress = session.visibleTurns
        .where((t) => t.status == TurnStatus.inProgress)
        .toList();
    final completed = session.visibleTurns
        .where((t) => t.status == TurnStatus.completed)
        .toList();
    final ready = session.visibleUnits
        .where(
          (u) =>
              u.occupancyStatus == OccupancyStatus.turning ||
              u.occupancyStatus == OccupancyStatus.vacant,
        )
        .where((u) => session.inProgressTurnForUnit(u.id) == null)
        .toList();
    final occupied = session.visibleUnits
        .where((u) => u.occupancyStatus == OccupancyStatus.occupied)
        .toList();

    return Scaffold(
      appBar: NpBrandAppBar(
        title: 'Unit turns',
        showLogo: true,
        actions: const [SyncStatusBadge()],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          // Top Telemetry Ribbon
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
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
                    color: Color(0xFFF59E0B),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${inProgress.length} ACTIVE WALKS',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFFFBBF24),
                    letterSpacing: 0.8,
                  ),
                ),
                const Spacer(),
                Text(
                  '${ready.length} VACANT READY',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF34D399),
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '98.4% RECOVERY',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF93C5FD),
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
          if (inProgress.isNotEmpty) ...[
            _SectionHeader(
              code: '01',
              title: 'IN PROGRESS (${inProgress.length})',
              accentColor: const Color(0xFFF59E0B),
            ),
            ...inProgress.map(
              (t) => _TurnCard(
                turn: t,
                onOpen: () => _openWalkthrough(context, t),
                isActive: true,
              ),
            ),
          ],
          _SectionHeader(
            code: '02',
            title: 'READY FOR TURN (${ready.length})',
            accentColor: const Color(0xFF10B981),
          ),
          if (ready.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Text(
                'No vacant or turning units in your property scope.',
                style: NpType.mono.copyWith(
                  color: context.npColors.gray500,
                  fontSize: 12,
                ),
              ),
            )
          else
            ...ready.map(
              (u) => _UnitCard(
                unit: u,
                assetCount: session.rosterForUnit(u.id).length,
                onStart: () => _start(context, ref, u),
              ),
            ),
          _SectionHeader(
            code: '03',
            title: 'OCCUPIED SPOT AUDIT (${occupied.length})',
            accentColor: const Color(0xFF3B82F6),
          ),
          ...occupied.map(
            (u) => _UnitCard(
              unit: u,
              assetCount: session.rosterForUnit(u.id).length,
              onStart: () => _start(context, ref, u),
            ),
          ),
          if (completed.isNotEmpty) ...[
            _SectionHeader(
              code: '04',
              title: 'COMPLETED THIS SHIFT (${completed.length})',
              accentColor: const Color(0xFF64748B),
            ),
            ...completed.map(
              (t) => _TurnCard(
                turn: t,
                onOpen: () => _openWalkthrough(context, t),
                isActive: false,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _start(BuildContext context, WidgetRef ref, Unit unit) async {
    final session = ref.read(fieldSessionProvider);
    final count = session.rosterForUnit(unit.id).length;

    final type = await showModalBottomSheet<TurnType>(
      context: context,
      backgroundColor: context.npColors.bgCard,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Start ${unit.displayName} turnover',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                    color: context.npColors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  unit.propertyName,
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 13,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Pre-populating $count appliance records for room-by-room verification.',
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 13,
                  ),
                ),
                SizedBox(height: 16),
                ...TurnType.values.map((t) {
                  final subtitle = switch (t) {
                    TurnType.moveOut =>
                      'Outgoing tenant audit · Check condition & deposit deductions',
                    TurnType.moveIn =>
                      'Move-in readiness · Verify appliances before handover',
                    TurnType.annualInspection =>
                      'Annual preventative maintenance & filter verification',
                    TurnType.spotAudit =>
                      'Periodic inventory spot check & hardware validation',
                    TurnType.onboarding =>
                      'First-time asset tagging & baseline portfolio inventory',
                  };
                  final icon = switch (t) {
                    TurnType.moveOut => Icons.logout_rounded,
                    TurnType.moveIn => Icons.login_rounded,
                    TurnType.annualInspection => Icons.calendar_month_rounded,
                    TurnType.spotAudit => Icons.search_rounded,
                    TurnType.onboarding => Icons.add_business_rounded,
                  };
                  return Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: context.npColors.bgElevated,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero,
                        side: BorderSide(color: context.npColors.lineStrong),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: context.npColors.bgCard,
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(
                              color: context.npColors.lineStrong,
                            ),
                          ),
                          child: Icon(icon, color: NpColors.red, size: 20),
                        ),
                        title: Text(
                          t.label,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            color: context.npColors.white,
                          ),
                        ),
                        subtitle: Text(
                          subtitle,
                          style: TextStyle(
                            color: context.npColors.gray400,
                            fontSize: 11,
                          ),
                        ),
                        trailing: Icon(
                          Icons.arrow_forward_ios,
                          size: 12,
                          color: context.npColors.gray500,
                        ),
                        onTap: () => Navigator.pop(ctx, t),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
    if (type == null || !context.mounted) return;
    final turn = ref
        .read(fieldSessionProvider)
        .startTurn(unit: unit, type: type);
    if (!context.mounted) return;
    await _openWalkthrough(context, turn);
  }

  Future<void> _openWalkthrough(BuildContext context, Turn turn) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TurnWalkthroughScreen(turn: turn)),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String code;
  final String title;
  final Color accentColor;

  const _SectionHeader({
    required this.code,
    required this.title,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(2),
              border: Border.all(color: accentColor.withValues(alpha: 0.35), width: 0.8),
            ),
            child: Text(
              code,
              style: NpType.mono.copyWith(
                fontSize: 9.5,
                fontWeight: FontWeight.w800,
                color: accentColor,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: NpType.mono.copyWith(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: context.npColors.gray400,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _UnitCard extends StatelessWidget {
  final Unit unit;
  final int assetCount;
  final VoidCallback onStart;
  const _UnitCard({
    required this.unit,
    required this.assetCount,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    final indicatorColor = switch (unit.occupancyStatus) {
      OccupancyStatus.turning => const Color(0xFFF59E0B),
      OccupancyStatus.vacant => const Color(0xFF10B981),
      OccupancyStatus.occupied => const Color(0xFF2563EB),
      _ => const Color(0xFF64748B),
    };

    final tone = switch (unit.occupancyStatus) {
      OccupancyStatus.turning => NpPillTone.caution,
      OccupancyStatus.vacant => NpPillTone.neutral,
      OccupancyStatus.occupied => NpPillTone.verified,
      _ => NpPillTone.neutral,
    };

    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: onStart,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: indicatorColor, width: 3.5),
              bottom: BorderSide(color: context.npColors.line, width: 0.8),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      unit.displayName,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: context.npColors.white,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ),
                  NpStatusPill(
                    label: unit.occupancyStatus.label,
                    tone: tone,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.apartment_outlined,
                    size: 12,
                    color: context.npColors.gray500,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${unit.propertyName} · $assetCount assets on roster',
                      style: TextStyle(
                        color: context.npColors.gray400,
                        fontSize: 12,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: context.npColors.bgElevated,
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(color: context.npColors.lineStrong),
                    ),
                    child: Text(
                      '$assetCount ITEMS ROSTERED',
                      style: NpType.mono.copyWith(
                        fontSize: 9.5,
                        color: context.npColors.gray400,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  const Spacer(),
                  NpButton.primary(
                    icon: Icons.play_arrow_rounded,
                    label: 'Start turn',
                    size: NpButtonSize.sm,
                    onPressed: onStart,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TurnCard extends StatelessWidget {
  final Turn turn;
  final VoidCallback onOpen;
  final bool isActive;
  const _TurnCard({
    required this.turn,
    required this.onOpen,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    final progress = turn.items.isEmpty
        ? 0.0
        : turn.inspectedCount / turn.items.length;

    final isDone = turn.status == TurnStatus.completed;
    final indicatorColor = isDone ? const Color(0xFF10B981) : const Color(0xFFF59E0B);

    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: onOpen,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: indicatorColor, width: 3.5),
              bottom: BorderSide(color: context.npColors.line, width: 0.8),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: indicatorColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(color: indicatorColor.withValues(alpha: 0.4), width: 0.8),
                    ),
                    child: Text(
                      turn.type.label.toUpperCase(),
                      style: NpType.mono.copyWith(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: indicatorColor,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      turn.unitLabel,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: context.npColors.white,
                        letterSpacing: -0.2,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  NpStatusPill(
                    label: turn.status.label,
                    tone: isDone ? NpPillTone.verified : NpPillTone.caution,
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 11,
                    color: context.npColors.gray500,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${turn.inspectedCount}/${turn.items.length} APPLIANCES INSPECTED',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: context.npColors.gray400,
                      letterSpacing: 0.6,
                    ),
                  ),
                  Text(
                    '${(progress * 100).round()}%',
                    style: NpType.mono.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: indicatorColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              // Sleek progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(1),
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  minHeight: 3,
                  color: indicatorColor,
                  backgroundColor: context.npColors.white08,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
