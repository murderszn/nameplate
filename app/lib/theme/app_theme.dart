import 'package:flutter/material.dart';

/// Nameplate brand tokens.
///
/// Source of truth: docs/branding.md §6 "Color palette". Keep these values in
/// sync with website/src/styles/tokens.css and hq/src/styles/tokens.css — all
/// three surfaces must render the same brand.
class NpColors {
  NpColors._();

  // Core
  static const ink = Color(0xFF0E1620);
  static const slate900 = Color(0xFF16212E);
  static const slate700 = Color(0xFF2B3A4C);
  static const steel500 = Color(0xFF61748C);
  static const mist200 = Color(0xFFDDE3EA);
  static const mist100 = Color(0xFFEFF3F7);
  static const paper = Color(0xFFFAFCFD);

  // Brand & action
  static const plate600 = Color(0xFF0B5D8A); // primary brand color
  static const plate700 = Color(0xFF084A6E); // hover/pressed
  static const plate100 = Color(0xFFDCEDF6); // tinted background
  static const signal500 = Color(0xFFF0A028); // amber accent — never as text
  static const signal100 = Color(0xFFFDF0DA);

  // Status semantics — fixed meanings, do not reuse for decoration.
  static const verified600 = Color(0xFF137A5B); // present/confirmed/closed/success
  static const verified100 = Color(0xFFDCF1E9);
  static const caution600 = Color(0xFFB4700C); // aging, overdue, SLA at risk
  static const fault600 = Color(0xFFC23B3B); // broken, unaccounted for, sync failure
  static const fault100 = Color(0xFFFBE4E4);
  static const offline500 = Color(0xFF7A5AA8); // offline / pending sync only

  // Dark-mode primary lighten, per branding.md §6 rules.
  static const plate600Dark = Color(0xFF3E9BC9);
}

/// App-wide ThemeData. Field app requires dark mode support (utility rooms,
/// night calls) per branding.md §6.
class AppTheme {
  AppTheme._();

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: NpColors.plate600,
      brightness: Brightness.light,
      primary: NpColors.plate600,
      secondary: NpColors.signal500,
      surface: NpColors.paper,
      error: NpColors.fault600,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: NpColors.paper,
      appBarTheme: const AppBarTheme(
        backgroundColor: NpColors.plate600,
        foregroundColor: Colors.white,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NpColors.plate600,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: NpColors.signal500,
        foregroundColor: NpColors.ink,
      ),
      dividerColor: NpColors.mist200,
      cardTheme: CardThemeData(
        color: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: const BorderSide(color: NpColors.mist200),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: NpColors.plate100,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(color: selected ? NpColors.plate600 : NpColors.steel500);
        }),
      ),
      textTheme: const TextTheme().apply(
        bodyColor: NpColors.ink,
        displayColor: NpColors.ink,
      ),
    );
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: NpColors.plate600Dark,
      brightness: Brightness.dark,
      primary: NpColors.plate600Dark,
      secondary: NpColors.signal500,
      surface: NpColors.slate900,
      error: NpColors.fault600,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: NpColors.slate900,
      appBarTheme: const AppBarTheme(
        backgroundColor: NpColors.slate900,
        foregroundColor: NpColors.mist100,
        centerTitle: false,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: NpColors.signal500,
        foregroundColor: NpColors.ink,
      ),
      cardTheme: CardThemeData(
        color: NpColors.slate700,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      textTheme: const TextTheme().apply(
        bodyColor: NpColors.mist100,
        displayColor: NpColors.mist100,
      ),
    );
  }
}
