import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/part.dart';
import '../../models/service_event.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';

/// Log a service event — v0-scope.md §1.1.
/// Captures: event type, symptom codes (required, single-tap chips),
/// findings, resolution code, condition before/after, labor minutes,
/// parts used/swapped with cost, part swap source tracing, repair-vs-replace
/// decision. Works entirely offline; queued to the outbox.
///
/// TODO(ids): use a real UUIDv7 generator for `id` (architecture.md §3 says
/// clients generate ids offline). This scaffold uses a timestamp placeholder
/// since no uuid package is wired up yet — swap for `uuid` package's v7 once
/// added to pubspec.yaml.
///
/// TODO(non-negotiable): symptom_codes are required on repair events
/// (v0-scope.md §3 #6) — the Submit button below is disabled until at least
/// one symptom is picked for event types that represent a repair.
///
/// TODO(part lineage): the "pulled from another asset" part-swap flow (scan
/// that asset) is the product's signature flow (v0-scope.md §1.1) and is
/// only stubbed here as a text field — replace with a scan-to-select flow
/// wired to AssetRepository.lookupByCode.
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log Service Event')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(widget.asset.npid, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          Text('Event type', style: Theme.of(context).textTheme.labelLarge),
          DropdownButtonFormField<ServiceEventType>(
            initialValue: _eventType,
            items: ServiceEventType.values
                .map((t) => DropdownMenuItem(value: t, child: Text(t.name)))
                .toList(),
            onChanged: (v) => setState(() => _eventType = v!),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text('Symptoms', style: Theme.of(context).textTheme.labelLarge),
              if (_isRepairLike) ...[
                const SizedBox(width: 6),
                Text('(required)', style: TextStyle(color: NpColors.fault600, fontSize: 12)),
              ],
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: _symptomOptions.map((s) {
              final selected = _symptoms.contains(s);
              return FilterChip(
                label: Text(s),
                selected: selected,
                onSelected: (v) => setState(() => v ? _symptoms.add(s) : _symptoms.remove(s)),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _findingsController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Findings', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<ResolutionCode>(
            initialValue: _resolutionCode,
            decoration: const InputDecoration(labelText: 'Resolution code'),
            items: ResolutionCode.values
                .map((r) => DropdownMenuItem(value: r, child: Text(r.name)))
                .toList(),
            onChanged: (v) => setState(() => _resolutionCode = v),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _laborMinutesController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Labor minutes', border: OutlineInputBorder()),
          ),
          const Divider(height: 32),
          Text('Parts used / swapped', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          TextField(
            controller: _partDescriptionController,
            decoration: const InputDecoration(labelText: 'Part description', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _partCostController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Part cost (USD)', border: OutlineInputBorder()),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Pulled from another asset'),
            subtitle: const Text('Part-swap source tracing — TODO: scan source asset'),
            value: _partPulledFromAnotherAsset,
            onChanged: (v) => setState(() => _partPulledFromAnotherAsset = v),
          ),
          const Divider(height: 32),
          Text('Repair vs. replace decision', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          DropdownButtonFormField<RepairVsReplaceDecision>(
            initialValue: _decision,
            items: RepairVsReplaceDecision.values
                .map((d) => DropdownMenuItem(value: d, child: Text(d.name)))
                .toList(),
            onChanged: (v) => setState(() => _decision = v),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _canSubmit && !_submitting ? _submit : null,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Save Service Event'),
          ),
        ],
      ),
    );
  }
}
