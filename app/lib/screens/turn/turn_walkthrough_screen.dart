import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/turn.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';

class TurnWalkthroughScreen extends ConsumerStatefulWidget {
  final Turn turn;
  const TurnWalkthroughScreen({super.key, required this.turn});

  @override
  ConsumerState<TurnWalkthroughScreen> createState() =>
      _TurnWalkthroughScreenState();
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
        backgroundColor: context.npColors.bgCard,
        title: Row(
          children: [
            Icon(Icons.assignment_turned_in, color: NpColors.red, size: 24),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Finish turn · ${turn.unitLabel}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
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
              '${turn.items.length} assets audited · ${turn.missingCount} missing · ${turn.damagedCount} flagged for service.',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: context.npColors.gray300),
            ),
            SizedBox(height: 14),
            if (flaggedItems.isNotEmpty) ...[
              Text(
                'Work orders to create (${flaggedItems.length})',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  color: NpColors.red,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              SizedBox(height: 8),
              Container(
                constraints: BoxConstraints(maxHeight: 180),
                decoration: BoxDecoration(
                  color: context.npColors.bg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: context.npColors.gray800),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: EdgeInsets.all(8),
                  itemCount: flaggedItems.length,
                  separatorBuilder: (context, index) =>
                      Divider(height: 8, color: context.npColors.gray800),
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
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: context.npColors.white,
                                ),
                              ),
                              Text(
                                '${item.finding?.label} · ${item.decision.label}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: context.npColors.gray400,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (item.photos.isNotEmpty)
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: context.npColors.bgElevated,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.photo_camera_outlined,
                                  size: 11,
                                  color: context.npColors.white,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  '${item.photos.length}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: context.npColors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ] else ...[
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: context.npSuccessBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: context.npSuccessFg.withValues(alpha: 0.4),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: context.npSuccessFg,
                      size: 18,
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'All assets passed inspection',
                        style: TextStyle(
                          color: context.npSuccessFg,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        actions: [
          NpButton.outline(
            label: 'Keep reviewing',
            size: NpButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, false),
          ),
          NpButton.primary(
            icon: Icons.send_rounded,
            label: 'Finish turn',
            size: NpButtonSize.sm,
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final result = ref.read(fieldSessionProvider).completeTurn(turn);
    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          result.workOrdersCreated == 0
              ? 'Turn finished. No work orders needed.'
              : 'Turn finished. ${result.workOrdersCreated} work order${result.workOrdersCreated == 1 ? '' : 's'} queued to upload.',
        ),
      ),
    );
  }

