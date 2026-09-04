import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';

/// Flag Missing/Broken — v0-scope.md §1.1 asset detail action.
/// Full-bleed incident stage, high-contrast hazard styling, and sticky action dock.
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
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Issue saved. Queued to upload.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const NpBrandAppBar(title: 'Flag issue'),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          // ── 00 // Full-Bleed Incident Hero Stage ───────────────────────────
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFF1F0A0E), Color(0xFF0C080A)],
              ),
              border: Border(
                bottom: BorderSide(color: context.npColors.lineStrong),
                left: const BorderSide(color: NpColors.red, width: 3.5),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2.5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(color: const Color(0xFFEF4444)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.warning_amber_rounded,
                            size: 13,
                            color: Color(0xFFEF4444),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'INCIDENT REPORT // ESCALATION',
                            style: NpType.mono.copyWith(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFEF4444),
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Text(
                      widget.asset.npid,
                      style: NpType.mono.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: NpColors.red,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  widget.asset.categoryDisplayName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${widget.asset.currentLocationLabel ?? 'Unknown location'} · Serial: ${widget.asset.serialNumber ?? 'UNSPECIFIED'}',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: context.npColors.gray400,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          // ── Telemetry Ribbon ───────────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: context.npColors.bgCard,
              border: Border(
                bottom: BorderSide(color: context.npColors.lineStrong),
              ),
            ),
            child: Row(
              children: [
                Text(
                  'DISPATCH ACTION //',
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: NpColors.red,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Audit discrepancy flagged for operations supervisor',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: context.npColors.gray400,
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // ── 01 // Reason Selection ─────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Report an asset issue',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Choose what happened and add any details the next technician needs.',
                  style: TextStyle(
                    color: context.npColors.gray400,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 16),
                _FlagReasonTile(
                  icon: Icons.search_off_rounded,
                  title: 'Unaccounted for',
                  subtitle: 'Not found at its recorded location.',
                  isSelected: _reason == _FlagReason.unaccountedFor,
                  accentColor: const Color(0xFFEF4444),
                  onTap: () =>
                      setState(() => _reason = _FlagReason.unaccountedFor),
                ),
                const SizedBox(height: 10),
                _FlagReasonTile(
                  icon: Icons.hardware_rounded,
                  title: 'Asset is broken',
                  subtitle: 'Present, but not working correctly.',
                  isSelected: _reason == _FlagReason.broken,
                  accentColor: const Color(0xFFF59E0B),
                  onTap: () => setState(() => _reason = _FlagReason.broken),
                ),
                const SizedBox(height: 20),
                Text(
                  'TECHNICIAN NOTES // FIELD EVIDENCE',
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: context.npColors.gray500,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Notes (optional)',
                    hintText: 'Anything the next technician should know…',
                    prefixIcon: const Icon(Icons.edit_note_rounded),
                    filled: true,
                    fillColor: context.npColors.bgCard,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          decoration: BoxDecoration(
            color: context.npColors.bg,
            border: Border(top: BorderSide(color: context.npColors.lineStrong)),
          ),
          child: Row(
            children: [
              Expanded(
                child: NpButton.danger(
                  icon: Icons.flag_rounded,
                  label: _submitting ? 'Saving…' : 'Submit issue',
                  size: NpButtonSize.lg,
                  isExpanded: true,
                  isLoading: _submitting,
                  onPressed: _submitting ? null : _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Flag Reason Tile ──────────────────────────────────────────────────────────

class _FlagReasonTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final Color accentColor;
  final VoidCallback onTap;

  const _FlagReasonTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.accentColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected
          ? accentColor.withValues(alpha: 0.08)
          : context.npColors.bgCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(2),
        side: BorderSide(
          color: isSelected ? accentColor : context.npColors.lineStrong,
          width: isSelected ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isSelected
                      ? accentColor.withValues(alpha: 0.16)
                      : context.npColors.bgElevated,
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Icon(
                  icon,
                  color: isSelected ? accentColor : context.npColors.gray400,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isSelected
                            ? Colors.white
                            : context.npColors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: context.npColors.gray400,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                isSelected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
                color: isSelected ? accentColor : context.npColors.gray500,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
