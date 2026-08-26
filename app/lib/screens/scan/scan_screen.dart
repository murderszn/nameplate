import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/sync_status_badge.dart';
import '../asset/asset_detail_screen.dart';

/// Scan & identify — the core loop, must be sub-3-seconds (v0-scope.md §1.1).
///
/// TODO(camera): wire up `mobile_scanner` for QR scanning of Nameplate Tags.
/// The scan resolver must work fully offline against the local Drift mirror
/// (architecture.md §4.6). A code outside the local working set queues as an
/// UnresolvedScan (data-model.md §3 `asset_identifier_scan`) — never discard.
///
/// This scaffold provides camera-less manual NPID entry only, as a
/// placeholder for the real QR flow.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    final code = _controller.text.trim();
    if (code.isEmpty) return;
    final repo = ref.read(assetRepositoryProvider);
    final asset = await repo.lookupByCode(code);
    if (!mounted) return;
    if (asset == null) {
      setState(
        () => _error =
            'No asset found for "$code". Checksum or offline resolution TODO.',
      );
      return;
    }
    setState(() => _error = null);
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => AssetDetailScreen(assetId: asset.id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Asset'),
        actions: const [SyncStatusBadge()],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: NpColors.slate900,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: NpColors.signal500, width: 3),
              ),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.qr_code_scanner,
                      color: NpColors.signal500,
                      size: 64,
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Camera preview placeholder\n(mobile_scanner TODO)',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Or enter the NPID manually (damaged sticker):',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _controller,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              hintText: 'NP-XXXXXXXX',
              errorText: _error,
              border: const OutlineInputBorder(),
            ),
            onSubmitted: (_) => _lookup(),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _lookup,
            icon: const Icon(Icons.search),
            label: const Text('Look up'),
          ),
        ],
      ),
    );
  }
}
