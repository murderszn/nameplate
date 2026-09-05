import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/field_session.dart';
import '../../services/providers.dart';
import '../../services/sync_status_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/theme_controller.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
import 'fleet_gallery_screen.dart';
import 'tag_studio_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(fieldSessionProvider);
    final snapshot = session.syncSnapshot;
    final lastSync = session.lastSyncedAt;
    final darkMode = ref.watch(themeModeProvider) == ThemeMode.dark;

    final isOffline = snapshot.state == SyncState.offline || session.offlineMode;
    final syncStatusSubtitle = isOffline
        ? 'Offline · ${snapshot.pendingCount} queued'
        : snapshot.pendingCount == 0
        ? 'Current · last push ${_ago(lastSync)}'
        : '${snapshot.pendingCount} pending'
            '${snapshot.oldestUnsyncedAt != null ? ' · oldest ${_ago(snapshot.oldestUnsyncedAt)}' : ''}';

    return Scaffold(
      appBar: const NpBrandAppBar(title: 'Settings', showLogo: true),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          // ── 00 // Unified Identity, Role & Scope Stage ─────────────────────
          _AccountAndRoleHero(
            session: session,
            onPickTech: () => _pickTech(context, ref, session),
            onPickProperties: () => _pickProperties(context, ref, session),
            onSelectRole: (role) {
              ref.read(fieldSessionProvider).setRole(
                role,
                unitId: role == AppRole.renter ? 'unit-214' : null,
              );
            },
          ),

          // ── Telemetry Ribbon: Sync & Network Status ────────────────────────
          _SyncTelemetryRibbon(
            isOffline: isOffline,
            statusText: syncStatusSubtitle,
            pendingCount: snapshot.pendingCount,
            syncing: session.syncing,
            onSync: session.offlineMode
                ? null
                : () async {
                    await ref.read(fieldSessionProvider).forceSync();
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Synced. Nothing waiting to upload.'),
                      ),
                    );
                  },
          ),

          // ── Appearance ─────────────────────────────────────────────────────
          const _FullBleedSectionHeader(
            title: 'System appearance',
          ),
          _FullBleedSwitchTile(
            icon: darkMode
                ? Icons.dark_mode_rounded
                : Icons.light_mode_rounded,
            accentColor: NpColors.red,
            title: 'Dark mode',
            subtitle: darkMode
                ? 'Dark Nameplate theme'
                : 'White Nameplate theme · default',
            value: darkMode,
            onChanged: (enabled) =>
                ref.read(themeModeProvider.notifier).setDarkMode(enabled),
          ),

          Divider(height: 1, color: context.npColors.lineStrong),

          // ── Sync & Network Data ────────────────────────────────────────────
          const _FullBleedSectionHeader(
            title: 'Data transport & offline buffer',
          ),
          _FullBleedSwitchTile(
            icon: Icons.cloud_off_rounded,
            accentColor: const Color(0xFFF59E0B),
            title: 'Work offline',
            subtitle: 'Queue writes; skip pull until you reconnect',
            value: session.offlineMode,
            onChanged: (v) =>
                ref.read(fieldSessionProvider).setOfflineMode(v),
          ),
          Divider(height: 1, color: context.npColors.lineStrong),
          _FullBleedSwitchTile(
            icon: Icons.wifi_tethering_rounded,
            accentColor: const Color(0xFF10B981),
            title: 'Photos on Wi-Fi only',
            subtitle: 'Skip photo upload on cellular. On by default.',
            value: session.photoWifiOnly,
            onChanged: (v) =>
                ref.read(fieldSessionProvider).setPhotoWifiOnly(v),
          ),

          // ── Hardware Minting Studio ────────────────────────────────────────
          const _FullBleedSectionHeader(
            title: 'Hardware & tag commissioning',
          ),
          _TagStudioBanner(
            offlineRemainingCount: session.remainingOfflinePoolCount,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const TagStudioScreen()),
            ),
          ),
          Divider(height: 1, color: context.npColors.lineStrong),
          _FleetGalleryBanner(
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const FleetGalleryScreen()),
            ),
          ),

          // ── Waiting to Upload (Outbox) ─────────────────────────────────────
          if (session.outbox.isNotEmpty) ...[
            _FullBleedSectionHeader(
              title: 'Upload queue buffer',
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: const Color(0xFFEF4444)),
                ),
                child: Text(
                  '${session.outbox.length} OPS',
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFFEF4444),
                  ),
                ),
              ),
            ),
            ...session.outbox.take(8).map((op) => _OutboxTile(op: op)),
          ],

          // ── Device & App Diagnostics ───────────────────────────────────────
          const _FullBleedSectionHeader(
            title: 'Device telemetry & app runtime',
          ),
          _FullBleedTile(
            icon: Icons.devices_rounded,
            accentColor: context.npColors.gray400,
            title: 'Device identifier',
            subtitle:
                '${session.deviceId} · ${MediaQuery.sizeOf(context).shortestSide >= 640 ? 'Tablet' : 'Phone'} layout',
          ),
          Divider(height: 1, color: context.npColors.lineStrong),
          _FullBleedTile(
            icon: Icons.shield_outlined,
            accentColor: NpColors.red,
            title: 'About Nameplate Field',
            subtitle: 'Scan it. Trace it. Account for it.',
          ),
        ],
      ),
    );
  }

  Future<void> _pickTech(
    BuildContext context,
    WidgetRef ref,
    FieldSession session,
  ) async {
    final next = await showModalBottomSheet<FieldTech>(
      context: context,
      backgroundColor: context.npColors.bgCard,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text(
                  'Switch Field Technician',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  'Select active technician profile for service logs and sign-offs',
                ),
              ),
              ...session.roster.map((t) {
                final selected = session.tech.id == t.id;
                return ListTile(
                  leading: Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                    color: selected ? NpColors.red : context.npColors.gray500,
                  ),
                  title: Text(t.name),
                  subtitle: Text('${t.role} · ${t.email}'),
                  onTap: () => Navigator.pop(ctx, t),
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
    if (next != null) ref.read(fieldSessionProvider).selectTech(next);
  }

  Future<void> _pickProperties(
    BuildContext context,
    WidgetRef ref,
    FieldSession session,
  ) async {
    final selected = Set<String>.from(session.assignedPropertyIds);
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: context.npColors.bgCard,
      showDragHandle: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModal) {
            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const ListTile(
                      title: Text(
                        'Property scope',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        'Turns and work orders filter to these properties',
                      ),
                    ),
                    ...session.properties.map(
                      (p) => CheckboxListTile(
                        value: selected.contains(p.id),
                        title: Text(p.name),
                        subtitle: Text(p.code ?? ''),
                        onChanged: (v) {
                          setModal(() {
                            if (v == true) {
                              selected.add(p.id);
                            } else {
                              selected.remove(p.id);
                            }
                          });
                        },
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: NpButton.primary(
                        icon: Icons.check_rounded,
                        label: 'Save Scope',
                        size: NpButtonSize.md,
                        isExpanded: true,
                        onPressed: () {
                          ref
                              .read(fieldSessionProvider)
                              .setAssignedProperties(selected);
                          Navigator.pop(ctx);
                        },
                      ),
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

  String _ago(DateTime? t) {
    if (t == null) return 'never';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'just now';
    if (d.inMinutes < 60) return '${d.inMinutes}m ago';
    if (d.inHours < 24) return '${d.inHours}h ago';
    return '${d.inDays}d ago';
  }
}

// ── Unified Identity, Role & Scope Hero Stage ─────────────────────────────────

class _AccountAndRoleHero extends StatelessWidget {
  final FieldSession session;
  final VoidCallback onPickTech;
  final VoidCallback onPickProperties;
  final ValueChanged<AppRole> onSelectRole;

  const _AccountAndRoleHero({
    required this.session,
    required this.onPickTech,
    required this.onPickProperties,
    required this.onSelectRole,
  });

  @override
  Widget build(BuildContext context) {
    final isRenter = session.isRenter;
    final accentColor = isRenter ? const Color(0xFF0EA5E9) : NpColors.red;
    final assignedProps = session.properties
        .where((p) => session.assignedPropertyIds.contains(p.id))
        .map((p) => p.name)
        .join(', ');

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
          left: BorderSide(color: accentColor, width: 3.5),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Role Segment Header & Selector ──────────────────────────────
          Row(
            children: [
              Expanded(
                child: Text(
                  'APP ROLE & ACCESS SCOPE',
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: context.npColors.gray400,
                    letterSpacing: 1.0,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: accentColor),
                ),
                child: Text(
                  isRenter ? 'RESIDENT' : 'FIELD OPS',
                  style: NpType.mono.copyWith(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: accentColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Segmented switch between Technician mode and Resident mode
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: context.npColors.bgElevated,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: context.npColors.lineStrong),
            ),
            child: Row(
              children: [
                // Technician Mode Tab
                Expanded(
                  child: InkWell(
                    onTap: isRenter ? () => onSelectRole(AppRole.technician) : null,
                    borderRadius: BorderRadius.circular(2),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      decoration: BoxDecoration(
                        color: !isRenter
                            ? NpColors.red.withValues(alpha: 0.16)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(
                          color: !isRenter
                              ? NpColors.red
                              : Colors.transparent,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.engineering_outlined,
                            size: 15,
                            color: !isRenter ? NpColors.red : context.npColors.gray500,
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'Technician',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: !isRenter ? FontWeight.w800 : FontWeight.w600,
                                  color: !isRenter ? context.npColors.white : context.npColors.gray400,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                // Resident / Renter Mode Tab
                Expanded(
                  child: InkWell(
                    onTap: !isRenter ? () => onSelectRole(AppRole.renter) : null,
                    borderRadius: BorderRadius.circular(2),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
                      decoration: BoxDecoration(
                        color: isRenter
                            ? const Color(0xFF0EA5E9).withValues(alpha: 0.16)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(
                          color: isRenter
                              ? const Color(0xFF0EA5E9)
                              : Colors.transparent,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.home_outlined,
                            size: 15,
                            color: isRenter ? const Color(0xFF0EA5E9) : context.npColors.gray500,
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'Renter / Resident',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isRenter ? FontWeight.w800 : FontWeight.w600,
                                  color: isRenter ? context.npColors.white : context.npColors.gray400,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Divider(height: 1, color: context.npColors.lineStrong),
          const SizedBox(height: 12),

          // ── Active Identity Details ──────────────────────────────────────
          if (!isRenter) ...[
            // Technician Mode Card
            Row(
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    session.tech.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: onPickTech,
                  borderRadius: BorderRadius.circular(2),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: context.npColors.bgElevated,
                      borderRadius: BorderRadius.circular(2),
                      border: Border.all(color: context.npColors.lineStrong),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.swap_horiz_rounded,
                          size: 13,
                          color: context.npColors.gray400,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'SWITCH TECH',
                          style: NpType.mono.copyWith(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: context.npColors.white,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${session.tech.role.toLowerCase() == 'technician' ? 'Field Technician' : '${session.tech.role} · Field Technician'} · ${FieldSession.orgName}',
              style: TextStyle(
                fontSize: 12,
                color: context.npColors.gray400,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: onPickProperties,
              borderRadius: BorderRadius.circular(2),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: context.npColors.bgElevated,
                  borderRadius: BorderRadius.circular(2),
                  border: Border.all(color: context.npColors.lineStrong, width: 0.8),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.apartment_rounded,
                      size: 13,
                      color: Color(0xFFF59E0B),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        assignedProps.isNotEmpty
                            ? 'Scope: $assignedProps'
                            : 'No assigned properties',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: context.npColors.gray300,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'EDIT',
                      style: NpType.mono.copyWith(
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFFF59E0B),
                      ),
                    ),
                    const SizedBox(width: 2),
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 13,
                      color: Color(0xFFF59E0B),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            // Resident Mode Card
            Row(
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: Color(0xFF0EA5E9),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    session.tech.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0EA5E9).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: const Color(0xFF0EA5E9)),
                  ),
                  child: Text(
                    'UNIT 214',
                    style: NpType.mono.copyWith(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0EA5E9),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Resident · Sonoran Ridge · 4 Registered Appliances',
              style: TextStyle(
                fontSize: 12,
                color: context.npColors.gray400,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(2),
                border: Border.all(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.25),
                  width: 0.8,
                ),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 13,
                    color: Color(0xFF0EA5E9),
                  ),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Resident scope: scan appliances in your unit or check work orders',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF38BDF8),
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Sync Telemetry Ribbon ─────────────────────────────────────────────────────

class _SyncTelemetryRibbon extends StatelessWidget {
  final bool isOffline;
  final String statusText;
  final int pendingCount;
  final bool syncing;
  final VoidCallback? onSync;

  const _SyncTelemetryRibbon({
    required this.isOffline,
    required this.statusText,
    required this.pendingCount,
    required this.syncing,
    required this.onSync,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: context.npColors.bgElevated,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: isOffline
                  ? const Color(0xFFF59E0B)
                  : const Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isOffline ? 'OFFLINE BUFFER' : 'SYNC LIVE',
                  style: NpType.mono.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    color: isOffline
                        ? const Color(0xFFF59E0B)
                        : const Color(0xFF10B981),
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 12,
                    color: context.npColors.gray400,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          NpButton.outline(
            icon: Icons.sync_rounded,
            label: 'Sync',
            size: NpButtonSize.sm,
            isLoading: syncing,
            onPressed: onSync,
          ),
        ],
      ),
    );
  }
}

// ── Full-Bleed Section Header ─────────────────────────────────────────────────

class _FullBleedSectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;

  const _FullBleedSectionHeader({
    required this.title,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: NpType.mono.copyWith(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: context.npColors.gray400,
                letterSpacing: 1.1,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing!,
          ],
        ],
      ),
    );
  }
}

// ── Full-Bleed Tile ───────────────────────────────────────────────────────────

class _FullBleedTile extends StatelessWidget {
  final IconData icon;
  final Color accentColor;
  final String title;
  final String? subtitle;

  const _FullBleedTile({
    required this.icon,
    required this.accentColor,
    required this.title,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.npColors.bgCard,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: accentColor, width: 3.5),
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: accentColor, size: 20),
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
                      color: context.npColors.white,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        fontSize: 12,
                        color: context.npColors.gray400,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Full-Bleed Switch Tile ────────────────────────────────────────────────────

class _FullBleedSwitchTile extends StatelessWidget {
  final IconData icon;
  final Color accentColor;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _FullBleedSwitchTile({
    required this.icon,
    required this.accentColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.npColors.bgCard,
      child: InkWell(
        onTap: () => onChanged(!value),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                color: value ? accentColor : context.npColors.lineStrong,
                width: 3.5,
              ),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
          child: Row(
            children: [
              Icon(
                icon,
                color: value ? accentColor : context.npColors.gray500,
                size: 20,
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
                        color: context.npColors.white,
                      ),
                    ),
                    const SizedBox(height: 3),
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
              Switch(
                value: value,
                onChanged: onChanged,
                activeThumbColor: accentColor,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Full-Bleed Tag Studio Banner ──────────────────────────────────────────────

class _TagStudioBanner extends StatelessWidget {
  final int offlineRemainingCount;
  final VoidCallback onTap;

  const _TagStudioBanner({
    required this.offlineRemainingCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF18181B),
                Color(0xFF09090B),
              ],
            ),
            border: Border(
              top: BorderSide(color: context.npColors.lineStrong),
              bottom: BorderSide(color: context.npColors.lineStrong),
              left: const BorderSide(color: NpColors.red, width: 3.5),
            ),
          ),
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: context.npColors.bgElevated,
                  border: Border.all(color: context.npColors.lineStrong),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: const Center(
                  child: Icon(
                    Icons.qr_code_2_rounded,
                    color: NpColors.red,
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Nameplate Tag studio',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 1.5,
                          ),
                          decoration: BoxDecoration(
                            color: NpColors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(color: NpColors.red),
                          ),
                          child: Text(
                            '$offlineRemainingCount READY',
                            style: NpType.mono.copyWith(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: NpColors.red,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Mint NPID + QR payload for a physical plate',
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
                Icons.arrow_forward_ios_rounded,
                color: context.npColors.gray500,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FleetGalleryBanner extends StatelessWidget {
  final VoidCallback onTap;

  const _FleetGalleryBanner({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF18181B),
                Color(0xFF09090B),
              ],
            ),
            border: Border(
              top: BorderSide(color: context.npColors.lineStrong),
              bottom: BorderSide(color: context.npColors.lineStrong),
              left: const BorderSide(color: NpColors.red, width: 3.5),
            ),
          ),
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: context.npColors.bgElevated,
                  border: Border.all(color: context.npColors.lineStrong),
                  borderRadius: BorderRadius.circular(2),
                ),
                padding: const EdgeInsets.all(5),
                child: const Center(
                  child: NpApplianceArt(
                    assetPath: NpAssets.isoFridge,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Flexible(
                          child: Text(
                            'The Fleet — Line Art',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 1.5,
                          ),
                          decoration: BoxDecoration(
                            color: NpColors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(color: NpColors.red),
                          ),
                          child: Text(
                            '10 UNITS',
                            style: NpType.mono.copyWith(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: NpColors.red,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Isometric portfolio line art from iso.html',
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
                Icons.arrow_forward_ios_rounded,
                color: context.npColors.gray500,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }
}



// ── Outbox Tile ───────────────────────────────────────────────────────────────

class _OutboxTile extends StatelessWidget {
  final dynamic op;
  const _OutboxTile({required this.op});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgElevated,
        border: Border(
          bottom: BorderSide(color: context.npColors.lineStrong),
          left: const BorderSide(color: Color(0xFFF59E0B), width: 3.5),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(
            op.synced ? Icons.check_circle_rounded : Icons.cloud_upload_rounded,
            color: op.synced ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            size: 18,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  op.summary,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  op.type,
                  style: NpType.mono.copyWith(
                    fontSize: 10,
                    color: context.npColors.gray500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


