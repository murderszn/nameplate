import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/providers.dart';
import '../../theme/app_theme.dart';

/// Settings / diagnostics — v0-scope.md §1.1 "Offline infrastructure":
/// pending count, oldest unsynced item, force-sync. Also login/property
/// picker would live here (v0-scope.md §1.1 "Auth & setup") — not yet
/// scaffolded.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncAsync = ref.watch(syncStatusProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const ListTile(
            leading: Icon(Icons.person_outline),
            title: Text('Signed in as'),
            subtitle: Text('TODO: wire to /v1/me + Supabase Auth session'),
          ),
          const ListTile(
            leading: Icon(Icons.apartment_outlined),
            title: Text('Assigned properties'),
            subtitle: Text('TODO: property_assignment scope picker'),
          ),
          const Divider(),
          syncAsync.when(
            data: (snapshot) => ListTile(
              leading: const Icon(Icons.sync, color: NpColors.plate600),
              title: const Text('Sync diagnostics'),
              subtitle: Text(
                'State: ${snapshot.state.name} · Pending: ${snapshot.pendingCount}'
                '${snapshot.oldestUnsyncedAt != null ? ' · Oldest: ${snapshot.oldestUnsyncedAt}' : ''}',
              ),
              trailing: TextButton(
                onPressed: () {
                  // TODO: trigger sync engine force-push/pull
                  // (architecture.md §4.2/§4.4).
                },
                child: const Text('Force sync'),
              ),
            ),
            loading: () => const ListTile(title: Text('Loading sync status…')),
            error: (_, __) => const ListTile(title: Text('Sync status unavailable (offline)')),
          ),
          const Divider(),
          const ListTile(
            leading: Icon(Icons.wifi_tethering_outlined),
            title: Text('Photo upload'),
            subtitle: Text('Unmetered connections only (tech-overridable) — TODO'),
          ),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('About'),
            subtitle: Text('Nameplate Field — see docs/architecture.md for the sync design'),
          ),
        ],
      ),
    );
  }
}
