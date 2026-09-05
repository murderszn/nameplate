import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/turn.dart';
import '../../models/unit.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
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
              accentColor: context.npColors.gray400,
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
              accentColor: const Color(0xFF10B981),
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
    final isTurning = unit.occupancyStatus == OccupancyStatus.turning;
    final isVacant = unit.occupancyStatus == OccupancyStatus.vacant;

    final blockColor = switch (unit.occupancyStatus) {
      OccupancyStatus.turning =>
        const Color(0xFFF59E0B).withValues(alpha: 0.15),
      OccupancyStatus.vacant =>
        const Color(0xFF10B981).withValues(alpha: 0.15),
      _ => context.npColors.bgElevated,
    };
    final tone = switch (unit.occupancyStatus) {
      OccupancyStatus.turning => NpPillTone.caution,
      OccupancyStatus.vacant => NpPillTone.verified,
      _ => NpPillTone.neutral,
    };
    final microHeaderBg = isTurning
        ? const Color(0xFFF59E0B).withValues(alpha: 0.08)
        : (isVacant
            ? const Color(0xFF10B981).withValues(alpha: 0.08)
            : context.npColors.bgCard);

    final propertyImage = NpAssets.propertyImageFor(unit.propertyName);

    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onStart();
        },
        splashColor: NpColors.redSubtle,
        highlightColor: context.npColors.white08,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: context.npColors.line, width: 0.8),
            ),
          ),
          child: Stack(
            children: [
              // 68px left property photo tile with occupancy tint
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 68,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(
                      propertyImage,
                      fit: BoxFit.cover,
                    ),
                    Container(
                      color: isTurning
                          ? const Color(0xFFF59E0B).withValues(alpha: 0.28)
                          : (isVacant
                              ? const Color(0xFF10B981).withValues(alpha: 0.28)
                              : const Color(0x3A000000)),
                    ),
                    if (isTurning || isVacant)
                      Positioned(
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3.5,
                        child: Container(
                          color: isTurning
                              ? const Color(0xFFF59E0B)
                              : const Color(0xFF10B981),
                        ),
                      ),
                  ],
                ),
              ),
              // Right content
              Padding(
                padding: const EdgeInsets.only(left: 68),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Key row 1: Micro-header with soft tinted background
                    Container(
                      color: microHeaderBg,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isTurning
                                  ? const Color(0xFFF59E0B).withValues(alpha: 0.12)
                                  : (isVacant
                                      ? const Color(0xFF10B981).withValues(alpha: 0.12)
                                      : context.npColors.bgElevated),
                              border: Border.all(
                                color: isTurning
                                    ? const Color(0xFFF59E0B).withValues(alpha: 0.4)
                                    : (isVacant
                                        ? const Color(0xFF10B981).withValues(alpha: 0.4)
                                        : context.npColors.lineStrong),
                                width: 0.8,
                              ),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Text(
                              unit.label.toUpperCase(),
                              style: NpType.mono.copyWith(
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                                color: isTurning
                                    ? const Color(0xFFF59E0B)
                                    : (isVacant
                                        ? const Color(0xFF10B981)
                                        : context.npColors.white),
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          NpStatusPill(
                            label: unit.occupancyStatus.label.toUpperCase(),
                            tone: tone,
                          ),
                          const Spacer(),
                          Flexible(
                            child: Text(
                              '${unit.buildingName.toUpperCase()} · ${unit.propertyName.toUpperCase()}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                              style: NpType.mono.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: context.npColors.gray500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 10,
                            color: context.npColors.gray500,
                          ),
                        ],
                      ),
                    ),
                    // Key row 2: Details (full width) + Icon Action Button
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  unit.displayName,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14.5,
                                    color: context.npColors.white,
                                    height: 1.25,
                                    letterSpacing: -0.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  '${unit.propertyName}${assetCount != null ? ' · $assetCount appliances' : ''}',
                                  style: TextStyle(
                                    color: context.npColors.gray400,
                                    fontSize: 12,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  isTurning
                                      ? 'READY FOR TURNOVER AUDIT'
                                      : (isVacant
                                          ? 'VACANT // PRE-LEASE AUDIT'
                                          : 'ACTIVE LEASE // AUDIT READY'),
                                  style: NpType.mono.copyWith(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: isTurning
                                        ? const Color(0xFFF59E0B)
                                        : (isVacant
                                            ? const Color(0xFF10B981)
                                            : context.npColors.gray500),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Icon-only start button replacing the old text button
                          Material(
                            color: isTurning || isVacant
                                ? NpColors.red
                                : context.npColors.bgElevated,
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                onStart();
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isTurning || isVacant
                                        ? NpColors.redBorder
                                        : context.npColors.lineStrong,
                                    width: 0.8,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Icon(
                                  Icons.play_arrow_rounded,
                                  color: isTurning || isVacant
                                      ? Colors.white
                                      : context.npColors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ],
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

    final propertyImage = NpAssets.propertyImageFor(turn.unitLabel);

    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onOpen();
        },
        splashColor: NpColors.redSubtle,
        highlightColor: context.npColors.white08,
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: context.npColors.line, width: 0.8),
            ),
          ),
          child: Stack(
            children: [
              // 68px left property photo tile with status tint
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 68,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(
                      propertyImage,
                      fit: BoxFit.cover,
                    ),
                    Container(
                      color: isDone
                          ? const Color(0xFF10B981).withValues(alpha: 0.28)
                          : (isActive
                              ? const Color(0xFFC51F2D).withValues(alpha: 0.28)
                              : const Color(0x3A000000)),
                    ),
                    Positioned(
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3.5,
                      child: Container(
                        color: isDone
                            ? const Color(0xFF10B981)
                            : (isActive ? NpColors.red : context.npColors.lineStrong),
                      ),
                    ),
                  ],
                ),
              ),
              // Right content
              Padding(
                padding: const EdgeInsets.only(left: 68),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Key row 1: Micro-header
                    Container(
                      color: isActive
                          ? NpColors.redSubtle
                          : context.npColors.bgCard,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? NpColors.red.withValues(alpha: 0.12)
                                  : context.npColors.bgElevated,
                              border: Border.all(
                                color: isActive
                                    ? NpColors.redBorder
                                    : context.npColors.lineStrong,
                                width: 0.8,
                              ),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Text(
                              turn.type.label.toUpperCase(),
                              style: NpType.mono.copyWith(
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                                color: isActive
                                    ? NpColors.red
                                    : context.npColors.white,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          NpStatusPill(
                            label: turn.status.label.toUpperCase(),
                            tone: isDone ? NpPillTone.verified : NpPillTone.caution,
                          ),
                          if (isActive) ...[
                            const SizedBox(width: 6),
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: NpColors.red,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                          const Spacer(),
                          Flexible(
                            child: Text(
                              turn.unitLabel.toUpperCase(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.end,
                              style: NpType.mono.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isActive
                                    ? NpColors.red
                                    : context.npColors.gray500,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 10,
                            color: context.npColors.gray500,
                          ),
                        ],
                      ),
                    ),
                    // Key row 2: Progress details (full width) + Action Icon Button
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  turn.unitLabel,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14.5,
                                    color: context.npColors.white,
                                    height: 1.25,
                                    letterSpacing: -0.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${turn.inspectedCount}/${turn.items.length} INSPECTED',
                                      style: NpType.mono.copyWith(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w700,
                                        color: context.npColors.gray400,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    Text(
                                      '${(progress * 100).round()}%',
                                      style: NpType.mono.copyWith(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        color: isDone
                                            ? const Color(0xFF10B981)
                                            : NpColors.red,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(3),
                                  child: LinearProgressIndicator(
                                    value: progress.clamp(0.0, 1.0),
                                    minHeight: 5,
                                    color: isDone
                                        ? const Color(0xFF10B981)
                                        : NpColors.red,
                                    backgroundColor: context.npColors.white08,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Material(
                            color: isActive
                                ? NpColors.red
                                : context.npColors.bgElevated,
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              onTap: () {
                                HapticFeedback.lightImpact();
                                onOpen();
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isActive
                                        ? NpColors.redBorder
                                        : context.npColors.lineStrong,
                                    width: 0.8,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Icon(
                                  isActive
                                      ? Icons.arrow_forward_rounded
                                      : Icons.visibility_outlined,
                                  color: isActive
                                      ? Colors.white
                                      : context.npColors.white,
                                  size: 22,
                                ),
                              ),
                            ),
                          ),
                        ],
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
