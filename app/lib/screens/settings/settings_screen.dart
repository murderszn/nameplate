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
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          ResponsiveContainer(
            maxWidth: 720,
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.person_outline),
                        title: const Text('Technician'),
                        subtitle: Text('${session.tech.name} · ${session.tech.role}\n${FieldSession.orgName}'),
                        isThreeLine: true,
                        trailing: const Icon(Icons.chevron_right, color: NpColors.gray500),
                        onTap: () => _pickTech(context, ref, session),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.apartment_outlined),
                        title: const Text('Assigned properties'),
                        subtitle: Text(
                          session.properties
                              .where((p) => session.assignedPropertyIds.contains(p.id))
                              .map((p) => p.name)
                              .join(', '),
                        ),
                        trailing: const Icon(Icons.chevron_right, color: NpColors.gray500),
                        onTap: () => _pickProperties(context, ref, session),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.sync),
                        title: const Text('Sync engine'),
                        subtitle: Text(
                          snapshot.state == SyncState.offline
                              ? 'Offline · ${snapshot.pendingCount} queued'
                              : snapshot.pendingCount == 0
                                  ? 'Current · last push ${_ago(lastSync)}'
                                  : '${snapshot.pendingCount} pending'
                                      '${snapshot.oldestUnsyncedAt != null ? ' · oldest ${_ago(snapshot.oldestUnsyncedAt)}' : ''}',
                        ),
                        trailing: session.syncing
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : OutlinedButton(
                                onPressed: session.offlineMode
                                    ? null
                                    : () async {
                                        await ref.read(fieldSessionProvider).forceSync();
                                        if (!context.mounted) return;
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Outbox drained. Working set current.')),
                                        );
                                      },
                                child: const Text('Force sync'),
                              ),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.cloud_off),
                        title: const Text('Work offline'),
                        subtitle: const Text('Queue writes; skip pull until you reconnect'),
                        value: session.offlineMode,
                        onChanged: (v) => ref.read(fieldSessionProvider).setOfflineMode(v),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        secondary: const Icon(Icons.wifi_tethering_outlined),
                        title: const Text('Photos on unmetered Wi-Fi only'),
                        subtitle: const Text('Tech-overridable · default on'),
                        value: session.photoWifiOnly,
                        onChanged: (v) => ref.read(fieldSessionProvider).setPhotoWifiOnly(v),
                      ),
                    ],
                  ),
                ),
                if (session.outbox.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const NpKicker('Outbox'),
                          const SizedBox(height: 8),
                          ...session.outbox.take(8).map(
                            (op) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                              leading: Icon(
                                op.synced ? Icons.check_circle : Icons.cloud_upload,
                                color: op.synced ? NpColors.white : NpColors.red,
                                size: 18,
                              ),
                              title: Text(op.summary, maxLines: 1, overflow: TextOverflow.ellipsis),
                              subtitle: Text(
                                op.type,
                                style: NpType.mono.copyWith(fontSize: 11, color: NpColors.gray500),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.qr_code_2),
                        title: const Text('Nameplate Tag studio'),
                        subtitle: const Text('Mint NPID + QR payload for a physical plate'),
                        trailing: const Icon(Icons.chevron_right, color: NpColors.gray500),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const TagStudioScreen()),
                        ),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.tablet_android),
                        title: const Text('Device'),
                        subtitle: Text('${session.deviceId} · ${MediaQuery.sizeOf(context).shortestSide >= 640 ? 'Tablet' : 'Phone'} layout'),
                      ),
                      const Divider(height: 1),
                      const ListTile(
                        leading: Icon(Icons.info_outline),
                        title: Text('About Nameplate Field'),
                        subtitle: Text('v0.1.0 · Offline-first appliance registry'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickTech(BuildContext context, WidgetRef ref, FieldSession session) async {
    final next = await showModalBottomSheet<FieldTech>(
      context: context,
      backgroundColor: NpColors.bgCard,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(title: Text('Sign in as', style: TextStyle(fontWeight: FontWeight.w800))),
              ...session.roster.map(
                (t) {
                  final selected = session.tech.id == t.id;
                  return ListTile(
                    leading: Icon(
                      selected ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: selected ? NpColors.plate600 : NpColors.gray500,
                    ),
                    title: Text(t.name),
                    subtitle: Text('${t.role} · ${t.email}'),
                    onTap: () => Navigator.pop(ctx, t),
                  );
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
    if (next != null) ref.read(fieldSessionProvider).selectTech(next);
  }

  Future<void> _pickProperties(BuildContext context, WidgetRef ref, FieldSession session) async {
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
                      title: Text('Property scope', style: TextStyle(fontWeight: FontWeight.w800)),
                      subtitle: Text('Turns and work orders filter to these properties'),
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
                        onPressed: () {
                          ref.read(fieldSessionProvider).setAssignedProperties(selected);
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
