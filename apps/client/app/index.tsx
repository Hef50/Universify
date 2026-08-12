import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

/**
 * Landing page for unauthenticated users.
 *
 * Design principles (see repo docs / PR description for sources):
 * - Type-led hero with a 5-second-clarity value proposition
 * - Product-first: a preview of real event cards instead of abstract art
 * - Accent color reserved for actions; calm neutral surfaces elsewhere
 * - Hairline borders over heavy shadows; generous whitespace
 * - Fully theme-aware (light/dark/high-contrast) and reduced-motion friendly
 */
export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const { colors, fontScale, reduceMotion } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim, reduceMotion]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>
            CMU<Text style={styles.wordmarkAccent}>nify</Text>
          </Text>
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.topBarButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={[styles.hero, isMobile && styles.heroMobile]}>
          <View style={styles.announcePill}>
            <Text style={styles.announcePillText}>Built by students, for CMU</Text>
          </View>

          <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
            Every campus event.{'\n'}One place.
          </Text>

          <Text style={[styles.subheadline, isMobile && styles.subheadlineMobile]}>
            CMUnify pulls events out of scattered Slack channels, Discord servers,
            and mailing lists into a single calendar — with recommendations that
            learn what you actually go to.
          </Text>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => router.push('/(auth)/signup')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryCtaText}>Get started</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryCta}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryCtaText}>Sign in with CMU account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.trustLine}>
            Free forever · @andrew.cmu.edu sign-in · Google Calendar sync
          </Text>
        </View>

        {/* Product preview: a stack of event cards */}
        <View style={[styles.previewSection, isMobile && styles.previewSectionMobile]}>
          <PreviewCard
            styles={styles}
            colors={colors}
            accent="#8B5CF6"
            title="Intro to Systems Study Session"
            meta="Tue 7:00 PM · Gates 4401"
            chips={['Academic', 'Tech']}
            going={32}
            offset="left"
          />
          <PreviewCard
            styles={styles}
            colors={colors}
            accent={colors.primary}
            title="Poker Night @ Wiegand"
            meta="Fri 8:00 PM · Wiegand Gym Lounge"
            chips={['Social', 'Fun']}
            going={87}
            offset="center"
            elevated
          />
          <PreviewCard
            styles={styles}
            colors={colors}
            accent="#0EA5E9"
            title="ScottyLabs Demo Day"
            meta="Sat 2:00 PM · Rangos Ballroom"
            chips={['Tech', 'Networking']}
            going={140}
            offset="right"
          />
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionKicker}>WHY CMUNIFY</Text>
          <Text style={styles.sectionTitle}>Stop missing things you&apos;d love</Text>
          <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="calendar-outline"
              title="One unified calendar"
              body="Slack, Discord, and campus events merged into a week view that looks like your Google Calendar."
            />
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="sparkles-outline"
              title="Learns your taste"
              body="Recommendations built from the events you actually attend — no interest quizzes."
            />
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="sync-outline"
              title="Google Calendar sync"
              body="Pin an event and it lands in your Google Calendar. Unpin it, it's gone."
            />
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="chatbubbles-outline"
              title="Auto-imported announcements"
              body="Bots read club announcement channels and turn free-text posts into structured events."
            />
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="funnel-outline"
              title="Search that works"
              body="Filter by category, time of day, location, and availability. Three search modes."
            />
            <Feature
              styles={styles}
              colors={colors}
              isDesktop={isDesktop}
              icon="notifications-outline"
              title="Never double-booked"
              body="Drag over a free time slot and see the best events that fit exactly there."
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsStrip}>
          <Stat styles={styles} value="500+" label="Events aggregated" />
          <View style={styles.statDivider} />
          <Stat styles={styles} value="30+" label="Clubs and orgs" />
          <View style={styles.statDivider} />
          <Stat styles={styles} value="3" label="Platforms unified" />
        </View>

        {/* Final CTA */}
        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>Your campus, in one feed</Text>
          <Text style={styles.finalCtaBody}>
            Sign in with your CMU Google account and see this week&apos;s events in seconds.
          </Text>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryCtaText}>Get started free</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with care at Carnegie Mellon · ScottyLabs Labrador · © 2026 CMUnify
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

/* ─── Sections ──────────────────────────────────────────────────────── */

