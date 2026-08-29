import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/field_session.dart';
import '../../services/providers.dart';
import '../../services/sync_status_service.dart';
import '../../theme/app_theme.dart';
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

    return Scaffold(
      appBar: const NpBrandAppBar(
        kicker: '03 / Device',
        title: 'Field console',
        showLogo: true,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        children: [
          ResponsiveContainer(
            maxWidth: 720,
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ── Identity ────────────────────────────────────────
                NpSectionLabel('Identity'),
                const SizedBox(height: 10),
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
                          .where((p) =>
                              session.assignedPropertyIds.contains(p.id))
                          .map((p) => p.name)
                          .join(', '),
                      onTap: () => _pickProperties(context, ref, session),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // ── Sync ─────────────────────────────────────────────
                NpSectionLabel('Sync engine'),
                const SizedBox(height: 10),
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
                      trailing: session.syncing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : GestureDetector(
                              onTap: session.offlineMode
                                  ? null
                                  : () async {
                                      await ref
                                          .read(fieldSessionProvider)
                                          .forceSync();
                                      if (!context.mounted) return;
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'Outbox drained. Working set current.')),
                                      );
                                    },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: session.offlineMode
                                        ? NpColors.lineStrong
                                        : NpColors.white,
                                  ),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                                child: Text(
                                  'FORCE SYNC',
                                  style: NpType.mono.copyWith(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: session.offlineMode
                                        ? NpColors.gray500
                                        : NpColors.white,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ),
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
                      title: 'Photos on unmetered Wi-Fi only',
                      subtitle: 'Tech-overridable · default on',
                      value: session.photoWifiOnly,
                      onChanged: (v) =>
                          ref.read(fieldSessionProvider).setPhotoWifiOnly(v),
                    ),
                  ],
                ),

                if (session.outbox.isNotEmpty) ...[
                  const SizedBox(height: 28),
                  NpSectionLabel('Outbox', trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
                  )),
                  const SizedBox(height: 10),
                  _SettingsGroup(
                    children: [
                      ...session.outbox.take(8).map((op) => _OutboxItem(op: op)),
                    ],
                  ),
                ],

                const SizedBox(height: 28),

                // ── Tools ────────────────────────────────────────────
                NpSectionLabel('Tools'),
                const SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.qr_code_2,
                      title: 'Nameplate Tag studio',
                      subtitle: 'Mint NPID + QR payload for a physical plate',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                            builder: (_) => const TagStudioScreen()),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // ── About ────────────────────────────────────────────
                NpSectionLabel('Device & app'),
                const SizedBox(height: 10),
                _SettingsGroup(
                  children: [
                    _SettingsTile(
                      icon: Icons.tablet_android,
                      title: 'Device',
                      subtitle:
                          '${session.deviceId} · ${MediaQuery.sizeOf(context).shortestSide >= 640 ? 'Tablet' : 'Phone'} layout',
                    ),
                    _GroupDivider(),
                    const _SettingsTile(
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
      BuildContext context, WidgetRef ref, FieldSession session) async {
    final next = await showModalBottomSheet<FieldTech>(
      context: context,
      backgroundColor: NpColors.bgCard,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text('Sign in as',
                    style: TextStyle(fontWeight: FontWeight.w800)),
              ),
              ...session.roster.map((t) {
                final selected = session.tech.id == t.id;
                return ListTile(
                  leading: Icon(
                    selected
                        ? Icons.radio_button_checked
                        : Icons.radio_button_off,
                    color: selected ? NpColors.red : NpColors.gray500,
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
      BuildContext context, WidgetRef ref, FieldSession session) async {
    final selected = Set<String>.from(session.assignedPropertyIds);
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: NpColors.bgCard,
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
                      title: Text('Property scope',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      subtitle: Text(
                          'Turns and work orders filter to these properties'),
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
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: NpColors.red,
                        ),
                        onPressed: () {
                          ref
                              .read(fieldSessionProvider)
                              .setAssignedProperties(selected);
                          Navigator.pop(ctx);
                        },
                        child: const Text('Save scope'),
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
      decoration: const BoxDecoration(
        color: NpColors.bgCard,
        border: Border.fromBorderSide(BorderSide(color: NpColors.lineStrong)),
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
      const Divider(height: 1, color: NpColors.lineStrong);
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
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: NpColors.white,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: const TextStyle(color: NpColors.gray400, fontSize: 12),
            )
          : null,
      trailing: trailing ??
          (onTap != null
              ? const Icon(Icons.chevron_right, color: NpColors.gray500, size: 18)
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
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: NpColors.white,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(color: NpColors.gray400, fontSize: 12),
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
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      dense: true,
      leading: Icon(
        op.synced ? Icons.check_circle : Icons.cloud_upload,
        color: op.synced ? NpColors.white : NpColors.red,
        size: 16,
      ),
      title: Text(
        op.summary,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 13, color: NpColors.white),
      ),
      subtitle: Text(
        op.type,
        style: NpType.mono.copyWith(fontSize: 10, color: NpColors.gray500),
      ),
    );
  }
}
