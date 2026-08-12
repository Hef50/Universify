import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppPalette } from '@/constants/theme';

/**
 * OAuth callback route for Google sign-in.
 * When Supabase redirects after Google OAuth, the URL contains ?code=...
 * We must exchange this code for a session to get provider_token (for Calendar API).
 */
export default function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);
  const { colors, fontScale } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fontScale), [colors, fontScale]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      router.replace('/(auth)/login');
      return;
    }

    const runExchange = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(`Auth error: ${errorParam}`);
        setTimeout(() => router.replace('/(auth)/login'), 3000);
        return;
      }

      if (!code) {
        // No code - might already have session or direct visit; go to app
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
        return;
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setError(exchangeError.message);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
          return;
        }

        // Success - onAuthStateChange will update context; redirect to app
        router.replace('/(tabs)');
      } catch (err) {
        console.error('Callback exception:', err);
        setError('Failed to complete sign-in');
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      }
    };

    runExchange();
  }, []);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>Completing sign-in...</Text>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: AppPalette, fontScale: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    message: {
      marginTop: 16,
      fontSize: 16 * fontScale,
      color: colors.textSecondary,
    },
    errorText: {
      fontSize: 16 * fontScale,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
  });