function PreviewCard({
  styles,
  colors,
  accent,
  title,
  meta,
  chips,
  going,
  offset,
  elevated,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
  accent: string;
  title: string;
  meta: string;
  chips: string[];
  going: number;
  offset: 'left' | 'center' | 'right';
  elevated?: boolean;
}) {
  return (
    <View
      style={[
        styles.previewCard,
        elevated && styles.previewCardElevated,
        offset === 'left' && styles.previewCardLeft,
        offset === 'right' && styles.previewCardRight,
      ]}
    >
      <View style={[styles.previewAccentBar, { backgroundColor: accent }]} />
      <View style={styles.previewCardBody}>
        <Text style={styles.previewCardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.previewCardMeta} numberOfLines={1}>
          {meta}
        </Text>
        <View style={styles.previewCardFooter}>
          <View style={styles.previewChips}>
            {chips.map((chip) => (
              <View key={chip} style={[styles.previewChip, { backgroundColor: `${accent}1A` }]}>
                <Text style={[styles.previewChipText, { color: accent }]}>{chip}</Text>
              </View>
            ))}
          </View>
          <View style={styles.previewGoing}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.previewGoingText}>{going} going</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Feature({
  styles,
  colors,
  icon,
  title,
  body,
  isDesktop,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: AppPalette;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  isDesktop?: boolean;
}) {
  return (
    <View style={[styles.featureCard, isDesktop && styles.featureCardDesktop]}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

function Stat({
  styles,
  value,
  label,
}: {
  styles: ReturnType<typeof createStyles>;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 48,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    /* Top bar */
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 18,
      maxWidth: 1080,
      width: '100%',
      alignSelf: 'center',
    },
    wordmark: {
      fontSize: 20 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    wordmarkAccent: {
      color: colors.primary,
    },
    topBarButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topBarButtonText: {
      fontSize: 14 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },

    /* Hero */
    hero: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 72,
      paddingBottom: 40,
      maxWidth: 880,
      width: '100%',
      alignSelf: 'center',
    },
    heroMobile: {
      paddingTop: 40,
    },
    announcePill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 28,
    },
    announcePillText: {
      fontSize: 13 * fontScale,
      fontWeight: '500',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },
    headline: {
      fontSize: 64 * fontScale,
      lineHeight: 68 * fontScale,
      fontWeight: '800',
      letterSpacing: -2,
      textAlign: 'center',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    headlineMobile: {
      fontSize: 42 * fontScale,
      lineHeight: 46 * fontScale,
      letterSpacing: -1.2,
    },
    subheadline: {
      fontSize: 18 * fontScale,
      lineHeight: 28 * fontScale,
      textAlign: 'center',
      color: colors.textSecondary,
      maxWidth: 620,
      marginBottom: 32,
    },
    subheadlineMobile: {
      fontSize: 16 * fontScale,
      lineHeight: 25 * fontScale,
    },
    ctaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    primaryCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
    },
    primaryCtaText: {
      fontSize: 16 * fontScale,
      fontWeight: '600',
      color: colors.onPrimary,
    },
    secondaryCta: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryCtaText: {
      fontSize: 15 * fontScale,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    trustLine: {
      fontSize: 13 * fontScale,
      color: colors.textTertiary,
      textAlign: 'center',
    },

    /* Product preview */
    previewSection: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      gap: 12,
      maxWidth: 640,
      width: '100%',
      alignSelf: 'center',
    },
    previewSectionMobile: {
      paddingVertical: 24,
    },
    previewCard: {
      width: '100%',
      maxWidth: 520,
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    previewCardElevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 4,
      transform: [{ scale: 1.03 }],
      zIndex: 2,
    },
    previewCardLeft: {
      transform: [{ rotate: '-1.2deg' }, { translateX: -14 }],
      opacity: 0.9,
    },
    previewCardRight: {
      transform: [{ rotate: '1.2deg' }, { translateX: 14 }],
      opacity: 0.9,
    },
    previewAccentBar: {
      width: 4,
    },
    previewCardBody: {
      flex: 1,
      padding: 16,
    },
    previewCardTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    previewCardMeta: {
      fontSize: 13 * fontScale,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    previewCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewChips: {
      flexDirection: 'row',
      gap: 6,
    },
    previewChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    previewChipText: {
      fontSize: 11 * fontScale,
      fontWeight: '600',
    },
    previewGoing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    previewGoingText: {
      fontSize: 12 * fontScale,
      color: colors.textSecondary,
      fontWeight: '500',
    },

    /* Features */
    featuresSection: {
      paddingHorizontal: 24,
      paddingVertical: 56,
      maxWidth: 1080,
      width: '100%',
      alignSelf: 'center',
    },
    sectionKicker: {
      fontSize: 12 * fontScale,
      fontWeight: '700',
      letterSpacing: 1.5,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 32 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 36,
    },
    featuresGrid: {
      gap: 14,
    },
    featuresGridDesktop: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    featureCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    featureCardDesktop: {
      flexBasis: 320,
      flexGrow: 1,
      maxWidth: 340,
    },
    featureIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    featureTitle: {
      fontSize: 16 * fontScale,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    featureBody: {
      fontSize: 14 * fontScale,
      lineHeight: 21 * fontScale,
      color: colors.textSecondary,
    },

    /* Stats */
    statsStrip: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 24,
      paddingVertical: 28,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      maxWidth: 720,
      width: 'auto',
      alignSelf: 'center',
      minWidth: '80%',
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 26 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 12 * fontScale,
      color: colors.textTertiary,
      marginTop: 2,
      textAlign: 'center',
    },
    statDivider: {
      width: 1,
      height: 36,
      backgroundColor: colors.border,
    },

    /* Final CTA */
    finalCta: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 64,
    },
    finalCtaTitle: {
      fontSize: 30 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    finalCtaBody: {
      fontSize: 16 * fontScale,
      lineHeight: 24 * fontScale,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 480,
      marginBottom: 24,
    },

    /* Footer */
    footer: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    footerText: {
      fontSize: 13 * fontScale,
      color: colors.textTertiary,
      textAlign: 'center',
    },
  });
