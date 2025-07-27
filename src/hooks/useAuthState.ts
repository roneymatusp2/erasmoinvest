import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { smartLog } from '../utils/smartLog';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

interface UseAuthStateReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  authState: AuthState;
  error: string | null;
}

export const useAuthState = (): UseAuthStateReturn => {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const checkInProgressRef = useRef(false);

  useEffect(() => {
    // Set mounted flag
    mountedRef.current = true;

    // Prevent concurrent checks
    if (checkInProgressRef.current) {
      return;
    }

    const initAuth = async () => {
      checkInProgressRef.current = true;
      
      try {
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        
        if (sessionError) {
          setAuthState('error');
          setError(sessionError.message);
          return;
        }
        
        setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
        smartLog('🔒 Initial auth check:', session?.user ? 'Authenticated' : 'Not authenticated');
        
      } catch (err) {
        if (mountedRef.current) {
          setAuthState('error');
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        checkInProgressRef.current = false;
      }
    };

    // Initial check
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      
      smartLog('🔒 Auth state change:', event);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          setAuthState('authenticated');
          setError(null);
          break;
          
        case 'SIGNED_OUT':
          setAuthState('unauthenticated');
          setError(null);
          break;
          
        case 'PASSWORD_RECOVERY':
        case 'USER_DELETED':
          setAuthState('unauthenticated');
          break;
      }
    });

    // Cleanup
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once

  return {
    isAuthenticated: authState === 'authenticated',
    isLoading: authState === 'checking',
    authState,
    error
  };
};