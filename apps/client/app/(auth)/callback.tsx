import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

/**
 * OAuth callback route for Google sign-in.
 * When Supabase redirects after Google OAuth, the URL contains ?code=...
 * We must exchange this code for a session to get provider_token (for Calendar API).
 */
export default function AuthCallbackScreen() {
  const [error, setError] = useState<string | null>(null);

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
        // #region agent log
        if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/6ce6a0bd-b1d8-4a58-95c8-c0ef781b168b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback.tsx:noCode',message:'Callback hit but no code in URL',data:{url:typeof window!=='undefined'?window.location.href:''},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        // #region agent log
        if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/6ce6a0bd-b1d8-4a58-95c8-c0ef781b168b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback.tsx:exchange',message:'After exchangeCodeForSession',data:{hasCode:!!code,hasError:!!exchangeError,hasSession:!!exchangeData?.session,hasProviderToken:!!exchangeData?.session?.provider_token},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          // #region agent log
          if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/6ce6a0bd-b1d8-4a58-95c8-c0ef781b168b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback.tsx:exchangeError',message:'Code exchange failed',data:{error:exchangeError.message},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
          // #endregion
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
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.message}>Completing sign-in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
