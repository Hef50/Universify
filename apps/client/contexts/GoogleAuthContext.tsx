import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface GoogleAuthContextType {
  isGoogleAuthenticated: boolean;
  isLoading: boolean;
  googleSession: Session | null;
  providerToken: string | null;
  googleSignIn: () => Promise<void>;
  googleSignOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  error: string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

// Storage keys for web
const GOOGLE_AUTH_STORAGE_KEY = 'universify_google_auth';

export const GoogleAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [googleSession, setGoogleSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session on mount
  useEffect(() => {
    loadSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setGoogleSession(session);
      if (Platform.OS === 'web' && session) {
        // Store session info in localStorage
        try {
          localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, JSON.stringify({
            access_token: session.access_token,
            provider_token: session.provider_token,
            expires_at: session.expires_at,
          }));
        } catch (err) {
          console.error('Failed to store Google auth session:', err);
        }
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error loading session:', sessionError);
        setError(sessionError.message);
      } else {
        setGoogleSession(session);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load authentication session');
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline', // Ask Google for refresh token
            prompt: 'consent', // Force Google to show the consent screen
            include_granted_scopes: 'true', // Merge with old scopes
          },
          redirectTo: Platform.OS === 'web' 
            ? (typeof window !== 'undefined' ? window.location.origin : undefined)
            : undefined,
        },
      });

      if (signInError) {
        console.error('Google sign-in error:', signInError);
        setError(signInError.message || 'Google sign-in failed');
        setIsLoading(false);
      }
      // Note: OAuth redirect will happen, so we don't set loading to false here
      // The onAuthStateChange listener will handle the session update
    } catch (err) {
      console.error('Google sign-in exception:', err);
      setError('An unexpected error occurred during sign-in');
      setIsLoading(false);
    }
  };

  const googleSignOut = async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Google sign-out error:', signOutError);
        setError(signOutError.message || 'Sign-out failed');
      } else {
        setGoogleSession(null);
        // Clear stored session
        if (Platform.OS === 'web') {
          try {
            localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
          } catch (err) {
            console.error('Failed to clear stored session:', err);
          }
        }
      }
    } catch (err) {
      console.error('Google sign-out exception:', err);
      setError('An unexpected error occurred during sign-out');
    }
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      console.log('Refreshing Google session...');
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        return null;
      }
      
      if (!session) {
        console.warn('Session refresh returned null session');
        return null;
      }
      
      console.log('Session refreshed successfully:', {
        hasAccessToken: !!session.access_token,
        hasProviderToken: !!session.provider_token,
        expiresAt: session.expires_at,
      });
      
      setGoogleSession(session);
      return session;
    } catch (err) {
      console.error('Session refresh exception:', err);
      return null;
    }
  };

  // Get provider token from session
  const providerToken = googleSession?.provider_token || null;

  const value: GoogleAuthContextType = {
    isGoogleAuthenticated: !!googleSession,
    isLoading,
    googleSession,
    providerToken,
    googleSignIn,
    googleSignOut,
    refreshSession,
    error,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = (): GoogleAuthContextType => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};

