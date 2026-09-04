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
          if (inProgress.isNotEmpty) ...[
            _SectionHeader(
              title: 'In progress (${inProgress.length})',
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
            title: 'Units (${ready.length})',
            accentColor: const Color(0xFF10B981),
          ),
          if (ready.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Text(
                'No units in your property scope.',
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
          if (occupied.isNotEmpty) ...[
            _SectionHeader(
              title: 'Occupied (${occupied.length})',
              accentColor: const Color(0xFF3B82F6),
            ),
            ...occupied.map(
              (u) => _UnitCard(
                unit: u,
                assetCount: session.rosterForUnit(u.id).length,
                onStart: () => _start(context, ref, u),
              ),
            ),
          ],
          if (completed.isNotEmpty) ...[
            _SectionHeader(
              title: 'Completed (${completed.length})',
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
  final String title;
  final Color accentColor;

  const _SectionHeader({
    required this.title,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: NpType.mono.copyWith(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          color: accentColor,
          letterSpacing: 1.1,
        ),
      ),
    );
  }
}

class _UnitCard extends StatelessWidget {
  final Unit unit;
  final int? assetCount;
  final VoidCallback onStart;
  const _UnitCard({
    required this.unit,
    this.assetCount,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    final tileBg = switch (unit.occupancyStatus) {
      OccupancyStatus.turning => const Color(0x33F59E0B),
      OccupancyStatus.vacant => const Color(0x3310B981),
      _ => context.npColors.white08,
    };

    final tileFg = switch (unit.occupancyStatus) {
      OccupancyStatus.turning => const Color(0xFFF59E0B),
      OccupancyStatus.vacant => const Color(0xFF10B981),
      _ => context.npColors.white,
    };

    final monogram = () {
      final name = unit.displayName.trim();
      if (name.isEmpty) return 'U';
      final parts = name.split(RegExp(r'\s+'));
      if (parts.length > 1 && parts.last.isNotEmpty) {
        return parts.last.length <= 3 ? parts.last.toUpperCase() : parts.last[0].toUpperCase();
      }
      return name[0].toUpperCase();
    }();

    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong, width: 0.8),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onStart,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // 48px rounded icon tile left of unit.displayName with tinted fill by occupancyStatus + monogram letter
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: tileBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: tileFg.withValues(alpha: 0.35),
                      width: 1,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    monogram,
                    style: NpType.mono.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: tileFg,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        unit.displayName,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                          color: context.npColors.white,
                          letterSpacing: -0.2,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.apartment_outlined,
                            size: 13,
                            color: context.npColors.gray500,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              unit.propertyName,
                              style: TextStyle(
                                color: context.npColors.gray400,
                                fontSize: 12,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                NpButton.primary(
                  icon: Icons.play_arrow_rounded,
                  label: 'Start turn',
                  size: NpButtonSize.sm,
                  onPressed: onStart,
                ),
              ],
            ),
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
    final stripeColor = isDone ? const Color(0xFF10B981) : const Color(0xFFEB2B2B);

    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong, width: 0.8),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onOpen,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header stripe Container(height: 3.5) in same color (red active / emerald completed)
              Container(
                height: 3.5,
                width: double.infinity,
                color: stripeColor,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: stripeColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(
                              color: stripeColor.withValues(alpha: 0.4),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            turn.type.label.toUpperCase(),
                            style: NpType.mono.copyWith(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: stripeColor,
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
                    const SizedBox(height: 12),
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
                            color: stripeColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Progress bar: 8px rounded, track white08, fill red active / emerald completed
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress.clamp(0.0, 1.0),
                        minHeight: 8,
                        color: stripeColor,
                        backgroundColor: context.npColors.white08,
                      ),
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
