import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/turn.dart';
import '../../services/providers.dart';
import 'turn_walkthrough_screen.dart';

/// Entry point for unit turn ("turnover") inspections — v0-scope.md §1.1
/// "Turn walkthrough". For V0 this is a simple start-a-turn form; a real
/// implementation lists in-progress/assigned turns pulled from the local
/// mirror plus a "start new" action scoped to units in the working set.
class TurnsScreen extends ConsumerStatefulWidget {
  const TurnsScreen({super.key});

  @override
  ConsumerState<TurnsScreen> createState() => _TurnsScreenState();
}

class _TurnsScreenState extends ConsumerState<TurnsScreen> {
  final _unitLabelController = TextEditingController(text: 'Building C — Unit 4B');
  TurnType _type = TurnType.moveOut;

  @override
  void dispose() {
    _unitLabelController.dispose();
    super.dispose();
  }

  Future<void> _startTurn() async {
    final repo = ref.read(turnRepositoryProvider);
    final turn = await repo.startTurn(
      unitId: 'demo-unit-1',
      unitLabel: _unitLabelController.text.trim(),
      type: _type,
    );
    if (!mounted) return;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => TurnWalkthroughScreen(turn: turn)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Unit Turns')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Start a turn walkthrough. The checklist is generated from the '
              "unit's current asset roster.",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _unitLabelController,
              decoration: const InputDecoration(labelText: 'Unit', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<TurnType>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Turn type'),
              items: TurnType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.name))).toList(),
              onChanged: (v) => setState(() => _type = v!),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _startTurn,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start Turn'),
            ),
          ],
        ),
      ),
    );
  }
}
