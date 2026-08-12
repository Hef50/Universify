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

// Light: soft "unbleached" warm neutrals instead of pure white/cool gray —
// easier on the eyes for content-heavy screens — with a refined crimson
// accent reserved for actions and highlights (WCAG AA on light surfaces).
const lightPalette: AppPalette = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F4',
  border: '#E7E5E4',
  textPrimary: '#1C1917',
  textSecondary: '#57534E',
  textTertiary: '#A8A29E',
  primary: '#E11D48',
  onPrimary: '#FFFFFF',
  success: '#059669',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  infoSoft: '#EFF6FF',
  infoText: '#1D4ED8',
  overlay: 'rgba(28, 25, 23, 0.5)',
};

const lightHighContrastPalette: AppPalette = {
  ...lightPalette,
  background: '#FFFFFF',
  surfaceAlt: '#EDECEA',
  border: '#57534E',
  textPrimary: '#000000',
  textSecondary: '#292524',
  textTertiary: '#44403C',
  primary: '#BE123C',
  danger: '#B91C1C',
  infoText: '#1E3A8A',
};

// Dark: stepped surfaces (~5-8% luminance per level) instead of pure black,
// desaturated text (not pure white) to avoid glare, and a more luminous
// accent — colors need extra saturation/lightness on dark backgrounds.
const darkPalette: AppPalette = {
  background: '#0C0E12',
  surface: '#15181E',
  surfaceAlt: '#1E222A',
  border: '#2A2F38',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textTertiary: '#70737C',
  primary: '#FB7185',
  onPrimary: '#26060C',
  success: '#34D399',
  danger: '#F87171',
  dangerSoft: '#2D1517',
  infoSoft: '#16233B',
  infoText: '#93C5FD',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

const darkHighContrastPalette: AppPalette = {
  ...darkPalette,
  background: '#000000',
  surface: '#101317',
  surfaceAlt: '#1A1E24',
  border: '#8A8F98',
  textPrimary: '#FFFFFF',
  textSecondary: '#E4E4E7',
  textTertiary: '#C3C7CD',
  primary: '#FDA4AF',
  onPrimary: '#26060C',
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
