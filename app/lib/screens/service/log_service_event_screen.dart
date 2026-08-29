import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/asset.dart';
import '../../models/part.dart';
import '../../models/service_event.dart';
import '../../models/work_order.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';

/// Log a service event — v0-scope.md §1.1.
/// Captures: event type, symptom codes (required), findings, resolution code,
/// condition before/after, labor minutes, parts used/swapped with cost,
/// part swap source tracing (donor asset cannibalization), repair-vs-replace decision.
class LogServiceEventScreen extends ConsumerStatefulWidget {
  final Asset asset;
  final WorkOrder? workOrder;

  const LogServiceEventScreen({
    super.key,
    required this.asset,
    this.workOrder,
  });

  @override
  ConsumerState<LogServiceEventScreen> createState() => _LogServiceEventScreenState();
}

const _symptomMap = {
  'not_cooling': 'No cooling / Warm',
  'leaking': 'Water leak',
  'noisy': 'Noisy / Vibration',
  'door_seal': 'Gasket / Door seal',
  'wont_drain': 'Drainage failure',
  'no_heat': 'No heat / Burner out',
  'no_power': 'No power / Tripping',
  'control_failure': 'Control board error',
};

const _symptomIconMap = {
  'not_cooling': Icons.ac_unit_rounded,
  'leaking': Icons.water_drop_rounded,
  'noisy': Icons.volume_up_rounded,
  'door_seal': Icons.sensor_door_rounded,
  'wont_drain': Icons.plumbing_rounded,
  'no_heat': Icons.local_fire_department_rounded,
  'no_power': Icons.electric_bolt_rounded,
  'control_failure': Icons.developer_board_rounded,
};

enum _PartSource { newInventory, salvagedFromDonor }

class _LogServiceEventScreenState extends ConsumerState<LogServiceEventScreen> {
  ServiceEventType _eventType = ServiceEventType.repair;
  ResolutionCode? _resolutionCode = ResolutionCode.fixed;
  RepairVsReplaceDecision? _decision = RepairVsReplaceDecision.repaired;
  AssetCondition _conditionAfter = AssetCondition.good;
  final Set<String> _symptoms = {};

  final _findingsController = TextEditingController();
  final _laborMinutesController = TextEditingController(text: '45');
  final _partDescriptionController = TextEditingController();
  final _partCostController = TextEditingController(text: '0');

  _PartSource _partSource = _PartSource.newInventory;
  Asset? _selectedDonorAsset;
  bool _submitting = false;

  static const double _hourlyLaborRate = 85.0;
  static const double _defaultReplacementCost = 850.0;

  @override
  void initState() {
    super.initState();
    if (widget.workOrder != null) {
      _findingsController.text = 'Resolving ${widget.workOrder!.title}';
    }
  }

  @override
  void dispose() {
    _findingsController.dispose();
    _laborMinutesController.dispose();
    _partDescriptionController.dispose();
    _partCostController.dispose();
    super.dispose();
  }

  double get _laborCost {
    final mins = double.tryParse(_laborMinutesController.text.trim()) ?? 0;
    return (mins / 60.0) * _hourlyLaborRate;
  }

  double get _partsCost => double.tryParse(_partCostController.text.trim()) ?? 0;

  double get _totalEstimatedCost => _laborCost + _partsCost;

  bool get _isRepairLike => const {
        ServiceEventType.repair,
        ServiceEventType.diagnostic,
        ServiceEventType.partReplacement,
      }.contains(_eventType);

  bool get _canSubmit => !_isRepairLike || _symptoms.isNotEmpty;

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;
    setState(() => _submitting = true);

    final partsUsed = <PartUsage>[];
    if (_partDescriptionController.text.trim().isNotEmpty) {
      final partDesc = _partDescriptionController.text.trim();
      final cost = _partsCost;

      if (_partSource == _PartSource.salvagedFromDonor && _selectedDonorAsset != null) {
        partsUsed.add(PartUsage(
          id: 'pu-salvage-${DateTime.now().microsecondsSinceEpoch}',
          action: PartUsageAction.installed,
          descriptionOnly: partDesc,
          unitCost: cost,
          part: Part(
            id: 'part-salvaged-${DateTime.now().microsecondsSinceEpoch}',
            componentType: partDesc,
            origin: PartOrigin.salvaged,
            sourceAssetId: _selectedDonorAsset!.id,
            sourceAssetLabel: '${_selectedDonorAsset!.categoryDisplayName} ${_selectedDonorAsset!.npid} (${_selectedDonorAsset!.currentLocationLabel ?? "Storage"})',
            salvagedAt: DateTime.now(),
            condition: PartCondition.testedGood,
            imputedValue: cost > 0 ? cost : 45.0,
          ),
        ));
      } else {
        partsUsed.add(PartUsage(
          id: 'pu-new-${DateTime.now().microsecondsSinceEpoch}',
          action: PartUsageAction.installed,
          descriptionOnly: partDesc,
          unitCost: cost,
          part: Part(
            id: 'part-new-${DateTime.now().microsecondsSinceEpoch}',
            componentType: partDesc,
            origin: PartOrigin.newPurchase,
            condition: PartCondition.newCondition,
            acquisitionCost: cost,
          ),
        ));
      }
    }

