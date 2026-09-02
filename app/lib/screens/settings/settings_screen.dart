import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/field_session.dart';
import '../../services/providers.dart';
import '../../services/sync_status_service.dart';
import '../../theme/app_theme.dart';
import '../../theme/theme_controller.dart';
import '../../widgets/np_action_buttons.dart';
import '../../widgets/np_brand.dart';
import '../../widgets/responsive_layout.dart';
import 'tag_studio_screen.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(fieldSessionProvider);
    final snapshot = session.syncSnapshot;
    final lastSync = session.lastSyncedAt;
    final darkMode = ref.watch(themeModeProvider) == ThemeMode.dark;

    return Scaffold(
      appBar: NpBrandAppBar(title: 'Settings', showLogo: true),
      body: ListView(
        padding: EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          ResponsiveContainer(
            maxWidth: 720,
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Identity ────────────────────────────────────────
                NpSectionLabel('Identity'),
                SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.person_outline,
                      title: 'Technician',
                      subtitle:
                          '${session.tech.name} · ${session.tech.role}\n${FieldSession.orgName}',
                      isThreeLine: true,
                      onTap: () => _pickTech(context, ref, session),
                    ),
                    _GroupDivider(),
                    _SettingsTile(
                      icon: Icons.apartment_outlined,
                      title: 'Assigned properties',
                      subtitle: session.properties
                          .where(
                            (p) => session.assignedPropertyIds.contains(p.id),
                          )
                          .map((p) => p.name)
                          .join(', '),
                      onTap: () => _pickProperties(context, ref, session),
                    ),
                  ],
                ),

                SizedBox(height: 20),

                // ── Appearance ───────────────────────────────────────
                NpSectionLabel('Appearance'),
                SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SwitchTile(
                      icon: darkMode
                          ? Icons.dark_mode_outlined
                          : Icons.light_mode_outlined,
                      title: 'Dark mode',
                      subtitle: darkMode
                          ? 'Dark Nameplate theme'
                          : 'White Nameplate theme · default',
                      value: darkMode,
                      onChanged: (enabled) => ref
                          .read(themeModeProvider.notifier)
                          .setDarkMode(enabled),
                    ),
                  ],
                ),

                SizedBox(height: 20),

                // ── Sync ─────────────────────────────────────────────
                NpSectionLabel('Sync'),
                SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.sync,
                      title: 'Sync status',
                      subtitle: snapshot.state == SyncState.offline
                          ? 'Offline · ${snapshot.pendingCount} queued'
                          : snapshot.pendingCount == 0
                          ? 'Current · last push ${_ago(lastSync)}'
                          : '${snapshot.pendingCount} pending'
                                '${snapshot.oldestUnsyncedAt != null ? ' · oldest ${_ago(snapshot.oldestUnsyncedAt)}' : ''}',
                      trailing: NpButton.outline(
                        icon: Icons.sync_rounded,
                        label: 'Sync',
                        size: NpButtonSize.sm,
                        isLoading: session.syncing,
                        onPressed: session.offlineMode
                            ? null
                            : () async {
                                await ref
                                    .read(fieldSessionProvider)
                                    .forceSync();
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Synced. Nothing waiting to upload.',
                                    ),
                                  ),
                                );
                              },
                      ),
                    ),
                    _GroupDivider(),
                    _SwitchTile(
                      icon: Icons.cloud_off,
                      title: 'Work offline',
                      subtitle: 'Queue writes; skip pull until you reconnect',
                      value: session.offlineMode,
                      onChanged: (v) =>
                          ref.read(fieldSessionProvider).setOfflineMode(v),
                    ),
                    _GroupDivider(),
                    _SwitchTile(
                      icon: Icons.wifi_tethering_outlined,
                      title: 'Photos on Wi-Fi only',
                      subtitle: 'Skip photo upload on cellular. On by default.',
                      value: session.photoWifiOnly,
                      onChanged: (v) =>
                          ref.read(fieldSessionProvider).setPhotoWifiOnly(v),
                    ),
                  ],
                ),

                if (session.outbox.isNotEmpty) ...[
                  SizedBox(height: 20),
                  NpSectionLabel(
                    'Waiting to upload',
                    trailing: Container(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: NpColors.redSubtle,
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(color: NpColors.redBorder),
                      ),
                      child: Text(
                        '${session.outbox.length}',
                        style: NpType.mono.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: NpColors.red,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: 10),
                  _SettingsGroup(
                    children: [
                      ...session.outbox
                          .take(8)
                          .map((op) => _OutboxItem(op: op)),
                    ],
                  ),
                ],

                SizedBox(height: 20),

                // ── Tools ────────────────────────────────────────────
                NpSectionLabel('Tools'),
                SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.qr_code_2,
                      title: 'Nameplate Tag studio',
                      subtitle: 'Mint NPID + QR payload for a physical plate',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => TagStudioScreen()),
                      ),
                    ),
                  ],
                ),

                SizedBox(height: 20),

                // ── About ────────────────────────────────────────────
                NpSectionLabel('Device & app'),
                SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.tablet_android,
                      title: 'Device',
                      subtitle:
                          '${session.deviceId} · ${MediaQuery.sizeOf(context).shortestSide >= 640 ? 'Tablet' : 'Phone'} layout',
                    ),
                    _GroupDivider(),
                    _SettingsTile(
                      icon: Icons.info_outline,
                      title: 'About Nameplate Field',
                      subtitle: 'v0.1.0 · Offline-first appliance registry',
                    ),
                  ],
                ),
              ],
            ),
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
              ListTile(
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
              SizedBox(height: 8),
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
                padding: EdgeInsets.only(bottom: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
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
                      padding: EdgeInsets.symmetric(horizontal: 16),
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

// ── Shared setting widgets ─────────────────────────────────────────────────────

class _SettingsGroup extends StatelessWidget {
  final List<Widget> children;
  const _SettingsGroup({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.npColors.bgCard,
        border: Border.fromBorderSide(
          BorderSide(color: context.npColors.lineStrong),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    );
  }
}

class _GroupDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      Divider(height: 1, color: context.npColors.lineStrong);
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final bool isThreeLine;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.isThreeLine = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: NpColors.red, size: 20),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: context.npColors.white,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: TextStyle(color: context.npColors.gray400, fontSize: 12),
            )
          : null,
      trailing:
          trailing ??
          (onTap != null
              ? Icon(
                  Icons.chevron_right,
                  color: context.npColors.gray500,
                  size: 18,
                )
              : null),
      isThreeLine: isThreeLine,
      onTap: onTap,
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      secondary: Icon(icon, color: NpColors.red, size: 20),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: context.npColors.white,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(color: context.npColors.gray400, fontSize: 12),
      ),
      value: value,
      onChanged: onChanged,
    );
  }
}

class _OutboxItem extends StatelessWidget {
  final dynamic op;
  const _OutboxItem({required this.op});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      dense: true,
      leading: Icon(
        op.synced ? Icons.check_circle : Icons.cloud_upload,
        color: op.synced ? context.npColors.white : NpColors.pending,
        size: 16,
      ),
      title: Text(
        op.summary,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 13, color: context.npColors.white),
      ),
      subtitle: Text(
        op.type,
        style: NpType.mono.copyWith(
          fontSize: 10,
          color: context.npColors.gray500,
        ),
      ),
    );
  }
}
