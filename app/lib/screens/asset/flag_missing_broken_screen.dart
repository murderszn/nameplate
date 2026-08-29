import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
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
        child: Container(
          decoration: const BoxDecoration(
            color: NpColors.bgCard,
            border: Border.fromBorderSide(BorderSide(color: NpColors.lineStrong)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: NpColors.lineStrong)),
                ),
                child: Row(
                  children: [
                    const NpKicker('01 / Exception Report'),
                    const Spacer(),
                    Text(
                      widget.asset.npid,
                      style: NpType.mono.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: NpColors.red,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Flag Asset Condition',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'This updates the asset registry ledger and schedules an immediate triage ticket.',
                      style: const TextStyle(color: NpColors.gray400, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    NpActionTile(
                      icon: Icons.search_off_rounded,
                      kicker: 'Location Unconfirmed',
                      title: 'Unaccounted For',
                      subtitle: 'Cannot locate asset where records indicate it should be.',
                      isSelected: _reason == _FlagReason.unaccountedFor,
                      isDestructive: true,
                      onTap: () => setState(() => _reason = _FlagReason.unaccountedFor),
                    ),
                    const SizedBox(height: 10),
                    NpActionTile(
                      icon: Icons.hardware_rounded,
                      kicker: 'Physical / Operational Damage',
                      title: 'Broken / Inoperable',
                      subtitle: 'Asset is present, but critical functions have failed.',
                      isSelected: _reason == _FlagReason.broken,
                      isDestructive: true,
                      onTap: () => setState(() => _reason = _FlagReason.broken),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Field Notes & Context (optional)',
                        hintText: 'Provide details for the investigation work order...',
                        prefixIcon: Icon(Icons.edit_note_rounded),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: NpButton.danger(
                            icon: Icons.flag_rounded,
                            label: _submitting ? 'RECORDING...' : 'SUBMIT STATUS FLAG',
                            size: NpButtonSize.lg,
                            isExpanded: true,
                            isLoading: _submitting,
                            onPressed: _submitting ? null : _submit,
                          ),
                        ),
                      ],
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

