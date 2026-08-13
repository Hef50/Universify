import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design tokens — the vocabulary every screen builds from.
 *
 * The rules behind the numbers, from current mobile design guidance:
 *  - Spacing is an 8pt grid with 4pt half-steps. Arbitrary values (13, 18, 22)
 *    are what make an interface feel hand-assembled; a fixed set is what makes
 *    unrelated screens look like one product.
 *  - Type is a small, fixed scale modelled on Apple's HIG styles, with each
 *    step carrying its own weight, line height and tracking. Headings run
 *    ~1.5–2× body size so hierarchy is obvious at a glance.
 *  - Emphasis comes from the three text colour roles in the palette, not from
 *    inventing new colours per screen.
 *  - Depth is a single shadow ramp in light mode; in dark mode shadows are
 *    invisible, so separation comes from stepped surfaces and hairlines.
 *  - Anything tappable is at least 44pt.
 */

/** 8pt grid with 4pt half-steps. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum tap target, per Apple HIG. */
export const TouchTarget = 44;

/** Content column width — text lines stay readable on wide screens. */
export const ContentWidth = {
  narrow: 560,
  regular: 720,
  wide: 1120,
} as const;

type TypeToken =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption'
  | 'overline';

interface TypeSpec {
  size: number;
  lineHeight: number;
  weight: TextStyle['fontWeight'];
  tracking?: number;
  uppercase?: boolean;
}

/**
 * Sizes are unscaled; `createType(fontScale)` applies the user's font-size
 * preference. Tight tracking on the big sizes keeps large headings from
 * looking loose — the standard fix for oversized system type.
 */
const TYPE: Record<TypeToken, TypeSpec> = {
  display: { size: 34, lineHeight: 40, weight: '800', tracking: -0.8 },
  title1: { size: 28, lineHeight: 34, weight: '800', tracking: -0.6 },
  title2: { size: 22, lineHeight: 28, weight: '700', tracking: -0.4 },
  title3: { size: 20, lineHeight: 26, weight: '700', tracking: -0.3 },
  headline: { size: 17, lineHeight: 23, weight: '700', tracking: -0.2 },
  body: { size: 16, lineHeight: 24, weight: '400' },
  callout: { size: 15, lineHeight: 21, weight: '400' },
  subhead: { size: 14, lineHeight: 20, weight: '600' },
  footnote: { size: 13, lineHeight: 18, weight: '400' },
  caption: { size: 12, lineHeight: 16, weight: '600' },
  overline: { size: 11, lineHeight: 14, weight: '700', tracking: 0.8, uppercase: true },
};

export type Typography = Record<TypeToken, TextStyle>;

/** Build the type scale for a given font-size preference. */
export function createType(fontScale: number): Typography {
  const built = {} as Typography;
  (Object.keys(TYPE) as TypeToken[]).forEach((token) => {
    const spec = TYPE[token];
    built[token] = {
      fontSize: spec.size * fontScale,
      lineHeight: spec.lineHeight * fontScale,
      fontWeight: spec.weight,
      ...(spec.tracking ? { letterSpacing: spec.tracking } : {}),
      ...(spec.uppercase ? { textTransform: 'uppercase' as const } : {}),
    };
  });
  return built;
}

export interface Elevation {
  /** Flat — separated by a hairline border instead. */
  flat: ViewStyle;
  /** Resting cards. */
  low: ViewStyle;
  /** Raised surfaces: sticky bars, popovers. */
  medium: ViewStyle;
  /** Modals and sheets. */
  high: ViewStyle;
}

const shadow = (y: number, blur: number, opacity: number): ViewStyle =>
  Platform.select<ViewStyle>({
    web: { boxShadow: `0 ${y}px ${blur}px rgba(15, 15, 20, ${opacity})` } as ViewStyle,
    default: {
      shadowColor: '#0F0F14',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation: y + 1,
    },
  }) as ViewStyle;

/**
 * Shadows read as dirt on dark backgrounds, so dark mode returns flat styles
 * and leans on the palette's stepped surfaces and borders for separation.
 */
export function createElevation(isDark: boolean): Elevation {
  if (isDark) {
    return { flat: {}, low: {}, medium: {}, high: {} };
  }
  return {
    flat: {},
    low: shadow(1, 2, 0.06),
    medium: shadow(4, 12, 0.08),
    high: shadow(12, 32, 0.14),
  };
}

/** Standard entrance/exit timings. Long enough to read, short enough to feel instant. */
export const Motion = {
  fast: 140,
  base: 220,
  slow: 320,
  /** Per-item stagger in a list entrance. */
  stagger: 45,
} as const;
