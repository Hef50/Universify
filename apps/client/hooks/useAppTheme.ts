import { useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { AppPalette, AppPalettes, FontScales } from '@/constants/theme';

export interface AppTheme {
  /** Semantic color palette for the active theme + contrast setting */
  colors: AppPalette;
  /** Multiplier for text sizes (Settings -> Font Size) */
  fontScale: number;
  /** True when animations should be skipped (Settings -> Reduce Motion) */
  reduceMotion: boolean;
  isDark: boolean;
  highContrast: boolean;
}

/**
 * The one hook every screen/component should use for colors, font scaling,
 * and motion preferences. Resolves the user's theme (light/dark/system),
 * high-contrast setting, and font size from SettingsContext.
 */
export function useAppTheme(): AppTheme {
  const { settings, currentTheme } = useSettings();

  const highContrast = settings.accessibility?.highContrast ?? false;
  const reduceMotion = settings.accessibility?.reduceMotion ?? false;
  const fontScale = FontScales[settings.fontSize] ?? 1;

  const colors = AppPalettes[currentTheme][highContrast ? 'highContrast' : 'default'];

  return useMemo(
    () => ({
      colors,
      fontScale,
      reduceMotion,
      isDark: currentTheme === 'dark',
      highContrast,
    }),
    [colors, fontScale, reduceMotion, currentTheme, highContrast]
  );
}
