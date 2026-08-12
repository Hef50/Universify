import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

export default function LoginScreen() {
  const { isLoading, error } = useAuth();
  const { googleSignIn, isLoading: isGoogleLoading } = useGoogleAuth();
  const { isMobile } = useResponsive();
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  const handleGoogleSignIn = async () => {
    await googleSignIn();
    // On success, onAuthStateChange will set session; tabs layout redirects to /(tabs)
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
          <Text style={styles.wordmark}>
            CMU<Text style={styles.wordmarkAccent}>nify</Text>
          </Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in with your CMU account</Text>
          <Text style={styles.cmuHint}>Use your @andrew.cmu.edu or @cmu.edu email</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>New to CMUnify? </Text>
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
          >
            <Text style={styles.signupLink}>Sign up with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
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
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 3,
    },
    cardMobile: {
      padding: 24,
      borderRadius: 14,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    wordmark: {
      fontSize: 22 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
      marginBottom: 20,
    },
    wordmarkAccent: {
      color: colors.primary,
    },
    title: {
      fontSize: 26 * fontScale,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16 * fontScale,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    cmuHint: {
      fontSize: 13 * fontScale,
      color: colors.textTertiary,
    },
    errorContainer: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14 * fontScale,
      textAlign: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    googleButton: {
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    googleIcon: {
      fontSize: 20,
      marginRight: 8,
      fontWeight: 'bold',
      color: '#4285F4',
    },
    googleButtonText: {
      color: colors.textPrimary,
      fontSize: 16 * fontScale,
      fontWeight: '600',
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    signupText: {
      fontSize: 14 * fontScale,
      color: colors.textSecondary,
    },
    signupLink: {
      fontSize: 14 * fontScale,
      color: colors.primary,
      fontWeight: '600',
    },
  });
