'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, syncUserData } from '@/lib/supabase-sync';
import type { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  username: string;
  shopName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MIDDLEWARE_AUTH_COOKIE = 'authToken';

function setMiddlewareAuthCookie(session: Session | null) {
  if (typeof document === 'undefined') {
    return;
  }

  if (!session) {
    document.cookie = `${MIDDLEWARE_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const maxAge = session.expires_at ? Math.max(session.expires_at - now, 0) : session.expires_in || 86400;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${MIDDLEWARE_AUTH_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from Supabase
  useEffect(() => {
    let mounted = true;
    let initialized = false;
    let unsubscribe: (() => void) | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(currentSession);
          setMiddlewareAuthCookie(currentSession);
          
          if (currentSession?.user) {
            setUser({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              username: currentSession.user.user_metadata?.username || 'User',
              shopName: currentSession.user.user_metadata?.shopName || 'My Shop',
            });

            await syncUserData(currentSession.user.id).catch((error) => {
              console.warn('[v0] Failed to synchronize user data after session restore:', error);
            });
          }
        }

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            setSession(newSession);
            setMiddlewareAuthCookie(newSession);
            
            if (newSession?.user) {
              setUser({
                id: newSession.user.id,
                email: newSession.user.email || '',
                username: newSession.user.user_metadata?.username || 'User',
                shopName: newSession.user.user_metadata?.shopName || 'My Shop',
              });

              syncUserData(newSession.user.id).catch((error) => {
                console.warn('[v0] Failed to synchronize user data after auth state change:', error);
              });
            } else {
              setUser(null);
            }
          }
        });

        unsubscribe = subscription?.unsubscribe;
      } catch (error) {
        console.error('[v0] Auth initialization error:', error);
      } finally {
        initialized = true;
        clearTimeout(timeout);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    timeout = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn('[v0] Auth initialization timeout');
        setLoading(false);
      }
    }, 5000);

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [supabase]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session?.user) {
        setMiddlewareAuthCookie(data.session);
        setSession(data.session);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          username: data.session.user.user_metadata?.username || email.split('@')[0],
          shopName: data.session.user.user_metadata?.shopName || 'My Shop',
        });

        await syncUserData(data.session.user.id).catch((error) => {
          console.warn('[v0] Failed to synchronize user data after login:', error);
        });

        console.log('[v0] Login successful:', email);
      }
    } catch (error) {
      console.error('[v0] Login error:', error);
      setUser(null);
      setSession(null);
      setMiddlewareAuthCookie(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      setUser(null);
      setSession(null);
      setMiddlewareAuthCookie(null);
      console.log('[v0] Logout successful');
    } catch (error) {
      console.error('[v0] Logout error:', error);
      setMiddlewareAuthCookie(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
}
