import 'dart:async';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/np_brand.dart';
import 'app_shell.dart';

/// Nameplate Field splash/loading screen.
/// Displays the official Nameplate logo, industrial ledger initialization status,
/// and smooth progress transition into the main field shell.
class SplashScreen extends StatefulWidget {
  final Widget nextScreen;
  final Duration duration;

  const SplashScreen({
    super.key,
    this.nextScreen = const AppShell(),
    this.duration = const Duration(milliseconds: 1400),
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _scaleAnimation;
  Timer? _statusTimer;
  Timer? _navigateTimer;
  int _statusIndex = 0;

  static const _statusMessages = [
    'CONNECTING TO EVENT LEDGER...',
    'SYNCING LOCAL MIRROR...',
    'INITIALIZING FIELD RUNTIME...',
    'SYSTEM ONLINE',
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    _scaleAnimation = Tween<double>(begin: 0.94, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutBack,
      ),
    );

    _controller.forward();

    // Step through the boot status lines
    _statusTimer = Timer.periodic(const Duration(milliseconds: 320), (timer) {
      if (!mounted) return;
      if (_statusIndex < _statusMessages.length - 1) {
        setState(() => _statusIndex++);
      } else {
        timer.cancel();
      }
    });

    _navigateTimer = Timer(widget.duration, _navigateNext);
  }

  void _navigateNext() {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => widget.nextScreen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeInOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 350),
      ),
    );
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _navigateTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NpColors.bg,
      body: GestureDetector(
        onTap: _navigateNext,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const NpDotGrid(),
            SafeArea(
              child: Center(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return Opacity(
                      opacity: _fadeAnimation.value,
                      child: Transform.scale(
                        scale: _scaleAnimation.value,
                        child: child,
                      ),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Real Nameplate Logo
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: NpColors.bgCard,
                            border: Border.all(color: NpColors.lineStrong),
                            borderRadius: BorderRadius.circular(4),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x33000000),
                                blurRadius: 24,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const NpLogo(height: 56),
                        ),
                        const SizedBox(height: 28),

                        // Kicker
                        const NpKicker('00 / OFFLINE LEDGER'),
                        const SizedBox(height: 10),

                        // Title Lockup
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            const Text(
                              'NAMEPLATE',
                              style: TextStyle(
                                color: NpColors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: NpColors.redSubtle,
                                border: Border.all(color: NpColors.redBorder),
                                borderRadius: BorderRadius.circular(2),
                              ),
                              child: Text(
                                'FIELD',
                                style: NpType.mono.copyWith(
                                  color: NpColors.red,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Subtitle
                        Text(
                          'Every appliance accounted for.',
                          style: TextStyle(
                            color: NpColors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Progress line
                        SizedBox(
                          width: 220,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(1),
                            child: const LinearProgressIndicator(
                              minHeight: 2,
                              backgroundColor: NpColors.lineStrong,
                              valueColor: AlwaysStoppedAnimation<Color>(NpColors.red),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Status Ticker
                        Text(
                          _statusMessages[_statusIndex],
                          style: NpType.mono.copyWith(
                            color: NpColors.gray400,
                            fontSize: 10,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // Footer branding
            Positioned(
              bottom: 24,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  'NAMEPLATE SYSTEMS · FIELD RUNTIME V0',
                  style: NpType.mono.copyWith(
                    color: NpColors.white40,
                    fontSize: 9,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
