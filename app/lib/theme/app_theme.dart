import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class NpColors {
  NpColors._();

  static const red = Color(0xFFEB2B2B);
  static const redHover = Color(0xFFF44343);
  static const redDeep = Color(0xFFC91F1F);
  static const redGlow = Colors.transparent;
  static const redSubtle = Color(0x14EB2B2B);
  static const redBorder = Color(0x66EB2B2B);

  /// Always-white ink for text sitting on a solid red or black fill.
  static const onSolid = Color(0xFFFFFFFF);
  static const solidLight = Color(0xFF111111);

  static const success = Color(0xFF22C55E);
  static const successDeep = Color(0xFF137A5B);
  static const successBgLight = Color(0xFFDCF1E9);
  static const successBgDark = Color(0xFF0D2818);

  static const dangerDeep = Color(0xFFC23B3B);
  static const dangerBgLight = Color(0xFFFBE4E4);
  static const dangerBgDark = Color(0xFF1F0A0A);

  /// Offline / pending — not a fault color (branding.md §6).
  static const pending = Color(0xFF7A5AA8);

  // Category tints and backgrounds (12% opacity variants)
  static const hvacBlue = Color(0xFF0EA5E9);
  static const hvacBlueBgLight = Color(0x1F0EA5E9);
  static const hvacBlueBgDark = Color(0x1F0EA5E9);

  static const laundryAmber = Color(0xFFF59E0B);
  static const laundryAmberBgLight = Color(0x1FF59E0B);
  static const laundryAmberBgDark = Color(0x1FF59E0B);

  static const kitchenEmerald = Color(0xFF10B981);
  static const kitchenEmeraldBgLight = Color(0x1F10B981);
  static const kitchenEmeraldBgDark = Color(0x1F10B981);

  static const infoViolet = Color(0xFF7A5AA8);
  static const infoVioletBgLight = Color(0x1F7A5AA8);
  static const infoVioletBgDark = Color(0x1F7A5AA8);
}

@immutable
class NpPalette extends ThemeExtension<NpPalette> {
  final Color bg;
  final Color bgSubtle;
  final Color bgElevated;
  final Color bgCard;
  final Color inputFill;
  final Color white;
  final Color white90;
  final Color white70;
  final Color white40;
  final Color white15;
  final Color white08;
  final Color gray900;
  final Color gray800;
  final Color gray700;
  final Color gray500;
  final Color gray400;
  final Color gray300;
  final Color line;
  final Color lineLight;
  final Color lineStrong;
  final Color dotGrid;

  const NpPalette({
    required this.bg,
    required this.bgSubtle,
    required this.bgElevated,
    required this.bgCard,
    required this.inputFill,
    required this.white,
    required this.white90,
    required this.white70,
    required this.white40,
    required this.white15,
    required this.white08,
    required this.gray900,
    required this.gray800,
    required this.gray700,
    required this.gray500,
    required this.gray400,
    required this.gray300,
    required this.line,
    required this.lineLight,
    required this.lineStrong,
    required this.dotGrid,
  });

  static const light = NpPalette(
    bg: Color(0xFFFFFFFF),
    bgSubtle: Color(0xFFF7F7F7),
    bgElevated: Color(0xFFEEEEEE),
    bgCard: Color(0xFFFAFAFA),
    inputFill: Color(0xFFF7F7F7),
    white: Color(0xFF111111),
    white90: Color(0xE6111111),
    white70: Color(0xB3111111),
    white40: Color(0x66111111),
    white15: Color(0x26111111),
    white08: Color(0x14111111),
    gray900: Color(0xFFF3F3F3),
    gray800: Color(0xFFE9E9E9),
    gray700: Color(0xFFD4D4D4),
    gray500: Color(0xFF6B6B6B),
    gray400: Color(0xFF555555),
    gray300: Color(0xFF333333),
    line: Color(0x1F000000),
    lineLight: Color(0x0F000000),
    lineStrong: Color(0x3D000000),
    dotGrid: Color(0x08000000),
  );

