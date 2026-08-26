import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/turn.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';

/// Unit Turn inspection checklist — v0-scope.md §1.1.
/// Per item: present-ok / damaged / needs service / missing / inaccessible;
/// condition; decision (repair/replace/clean/monitor). Fully offline.
/// Completing auto-generates work orders for flagged items server-side
/// (data-model.md §6) once synced.
class TurnWalkthroughScreen extends ConsumerStatefulWidget {
  final Turn turn;
  const TurnWalkthroughScreen({super.key, required this.turn});

  @override
  ConsumerState<TurnWalkthroughScreen> createState() => _TurnWalkthroughScreenState();
}

class _TurnWalkthroughScreenState extends ConsumerState<TurnWalkthroughScreen> {
  Future<void> _complete() async {
    await ref.read(turnRepositoryProvider).completeTurn(widget.turn);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Turn completed. Work orders will be generated on sync.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.turn.items;
    return Scaffold(
      appBar: AppBar(title: Text('Turn — ${widget.turn.unitLabel}')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, i) => _TurnItemCard(item: items[i], onChanged: () => setState(() {})),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _complete,
            icon: const Icon(Icons.check_circle_outline),
            label: Text('Complete Turn (${items.length} items)'),
          ),
        ),
      ),
    );
  }
}

class _TurnItemCard extends StatelessWidget {
  final TurnItem item;
  final VoidCallback onChanged;
  const _TurnItemCard({required this.item, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(item.assetLabel, style: Theme.of(context).textTheme.titleSmall)),
                if (item.verifiedByScan)
                  const Icon(Icons.qr_code, size: 16, color: NpColors.verified600),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: TurnItemFinding.values.map((f) {
                final selected = item.finding == f;
                return ChoiceChip(
                  label: Text(f.name),
                  selected: selected,
                  onSelected: (_) {
                    item.finding = f;
                    onChanged();
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<TurnItemDecision>(
              initialValue: item.decision,
              decoration: const InputDecoration(labelText: 'Decision', isDense: true),
              items: TurnItemDecision.values
                  .map((d) => DropdownMenuItem(value: d, child: Text(d.name)))
                  .toList(),
              onChanged: (v) {
                item.decision = v ?? TurnItemDecision.none;
                onChanged();
              },
            ),
          ],
        ),
      ),
    );
  }
}
