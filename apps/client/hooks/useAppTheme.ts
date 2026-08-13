import { useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { AppPalette, AppPalettes, FontScales } from '@/constants/theme';
import {
  Elevation,
  Radii,
  Spacing,
  Typography,
  createElevation,
  createType,
} from '@/constants/design';

export interface AppTheme {
  /** Semantic color palette for the active theme + contrast setting */
  colors: AppPalette;
  /** Type scale, already multiplied by the user's font-size preference */
  type: Typography;
  /** 8pt spacing scale */
  space: typeof Spacing;
  /** Corner radius scale */
  radii: typeof Radii;
  /** Shadow ramp (flat in dark mode, where shadows don't read) */
  elevation: Elevation;
  /** Multiplier for text sizes (Settings -> Font Size) */
  fontScale: number;
  /** True when animations should be skipped (Settings -> Reduce Motion) */
  reduceMotion: boolean;
  isDark: boolean;
  highContrast: boolean;
}

/**
 * The one hook every screen/component should use for colors, type, spacing,
 * elevation, and motion preferences. Resolves the user's theme (light/dark/
 * system), high-contrast setting, and font size from SettingsContext.
 */
export function useAppTheme(): AppTheme {
  const { settings, currentTheme } = useSettings();

  const highContrast = settings.accessibility?.highContrast ?? false;
  const reduceMotion = settings.accessibility?.reduceMotion ?? false;
  const fontScale = FontScales[settings.fontSize] ?? 1;
  const isDark = currentTheme === 'dark';

  const colors = AppPalettes[currentTheme][highContrast ? 'highContrast' : 'default'];
  const type = useMemo(() => createType(fontScale), [fontScale]);
  const elevation = useMemo(() => createElevation(isDark), [isDark]);

  return useMemo(
    () => ({
      colors,
      type,
      space: Spacing,
      radii: Radii,
      elevation,
      fontScale,
      reduceMotion,
      isDark,
      highContrast,
    }),
    [colors, type, elevation, fontScale, reduceMotion, isDark, highContrast]
  );
}
