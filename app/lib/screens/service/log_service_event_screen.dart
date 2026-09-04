import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
/// Full-bleed Instagram-style layout with elegant symptom multiselect dropdown,
/// edge-to-edge media stage, and sticky action dock.
class LogServiceEventScreen extends ConsumerStatefulWidget {
  final Asset asset;
  final WorkOrder? workOrder;

  const LogServiceEventScreen({super.key, required this.asset, this.workOrder});

  @override
  ConsumerState<LogServiceEventScreen> createState() =>
      _LogServiceEventScreenState();
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

  double get _partsCost =>
      double.tryParse(_partCostController.text.trim()) ?? 0;

  double get _totalEstimatedCost => _laborCost + _partsCost;

  bool get _isRepairLike => {
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

      if (_partSource == _PartSource.salvagedFromDonor &&
          _selectedDonorAsset != null) {
        partsUsed.add(
          PartUsage(
            id: 'pu-salvage-${DateTime.now().microsecondsSinceEpoch}',
            action: PartUsageAction.installed,
            descriptionOnly: partDesc,
            unitCost: cost,
            part: Part(
              id: 'part-salvaged-${DateTime.now().microsecondsSinceEpoch}',
              componentType: partDesc,
              origin: PartOrigin.salvaged,
              sourceAssetId: _selectedDonorAsset!.id,
              sourceAssetLabel:
                  '${_selectedDonorAsset!.categoryDisplayName} ${_selectedDonorAsset!.npid} (${_selectedDonorAsset!.currentLocationLabel ?? "Storage"})',
              salvagedAt: DateTime.now(),
              condition: PartCondition.testedGood,
              imputedValue: cost > 0 ? cost : 45.0,
            ),
          ),
        );
      } else {
        partsUsed.add(
          PartUsage(
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
          ),
        );
      }
    }

    final laborMins = int.tryParse(_laborMinutesController.text.trim()) ?? 45;
    final totalParts = partsUsed.fold(0.0, (sum, p) => sum + p.totalCost);

