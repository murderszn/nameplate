import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/nameplate_tag.dart';
import '../../widgets/np_brand.dart';

/// Field-side Nameplate Tag minting studio — sister of the marketing QR studio.
class TagStudioScreen extends ConsumerStatefulWidget {
  const TagStudioScreen({super.key});

  @override
  ConsumerState<TagStudioScreen> createState() => _TagStudioScreenState();
}

class _TagStudioScreenState extends ConsumerState<TagStudioScreen> {
  late String _npid;

  @override
  void initState() {
    super.initState();
    _npid = Npid.mint();
  }

  void _mint() {
    setState(() => _npid = ref.read(fieldSessionProvider).mintTag());
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(fieldSessionProvider);

    return Scaffold(
      appBar: const NpBrandAppBar(
        kicker: '04 / Hardware',
        title: 'Tag studio',
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const NpKicker('Mint a plate'),
          const SizedBox(height: 8),
          Text(
            'Generate a Crockford Base32 Nameplate ID with HMAC-SHA256 offline authentication. Minted locally from pre-allocated device pool.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: NpColors.gray400),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: NpColors.bg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: NpColors.gray800),
            ),
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.offline_bolt, color: NpColors.red, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'OFFLINE VAULT POOL',
                      style: NpType.mono.copyWith(fontSize: 11, fontWeight: FontWeight.w700, color: NpColors.gray300),
                    ),
                  ],
                ),
                Text(
                  '${session.remainingOfflinePoolCount} / 500 Available',
                  style: NpType.mono.copyWith(fontSize: 11, fontWeight: FontWeight.w700, color: NpColors.red),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          NameplateTag(npid: _npid),
          const SizedBox(height: 16),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: NpColors.red,
              foregroundColor: NpColors.white,
            ),
            onPressed: _mint,
            icon: const Icon(Icons.autorenew),
            label: const Text('Mint Next Pre-Allocated Tag'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: _npid));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Copied $_npid')),
              );
            },
            icon: const Icon(Icons.copy),
            label: const Text('Copy NPID'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: Npid.payloadUrl(_npid)));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied scan payload URL')),
              );
            },
            icon: const Icon(Icons.link),
            label: const Text('Copy scan URL'),
          ),
          if (session.mintedTags.isNotEmpty) ...[
            const SizedBox(height: 28),
            Text(
              'MINTED THIS SHIFT',
              style: NpType.mono.copyWith(
                color: NpColors.gray500,
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            ...session.mintedTags.take(12).map(
              (t) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.qr_code_2, color: NpColors.red),
                title: Text(t.npid, style: NpType.mono.copyWith(fontWeight: FontWeight.w700, color: NpColors.red)),
                subtitle: Text(
                  'Minted ${t.mintedAt.hour.toString().padLeft(2, '0')}:${t.mintedAt.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(color: NpColors.gray500, fontSize: 12),
                ),
                onTap: () => setState(() => _npid = t.npid),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