  static const dark = NpPalette(
    bg: Color(0xFF000000),
    bgSubtle: Color(0xFF080808),
    bgElevated: Color(0xFF111111),
    bgCard: Color(0xFF141414),
    inputFill: Color(0xFF0D0D0D),
    white: Color(0xFFFFFFFF),
    white90: Color(0xE6FFFFFF),
    white70: Color(0xB3FFFFFF),
    white40: Color(0x66FFFFFF),
    white15: Color(0x26FFFFFF),
    white08: Color(0x14FFFFFF),
    gray900: Color(0xFF121212),
    gray800: Color(0xFF1F1F1F),
    gray700: Color(0xFF2E2E2E),
    gray500: Color(0xFF6B6B6B),
    gray400: Color(0xFFA3A3A3),
    gray300: Color(0xFFD4D4D4),
    line: Color(0x1AFFFFFF),
    lineLight: Color(0x0DFFFFFF),
    lineStrong: Color(0x33FFFFFF),
    dotGrid: Color(0x06FFFFFF),
  );

  @override
  NpPalette copyWith() => this;

  @override
  NpPalette lerp(covariant NpPalette? other, double t) {
    if (other == null) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return NpPalette(
      bg: mix(bg, other.bg),
      bgSubtle: mix(bgSubtle, other.bgSubtle),
      bgElevated: mix(bgElevated, other.bgElevated),
      bgCard: mix(bgCard, other.bgCard),
      inputFill: mix(inputFill, other.inputFill),
      white: mix(white, other.white),
      white90: mix(white90, other.white90),
      white70: mix(white70, other.white70),
      white40: mix(white40, other.white40),
      white15: mix(white15, other.white15),
      white08: mix(white08, other.white08),
      gray900: mix(gray900, other.gray900),
      gray800: mix(gray800, other.gray800),
      gray700: mix(gray700, other.gray700),
      gray500: mix(gray500, other.gray500),
      gray400: mix(gray400, other.gray400),
      gray300: mix(gray300, other.gray300),
      line: mix(line, other.line),
      lineLight: mix(lineLight, other.lineLight),
      lineStrong: mix(lineStrong, other.lineStrong),
      dotGrid: mix(dotGrid, other.dotGrid),
    );
  }
}

extension NpThemeContext on BuildContext {
  NpPalette get npColors => Theme.of(this).extension<NpPalette>()!;

  bool get npIsLight => Theme.of(this).brightness == Brightness.light;

  /// Primary action fill: black in light mode, brand red in dark mode.
  Color get npSolid => npIsLight ? NpColors.solidLight : NpColors.red;

  Color get npSuccessFg =>
      npIsLight ? NpColors.successDeep : NpColors.success;
  Color get npSuccessBg =>
      npIsLight ? NpColors.successBgLight : NpColors.successBgDark;
  Color get npDangerFg => npIsLight ? NpColors.dangerDeep : NpColors.red;
  Color get npDangerBg =>
      npIsLight ? NpColors.dangerBgLight : NpColors.dangerBgDark;
}

