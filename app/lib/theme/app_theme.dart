import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Nameplate Field brand tokens.
///
/// Source of truth: website/css/styles.css and hq/src/styles/tokens.css —
/// black / white / red editorial system. Keep Field, HQ, and the marketing
/// site rendering as sister surfaces.
class NpColors {
  NpColors._();

  static const bg = Color(0xFF000000);
  static const bgSubtle = Color(0xFF080808);
  static const bgElevated = Color(0xFF111111);
  static const bgCard = Color(0xFF141414);
  static const inputFill = Color(0xFF0D0D0D);

  static const white = Color(0xFFFFFFFF);
  static const white90 = Color(0xE6FFFFFF);
  static const white70 = Color(0xB3FFFFFF);
  static const white40 = Color(0x66FFFFFF);
  static const white15 = Color(0x26FFFFFF);
  static const white08 = Color(0x14FFFFFF);

  static const red = Color(0xFFFF2A2A);
  static const redHover = Color(0xFFFF4D4D);
  static const redDeep = Color(0xFFD91D1D);
  static const redGlow = Color(0x59FF2A2A);
  static const redSubtle = Color(0x14FF2A2A);
  static const redBorder = Color(0x66FF2A2A);

  static const gray900 = Color(0xFF121212);
  static const gray800 = Color(0xFF1F1F1F);
  static const gray700 = Color(0xFF2E2E2E);
  static const gray500 = Color(0xFF6B6B6B);
  static const gray400 = Color(0xFFA3A3A3);
  static const gray300 = Color(0xFFD4D4D4);

  static const line = Color(0x1AFFFFFF);
  static const lineLight = Color(0x0DFFFFFF);
  static const lineStrong = Color(0x33FFFFFF);

  // Aliases used by existing Field widgets. Mapped onto the editorial
  // palette (same approach as HQ tokens.css) so screens stay in lockstep.
  static const ink = white;
  static const slate900 = bg;
  static const slate700 = gray800;
  static const steel500 = gray500;
  static const mist200 = line;
  static const mist100 = bgSubtle;
  static const paper = bg;
  static const plate600 = red;
  static const plate700 = redDeep;
  static const plate100 = redSubtle;
  static const signal500 = red;
  static const signal100 = redSubtle;
  static const verified600 = white;
  static const verified100 = white08;
  static const caution600 = red;
  static const fault600 = red;
  static const fault100 = redSubtle;
  static const offline500 = gray400;
  static const plate600Dark = red;
}

/// Mono identifiers (NPIDs, serials, work-order ids). Menlo/SF Mono on
/// Apple platforms — the same fallback stack the website uses.
class NpType {
  NpType._();

  static const monoFamily = 'Menlo';
  static const monoFallbacks = ['SF Mono', 'Courier', 'monospace'];

  static const TextStyle mono = TextStyle(
    fontFamily: monoFamily,
    fontFamilyFallback: monoFallbacks,
  );
}

/// App-wide ThemeData. Field is dark-only, matching HQ and the marketing site.
class AppTheme {
  AppTheme._();

  static ThemeData light() => dark();

  static ThemeData dark() {
    const colorScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: NpColors.red,
      onPrimary: NpColors.white,
      secondary: NpColors.white,
      onSecondary: NpColors.bg,
      tertiary: NpColors.gray400,
      onTertiary: NpColors.bg,
      surface: NpColors.bg,
      onSurface: NpColors.white,
      error: NpColors.red,
      onError: NpColors.white,
      outline: NpColors.lineStrong,
      outlineVariant: NpColors.line,
      surfaceContainerHighest: NpColors.bgCard,
      surfaceContainerHigh: NpColors.bgElevated,
      surfaceContainer: NpColors.bgCard,
    );

