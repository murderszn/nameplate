import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'screens/app_shell.dart';
import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';
import 'widgets/np_brand.dart';

void main() {
  runApp(const ProviderScope(child: NameplateFieldApp(home: SplashScreen())));
}

/// Nameplate Field — Flutter (iOS + Android) app for maintenance
/// technicians. See docs/architecture.md §4 for the offline-first sync
/// design this app is built around (Drift local mirror + append-only
/// outbox), and docs/v0-scope.md §1.1 for the V0 feature scope.
class NameplateFieldApp extends StatelessWidget {
  final Widget home;

  const NameplateFieldApp({
    super.key,
    this.home = const AppShell(),
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nameplate Field',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.dark,
      builder: (context, child) {
        return ColoredBox(
          color: NpColors.bg,
          child: Stack(
            fit: StackFit.expand,
            children: [
              const IgnorePointer(child: NpDotGrid()),
              ?child,
            ],
          ),
        );
      },
      home: home,
    );
  }
}
