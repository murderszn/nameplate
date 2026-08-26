import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';

/// Flag Missing/Broken — v0-scope.md §1.1 asset detail action.
///
/// Brand-voice rule (branding.md §5): never say "missing/stolen" in the UI —
/// say "unaccounted for," "location unconfirmed." No technician-surveillance
/// language; this is about the asset's record, not a suspect.
///
/// TODO(server rule): per data-model.md §6, a "missing" finding does NOT
/// immediately mark the asset stolen. It sets status='unaccounted_for',
/// opens an investigation work order, and starts the 30-day grace-window
/// clock. This screen only needs to capture reason + notes and queue it;
/// the server owns the investigation lifecycle.
class FlagMissingBrokenScreen extends ConsumerStatefulWidget {
  final Asset asset;
  const FlagMissingBrokenScreen({super.key, required this.asset});

  @override
  ConsumerState<FlagMissingBrokenScreen> createState() => _FlagMissingBrokenScreenState();
}

enum _FlagReason { unaccountedFor, broken }

class _FlagMissingBrokenScreenState extends ConsumerState<FlagMissingBrokenScreen> {
  _FlagReason _reason = _FlagReason.unaccountedFor;
  final _notesController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final repo = ref.read(assetRepositoryProvider);
    await repo.flagMissingOrBroken(
      assetId: widget.asset.id,
      reason: _reason.name,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Flag recorded. Queued for sync.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Flag Issue')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.asset.npid, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            RadioListTile<_FlagReason>(
              value: _FlagReason.unaccountedFor,
              groupValue: _reason,
              title: const Text('Unaccounted for'),
              subtitle: const Text("Can't locate it where records say it should be."),
              onChanged: (v) => setState(() => _reason = v!),
            ),
            RadioListTile<_FlagReason>(
              value: _FlagReason.broken,
              groupValue: _reason,
              title: const Text('Broken'),
              subtitle: const Text('Present, but not functioning.'),
              onChanged: (v) => setState(() => _reason = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: NpColors.fault600),
              onPressed: _submitting ? null : _submit,
              icon: const Icon(Icons.flag),
              label: const Text('Submit Flag'),
            ),
          ],
        ),
      ),
    );
  }
}