    final event = ServiceEvent(
      id: 'se-${DateTime.now().microsecondsSinceEpoch}',
      assetId: widget.asset.id,
      eventType: _eventType,
      symptomCodes: _symptoms.toList(),
      findings: _findingsController.text.trim().isEmpty
          ? null
          : _findingsController.text.trim(),
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
    widget.asset.status =
        _resolutionCode == ResolutionCode.fixed ||
            _resolutionCode == ResolutionCode.partReplaced
        ? AssetStatus.active
        : AssetStatus.needsRepair;
    widget.asset.lastServiceAt = DateTime.now();
    widget.asset.lifetimeServiceCost += (event.totalCost + _laborCost);

    if (widget.workOrder != null) {
      session.updateWorkOrderStatus(
        widget.workOrder!,
        WorkOrderStatus.completed,
      );
    }

    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Service saved on ${widget.asset.npid}. Total \$${(_totalEstimatedCost).toStringAsFixed(2)} — queued to upload.',
        ),
      ),
    );
  }

  /// Elegant Full-Bleed Multiselect Bottom Sheet Dropdown for Symptoms
  void _openSymptomBottomSheet() {
    HapticFeedback.selectionClick();
    final tempSelected = Set<String>.from(_symptoms);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.npColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Drag handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: context.npColors.gray700,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Sheet Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'DIAGNOSTIC SYMPTOMS',
                              style: NpType.mono.copyWith(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: context.npColors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Select all observed equipment faults',
                              style: TextStyle(
                                fontSize: 11,
                                color: context.npColors.gray400,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: tempSelected.isNotEmpty
                                ? NpColors.red.withValues(alpha: 0.12)
                                : context.npColors.bgElevated,
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(
                              color: tempSelected.isNotEmpty
                                  ? NpColors.redBorder
                                  : context.npColors.lineStrong,
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            '${tempSelected.length} of ${_symptomMap.length}',
                            style: NpType.mono.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: tempSelected.isNotEmpty
                                  ? NpColors.red
                                  : context.npColors.gray400,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(height: 1, color: context.npColors.line),
                    const SizedBox(height: 8),
                    // Symptoms List
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.45,
                      ),
                      child: ListView(
                        shrinkWrap: true,
                        children: [
                          for (final entry in _symptomMap.entries) ...[
                            _SymptomSheetRow(
                              code: entry.key,
                              label: entry.value,
                              icon: _symptomIconMap[entry.key] ??
                                  Icons.error_outline_rounded,
                              isSelected: tempSelected.contains(entry.key),
                              onToggle: () {
                                HapticFeedback.selectionClick();
                                setSheetState(() {
                                  if (tempSelected.contains(entry.key)) {
                                    tempSelected.remove(entry.key);
                                  } else {
                                    tempSelected.add(entry.key);
                                  }
                                });
                              },
                            ),
                            Divider(
                              height: 1,
                              color: context.npColors.lineLight,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Sheet Actions
                    Row(
                      children: [
                        if (tempSelected.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              setSheetState(() => tempSelected.clear());
                            },
                            child: Text(
                              'CLEAR ALL',
                              style: NpType.mono.copyWith(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: context.npColors.gray400,
                              ),
                            ),
                          ),
                        const Spacer(),
                        Expanded(
                          flex: tempSelected.isNotEmpty ? 2 : 1,
                          child: NpButton.primary(
                            label: tempSelected.isEmpty
                                ? 'CONFIRM SELECTION'
                                : 'APPLY (${tempSelected.length})',
                            icon: Icons.check_rounded,
                            size: NpButtonSize.md,
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              setState(() {
                                _symptoms
                                  ..clear()
                                  ..addAll(tempSelected);
                              });
                              Navigator.of(context).pop();
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// The elegant collapsed dropdown trigger
  Widget _buildSymptomDropdownField() {
    final hasSelection = _symptoms.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'DIAGNOSTIC SYMPTOMS',
              style: NpType.mono.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: context.npColors.gray400,
              ),
            ),
            if (_isRepairLike)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: hasSelection
                      ? context.npColors.bgElevated
                      : NpColors.red.withValues(alpha: 0.14),
                  border: Border.all(
                    color: hasSelection
                        ? context.npColors.lineStrong
                        : NpColors.redBorder,
                    width: 0.8,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Text(
                  hasSelection ? 'RESOLVED' : 'REQUIRED',
                  style: NpType.mono.copyWith(
                    color: hasSelection ? context.npColors.gray400 : NpColors.red,
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Material(
          color: context.npColors.bgElevated,
          borderRadius: BorderRadius.circular(2),
          child: InkWell(
            onTap: _openSymptomBottomSheet,
            borderRadius: BorderRadius.circular(2),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: hasSelection
                      ? context.npColors.lineStrong
                      : (_isRepairLike
                            ? NpColors.redBorder
                            : context.npColors.lineStrong),
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(2),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.tune_rounded,
                    size: 16,
                    color: hasSelection ? NpColors.red : context.npColors.gray400,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: hasSelection
                        ? Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: NpColors.red,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: Text(
                                  '${_symptoms.length} LOGGED',
                                  style: NpType.mono.copyWith(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              for (final code in _symptoms)
                                Text(
                                  _symptomMap[code] ?? code,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: context.npColors.white,
                                  ),
                                ),
                            ],
                          )
                        : Text(
                            'Select diagnostic symptoms…',
                            style: TextStyle(
                              fontSize: 13,
                              color: context.npColors.gray500,
                            ),
                          ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: context.npColors.gray400,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// Full-Bleed Instagram Media Stage Header
  Widget _buildInstagramMediaStage(String? schematic) {
    return Container(
      width: double.infinity,
      height: 156,
      decoration: BoxDecoration(
        color: const Color(0xFF0C0C0C),
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background ambient grid texture
          const Opacity(
            opacity: 0.25,
            child: NpDotGrid(),
          ),
          // Schematic Hero
          if (schematic != null)
            Center(
              child: Opacity(
                opacity: 0.9,
                child: Image.asset(
                  schematic,
                  height: 110,
                  fit: BoxFit.contain,
                ),
              ),
            ),
          // Top Overlaid Telemetry Bar
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Crockford Base32 Tag Pill
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: NpColors.redBorder, width: 0.8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: NpColors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'NPID // ${widget.asset.npid}',
                        style: NpType.mono.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                // Work Order Badge if attached
                if (widget.workOrder != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.75),
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(
                          color: context.npColors.lineStrong, width: 0.8),
                    ),
                    child: Text(
                      '${widget.workOrder!.id} · ${widget.workOrder!.slaLabel.toUpperCase()}',
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: NpColors.red,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Bottom Category & Location Bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.85),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.asset.categoryDisplayName.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${widget.asset.manufacturer ?? "Standard"} ${widget.asset.modelNumber ?? ""} · ${widget.asset.currentLocationLabel ?? "Unit Roster"}',
                          style: TextStyle(
                            fontSize: 10.5,
                            color: Colors.white.withValues(alpha: 0.65),
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDiagnosticsSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(
          bottom: BorderSide(color: context.npColors.line),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '01 // EVENT CLASSIFICATION',
            style: NpType.mono.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: context.npColors.gray400,
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<ServiceEventType>(
            initialValue: _eventType,
            decoration: const InputDecoration(
              labelText: 'Service Event Type',
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            items: ServiceEventType.values
                .map(
                  (t) => DropdownMenuItem(
                    value: t,
                    child: Text(t.label),
                  ),
                )
                .toList(),
            onChanged: (v) => setState(() => _eventType = v!),
          ),
          const SizedBox(height: 18),
          // The elegant multiselect dropdown solution
          _buildSymptomDropdownField(),
          const SizedBox(height: 18),
          Text(
            '02 // FINDINGS & OBSERVATIONS',
            style: NpType.mono.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: context.npColors.gray400,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _findingsController,
            maxLines: 2,
            decoration: const InputDecoration(
              labelText: 'Cause and actions performed',
              hintText: 'Describe diagnostic observations and repair steps…',
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutcomesSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(
          bottom: BorderSide(color: context.npColors.line),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '03 // RESOLUTION & LIFECYCLE',
            style: NpType.mono.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: context.npColors.gray400,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<ResolutionCode>(
                  isExpanded: true,
                  initialValue: _resolutionCode,
                  decoration: const InputDecoration(
                    labelText: 'Resolution',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  items: ResolutionCode.values
                      .map(
                        (r) => DropdownMenuItem(
                          value: r,
                          child: Text(r.label,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12.5)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _resolutionCode = v),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonFormField<AssetCondition>(
                  isExpanded: true,
                  initialValue: _conditionAfter,
                  decoration: const InputDecoration(
                    labelText: 'Condition After',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  items: AssetCondition.values
                      .map(
                        (c) => DropdownMenuItem(
                          value: c,
                          child: Text(c.label,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12.5)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) =>
                      setState(() => _conditionAfter = v ?? _conditionAfter),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<RepairVsReplaceDecision>(
            isExpanded: true,
            initialValue: _decision,
            decoration: const InputDecoration(
              labelText: 'Repair vs Replace Determination',
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            items: RepairVsReplaceDecision.values
                .map(
                  (d) => DropdownMenuItem(
                    value: d,
                    child: Text(d.label,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5)),
                  ),
                )
                .toList(),
            onChanged: (v) => setState(() => _decision = v),
          ),
        ],
      ),
    );
  }

  Widget _buildPartsAndHarvestingSection() {
    final session = ref.watch(fieldSessionProvider);
    final donorCandidates =
        session.assets.where((a) => a.id != widget.asset.id).toList();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: context.npColors.bg,
        border: Border(
          bottom: BorderSide(color: context.npColors.line),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '04 // PARTS & HARVESTING TRACEABILITY',
            style: NpType.mono.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: context.npColors.gray400,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: NpIconChip(
                  icon: Icons.inventory_2_outlined,
                  label: 'New Inventory',
                  isSelected: _partSource == _PartSource.newInventory,
                  onTap: () =>
                      setState(() => _partSource = _PartSource.newInventory),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: NpIconChip(
                  icon: Icons.recycling_rounded,
                  label: 'Salvaged Donor',
                  isSelected: _partSource == _PartSource.salvagedFromDonor,
                  onTap: () => setState(
                    () => _partSource = _PartSource.salvagedFromDonor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _partDescriptionController,
            decoration: const InputDecoration(
              labelText: 'Part Description / Model',
              hintText: 'e.g. Run Capacitor 45uF, Defrost Timer, Inverter Board',
              prefixIcon: Icon(Icons.build_circle_outlined, size: 18),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (_partSource == _PartSource.salvagedFromDonor) ...[
            const SizedBox(height: 10),
            DropdownButtonFormField<Asset>(
              isExpanded: true,
              initialValue: _selectedDonorAsset,
              decoration: const InputDecoration(
                labelText: 'Harvested From Donor Unit',
                prefixIcon: Icon(
                  Icons.recycling,
                  color: NpColors.red,
                  size: 18,
                ),
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              items: donorCandidates.map((a) {
                return DropdownMenuItem(
                  value: a,
                  child: Text(
                    '${a.categoryDisplayName} · ${a.npid} (${a.currentLocationLabel ?? "Storage"})',
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList(),
              onChanged: (val) => setState(() => _selectedDonorAsset = val),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _laborMinutesController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Labor Duration',
                    suffixText: 'min',
                    prefixIcon: Icon(Icons.timer_outlined, size: 18),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _partCostController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Part Cost',
                    prefixText: '\$',
                    prefixIcon: Icon(Icons.attach_money, size: 18),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildRepairVsReplaceEstimator(),
        ],
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
        color: context.npColors.bgElevated,
        borderRadius: BorderRadius.circular(2),
        border: Border.all(color: context.npColors.lineStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '05 // REPAIR VS REPLACE GAUGE',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  color: context.npColors.gray400,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                isEconomical ? 'CHEAPER TO REPAIR' : 'CONSIDER REPLACING',
                style: NpType.mono.copyWith(
                  fontSize: 10,
                  color: isEconomical
                      ? context.npSuccessFg
                      : context.npDangerFg,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total (Labor + Parts):',
                style: TextStyle(fontSize: 12, color: context.npColors.white),
              ),
              Text(
                '\$${cost.toStringAsFixed(2)}',
                style: NpType.mono.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: context.npColors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Replacement CapEx Baseline:',
                style: TextStyle(fontSize: 11, color: context.npColors.gray400),
              ),
              Text(
                '\$$_defaultReplacementCost (${ratio.toStringAsFixed(0)}%)',
                style: NpType.mono.copyWith(
                  fontSize: 11,
                  color: context.npColors.gray400,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(1),
            child: LinearProgressIndicator(
              value: (ratio / 100).clamp(0.0, 1.0),
              minHeight: 4,
              color: isEconomical
                  ? context.npSuccessFg
                  : context.npDangerFg,
              backgroundColor: context.npColors.bg,
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
        title: widget.workOrder != null
            ? 'Ticket ${widget.workOrder!.id}'
            : 'Service ${widget.asset.npid}',
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.zero, // Instagram full bleed style
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Full-Bleed Media Stage
            _buildInstagramMediaStage(schematic),
            if (isTablet)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 6,
                      child: Column(
                        children: [
                          _buildDiagnosticsSection(),
                          _buildOutcomesSection(),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 6,
                      child: _buildPartsAndHarvestingSection(),
                    ),
                  ],
                ),
              )
            else ...[
              _buildDiagnosticsSection(),
              _buildOutcomesSection(),
              _buildPartsAndHarvestingSection(),
            ],
            // Extra spacing so sticky footer never obscures form
            const SizedBox(height: 90),
          ],
        ),
      ),
      // Sticky Full-Bleed Bottom Action Dock
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(
          16,
          10,
          16,
          10 + MediaQuery.of(context).padding.bottom,
        ),
        decoration: BoxDecoration(
          color: context.npColors.bg,
          border: Border(
            top: BorderSide(color: context.npColors.lineStrong),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            NpButton.primary(
              icon: Icons.check_circle_outline_rounded,
              label: _submitting
                  ? 'SAVING RECORD…'
                  : (widget.workOrder != null
                        ? 'COMPLETE & CLOSE TICKET · \$${_totalEstimatedCost.toStringAsFixed(2)}'
                        : 'SAVE SERVICE EVENT · \$${_totalEstimatedCost.toStringAsFixed(2)}'),
              size: NpButtonSize.lg,
              isExpanded: true,
              isLoading: _submitting,
              onPressed: _canSubmit && !_submitting ? _submit : null,
            ),
            if (!_canSubmit)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Select at least one diagnostic symptom before closing ticket.',
                  textAlign: TextAlign.center,
                  style: NpType.mono.copyWith(
                    color: NpColors.red,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Custom row in the symptom multi-select bottom sheet
class _SymptomSheetRow extends StatelessWidget {
  final String code;
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onToggle;

  const _SymptomSheetRow({
    required this.code,
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onToggle,
        splashColor: NpColors.redSubtle,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isSelected
                      ? NpColors.red.withValues(alpha: 0.14)
                      : context.npColors.bgElevated,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: isSelected
                        ? NpColors.redBorder
                        : context.npColors.lineStrong,
                    width: 0.8,
                  ),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: isSelected ? NpColors.red : context.npColors.gray400,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected
                            ? context.npColors.white
                            : context.npColors.white90,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      code,
                      style: NpType.mono.copyWith(
                        fontSize: 10,
                        color: isSelected
                            ? NpColors.red
                            : context.npColors.gray500,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isSelected ? NpColors.red : Colors.transparent,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(
                    color: isSelected
                        ? NpColors.red
                        : context.npColors.lineStrong,
                    width: 1.2,
                  ),
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: Colors.white,
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
