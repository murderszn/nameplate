import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/turn.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';

class TurnWalkthroughScreen extends ConsumerStatefulWidget {
  final Turn turn;
  const TurnWalkthroughScreen({super.key, required this.turn});

  @override
  ConsumerState<TurnWalkthroughScreen> createState() => _TurnWalkthroughScreenState();
}

class _TurnWalkthroughScreenState extends ConsumerState<TurnWalkthroughScreen> {
  static const _categories = [
    'Refrigerator',
    'Washer',
    'Dryer',
    'Range',
    'Dishwasher',
    'Microwave',
    'HVAC',
    'Water heater',
    'Thermostat',
  ];

  Future<void> _complete() async {
    final turn = widget.turn;
    if (!turn.allInspected) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Inspect every item first (${turn.inspectedCount}/${turn.items.length} done).',
          ),
        ),
      );
      return;
    }

    final flaggedItems = turn.items.where((i) => i.flagged).toList();

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: NpColors.bgCard,
        title: Row(
          children: [
            const Icon(Icons.assignment_turned_in, color: NpColors.red, size: 24),
            const SizedBox(width: 8),
            Text('Complete Turn · ${turn.unitLabel}', style: NpType.mono.copyWith(fontSize: 16, fontWeight: FontWeight.w700)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${turn.items.length} assets audited · ${turn.missingCount} missing · ${turn.damagedCount} flagged for service.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NpColors.gray300),
            ),
            const SizedBox(height: 14),
            if (flaggedItems.isNotEmpty) ...[
              Text(
                'AUTOMATIC WORK ORDERS TO EMIT (${flaggedItems.length})',
                style: NpType.mono.copyWith(fontSize: 10, color: NpColors.red, fontWeight: FontWeight.w700, letterSpacing: 1.2),
              ),
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 180),
                decoration: BoxDecoration(
                  color: NpColors.bg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: NpColors.gray800),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.all(8),
                  itemCount: flaggedItems.length,
                  separatorBuilder: (context, index) => const Divider(height: 8, color: NpColors.gray800),
                  itemBuilder: (_, idx) {
                    final item = flaggedItems[idx];
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.category ?? item.assetLabel,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: NpColors.white),
                              ),
                              Text(
                                '${item.finding?.label} · ${item.decision.label}',
                                style: const TextStyle(fontSize: 11, color: NpColors.gray400),
                              ),
                            ],
                          ),
                        ),
                        if (item.photos.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: NpColors.bgElevated,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              '📸 ${item.photos.length}',
                              style: const TextStyle(fontSize: 10, color: NpColors.white),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D2818),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF22C55E)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: Color(0xFF22C55E), size: 18),
                    SizedBox(width: 8),
                    Text('100% Roster Passed Inspection', style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.w700, fontSize: 12)),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Review Again'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: NpColors.red, foregroundColor: NpColors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm & Emit Outbox'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final result = ref.read(fieldSessionProvider).completeTurn(turn);
    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Completed turn · ${result.workOrdersCreated} work orders queued for outbox sync.')),
    );
  }

  Future<void> _addUnexpected() async {
    String category = _categories.first;
    final notes = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: NpColors.bgCard,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const NpKicker('Discovered mid-walk'),
                  const SizedBox(height: 8),
                  const Text('Add untagged asset', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setModal(() => category = v ?? category),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: notes,
                    decoration: const InputDecoration(labelText: 'Notes (optional)'),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: NpColors.red, foregroundColor: NpColors.white),
                    onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('Mint NPID & add to checklist'),
                  ),
                  const SizedBox(height: 12),
                ],
              );
            },
          ),
        );
      },
    );
    if (ok != true) return;
    ref.read(fieldSessionProvider).addUnexpectedAsset(
          turn: widget.turn,
          category: category,
          notes: notes.text.trim().isEmpty ? null : notes.text.trim(),
        );
    notes.dispose();
  }

  Future<void> _verifyScan(TurnItem item) async {
    final controller = TextEditingController(text: item.npid ?? '');
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: NpColors.bgCard,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const NpKicker('Scan verification'),
              const SizedBox(height: 8),
              Text(item.assetLabel, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                textCapitalization: TextCapitalization.characters,
                style: NpType.mono.copyWith(fontWeight: FontWeight.w700, letterSpacing: 1.1),
                decoration: const InputDecoration(
                  labelText: 'NPID',
                  hintText: 'NP-XXXXXXXX',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: NpColors.red, foregroundColor: NpColors.white),
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Verify scan'),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
    if (ok != true) return;
    final hit = ref.read(fieldSessionProvider).verifyItemScan(item, controller.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(hit ? 'Scan verified for ${item.npid}.' : 'NPID did not match this plate.')),
    );
    controller.dispose();
  }

  void _capturePhoto(TurnItem item) {
    final schematic = (item.category != null ? NpAssets.schematicFor(item.category!) : null) ?? NpAssets.schematicFridge;
    ref.read(fieldSessionProvider).addPhotoToTurnItem(item, schematic);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('📸 Captured inspection photo for ${item.assetLabel}.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(fieldSessionProvider);
    final turn = widget.turn;
    final items = turn.items;
    final readOnly = turn.status == TurnStatus.completed;

    return Scaffold(
      appBar: NpBrandAppBar(
        kicker: '02 / ${turn.type.label}',
        title: turn.unitLabel,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${turn.inspectedCount}/${items.length} inspected'
                    '${turn.missingCount > 0 ? ' · ${turn.missingCount} unaccounted' : ''}'
                    '${turn.damagedCount > 0 ? ' · ${turn.damagedCount} flagged' : ''}',
                    style: NpType.mono.copyWith(color: NpColors.gray400, fontSize: 12, letterSpacing: 0.6),
                  ),
                ),
                if (!readOnly)
                  TextButton.icon(
                    onPressed: _addUnexpected,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Found untagged'),
                  ),
              ],
            ),
          ),
          LinearProgressIndicator(
            value: items.isEmpty ? 0 : turn.inspectedCount / items.length,
            minHeight: 3,
            color: NpColors.red,
            backgroundColor: NpColors.white08,
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _TurnItemCard(
                item: items[i],
                readOnly: readOnly,
                onChanged: () {
                  ref.read(fieldSessionProvider).saveTurnItem(items[i]);
                },
                onVerify: () => _verifyScan(items[i]),
                onAddPhoto: () => _capturePhoto(items[i]),
                onRemovePhoto: (idx) {
                  ref.read(fieldSessionProvider).removePhotoFromTurnItem(items[i], idx);
                },
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: readOnly
          ? null
          : SafeArea(
              child: ResponsiveContainer(
                padding: const EdgeInsets.all(16),
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: NpColors.red,
                    foregroundColor: NpColors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _complete,
                  icon: const Icon(Icons.check_circle_outline),
                  label: Text('Complete turn (${turn.inspectedCount}/${items.length})'),
                ),
              ),
            ),
    );
  }
}

