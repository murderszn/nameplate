import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/npid.dart';
import '../../services/providers.dart';
import '../../theme/app_theme.dart';
import '../../widgets/nameplate_tag.dart';
import '../../widgets/np_action_buttons.dart';
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
      appBar: NpBrandAppBar(title: 'Tag studio'),
      body: ListView(
        padding: EdgeInsets.all(16),
        children: [
          Text('Create a tag', style: Theme.of(context).textTheme.titleLarge),
          SizedBox(height: 6),
          Text(
            'Create a Nameplate ID you can print, even when this device is offline.',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: context.npColors.gray400),
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.offline_bolt, color: NpColors.red, size: 16),
              SizedBox(width: 7),
              Text(
                '${session.remainingOfflinePoolCount} tags available offline',
                style: TextStyle(fontSize: 12, color: context.npColors.gray400),
              ),
            ],
          ),
          SizedBox(height: 20),
          NameplateTag(npid: _npid),
          SizedBox(height: 20),
          NpButton.primary(
            icon: Icons.offline_bolt_rounded,
            label: 'Create next tag',
            size: NpButtonSize.lg,
            isExpanded: true,
            onPressed: _mint,
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: NpButton.secondary(
                  icon: Icons.copy_rounded,
                  label: 'Copy NPID',
                  size: NpButtonSize.md,
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: _npid));
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Copied $_npid to clipboard')),
                    );
                  },
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: NpButton.secondary(
                  icon: Icons.link_rounded,
                  label: 'Copy URL',
                  size: NpButtonSize.md,
                  onPressed: () async {
                    await Clipboard.setData(
                      ClipboardData(text: Npid.payloadUrl(_npid)),
                    );
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Copied scan payload URL')),
                    );
                  },
                ),
              ),
            ],
          ),
          if (session.mintedTags.isNotEmpty) ...[
            SizedBox(height: 28),
            Text(
              'Created this shift (${session.mintedTags.length})',
              style: NpType.mono.copyWith(
                color: context.npColors.gray500,
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(height: 10),
            ...session.mintedTags
                .take(12)
                .map(
                  (t) => Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Material(
                      color: context.npColors.bgElevated,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.zero,
                        side: BorderSide(color: context.npColors.lineStrong),
                      ),
                      child: ListTile(
                        dense: true,
                        leading: Container(
                          padding: EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: context.npColors.bgCard,
                            borderRadius: BorderRadius.circular(2),
                            border: Border.all(
                              color: context.npColors.lineStrong,
                            ),
                          ),
                          child: Icon(
                            Icons.qr_code_2_rounded,
                            color: NpColors.red,
                            size: 16,
                          ),
                        ),
                        title: Text(
                          t.npid,
                          style: NpType.mono.copyWith(
                            fontWeight: FontWeight.w700,
                            color: NpColors.red,
                          ),
                        ),
                        subtitle: Text(
                          'Minted ${t.mintedAt.hour.toString().padLeft(2, '0')}:${t.mintedAt.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(
                            color: context.npColors.gray400,
                            fontSize: 11,
                          ),
                        ),
                        trailing: Icon(
                          Icons.chevron_right,
                          size: 16,
                          color: context.npColors.gray500,
                        ),
                        onTap: () => setState(() => _npid = t.npid),
                      ),
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }
}