    const cardRadius = BorderRadius.all(Radius.circular(2));
    const buttonRadius = BorderRadius.all(Radius.circular(2));

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: Colors.transparent,
      canvasColor: NpColors.bg,
      dividerColor: NpColors.line,
      splashFactory: InkRipple.splashFactory,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xF2000000),
        foregroundColor: NpColors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: TextStyle(
          color: NpColors.white,
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.6,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: NpColors.white,
          foregroundColor: NpColors.bg,
          disabledBackgroundColor: NpColors.white15,
          disabledForegroundColor: NpColors.gray500,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: const RoundedRectangleBorder(borderRadius: buttonRadius),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NpColors.white,
          foregroundColor: NpColors.bg,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: const RoundedRectangleBorder(borderRadius: buttonRadius),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: NpColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          side: const BorderSide(color: NpColors.lineStrong),
          shape: const RoundedRectangleBorder(borderRadius: buttonRadius),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: NpColors.red,
          shape: const RoundedRectangleBorder(borderRadius: buttonRadius),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: NpColors.red,
        foregroundColor: NpColors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: buttonRadius),
      ),
      cardTheme: CardThemeData(
        color: NpColors.bgCard,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: const RoundedRectangleBorder(
          borderRadius: cardRadius,
          side: BorderSide(color: NpColors.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: NpColors.bg,
        elevation: 0,
        height: 72,
        indicatorColor: NpColors.white,
        overlayColor: WidgetStateProperty.all(NpColors.white08),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? NpColors.white : NpColors.gray400,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? NpColors.bg : NpColors.gray400,
            size: 22,
          );
        }),
      ),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: NpColors.bg,
        indicatorColor: NpColors.white,
        selectedIconTheme: IconThemeData(color: NpColors.bg, size: 22),
        unselectedIconTheme: IconThemeData(color: NpColors.gray400, size: 22),
        selectedLabelTextStyle: TextStyle(
          color: NpColors.white,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
        unselectedLabelTextStyle: TextStyle(color: NpColors.gray400, fontSize: 12),
      ),
      dividerTheme: const DividerThemeData(
        color: NpColors.lineLight,
        space: 1,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: NpColors.white08,
        selectedColor: NpColors.white,
        disabledColor: NpColors.gray800,
        labelStyle: const TextStyle(color: NpColors.gray300, fontWeight: FontWeight.w600),
        secondaryLabelStyle: const TextStyle(color: NpColors.bg, fontWeight: FontWeight.w700),
        side: const BorderSide(color: NpColors.line),
        shape: const RoundedRectangleBorder(borderRadius: buttonRadius),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: NpColors.inputFill,
        hintStyle: const TextStyle(color: NpColors.gray500),
        labelStyle: const TextStyle(color: NpColors.gray400),
        prefixIconColor: NpColors.gray400,
        suffixIconColor: NpColors.gray400,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: NpColors.lineStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: NpColors.red, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NpColors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NpColors.red, width: 1.4),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(9),
          borderSide: const BorderSide(color: NpColors.lineStrong),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: NpColors.bgElevated,
        contentTextStyle: const TextStyle(color: NpColors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: NpColors.line),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: NpColors.red,
        textColor: NpColors.white,
        subtitleTextStyle: TextStyle(color: NpColors.gray400, fontSize: 13),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected) ? NpColors.white : NpColors.gray400;
        }),
        trackColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.selected) ? NpColors.red : NpColors.gray700;
        }),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: NpColors.red),
      dropdownMenuTheme: const DropdownMenuThemeData(
        menuStyle: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(NpColors.bgCard),
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: NpColors.white, fontWeight: FontWeight.w900, letterSpacing: -1.4),
        headlineLarge: TextStyle(color: NpColors.white, fontWeight: FontWeight.w800, letterSpacing: -0.8),
        titleLarge: TextStyle(color: NpColors.white, fontWeight: FontWeight.w800, letterSpacing: -0.5),
        titleMedium: TextStyle(color: NpColors.white, fontWeight: FontWeight.w700),
        titleSmall: TextStyle(color: NpColors.white, fontWeight: FontWeight.w700),
        bodyLarge: TextStyle(color: NpColors.white90),
        bodyMedium: TextStyle(color: NpColors.white90),
        bodySmall: TextStyle(color: NpColors.gray400),
        labelLarge: TextStyle(color: NpColors.gray300, fontWeight: FontWeight.w600),
        labelMedium: TextStyle(color: NpColors.gray400),
      ).apply(bodyColor: NpColors.white, displayColor: NpColors.white),
    );
  }
}