  Future<void> _addUnexpected() async {
    String category = _categories.first;
    final notes = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.npColors.bgCard,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            16,
            16 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: StatefulBuilder(
            builder: (ctx, setModal) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Add untagged asset',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
                  ),
                  SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: InputDecoration(labelText: 'Category'),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setModal(() => category = v ?? category),
                  ),
                  SizedBox(height: 12),
                  TextField(
                    controller: notes,
                    decoration: InputDecoration(labelText: 'Notes (optional)'),
                  ),
                  SizedBox(height: 16),
                  NpButton.primary(
                    icon: Icons.qr_code_2_rounded,
                    label: 'Add to checklist',
                    size: NpButtonSize.md,
                    isExpanded: true,
                    onPressed: () => Navigator.pop(ctx, true),
                  ),
                  SizedBox(height: 12),
                ],
              );
            },
          ),
        );
      },
    );
    if (ok != true) return;
    ref
        .read(fieldSessionProvider)
        .addUnexpectedAsset(
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
      backgroundColor: context.npColors.bgCard,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            16,
            16 + MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Verify ${item.assetLabel}',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
              ),
              SizedBox(height: 12),
              TextField(
                controller: controller,
                textCapitalization: TextCapitalization.characters,
                style: NpType.mono.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
                decoration: InputDecoration(
                  labelText: 'NPID',
                  hintText: 'NP-XXXXXXXX',
                ),
              ),
              SizedBox(height: 16),
              NpButton.primary(
                icon: Icons.verified_rounded,
                label: 'Verify Scan',
                size: NpButtonSize.md,
                isExpanded: true,
                onPressed: () => Navigator.pop(ctx, true),
              ),
              SizedBox(height: 12),
            ],
          ),
        );
      },
    );
    if (ok != true) return;
    final hit = ref
        .read(fieldSessionProvider)
        .verifyItemScan(item, controller.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          hit
              ? 'Scan verified for ${item.npid}.'
              : 'NPID did not match this plate.',
        ),
      ),
    );
    controller.dispose();
  }

  void _capturePhoto(TurnItem item) {
    final schematic =
        (item.category != null
            ? NpAssets.svgFor(item.category!)
            : null) ??
        NpAssets.isoFridge;
    ref.read(fieldSessionProvider).addPhotoToTurnItem(item, schematic);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Photo saved for ${item.assetLabel}.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(fieldSessionProvider);
    final turn = widget.turn;
    final items = turn.items;
    final readOnly = turn.status == TurnStatus.completed;

    return Scaffold(
      appBar: NpBrandAppBar(title: '${turn.unitLabel} · ${turn.type.label}'),
      body: Column(
        children: [
          // Top Walkthrough Hero Stage
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: context.npColors.bgCard,
              border: Border(
                top: BorderSide(color: context.npColors.lineStrong, width: 1),
                bottom: BorderSide(color: context.npColors.lineStrong),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: context.npColors.bgElevated,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: context.npColors.lineStrong),
                      ),
                      child: Text(
                        turn.type.label.toUpperCase(),
                        style: NpType.mono.copyWith(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w800,
                          color: context.npColors.white,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                    const Spacer(),
                    if (!readOnly)
                      NpButton.secondary(
                        icon: Icons.add_rounded,
                        label: 'Untagged',
                        size: NpButtonSize.sm,
                        onPressed: _addUnexpected,
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${turn.inspectedCount}/${items.length} inspected'
                      '${turn.missingCount > 0 ? ' · ${turn.missingCount} unaccounted' : ''}'
                      '${turn.damagedCount > 0 ? ' · ${turn.damagedCount} flagged' : ''}',
                      style: NpType.mono.copyWith(
                        color: context.npColors.gray400,
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      '${items.isEmpty ? 0 : ((turn.inspectedCount / items.length) * 100).round()}% AUDITED',
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: NpColors.red,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(1),
                  child: LinearProgressIndicator(
                    value: items.isEmpty ? 0 : turn.inspectedCount / items.length,
                    minHeight: 3.5,
                    color: NpColors.red,
                    backgroundColor: context.npColors.white08,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: EdgeInsets.zero,
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox.shrink(),
              itemBuilder: (context, i) => _TurnItemCard(
                item: items[i],
                readOnly: readOnly,
                onChanged: () {
                  ref.read(fieldSessionProvider).saveTurnItem(items[i]);
                },
                onVerify: () => _verifyScan(items[i]),
                onAddPhoto: () => _capturePhoto(items[i]),
                onRemovePhoto: (idx) {
                  ref
                      .read(fieldSessionProvider)
                      .removePhotoFromTurnItem(items[i], idx);
                },
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: readOnly
          ? null
          : SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: context.npColors.bg,
                  border: Border(
                    top: BorderSide(color: context.npColors.lineStrong),
                  ),
                ),
                child: NpButton.primary(
                  icon: Icons.task_alt_rounded,
                  label:
                      'Complete turn (${turn.inspectedCount}/${items.length})',
                  size: NpButtonSize.lg,
                  isExpanded: true,
                  onPressed: _complete,
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

  static IconData _findingIcon(TurnItemFinding f) => switch (f) {
    TurnItemFinding.presentOk => Icons.check_circle_outline_rounded,
    TurnItemFinding.presentDamaged => Icons.error_outline_rounded,
    TurnItemFinding.presentNeedsService => Icons.build_circle_outlined,
    TurnItemFinding.missing => Icons.search_off_rounded,
    TurnItemFinding.inaccessible => Icons.block_rounded,
    TurnItemFinding.notApplicable => Icons.remove_circle_outline_rounded,
    TurnItemFinding.unexpectedFound => Icons.add_circle_outline_rounded,
  };

  static Color _findingColor(BuildContext context, TurnItemFinding f) =>
      switch (f) {
        TurnItemFinding.presentOk => Color(0xFF22C55E),
        TurnItemFinding.presentDamaged => NpColors.red,
        TurnItemFinding.presentNeedsService => Color(0xFFF59E0B),
        TurnItemFinding.missing => NpColors.red,
        TurnItemFinding.inaccessible => context.npColors.gray400,
        TurnItemFinding.notApplicable => context.npColors.gray500,
        TurnItemFinding.unexpectedFound => NpColors.red,
      };

  @override
  Widget build(BuildContext context) {
    final schematic = item.category == null
        ? null
        : NpAssets.schematicFor(item.category!);
    final indicatorColor = item.finding == null
        ? context.npColors.lineStrong
        : _findingColor(context, item.finding!);

    return Material(
      color: context.npColors.bgCard,
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
                if (schematic != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      width: 44,
                      height: 44,
                      padding: const EdgeInsets.all(3),
                      color: const Color(0xFF070709),
                      child: NpApplianceArt(
                        categoryOrTitle: item.category ?? '',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.category ?? item.assetLabel,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      if (item.npid != null)
                        Text(
                          item.npid!,
                          style: NpType.mono.copyWith(
                            color: NpColors.red,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                ),
                SizedBox(width: 8),
                NpMenuButton<String>(
                  size: 32,
                  items: [
                    NpMenuItem(
                      value: 'scan',
                      label: 'Verify Tag Scan',
                      icon: Icons.qr_code_scanner_rounded,
                    ),
                    NpMenuItem(
                      value: 'photo',
                      label: 'Attach Photo',
                      icon: Icons.camera_alt_outlined,
                    ),
                    NpMenuItem(
                      value: 'na',
                      label: 'Mark Not Applicable',
                      icon: Icons.remove_circle_outline_rounded,
                    ),
                  ],
                  onSelected: (action) {
                    switch (action) {
                      case 'scan':
                        onVerify();
                        break;
                      case 'photo':
                        onAddPhoto();
                        break;
                      case 'na':
                        item.finding = TurnItemFinding.notApplicable;
                        item.decision = TurnItemDecision.none;
                        onChanged();
                        break;
                    }
                  },
                ),
              ],
            ),
            SizedBox(height: 12),
            DropdownButtonFormField<TurnItemFinding>(
              initialValue: item.finding,
              decoration: InputDecoration(
                labelText: 'Inspection Finding',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              items: [
                ..._findings,
                if (item.finding == TurnItemFinding.unexpectedFound)
                  TurnItemFinding.unexpectedFound,
              ].map((f) {
                return DropdownMenuItem<TurnItemFinding>(
                  value: f,
                  child: Row(
                    children: [
                      Icon(_findingIcon(f), size: 16, color: _findingColor(context, f)),
                      SizedBox(width: 10),
                      Text(
                        f.label,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: context.npColors.white,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: readOnly
                  ? null
                  : (v) {
                      if (v == null) return;
                      item.finding = v;
                      if (v == TurnItemFinding.missing) {
                        item.decision = TurnItemDecision.investigate;
                      } else if (v == TurnItemFinding.presentDamaged) {
                        item.decision = TurnItemDecision.repair;
                      } else if (v == TurnItemFinding.presentOk) {
                        item.decision = TurnItemDecision.none;
                      }
                      onChanged();
                    },
            ),

            // Photo Evidence Section
            if (item.photos.isNotEmpty) ...[
              SizedBox(height: 12),
              Text(
                'Photos (${item.photos.length})',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  color: context.npColors.gray400,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                ),
              ),
              SizedBox(height: 6),
              SizedBox(
                height: 58,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: item.photos.length,
                  separatorBuilder: (context, index) => SizedBox(width: 8),
                  itemBuilder: (_, pIdx) {
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 58,
                            height: 58,
                            color: context.npColors.bg,
                            child: NpAssetPhoto(
                              path: item.photos[pIdx],
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        if (!readOnly)
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => onRemovePhoto(pIdx),
                              child: Container(
                                padding: EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: context.npColors.bg,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.close,
                                  size: 12,
                                  color: NpColors.red,
                                ),
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
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: NpButton.secondary(
                      icon: item.verifiedByScan
                          ? Icons.verified_rounded
                          : Icons.qr_code_scanner_rounded,
                      label: item.verifiedByScan
                          ? 'Rescan plate'
                          : 'Verify scan',
                      size: NpButtonSize.sm,
                      onPressed: onVerify,
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: NpButton.primary(
                      icon: Icons.camera_alt_rounded,
                      label: 'Add photo',
                      badge: item.photos.isNotEmpty
                          ? '${item.photos.length}'
                          : null,
                      size: NpButtonSize.sm,
                      onPressed: onAddPhoto,
                    ),
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
