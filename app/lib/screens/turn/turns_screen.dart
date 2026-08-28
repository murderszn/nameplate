import 'package:flutter/material.dart';
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
    final inProgress = session.visibleTurns.where((t) => t.status == TurnStatus.inProgress).toList();
    final completed = session.visibleTurns.where((t) => t.status == TurnStatus.completed).toList();
    final ready = session.visibleUnits
        .where((u) => u.occupancyStatus == OccupancyStatus.turning || u.occupancyStatus == OccupancyStatus.vacant)
        .where((u) => session.inProgressTurnForUnit(u.id) == null)
        .toList();
    final occupied = session.visibleUnits
        .where((u) => u.occupancyStatus == OccupancyStatus.occupied)
        .toList();

    return Scaffold(
      appBar: const NpBrandAppBar(
        kicker: '02 / Turnover',
        title: 'Unit turns',
        showLogo: true,
        actions: [SyncStatusBadge()],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          const NpKicker('Walk the unit once'),
          const SizedBox(height: 8),
          Text(
            'Checklist is the unit\'s asset roster. Flag damage or gaps; completing emits work orders.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
          ),
          if (inProgress.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionLabel('In progress (${inProgress.length})'),
            const SizedBox(height: 8),
            ...inProgress.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _TurnCard(
                    turn: t,
                    onOpen: () => _openWalkthrough(context, t),
                  ),
                )),
          ],
          const SizedBox(height: 24),
          _SectionLabel('Ready for turn (${ready.length})'),
          const SizedBox(height: 8),
          if (ready.isEmpty)
            const Text('No vacant or turning units in your property scope.', style: TextStyle(color: NpColors.gray500))
          else
            ...ready.map((u) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _UnitCard(
                    unit: u,
                    assetCount: session.rosterForUnit(u.id).length,
                    onStart: () => _start(context, ref, u),
                  ),
                )),
          const SizedBox(height: 24),
          _SectionLabel('Occupied — spot audit'),
          const SizedBox(height: 8),
          ...occupied.map((u) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _UnitCard(
                  unit: u,
                  assetCount: session.rosterForUnit(u.id).length,
                  onStart: () => _start(context, ref, u),
                ),
              )),
          if (completed.isNotEmpty) ...[
            const SizedBox(height: 24),
            _SectionLabel('Completed this shift (${completed.length})'),
            const SizedBox(height: 8),
            ...completed.map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _TurnCard(turn: t, onOpen: () => _openWalkthrough(context, t)),
                )),
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
      backgroundColor: NpColors.bgCard,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NpKicker('${unit.propertyName} · ${unit.displayName}'),
                const SizedBox(height: 6),
                const Text('Start Unit Turnover', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: NpColors.white)),
                const SizedBox(height: 4),
                Text(
                  'Pre-populating $count appliance records for room-by-room physical verification.',
                  style: const TextStyle(color: NpColors.gray400, fontSize: 13),
                ),
                const SizedBox(height: 16),
                ...TurnType.values.map(
                  (t) {
                    final subtitle = switch (t) {
                      TurnType.moveOut => 'Outgoing tenant audit · Check condition & deposit deductions',
                      TurnType.moveIn => 'Move-in readiness · Verify appliances operational before handover',
                      TurnType.annualInspection => 'Annual preventative maintenance & filter verification',
                      TurnType.spotAudit => 'Periodic inventory spot check & hardware validation',
                      TurnType.onboarding => 'First-time asset tagging & baseline portfolio inventory',
                    };
                    final icon = switch (t) {
                      TurnType.moveOut => Icons.logout,
                      TurnType.moveIn => Icons.login,
                      TurnType.annualInspection => Icons.calendar_month,
                      TurnType.spotAudit => Icons.search,
                      TurnType.onboarding => Icons.add_business,
                    };
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: NpColors.bg,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: const BorderSide(color: NpColors.gray800),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: NpColors.bgElevated,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Icon(icon, color: NpColors.red, size: 20),
                        ),
                        title: Text(t.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: NpColors.white)),
                        subtitle: Text(subtitle, style: const TextStyle(color: NpColors.gray400, fontSize: 11)),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: NpColors.gray500),
                        onTap: () => Navigator.pop(ctx, t),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
    if (type == null || !context.mounted) return;
    final turn = ref.read(fieldSessionProvider).startTurn(unit: unit, type: type);
    if (!context.mounted) return;
    await _openWalkthrough(context, turn);
  }

  Future<void> _openWalkthrough(BuildContext context, Turn turn) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TurnWalkthroughScreen(turn: turn)),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: NpType.mono.copyWith(
        color: NpColors.gray500,
        fontSize: 11,
        letterSpacing: 1.4,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _UnitCard extends StatelessWidget {
  final Unit unit;
  final int assetCount;
  final VoidCallback onStart;
  const _UnitCard({required this.unit, required this.assetCount, required this.onStart});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(unit.displayName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                ),
                NpStatusPill(
                  label: unit.occupancyStatus.label,
                  tone: unit.occupancyStatus == OccupancyStatus.turning
                      ? NpPillTone.caution
                      : unit.occupancyStatus == OccupancyStatus.vacant
                          ? NpPillTone.neutral
                          : NpPillTone.verified,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${unit.propertyName} · $assetCount assets on roster',
              style: const TextStyle(color: NpColors.gray400, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: NpColors.red,
                  foregroundColor: NpColors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                onPressed: onStart,
                icon: const Icon(Icons.play_arrow, size: 18),
                label: const Text('Start turn'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TurnCard extends StatelessWidget {
  final Turn turn;
  final VoidCallback onOpen;
  const _TurnCard({required this.turn, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final progress = turn.items.isEmpty ? 0.0 : turn.inspectedCount / turn.items.length;
    return Card(
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(turn.unitLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ),
                  NpStatusPill(
                    label: turn.status.label,
                    tone: turn.status == TurnStatus.completed ? NpPillTone.verified : NpPillTone.caution,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '${turn.type.label} · ${turn.inspectedCount}/${turn.items.length} inspected',
                style: const TextStyle(color: NpColors.gray400, fontSize: 13),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  color: NpColors.red,
                  backgroundColor: NpColors.white08,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