    final laborMins = int.tryParse(_laborMinutesController.text.trim()) ?? 45;
    final totalParts = partsUsed.fold(0.0, (sum, p) => sum + p.totalCost);

    final event = ServiceEvent(
      id: 'se-${DateTime.now().microsecondsSinceEpoch}',
      assetId: widget.asset.id,
      eventType: _eventType,
      symptomCodes: _symptoms.toList(),
      findings: _findingsController.text.trim().isEmpty ? null : _findingsController.text.trim(),
      resolutionCode: _resolutionCode,
      repairVsReplaceDecision: _decision,
      laborMinutes: laborMins,
      partsCost: totalParts,
      partsUsed: partsUsed,
      occurredAt: DateTime.now(),
    );

    await ref.read(serviceEventRepositoryProvider).logServiceEvent(event);

    final session = ref.read(fieldSessionProvider);
    widget.asset.condition = _conditionAfter;
    widget.asset.status = _resolutionCode == ResolutionCode.fixed || _resolutionCode == ResolutionCode.partReplaced
        ? AssetStatus.active
        : AssetStatus.needsRepair;
    widget.asset.lastServiceAt = DateTime.now();
    widget.asset.lifetimeServiceCost += (event.totalCost + _laborCost);

    if (widget.workOrder != null) {
      session.updateWorkOrderStatus(widget.workOrder!, WorkOrderStatus.completed);
    }

    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Service recorded on ${widget.asset.npid}. Total: \$${(_totalEstimatedCost).toStringAsFixed(2)} · Outbox queued.',
        ),
      ),
    );
  }

  Widget _buildLeftColumn() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const NpKicker('01 / Diagnostics'),
                if (_isRepairLike)
                  Text(
                    'Symptom Required',
                    style: NpType.mono.copyWith(color: NpColors.red, fontSize: 10, fontWeight: FontWeight.w700),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Event Type & Root Cause', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            DropdownButtonFormField<ServiceEventType>(
              initialValue: _eventType,
              decoration: const InputDecoration(labelText: 'Event Type'),
              items: ServiceEventType.values
                  .map((t) => DropdownMenuItem(value: t, child: Text(t.name.toUpperCase())))
                  .toList(),
              onChanged: (v) => setState(() => _eventType = v!),
            ),
            const SizedBox(height: 16),
            Text('Symptom Codes', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final entry in _symptomMap.entries)
                  NpIconChip(
                    icon: _symptomIconMap[entry.key],
                    label: entry.value,
                    isSelected: _symptoms.contains(entry.key),
                    onTap: () {
                      setState(() {
                        if (_symptoms.contains(entry.key)) {
                          _symptoms.remove(entry.key);
                        } else {
                          _symptoms.add(entry.key);
                        }
                      });
                    },
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _findingsController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Technician Findings & Work Performed',
                hintText: 'Describe issue, root cause, and component condition...',
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<ResolutionCode>(
                    initialValue: _resolutionCode,
                    decoration: const InputDecoration(labelText: 'Resolution Code'),
                    items: ResolutionCode.values
                        .map((r) => DropdownMenuItem(value: r, child: Text(r.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _resolutionCode = v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<AssetCondition>(
                    initialValue: _conditionAfter,
                    decoration: const InputDecoration(labelText: 'Condition After'),
                    items: AssetCondition.values
                        .map((c) => DropdownMenuItem(value: c, child: Text(c == AssetCondition.newCondition ? 'New' : c.name)))
                        .toList(),
                    onChanged: (v) => setState(() => _conditionAfter = v ?? _conditionAfter),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<RepairVsReplaceDecision>(
              initialValue: _decision,
              decoration: const InputDecoration(labelText: 'Action Disposition'),
              items: RepairVsReplaceDecision.values
                  .map((d) => DropdownMenuItem(value: d, child: Text(d.name.toUpperCase())))
                  .toList(),
              onChanged: (v) => setState(() => _decision = v),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRightColumn() {
    final session = ref.watch(fieldSessionProvider);
    final donorCandidates = session.assets.where((a) => a.id != widget.asset.id).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const NpKicker('02 / Parts & Hardware Lineage'),
            const SizedBox(height: 8),
            Text('Part Sourcing & Traceability', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: NpIconChip(
                    icon: Icons.inventory_2_outlined,
                    label: 'Van Stock (New)',
                    isSelected: _partSource == _PartSource.newInventory,
                    onTap: () => setState(() => _partSource = _PartSource.newInventory),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: NpIconChip(
                    icon: Icons.recycling_rounded,
                    label: 'Harvest from Donor',
                    isSelected: _partSource == _PartSource.salvagedFromDonor,
                    onTap: () => setState(() => _partSource = _PartSource.salvagedFromDonor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _partDescriptionController,
              decoration: const InputDecoration(
                labelText: 'Component Description',
                hintText: 'e.g. Defrost Timer, Inverter Board',
                prefixIcon: Icon(Icons.build_circle_outlined, size: 18),
              ),
              onChanged: (_) => setState(() {}),
            ),
            if (_partSource == _PartSource.salvagedFromDonor) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<Asset>(
                initialValue: _selectedDonorAsset,
                decoration: const InputDecoration(
                  labelText: 'Select Donor Asset (Cannibalized)',
                  prefixIcon: Icon(Icons.recycling, color: NpColors.red, size: 18),
                ),
                items: donorCandidates.map((a) {
                  return DropdownMenuItem(
                    value: a,
                    child: Text('${a.categoryDisplayName} · ${a.npid} (${a.currentLocationLabel ?? "Storage"})', style: const TextStyle(fontSize: 12)),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _selectedDonorAsset = val),
              ),
              if (_selectedDonorAsset != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D2818),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF22C55E)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified, color: Color(0xFF22C55E), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Lineage Link: Cannibalized from ${_selectedDonorAsset!.npid}',
                          style: const TextStyle(color: Color(0xFF22C55E), fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _laborMinutesController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Labor (Mins)',
                      suffixText: 'mins',
                      prefixIcon: Icon(Icons.timer_outlined, size: 18),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _partCostController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Part Cost',
                      prefixText: '\$',
                      prefixIcon: Icon(Icons.attach_money, size: 18),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildRepairVsReplaceEstimator(),
            const SizedBox(height: 20),
            NpButton.primary(
              icon: Icons.check_circle_outline_rounded,
              label: _submitting
                  ? 'RECORDING...'
                  : (widget.workOrder != null ? 'Record Service & Close Work Order' : 'Save & Queue Service Event'),
              size: NpButtonSize.lg,
              isExpanded: true,
              isLoading: _submitting,
              onPressed: _canSubmit && !_submitting ? _submit : null,
            ),
            if (!_canSubmit)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Select at least one symptom code to submit a repair event.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: NpColors.red, fontSize: 12),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRepairVsReplaceEstimator() {
    final cost = _totalEstimatedCost;
    final ratio = (cost / _defaultReplacementCost) * 100;
    final isEconomical = ratio < 50;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: NpColors.bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: NpColors.gray800),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('REPAIR VS. REPLACE ESTIMATE', style: NpType.mono.copyWith(fontSize: 10, color: NpColors.gray400, fontWeight: FontWeight.w700)),
              Text(
                isEconomical ? '✓ ECONOMICAL' : '⚠ REPLACE',
                style: NpType.mono.copyWith(fontSize: 10, color: isEconomical ? const Color(0xFF22C55E) : NpColors.red, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Total (Labor + Parts):', style: const TextStyle(fontSize: 12, color: NpColors.white)),
              Text('\$${cost.toStringAsFixed(2)}', style: NpType.mono.copyWith(fontWeight: FontWeight.w800, fontSize: 12, color: NpColors.white)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Benchmark:', style: const TextStyle(fontSize: 11, color: NpColors.gray400)),
              Text('\$$_defaultReplacementCost (${ratio.toStringAsFixed(0)}%)', style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray400)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: (ratio / 100).clamp(0.0, 1.0),
              minHeight: 4,
              color: isEconomical ? const Color(0xFF22C55E) : NpColors.red,
              backgroundColor: NpColors.bgElevated,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final schematic = NpAssets.schematicFor(widget.asset.categoryDisplayName);
    final isTablet = MediaQuery.of(context).size.width >= 768;

    return Scaffold(
      appBar: NpBrandAppBar(
        kicker: widget.workOrder != null ? '01 / Work Order' : '02 / Service',
        title: 'Service: ${widget.asset.npid}',
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(isTablet ? 20 : 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    if (schematic != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.asset(schematic, width: 44, height: 44, fit: BoxFit.cover),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.asset.categoryDisplayName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: NpColors.white)),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.asset.manufacturer ?? "Unknown"} ${widget.asset.modelNumber ?? ""} · ${widget.asset.npid}',
                            style: NpType.mono.copyWith(fontSize: 11, color: NpColors.red, fontWeight: FontWeight.w700),
                          ),
                          if (widget.workOrder != null)
                            Text(
                              'Linked WO: ${widget.workOrder!.id} (${widget.workOrder!.priority.label})',
                              style: const TextStyle(fontSize: 11, color: NpColors.gray400),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            if (isTablet)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 6, child: _buildLeftColumn()),
                  const SizedBox(width: 16),
                  Expanded(flex: 6, child: _buildRightColumn()),
                ],
              )
            else ...[
              _buildLeftColumn(),
              const SizedBox(height: 14),
              _buildRightColumn(),
            ],
          ],
        ),
      ),
    );
  }
}
