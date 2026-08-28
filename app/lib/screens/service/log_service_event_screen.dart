import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/part.dart';
import '../../models/service_event.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';

/// Log a service event — v0-scope.md §1.1.
/// Captures: event type, symptom codes (required, single-tap chips),
/// findings, resolution code, condition before/after, labor minutes,
/// parts used/swapped with cost, part swap source tracing, repair-vs-replace
/// decision.
/// Tablet optimized for 11" Kindle Fire field usage with high-contrast, glove-friendly controls.
class LogServiceEventScreen extends ConsumerStatefulWidget {
  final Asset asset;
  const LogServiceEventScreen({super.key, required this.asset});

  @override
  ConsumerState<LogServiceEventScreen> createState() => _LogServiceEventScreenState();
}

const _symptomOptions = [
  'no_heat',
  'wont_drain',
  'leaking',
  'no_power',
  'noisy',
  'not_cooling',
  'door_seal',
  'control_failure',
];

class _LogServiceEventScreenState extends ConsumerState<LogServiceEventScreen> {
  ServiceEventType _eventType = ServiceEventType.repair;
  ResolutionCode? _resolutionCode;
  RepairVsReplaceDecision? _decision;
  final Set<String> _symptoms = {};
  final _findingsController = TextEditingController();
  final _laborMinutesController = TextEditingController();
  final _partDescriptionController = TextEditingController();
  final _partCostController = TextEditingController();
  bool _partPulledFromAnotherAsset = false;
  bool _submitting = false;

  bool get _isRepairLike => const {
        ServiceEventType.repair,
        ServiceEventType.diagnostic,
        ServiceEventType.partReplacement,
      }.contains(_eventType);

  bool get _canSubmit => !_isRepairLike || _symptoms.isNotEmpty;

  @override
  void dispose() {
    _findingsController.dispose();
    _laborMinutesController.dispose();
    _partDescriptionController.dispose();
    _partCostController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;
    setState(() => _submitting = true);

    final partsUsed = <PartUsage>[];
    if (_partDescriptionController.text.trim().isNotEmpty) {
      partsUsed.add(PartUsage(
        id: 'pu-${DateTime.now().microsecondsSinceEpoch}',
        action: PartUsageAction.installed,
        descriptionOnly: _partDescriptionController.text.trim(),
        unitCost: double.tryParse(_partCostController.text.trim()) ?? 0,
        part: _partPulledFromAnotherAsset
            ? const Part(id: 'unresolved', componentType: 'unknown', origin: PartOrigin.salvaged)
            : null,
      ));
    }

    final event = ServiceEvent(
      id: 'se-${DateTime.now().microsecondsSinceEpoch}',
      assetId: widget.asset.id,
      eventType: _eventType,
      symptomCodes: _symptoms.toList(),
      findings: _findingsController.text.trim().isEmpty ? null : _findingsController.text.trim(),
      resolutionCode: _resolutionCode,
      repairVsReplaceDecision: _decision,
      laborMinutes: int.tryParse(_laborMinutesController.text.trim()),
      partsCost: partsUsed.fold(0, (sum, p) => sum + p.totalCost),
      partsUsed: partsUsed,
      occurredAt: DateTime.now(),
    );

    await ref.read(serviceEventRepositoryProvider).logServiceEvent(event);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Service event queued for sync.')),
    );
    Navigator.of(context).pop();
  }

  Widget _buildLeftColumn() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const NpKicker('Event'),
            const SizedBox(height: 10),
            Text(
              'Event Details & Diagnostics',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Text('Event Type', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            DropdownButtonFormField<ServiceEventType>(
              initialValue: _eventType,
              decoration: const InputDecoration(border: OutlineInputBorder()),
              items: ServiceEventType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.name.toUpperCase())))
                  .toList(),
              onChanged: (v) => setState(() => _eventType = v!),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Text('Symptoms Picklist', style: Theme.of(context).textTheme.labelLarge),
                if (_isRepairLike) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: NpColors.fault100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Required for repair', style: TextStyle(color: NpColors.fault600, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _symptomOptions.map((s) {
                final selected = _symptoms.contains(s);
                return FilterChip(
                  label: Text(s.replaceAll('_', ' ')),
                  labelStyle: TextStyle(
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? NpColors.plate600 : null,
                  ),
                  selected: selected,
                  selectedColor: NpColors.plate100,
                  checkmarkColor: NpColors.plate600,
                  onSelected: (v) => setState(() => v ? _symptoms.add(s) : _symptoms.remove(s)),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _findingsController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Technician Findings & Notes',
                hintText: 'Describe issue, root cause, and component condition...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: DropdownButtonFormField<ResolutionCode>(
                    initialValue: _resolutionCode,
                    decoration: const InputDecoration(labelText: 'Resolution Code', border: OutlineInputBorder()),
                    items: ResolutionCode.values
                        .map((r) => DropdownMenuItem(value: r, child: Text(r.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _resolutionCode = v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _laborMinutesController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Labor (min)', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRightColumn() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const NpKicker('Parts'),
            const SizedBox(height: 10),
            Text(
              'Parts Lineage & Disposition',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _partDescriptionController,
              decoration: const InputDecoration(
                labelText: 'Installed / Swapped Part Description',
                hintText: 'e.g. Inverter Control Board WPW10312695',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _partCostController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Part Cost (USD)',
                prefixText: '\$ ',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Salvaged / Pulled from another asset', style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Maintains parts pedigree across portfolio assets'),
              value: _partPulledFromAnotherAsset,
              onChanged: (v) => setState(() => _partPulledFromAnotherAsset = v),
            ),
            const Divider(height: 24),
            Text('Repair vs. Replace Decision', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            DropdownButtonFormField<RepairVsReplaceDecision>(
              initialValue: _decision,
              decoration: const InputDecoration(border: OutlineInputBorder()),
              items: RepairVsReplaceDecision.values
                  .map((d) => DropdownMenuItem(value: d, child: Text(d.name)))
                  .toList(),
              onChanged: (v) => setState(() => _decision = v),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _canSubmit && !_submitting ? _submit : null,
              icon: const Icon(Icons.save_outlined),
              label: const Text('Save & Queue Service Event', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            if (!_canSubmit)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Select at least one symptom code to submit a repair event.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NpColors.fault600, fontSize: 12),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = context.isTablet;

    return Scaffold(
      appBar: NpBrandAppBar(
        kicker: '02 / Service',
        title: widget.asset.npid,
      ),
      body: isTablet
          ? Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 6,
                    child: SingleChildScrollView(child: _buildLeftColumn()),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    flex: 5,
                    child: SingleChildScrollView(child: _buildRightColumn()),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildLeftColumn(),
                const SizedBox(height: 16),
                _buildRightColumn(),
              ],
            ),
    );
  }
}

