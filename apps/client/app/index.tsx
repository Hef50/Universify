import React, { useEffect, useRef, useState } from 'react';
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
      {/* Animated Background Gradient */}
      <AnimatedBackground />

      {/* Hero Section */}
      <HeroSection isMobile={isMobile} />

      {/* Floating Feature Cards */}
      <FeaturesSection isDesktop={isDesktop} />

      {/* Interactive Demo Preview */}
      <DemoSection />

      {/* Stats with Counter Animation */}
      <StatsSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <Footer />
    </ScrollView>
  );
}

const AnimatedBackground = () => {
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createFloatingAnimation = (animValue: Animated.Value, duration: number) => {
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
      createFloatingAnimation(float1, 3000),
      createFloatingAnimation(float2, 4000),
      createFloatingAnimation(float3, 5000),
    ]).start();
  }, []);

  const translateY1 = float1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const translateY2 = float2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  const translateY3 = float3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.backgroundContainer}>
      <Animated.View
        style={[
          styles.floatingCircle,
          styles.circle1,
          { transform: [{ translateY: translateY1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingCircle,
          styles.circle2,
          { transform: [{ translateY: translateY2 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingCircle,
          styles.circle3,
          { transform: [{ translateY: translateY3 }] },
        ]}
      />
    </View>
  );
};

const HeroSection: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.hero}>
      <Animated.View
        style={[
          styles.heroContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎓</Text>
          <Text style={styles.brandName}>Universify</Text>
        </View>

        <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
          Your Campus,{'\n'}
          <Text style={styles.heroTitleGradient}>All in One Place</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Discover events, connect with clubs, and never miss what's happening on campus
        </Text>

        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryCTAText}>Get Started Free</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCTA}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryCTAText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trustBadges}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✓</Text>
            <Text style={styles.badgeText}>Free Forever</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✓</Text>
            <Text style={styles.badgeText}>No Credit Card</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>✓</Text>
            <Text style={styles.badgeText}>1000+ Students</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const FeaturesSection: React.FC<{ isDesktop: boolean }> = ({ isDesktop }) => {
  const features = [
    {
      icon: '📅',
      title: 'Smart Calendar',
      description: 'See all campus events in one beautiful, unified calendar',
      color: '#FF6B6B',
    },
    {
      icon: '🔍',
      title: 'Semantic Search',
      description: 'Find exactly what you want with AI-powered search',
      color: '#8B7FFF',
    },
    {
      icon: '🎉',
      title: 'Social Events',
      description: 'Create and join casual meetups, study groups, and more',
      color: '#FF6BA8',
    },
    {
      icon: '🏛️',
      title: 'Club Hub',
      description: 'Stay connected with all your favorite campus organizations',
      color: '#4ECDC4',
    },
    {
      icon: '🔔',
      title: 'Smart Alerts',
      description: 'Get personalized notifications for events you care about',
      color: '#FFD93D',
    },
    {
      icon: '📱',
      title: 'Everywhere',
      description: 'Access from web, iOS, or Android - your choice',
      color: '#95E1D3',
    },
  ];

  return (
    <View style={styles.featuresSection}>
      <Text style={styles.sectionTitle}>Everything you need</Text>
      <Text style={styles.sectionSubtitle}>
        Powerful features to keep you connected
      </Text>

      <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} index={index} />
        ))}
      </View>
    </View>
  );
};

const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  color: string;
  index: number;
}> = ({ icon, title, description, color, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isHovered, setIsHovered] = useState(false);

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
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.featureIcon}>{icon}</Text>
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
      <View style={[styles.featureAccent, { backgroundColor: color }]} />
    </Animated.View>
  );
};

const DemoSection = () => {
  return (
    <View style={styles.demoSection}>
      <Text style={styles.sectionTitle}>See it in action</Text>
      <View style={styles.demoContainer}>
        <View style={styles.demoPlaceholder}>
          <Text style={styles.demoText}>📱</Text>
          <Text style={styles.demoSubtext}>Interactive demo coming soon</Text>
        </View>
      </View>
    </View>
  );
};