class NpType {
  NpType._();
  static const monoFamily = 'Menlo';
  static const monoFallbacks = ['SF Mono', 'Courier', 'monospace'];
  static const TextStyle mono = TextStyle(
    fontFamily: monoFamily,
    fontFamilyFallback: monoFallbacks,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData light() => _build(Brightness.light, NpPalette.light);
  static ThemeData dark() => _build(Brightness.dark, NpPalette.dark);

  static ThemeData _build(Brightness brightness, NpPalette c) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme(
      brightness: brightness,
      primary: NpColors.red,
      onPrimary: const Color(0xFFFFFFFF),
      secondary: c.white,
      onSecondary: c.bg,
      tertiary: c.gray400,
      onTertiary: c.bg,
      surface: c.bg,
      onSurface: c.white,
      error: NpColors.red,
      onError: const Color(0xFFFFFFFF),
      outline: c.lineStrong,
      outlineVariant: c.line,
      surfaceContainerHighest: c.bgCard,
      surfaceContainerHigh: c.bgElevated,
      surfaceContainer: c.bgCard,
    );
    const radius = BorderRadius.all(Radius.circular(2));
    final baseText = TextTheme(
      displayLarge: TextStyle(
        color: c.white,
        fontWeight: FontWeight.w900,
        letterSpacing: -1.4,
      ),
      headlineLarge: TextStyle(
        color: c.white,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
      ),
      titleLarge: TextStyle(
        color: c.white,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
      titleMedium: TextStyle(color: c.white, fontWeight: FontWeight.w700),
      titleSmall: TextStyle(color: c.white, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(color: c.white90),
      bodyMedium: TextStyle(color: c.white90),
      bodySmall: TextStyle(color: c.gray400),
      labelLarge: TextStyle(color: c.gray300, fontWeight: FontWeight.w600),
      labelMedium: TextStyle(color: c.gray400),
    ).apply(bodyColor: c.white, displayColor: c.white);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      extensions: [c],
      scaffoldBackgroundColor: Colors.transparent,
      canvasColor: c.bg,
      dividerColor: c.line,
      splashFactory: InkRipple.splashFactory,
      textTheme: baseText,
      appBarTheme: AppBarTheme(
        backgroundColor: isDark
            ? const Color(0xF2000000)
            : const Color(0xF2FFFFFF),
        foregroundColor: c.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          color: c.white,
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.6,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.white,
          foregroundColor: c.bg,
          disabledBackgroundColor: c.white15,
          disabledForegroundColor: c.gray500,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: const RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: c.white,
          foregroundColor: c.bg,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          shape: const RoundedRectangleBorder(borderRadius: radius),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.white,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          side: BorderSide(color: c.lineStrong),
          shape: const RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: NpColors.red,
          shape: const RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: isDark ? NpColors.red : NpColors.solidLight,
        foregroundColor: const Color(0xFFFFFFFF),
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: radius),
      ),
      cardTheme: CardThemeData(
        color: c.bgCard,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.all(Radius.circular(12)),
          side: BorderSide(color: c.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: c.bg,
        elevation: 0,
        height: 72,
        indicatorColor: c.white,
        overlayColor: WidgetStatePropertyAll(c.white08),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected)
                ? FontWeight.w700
                : FontWeight.w500,
            color: states.contains(WidgetState.selected) ? c.white : c.gray400,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? c.bg : c.gray400,
            size: 22,
          ),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: c.bg,
        indicatorColor: c.white,
        selectedIconTheme: IconThemeData(color: c.bg, size: 22),
        unselectedIconTheme: IconThemeData(color: c.gray400, size: 22),
        selectedLabelTextStyle: TextStyle(
          color: c.white,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
        unselectedLabelTextStyle: TextStyle(color: c.gray400, fontSize: 12),
      ),
      dividerTheme: DividerThemeData(
        color: c.lineLight,
        space: 1,
        thickness: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: c.white08,
        selectedColor: c.white,
        disabledColor: c.gray800,
        labelStyle: TextStyle(color: c.gray300, fontWeight: FontWeight.w600),
        secondaryLabelStyle: TextStyle(
          color: c.bg,
          fontWeight: FontWeight.w700,
        ),
        side: BorderSide(color: c.line),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.inputFill,
        hintStyle: TextStyle(color: c.gray500),
        labelStyle: TextStyle(color: c.gray400),
        prefixIconColor: c.gray400,
        suffixIconColor: c.gray400,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: BorderSide(color: c.lineStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: NpColors.red, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: NpColors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(2),
          borderSide: const BorderSide(color: NpColors.red, width: 1.4),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.bgElevated,
        contentTextStyle: TextStyle(color: c.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(2),
          side: BorderSide(color: c.line),
        ),
      ),
      listTileTheme: ListTileThemeData(
        iconColor: NpColors.red,
        textColor: c.white,
        subtitleTextStyle: TextStyle(color: c.gray400, fontSize: 13),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? const Color(0xFFFFFFFF)
              : c.gray400,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? (isDark ? NpColors.red : NpColors.solidLight)
              : c.gray700,
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: NpColors.red,
      ),
      dropdownMenuTheme: DropdownMenuThemeData(
        menuStyle: MenuStyle(backgroundColor: WidgetStatePropertyAll(c.bgCard)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.bgCard,
        modalBackgroundColor: c.bgCard,
        surfaceTintColor: Colors.transparent,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: c.bgCard,
        surfaceTintColor: Colors.transparent,
      ),
    );
  }
}
