import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/field_session.dart';
import '../../services/providers.dart';
import '../../services/sync_status_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/theme_controller.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
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
          // ── 00 // Full-Bleed Technician Credentials Stage ──────────────────
          _TechnicianHeroStage(
            session: session,
            onPickTech: () => _pickTech(context, ref, session),
            onPickProperties: () => _pickProperties(context, ref, session),
          ),

          // ── Role — Renter vs Tech (same binary) ───────────────────────────
          const _FullBleedSectionHeader(
            title: 'Signed-in role — same app, different scope',
          ),
          _RoleSwitchTile(session: session),

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
                  'Sign in as',
                  style: TextStyle(fontWeight: FontWeight.w800),
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

// ── Full-Bleed Technician Hero Stage ──────────────────────────────────────────

class _TechnicianHeroStage extends StatelessWidget {
  final FieldSession session;
  final VoidCallback onPickTech;
  final VoidCallback onPickProperties;

  const _TechnicianHeroStage({
    required this.session,
    required this.onPickTech,
    required this.onPickProperties,
  });

  @override
  Widget build(BuildContext context) {
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
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
              Text(
                session.tech.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.2,
                ),
              ),
              const Spacer(),
              InkWell(
                onTap: onPickTech,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: context.npColors.bgElevated,
                    borderRadius: BorderRadius.circular(2),
                    border: Border.all(color: context.npColors.lineStrong),
                  ),
                  child: Text(
                    'SWITCH',
                    style: NpType.mono.copyWith(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: context.npColors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          InkWell(
            onTap: onPickTech,
            child: Text(
              'Technician · ${session.tech.role} · ${FieldSession.orgName}',
              style: TextStyle(
                fontSize: 12,
                color: context.npColors.gray400,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 6),
          InkWell(
            onTap: onPickProperties,
            child: Row(
              children: [
                const Icon(
                  Icons.apartment_rounded,
                  size: 13,
                  color: Color(0xFFF59E0B),
                ),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    assignedProps.isNotEmpty
                        ? 'Scope: $assignedProps'
                        : 'No assigned properties',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: context.npColors.gray400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  size: 14,
                  color: context.npColors.gray500,
                ),
              ],
            ),
          ),
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
          Text(
            title.toUpperCase(),
            style: NpType.mono.copyWith(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: context.npColors.gray400,
              letterSpacing: 1.1,
            ),
          ),
          if (trailing != null) ...[
            const Spacer(),
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
                        const Text(
                          'Nameplate Tag studio',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
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

// ── Role Switch — same binary for renters & techs ───────────────────────────

class _RoleSwitchTile extends ConsumerWidget {
  final FieldSession session;
  const _RoleSwitchTile({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isRenter = session.isRenter;
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border(
          left: BorderSide(
            color: isRenter ? const Color(0xFF0EA5E9) : NpColors.red,
            width: 3.5,
          ),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isRenter ? Icons.home_outlined : Icons.engineering_outlined,
                color: isRenter ? const Color(0xFF0EA5E9) : NpColors.red,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                isRenter ? 'Renter — Unit 214' : 'Technician',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: context.npColors.white,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (isRenter ? const Color(0xFF0EA5E9) : NpColors.red)
                      .withValues(alpha: 0.12),
                  border: Border.all(
                    color: isRenter ? const Color(0xFF0EA5E9) : NpColors.red,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Text(
                  isRenter ? 'RENTER' : 'TECH',
                  style: NpType.mono.copyWith(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: isRenter ? const Color(0xFF0EA5E9) : NpColors.red,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isRenter
                ? 'Scan tags already in your unit, check work-order status, or file a new request against an identified nameplate.'
                : 'Full field toolkit — any tag, any unit, turns, harvest, and offline ledger.',
            style: TextStyle(
              fontSize: 12,
              color: context.npColors.gray400,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: isRenter
                      ? null
                      : () {
                          ref
                              .read(fieldSessionProvider)
                              .setRole(AppRole.renter, unitId: 'unit-214');
                        },
                  icon: const Icon(Icons.home_outlined, size: 16),
                  label: const Text('I’m a renter'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: context.npColors.white,
                    side: BorderSide(
                      color: isRenter
                          ? NpColors.red
                          : context.npColors.lineStrong,
                    ),
                    backgroundColor: isRenter
                        ? NpColors.red.withValues(alpha: 0.12)
                        : Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: !isRenter
                      ? null
                      : () {
                          ref
                              .read(fieldSessionProvider)
                              .setRole(AppRole.technician);
                        },
                  icon: const Icon(Icons.engineering_outlined, size: 16),
                  label: const Text('I’m a tech'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: context.npColors.white,
                    side: BorderSide(
                      color: !isRenter
                          ? NpColors.red
                          : context.npColors.lineStrong,
                    ),
                    backgroundColor: !isRenter
                        ? NpColors.red.withValues(alpha: 0.12)
                        : Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
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


