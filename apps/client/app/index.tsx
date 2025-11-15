import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';

const { width, height } = Dimensions.get('window');

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isMobile, isDesktop } = useResponsive();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.Text style={styles.loadingLogo}>🎓</Animated.Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground}>
        <AnimatedBlobs />
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <AnimatedHero isMobile={isMobile} />
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <FeaturesGrid isDesktop={isDesktop} />
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <StatsDisplay />
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <FinalCTA />
      </View>
    </ScrollView>
  );
}

const StarLogo = () => {
  return (
    <View style={styles.starContainer}>
      <View style={[styles.starPetal, styles.starPetalTop]} />
      <View style={[styles.starPetal, styles.starPetalRight]} />
      <View style={[styles.starPetal, styles.starPetalBottom]} />
      <View style={[styles.starPetal, styles.starPetalLeft]} />
      <View style={styles.starCenter} />
    </View>
  );
};

const AnimatedBlobs = () => {
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBlobAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createBlobAnimation(blob1Anim, 8000),
      createBlobAnimation(blob2Anim, 10000),
    ]).start();
  }, []);

  const blob1TranslateY = blob1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });

  const blob2TranslateY = blob2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  const blob1Scale = blob1Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const blob2Scale = blob2Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.95, 1],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          {
            transform: [
              { translateY: blob1TranslateY },
              { scale: blob1Scale },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          {
            transform: [
              { translateY: blob2TranslateY },
              { scale: blob2Scale },
            ],
          },
        ]}
      />
    </>
  );
};

const AnimatedHero: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: 300,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.heroContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoIcon}>
          <StarLogo />
        </View>
      </View>

      {/* Main Headline */}
      <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
        Welcome to
      </Text>
      <Text style={[styles.brandHeadline, isMobile && styles.brandHeadlineMobile]}>
        Universify
      </Text>

      {/* Subheadline */}
      <Text style={[styles.subheadline, isMobile && styles.subheadlineMobile]}>
        Your campus life, unified in one place.{'\n'}
        Discover events, connect with clubs, and never miss what matters.
      </Text>

      {/* CTA Buttons */}
      <View style={styles.ctaButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Trust Indicators */}
      <View style={styles.trustIndicators}>
        <View style={styles.trustItem}>
          <Text style={styles.trustIcon}>✓</Text>
          <Text style={styles.trustText}>Free Forever</Text>
        </View>
        <View style={styles.trustItem}>
          <Text style={styles.trustIcon}>✓</Text>
          <Text style={styles.trustText}>1000+ Students</Text>
        </View>
        <View style={styles.trustItem}>
          <Text style={styles.trustIcon}>✓</Text>
          <Text style={styles.trustText}>50+ Clubs</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const FeaturesGrid: React.FC<{ isDesktop: boolean }> = ({ isDesktop }) => {
  const features = [
    {
      icon: '📅',
      title: 'Unified Calendar',
      description: 'All campus events in one beautiful calendar view',
      gradient: ['#FF6B6B', '#FF8E8E'],
    },
    {
      icon: '🔍',
      title: 'Smart Discovery',
      description: 'AI-powered search to find exactly what you need',
      gradient: ['#8B7FFF', '#A89FFF'],
    },
    {
      icon: '🎉',
      title: 'Social Events',
      description: 'Create and join casual meetups instantly',
      gradient: ['#FF6BA8', '#FF8EBF'],
    },
    {
      icon: '🏛️',
      title: 'Club Hub',
      description: 'Stay connected with all your organizations',
      gradient: ['#4ECDC4', '#6FD9D1'],
    },
    {
      icon: '🔔',
      title: 'Smart Alerts',
      description: 'Get notified about events you care about',
      gradient: ['#FFD93D', '#FFE066'],
    },
    {
      icon: '📱',
      title: 'Cross-Platform',
      description: 'Access from web, iOS, or Android seamlessly',
      gradient: ['#95E1D3', '#ADE8DC'],
    },
  ];

  return (
    <>
      <Text style={styles.sectionTitle}>Everything you need</Text>
      <Text style={styles.sectionSubtitle}>
        Powerful features designed for student life
      </Text>

      <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} index={index} />
        ))}
      </View>
    </>
  );
};

