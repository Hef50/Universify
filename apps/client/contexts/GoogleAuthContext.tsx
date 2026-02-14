import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import type { Session } from '@supabase/supabase-js';

const ALLOWED_EMAIL_DOMAINS = ['andrew.cmu.edu', 'cmu.edu'];
const CMU_ERROR_MESSAGE =
  'This app is for CMU students only. Please sign in with your @andrew.cmu.edu account.';

function isCmuEmail(email: string | undefined): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? ALLOWED_EMAIL_DOMAINS.includes(domain) : false;
}

interface GoogleAuthContextType {
  isGoogleAuthenticated: boolean;
  isLoading: boolean;
  googleSession: Session | null;
  providerToken: string | null;
  googleSignIn: () => Promise<void>;
  googleSignOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  error: string | null;
  clearError: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

const GOOGLE_AUTH_STORAGE_KEY = 'universify_google_auth';

export const GoogleAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [googleSession, setGoogleSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  // Supabase refreshSession/TOKEN_REFRESHED strip provider_token; cache it so we don't lose it
  const providerTokenRef = useRef<string | null>(null);

  const setError = (msg: string | null) => {
    setErrorState(msg);
  };

  const clearError = () => setErrorState(null);

  // Load session on mount and listen for auth state changes
  useEffect(() => {
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email && !isCmuEmail(session.user.email)) {
        await supabase.auth.signOut();
        setGoogleSession(null);
        providerTokenRef.current = null;
        setError(CMU_ERROR_MESSAGE);
        setIsLoading(false);
        return;
      }

      // #region agent log
      if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/6ce6a0bd-b1d8-4a58-95c8-c0ef781b168b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GoogleAuthContext.tsx:onAuthStateChange',message:'Session from onAuthStateChange',data:{hasSession:!!session,hasProviderToken:!!session?.provider_token},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (session?.provider_token) providerTokenRef.current = session.provider_token;
      if (!session) providerTokenRef.current = null;
      setGoogleSession(session);
      setError(null);

      if (session) {
        storage.setItem(GOOGLE_AUTH_STORAGE_KEY, JSON.stringify({
          access_token: session.access_token,
          provider_token: session.provider_token,
          expires_at: session.expires_at,
        })).catch((err) => console.error('Failed to store Google auth session:', err));
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error loading session:', sessionError);
        setError(sessionError.message);
        return;
      }

      if (session?.user?.email && !isCmuEmail(session.user.email)) {
        await supabase.auth.signOut();
        setGoogleSession(null);
        providerTokenRef.current = null;
        setError(CMU_ERROR_MESSAGE);
        return;
      }

      if (session?.provider_token) providerTokenRef.current = session.provider_token;
      setGoogleSession(session);
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

      const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/callback`
        : undefined;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: redirectUrl,
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
        providerTokenRef.current = null;
        storage.removeItem(GOOGLE_AUTH_STORAGE_KEY).catch((err) => console.error('Failed to clear stored session:', err));
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
      
      // #region agent log
      if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7249/ingest/6ce6a0bd-b1d8-4a58-95c8-c0ef781b168b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'GoogleAuthContext.tsx:refreshSession',message:'refreshSession returned',data:{hasSession:!!session,hasProviderToken:!!session?.provider_token},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      setGoogleSession(session);
      return session;
    } catch (err) {
      console.error('Session refresh exception:', err);
      return null;
    }
  };

  // Session may be overwritten by refresh without provider_token; use ref as fallback
  const providerToken = googleSession?.provider_token ?? providerTokenRef.current ?? null;

  const value: GoogleAuthContextType = {
    isGoogleAuthenticated: !!googleSession,
    isLoading,
    googleSession,
    providerToken,
    googleSignIn,
    googleSignOut,
    refreshSession,
    error,
    clearError,
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