class _TurnItemCard extends StatelessWidget {
  final TurnItem item;
  final bool readOnly;
  final VoidCallback onChanged;
  final VoidCallback onVerify;
  final VoidCallback onAddPhoto;
  final ValueChanged<int> onRemovePhoto;

  const _TurnItemCard({
    required this.item,
    required this.readOnly,
    required this.onChanged,
    required this.onVerify,
    required this.onAddPhoto,
    required this.onRemovePhoto,
  });

  static const _findings = [
    TurnItemFinding.presentOk,
    TurnItemFinding.presentDamaged,
    TurnItemFinding.presentNeedsService,
    TurnItemFinding.missing,
    TurnItemFinding.inaccessible,
    TurnItemFinding.notApplicable,
  ];

  @override
  Widget build(BuildContext context) {
    final schematic = item.category == null ? null : NpAssets.schematicFor(item.category!);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (schematic != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(schematic, width: 44, height: 44, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.category ?? item.assetLabel, style: Theme.of(context).textTheme.titleSmall),
                      if (item.npid != null)
                        Text(
                          item.npid!,
                          style: NpType.mono.copyWith(color: NpColors.red, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                    ],
                  ),
                ),
                Icon(
                  item.verifiedByScan ? Icons.qr_code : Icons.qr_code_outlined,
                  size: 18,
                  color: item.verifiedByScan ? NpColors.red : NpColors.gray500,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final f in [
                  ..._findings,
                  if (item.finding == TurnItemFinding.unexpectedFound) TurnItemFinding.unexpectedFound,
                ])
                  ChoiceChip(
                    label: Text(f.label),
                    selected: item.finding == f,
                    onSelected: readOnly
                        ? null
                        : (_) {
                            item.finding = f;
                            if (f == TurnItemFinding.missing) {
                              item.decision = TurnItemDecision.investigate;
                            } else if (f == TurnItemFinding.presentDamaged) {
                              item.decision = TurnItemDecision.repair;
                            }
                            onChanged();
                          },
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<TurnItemDecision>(
                    initialValue: item.decision,
                    decoration: const InputDecoration(labelText: 'Decision', isDense: true),
                    items: TurnItemDecision.values
                        .map((d) => DropdownMenuItem(value: d, child: Text(d.label)))
                        .toList(),
                    onChanged: readOnly
                        ? null
                        : (v) {
                            item.decision = v ?? TurnItemDecision.none;
                            onChanged();
                          },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<AssetCondition>(
                    initialValue: item.condition,
                    decoration: const InputDecoration(labelText: 'Condition', isDense: true),
                    items: AssetCondition.values
                        .map(
                          (c) => DropdownMenuItem(
                            value: c,
                            child: Text(c == AssetCondition.newCondition ? 'New' : c.name),
                          ),
                        )
                        .toList(),
                    onChanged: readOnly
                        ? null
                        : (v) {
                            item.condition = v;
                            onChanged();
                          },
                  ),
                ),
              ],
            ),

            // Photo Evidence Section
            if (item.photos.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'PHOTO EVIDENCE (${item.photos.length})',
                style: NpType.mono.copyWith(fontSize: 10, color: NpColors.gray400, fontWeight: FontWeight.w700, letterSpacing: 1.1),
              ),
              const SizedBox(height: 6),
              SizedBox(
                height: 58,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: item.photos.length,
                  separatorBuilder: (context, index) => const SizedBox(width: 8),
                  itemBuilder: (_, pIdx) {
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            width: 58,
                            height: 58,
                            color: NpColors.bg,
                            child: Image.asset(item.photos[pIdx], fit: BoxFit.cover),
                          ),
                        ),
                        if (!readOnly)
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => onRemovePhoto(pIdx),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: NpColors.bg,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 12, color: NpColors.red),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ],

            if (!readOnly) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: onVerify,
                    icon: const Icon(Icons.qr_code_scanner, size: 16),
                    label: Text(item.verifiedByScan ? 'Rescan plate' : 'Verify by scan'),
                  ),
                  TextButton.icon(
                    onPressed: onAddPhoto,
                    icon: const Icon(Icons.camera_alt, size: 16, color: NpColors.red),
                    label: const Text('Add Photo', style: TextStyle(color: NpColors.red)),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