const StatsSection = () => {
  const stats = [
    { value: '1,000+', label: 'Active Students' },
    { value: '500+', label: 'Events Monthly' },
    { value: '50+', label: 'Campus Clubs' },
    { value: '98%', label: 'Satisfaction' },
  ];

  return (
    <View style={styles.statsSection}>
      {stats.map((stat, index) => (
        <AnimatedStat key={index} {...stat} delay={index * 100} />
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
      tension: 50,
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

const TestimonialsSection = () => {
  const testimonials = [
    {
      text: "Universify changed how I experience campus life. I never miss an event!",
      author: "Sarah M.",
      role: "Junior, CMU",
    },
    {
      text: "Finally, all campus events in one place. This app is a game-changer.",
      author: "Alex K.",
      role: "Sophomore, CMU",
    },
  ];

  return (
    <View style={styles.testimonialsSection}>
      <Text style={styles.sectionTitle}>Loved by students</Text>
      <View style={styles.testimonialsGrid}>
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} {...testimonial} index={index} />
        ))}
      </View>
    </View>
  );
};

const TestimonialCard: React.FC<{
  text: string;
  author: string;
  role: string;
  index: number;
}> = ({ text, author, role, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: index * 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.testimonialCard, { opacity: fadeAnim }]}>
      <Text style={styles.testimonialText}>"{text}"</Text>
      <View style={styles.testimonialAuthor}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorInitial}>{author[0]}</Text>
        </View>
        <View>
          <Text style={styles.authorName}>{author}</Text>
          <Text style={styles.authorRole}>{role}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const FinalCTA = () => {
  return (
    <View style={styles.finalCTA}>
      <Text style={styles.finalCTATitle}>Ready to transform your campus experience?</Text>
      <Text style={styles.finalCTASubtitle}>
        Join thousands of students already using Universify
      </Text>
      <TouchableOpacity
        style={styles.finalCTAButton}
        onPress={() => router.push('/(auth)/signup')}
      >
        <Text style={styles.finalCTAButtonText}>Start for Free</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
};

const Footer = () => {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerBrand}>🎓 Universify</Text>
      <Text style={styles.footerText}>Made with ❤️ for students</Text>
      <Text style={styles.footerCopyright}>© 2025 Universify. All rights reserved.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingLogo: {
    fontSize: 64,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.05,
  },
  circle1: {
    width: 400,
    height: 400,
    backgroundColor: '#FF6B6B',
    top: -200,
    left: -100,
  },
  circle2: {
    width: 300,
    height: 300,
    backgroundColor: '#8B7FFF',
    bottom: 100,
    right: -50,
  },
  circle3: {
    width: 250,
    height: 250,
    backgroundColor: '#4ECDC4',
    top: height * 0.4,
    left: width * 0.7,
  },
  hero: {
    minHeight: height * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 800,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  logoEmoji: {
    fontSize: 48,
  },
  brandName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 64,
  },
  heroTitleMobile: {
    fontSize: 40,
    lineHeight: 48,
  },
  heroTitleGradient: {
    color: '#FF6B6B',
  },
  heroSubtitle: {
    fontSize: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
    maxWidth: 600,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryCTA: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  primaryCTAText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  ctaArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryCTA: {
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  secondaryCTAText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    color: '#6BCF7F',
    fontSize: 16,
  },
  badgeText: {
    color: '#6B7280',
    fontSize: 14,
  },
  featuresSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#F8F9FA',
  },
  sectionTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
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
    width: width > 768 ? 350 : width - 48,
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 20,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      default: {
        elevation: 4,
      },
    }),
    position: 'relative',
    overflow: 'hidden',
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  featureAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  demoSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  demoContainer: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  demoPlaceholder: {
    height: 400,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  demoText: {
    fontSize: 64,
    marginBottom: 16,
  },
  demoSubtext: {
    fontSize: 18,
    color: '#6B7280',
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#1F2937',
  },
  statCard: {
    alignItems: 'center',
    minWidth: 150,
  },
  statValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  testimonialsSection: {
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  testimonialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  testimonialCard: {
    width: width > 768 ? 450 : width - 48,
    backgroundColor: '#F8F9FA',
    padding: 32,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  testimonialText: {
    fontSize: 18,
    color: '#1F2937',
    lineHeight: 28,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  authorRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  finalCTA: {
    paddingVertical: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  finalCTATitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 700,
  },
  finalCTASubtitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  finalCTAButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  finalCTAButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#1F2937',
    gap: 12,
  },
  footerBrand: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#6B7280',
  },
});
