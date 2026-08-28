import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';

/// Flag Missing/Broken — v0-scope.md §1.1 asset detail action.
///
/// Brand-voice rule (branding.md §5): never say "missing/stolen" in the UI —
/// say "unaccounted for," "location unconfirmed." No technician-surveillance
/// language; this is about the asset's record, not a suspect.
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
      appBar: const NpBrandAppBar(
        kicker: '02 / Plate',
        title: 'Flag issue',
      ),
      body: ResponsiveContainer(
        maxWidth: 640,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Icon(Icons.flag_outlined, color: NpColors.fault600, size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Flag Asset — ${widget.asset.npid}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: () => setState(() => _reason = _FlagReason.unaccountedFor),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _reason == _FlagReason.unaccountedFor ? NpColors.fault600 : NpColors.mist200,
                        width: _reason == _FlagReason.unaccountedFor ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      color: _reason == _FlagReason.unaccountedFor ? NpColors.fault100.withValues(alpha: 0.3) : null,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _reason == _FlagReason.unaccountedFor ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: _reason == _FlagReason.unaccountedFor ? NpColors.fault600 : NpColors.steel500,
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Unaccounted For', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              SizedBox(height: 4),
                              Text("Cannot locate asset where records indicate it should be.", style: TextStyle(color: NpColors.steel500, fontSize: 13)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () => setState(() => _reason = _FlagReason.broken),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _reason == _FlagReason.broken ? NpColors.fault600 : NpColors.mist200,
                        width: _reason == _FlagReason.broken ? 2 : 1,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      color: _reason == _FlagReason.broken ? NpColors.fault100.withValues(alpha: 0.3) : null,
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _reason == _FlagReason.broken ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: _reason == _FlagReason.broken ? NpColors.fault600 : NpColors.steel500,
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Broken / Inoperable', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              SizedBox(height: 4),
                              Text('Asset is present, but critical functions have failed.', style: TextStyle(color: NpColors.steel500, fontSize: 13)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Field Notes & Context (optional)',
                    hintText: 'Provide details for the investigation work order...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: NpColors.fault600,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _submitting ? null : _submit,
                  icon: const Icon(Icons.flag),
                  label: const Text('Submit Status Flag', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

