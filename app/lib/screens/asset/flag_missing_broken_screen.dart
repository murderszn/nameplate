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
  ConsumerState<FlagMissingBrokenScreen> createState() =>
      _FlagMissingBrokenScreenState();
}

enum _FlagReason { unaccountedFor, broken }

class _FlagMissingBrokenScreenState
    extends ConsumerState<FlagMissingBrokenScreen> {
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
      notes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('Issue saved. Queued to upload.')));
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: NpBrandAppBar(title: 'Flag issue'),
      body: ResponsiveContainer(
        maxWidth: 640,
        child: Container(
          decoration: BoxDecoration(
            color: context.npColors.bgCard,
            border: Border.fromBorderSide(
              BorderSide(color: context.npColors.lineStrong),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: context.npColors.lineStrong),
                  ),
                ),
                child: Row(
                  children: [
                    Text(
                      'Issue details',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Spacer(),
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
                padding: EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Report an asset issue',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Choose what happened and add any details the next technician needs.',
                      style: TextStyle(
                        color: context.npColors.gray400,
                        fontSize: 13,
                      ),
                    ),
                    SizedBox(height: 16),
                    NpActionTile(
                      icon: Icons.search_off_rounded,
                      title: 'Unaccounted for',
                      subtitle: 'Not found at its recorded location.',
                      isSelected: _reason == _FlagReason.unaccountedFor,
                      isDestructive: true,
                      onTap: () =>
                          setState(() => _reason = _FlagReason.unaccountedFor),
                    ),
                    SizedBox(height: 10),
                    NpActionTile(
                      icon: Icons.hardware_rounded,
                      title: 'Asset is broken',
                      subtitle: 'Present, but not working correctly.',
                      isSelected: _reason == _FlagReason.broken,
                      isDestructive: true,
                      onTap: () => setState(() => _reason = _FlagReason.broken),
                    ),
                    SizedBox(height: 20),
                    TextField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Notes (optional)',
                        hintText: 'Anything the next technician should know…',
                        prefixIcon: Icon(Icons.edit_note_rounded),
                      ),
                    ),
                    SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: NpButton.danger(
                            icon: Icons.flag_rounded,
                            label: _submitting
                                ? 'Saving…'
                                : 'Submit issue',
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
