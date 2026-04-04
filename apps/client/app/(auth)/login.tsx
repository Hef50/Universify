import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { useResponsive } from '@/hooks/useResponsive';

const SHOW_AUTO_LOGIN = __DEV__;

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const { googleSignIn, isLoading: isGoogleLoading, error: googleError } = useGoogleAuth();
  const { isMobile } = useResponsive();

  const handleGoogleSignIn = async () => {
    await googleSignIn();
  };

  const handleAutoLogin = async () => {
    const success = await login({ email: 'demo@cmu.edu', password: 'Demo123!' });
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleAdminLogin = async () => {
    const success = await login({ email: 'admin@cmu.edu', password: 'Admin123!' });
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        isMobile && styles.scrollContentMobile,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🎓</Text>
          </View>
          <Text style={styles.title}>Welcome to Universify</Text>
          <Text style={styles.subtitle}>Sign in with your CMU account</Text>
          <Text style={styles.cmuHint}>Use your @andrew.cmu.edu or @cmu.edu email</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {googleError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{googleError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.googleButton, (isGoogleLoading || isLoading) && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading || isLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {SHOW_AUTO_LOGIN && (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleAutoLogin}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Auto Login (Demo)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, isLoading && styles.buttonDisabled]}
              onPress={handleAdminLogin}
              disabled={isLoading}
            >
              <Text style={styles.adminButtonText}>Admin Demo Login</Text>
            </TouchableOpacity>
          </>
        )}

        {SHOW_AUTO_LOGIN && (
          <View style={styles.demoInfo}>
            <Text style={styles.demoTitle}>Demo Accounts:</Text>
            <Text style={styles.demoText}>demo@cmu.edu / Demo123!</Text>
            <Text style={styles.demoText}>student@andrew.cmu.edu / Student123!</Text>
            <Text style={styles.demoText}>admin@cmu.edu / Admin123! (Admin)</Text>
          </View>
        )}

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContentMobile: {
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardMobile: {
    padding: 24,
    borderRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  cmuHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleIcon: {
    fontSize: 20,
    marginRight: 8,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    height: 48,
    backgroundColor: '#4A154B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
