/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/**
 * Semantic app palette used by useAppTheme(). Every screen/component should
 * pull colors from here (via the hook) instead of hardcoding hex values, so
 * dark mode and high-contrast mode apply everywhere.
 */
export interface AppPalette {
  /** Page background */
  background: string;
  /** Cards, drawers, sheets */
  surface: string;
  /** Subtle secondary surface (chips, inactive buttons, table stripes) */
  surfaceAlt: string;
  /** Hairline borders and dividers */
  border: string;
  /** Headline / primary body text */
  textPrimary: string;
  /** Secondary text */
  textSecondary: string;
  /** Tertiary / placeholder text */
  textTertiary: string;
  /** Brand primary (buttons, active states) */
  primary: string;
  /** Text/icons rendered on top of primary */
  onPrimary: string;
  /** Success accents */
  success: string;
  /** Errors / destructive accents */
  danger: string;
  /** Soft danger background (error banners) */
  dangerSoft: string;
  /** Soft info background (notices) */
  infoSoft: string;
  /** Text on infoSoft */
  infoText: string;
  /** Scrim behind modals/drawers */
  overlay: string;
}

const lightPalette: AppPalette = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  primary: '#FF6B6B',
  onPrimary: '#FFFFFF',
  success: '#6BCF7F',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  infoSoft: '#EFF6FF',
  infoText: '#1E40AF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const lightHighContrastPalette: AppPalette = {
  ...lightPalette,
  background: '#FFFFFF',
  surfaceAlt: '#EDEEF1',
  border: '#6B7280',
  textPrimary: '#000000',
  textSecondary: '#1F2937',
  textTertiary: '#374151',
  primary: '#D63333',
  danger: '#B91C1C',
  infoText: '#1E3A8A',
};

const darkPalette: AppPalette = {
  background: '#111418',
  surface: '#1C2127',
  surfaceAlt: '#262C34',
  border: '#3A424D',
  textPrimary: '#F3F4F6',
  textSecondary: '#B0B8C1',
  textTertiary: '#7D8590',
  primary: '#FF6B6B',
  onPrimary: '#FFFFFF',
  success: '#6BCF7F',
  danger: '#F87171',
  dangerSoft: '#3F1D1D',
  infoSoft: '#1E2A44',
  infoText: '#93C5FD',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

const darkHighContrastPalette: AppPalette = {
  ...darkPalette,
  background: '#000000',
  surface: '#101317',
  surfaceAlt: '#1A1F26',
  border: '#9CA3AF',
  textPrimary: '#FFFFFF',
  textSecondary: '#E5E7EB',
  textTertiary: '#C3C9D1',
  primary: '#FF8585',
};

export const AppPalettes = {
  light: { default: lightPalette, highContrast: lightHighContrastPalette },
  dark: { default: darkPalette, highContrast: darkHighContrastPalette },
} as const;

/** Font-size multipliers for the Settings "Font Size" preference. */
export const FontScales = {
  small: 0.9,
  medium: 1,
  large: 1.15,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