const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  gradient: string[];
  index: number;
}> = ({ icon, title, description, gradient, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.featureIconWrapper, { backgroundColor: gradient[0] + '15' }]}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </Animated.View>
  );
};

const StatsDisplay = () => {
  const stats = [
    { value: '1,000+', label: 'Active Students' },
    { value: '500+', label: 'Events Monthly' },
    { value: '50+', label: 'Campus Clubs' },
    { value: '98%', label: 'Satisfaction' },
  ];

  return (
    <View style={styles.statsContainer}>
      {stats.map((stat, index) => (
        <AnimatedStat key={index} {...stat} delay={index * 150} />
      ))}
    </View>
  );
};

const AnimatedStat: React.FC<{
  value: string;
  label: string;
  delay: number;
}> = ({ value, label, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
};

const FinalCTA = () => {
  return (
    <View style={styles.finalCTAContainer}>
      <Text style={styles.finalCTATitle}>
        Ready to transform your campus experience?
      </Text>
      <Text style={styles.finalCTASubtitle}>
        Join thousands of students already using Universify
      </Text>
      <TouchableOpacity
        style={styles.finalCTAButton}
        onPress={() => router.push('/(auth)/signup')}
        activeOpacity={0.9}
      >
        <Text style={styles.finalCTAButtonText}>Get Started Free</Text>
      </TouchableOpacity>
      <Text style={styles.footer}>
        Made with ❤️ for students • © 2025 Universify
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4F3',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E4F3',
  },
  loadingLogo: {
    fontSize: 64,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#E8E4F3',
  },
  blob: {
    position: 'absolute',
    borderRadius: 1000,
  },
  blob1: {
    width: 800,
    height: 800,
    backgroundColor: '#FF7A6B',
    opacity: 0.7,
    top: -100,
    left: -300,
  },
  blob2: {
    width: 700,
    height: 700,
    backgroundColor: '#FF9B8F',
    opacity: 0.6,
    top: 100,
    left: -200,
  },
  hero: {
    minHeight: height * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 900,
    width: '100%',
  },
  logoSection: {
    marginBottom: 40,
  },
  logoIcon: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  starPetal: {
    position: 'absolute',
    width: 28,
    height: 28,
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
  },
  starPetalTop: {
    top: 0,
    left: 18,
  },
  starPetalRight: {
    top: 18,
    right: 0,
  },
  starPetalBottom: {
    bottom: 0,
    left: 18,
  },
  starPetalLeft: {
    top: 18,
    left: 0,
  },
  starCenter: {
    width: 20,
    height: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    position: 'absolute',
    top: 22,
    left: 22,
  },
  headline: {
    fontSize: 72,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -2,
  },
  headlineMobile: {
    fontSize: 48,
  },
  brandHeadline: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -2,
  },
  brandHeadlineMobile: {
    fontSize: 48,
  },
  subheadline: {
    fontSize: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 34,
    maxWidth: 700,
  },
  subheadlineMobile: {
    fontSize: 18,
    lineHeight: 28,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
    ...Platform.select({
      web: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      default: {
        elevation: 12,
      },
    }),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
  },
  trustIndicators: {
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustIcon: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trustText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  featuresSection: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  sectionSubtitle: {
    fontSize: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 64,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  featuresGridDesktop: {
    gap: 32,
  },
  featureCard: {
    width: width > 768 ? 360 : width - 48,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      default: {
        elevation: 3,
      },
    }),
  },
  featureIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIcon: {
    fontSize: 36,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  statsSection: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 48,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  statCard: {
    alignItems: 'center',
    minWidth: 160,
  },
  statValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FF6B6B',
    marginBottom: 8,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  ctaSection: {
    paddingVertical: 120,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  finalCTAContainer: {
    alignItems: 'center',
    maxWidth: 800,
    alignSelf: 'center',
  },
  finalCTATitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -1,
  },
  finalCTASubtitle: {
    fontSize: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
  },
  finalCTAButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 56,
    paddingVertical: 22,
    borderRadius: 16,
    ...Platform.select({
      web: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      default: {
        elevation: 12,
      },
    }),
  },
  finalCTAButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 48,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
