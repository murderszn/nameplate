import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/field_session.dart';
import '../services/providers.dart';
import '../theme/app_theme.dart';
import '../widgets/np_brand.dart';
import 'app_shell.dart';

/// First-run role gate: same binary, two audiences.
/// Renters scan already-identified nameplates, check work-order status,
/// and file new requests against their unit's ledger.
class RoleSelectorScreen extends ConsumerWidget {
  const RoleSelectorScreen({super.key});

  void _select(BuildContext context, WidgetRef ref, AppRole role) {
    HapticFeedback.lightImpact();
    final session = ref.read(fieldSessionProvider);
    // Renter is scoped to Unit 214 (Sonoran Ridge) for demo.
    session.setRole(role, unitId: role == AppRole.renter ? 'unit-214' : null);
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => const AppShell(),
        transitionsBuilder: (context, anim, secondaryAnimation, child) => FadeTransition(opacity: anim, child: child),
        transitionDuration: const Duration(milliseconds: 280),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.npColors;
    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const NpDotGrid(),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  NpLogo(height: 38),
                  const SizedBox(height: 14),
                  Text(
                    'NAMEPLATE',
                    style: TextStyle(color: c.white, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Every appliance accounted for.',
                    style: TextStyle(color: c.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 32),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Who are you signing in as?',
                          style: TextStyle(color: c.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.6, height: 1.1),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Same app. Different ledger scope. Pick the view that matches your key.',
                          style: TextStyle(color: c.gray400, fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _RoleCard(
                    icon: Icons.engineering_outlined,
                    title: 'I’m a tech',
                    subtitle: 'Full field toolkit — scan any tag, log service, run turns, harvest parts.',
                    meta: 'Technicians · Lead techs',
                    cta: 'Continue as Tech →',
                    onTap: () => _select(context, ref, AppRole.technician),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.home_outlined,
                    title: 'I’m a renter',
                    subtitle: 'Scan the tags already in your unit, check work-order status, or file a new request.',
                    meta: 'Unit 214 · Sonoran Ridge · 4 appliances',
                    cta: 'Continue as Renter →',
                    onTap: () => _select(context, ref, AppRole.renter),
                    isRenter: true,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'You can switch anytime in Settings → Role.',
                    style: TextStyle(color: c.gray500, fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String meta;
  final String cta;
  final VoidCallback onTap;
  final bool isRenter;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.meta,
    required this.cta,
    required this.onTap,
    this.isRenter = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.npColors;
    return Material(
      color: c.bgCard,
      borderRadius: BorderRadius.circular(2),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(2),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
          decoration: BoxDecoration(
            border: Border.all(color: c.lineStrong),
            borderRadius: BorderRadius.circular(2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isRenter ? c.white : NpColors.red,
                      borderRadius: BorderRadius.circular(2),
                    ),
                    child: Icon(icon, size: 18, color: isRenter ? c.bg : Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: TextStyle(color: c.white, fontSize: 15, fontWeight: FontWeight.w800, letterSpacing: -0.2)),
                        const SizedBox(height: 2),
                        Text(meta, style: TextStyle(color: c.gray500, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(subtitle, style: TextStyle(color: c.gray400, fontSize: 12.5, height: 1.4)),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                height: 38,
                decoration: BoxDecoration(
                  color: isRenter ? Colors.transparent : c.white,
                  border: Border.all(color: isRenter ? c.lineStrong : Colors.transparent),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Center(
                  child: Text(
                    cta,
                    style: TextStyle(
                      color: isRenter ? c.white : c.bg,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
