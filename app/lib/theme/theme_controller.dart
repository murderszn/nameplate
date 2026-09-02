import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _themePreferenceKey = 'nameplate-theme';

final themeModeProvider = StateNotifierProvider<ThemeModeController, ThemeMode>(
  (ref) => ThemeModeController(),
);

class ThemeModeController extends StateNotifier<ThemeMode> {
  ThemeModeController() : super(ThemeMode.light) {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      if (preferences.getString(_themePreferenceKey) == 'dark') {
        state = ThemeMode.dark;
      }
    } catch (_) {
      // Light mode remains the safe default if preferences are unavailable.
    }
  }

  Future<void> setDarkMode(bool enabled) async {
    state = enabled ? ThemeMode.dark : ThemeMode.light;
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        _themePreferenceKey,
        enabled ? 'dark' : 'light',
      );
    } catch (_) {
      // The selected theme still applies for the current session.
    }
  }
}
