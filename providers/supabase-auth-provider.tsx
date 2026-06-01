'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearSupabaseAuthStorage,
  DEMO_USER_ID,
  isSupabaseConfigured,
  isSupabaseNetworkError,
  SUPABASE_UNAVAILABLE_MESSAGE,
  supabase,
  syncUserData,
} from '@/lib/supabase-sync';
import type { Session } from '@supabase/supabase-js';

interface User {
  id?: number;
  username: string;
  role: 'super_admin' | 'owner' | 'worker';
  shopId?: number;
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
const LOCAL_AUTH_STORAGE_KEY = 'user';
const LOCAL_AUTH_EMAIL = 'bharatjadhav1971@gmail.com';
const LOCAL_AUTH_PASSWORD = 'Bharat@71';
const LOCAL_AUTH_USER: User = {
  id: DEMO_USER_ID,
  email: LOCAL_AUTH_EMAIL,
  username: 'Bharat',
  shopName: 'Bharat Kirana Store',
};

function setMiddlewareAuthCookie(session: Session | null) {
  if (typeof document === 'undefined') {
    return;
  }

  if (!session) {
    document.cookie = `${MIDDLEWARE_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const maxAge = session.expires_at ? Math.max(session.expires_at - now, 0) : session.expires_in || 86400;
  
  // Use a simple value '1' as expected by proxy.js
  document.cookie = `${MIDDLEWARE_AUTH_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function setLocalAuthCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  // Use a very specific expiration to ensure it's not seen as a session cookie
  const date = new Date();
  date.setTime(date.getTime() + (24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  
  document.cookie = `${MIDDLEWARE_AUTH_COOKIE}=local; path=/; max-age=86400; SameSite=Lax${expires}`;
  console.log('[v0] Local auth cookie set');
}

function clearAuthState() {
  clearSupabaseAuthStorage();
  localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
  setMiddlewareAuthCookie(null);
  supabase.auth.stopAutoRefresh();
}

function readLocalUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedUser = localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    if (!storedUser) {
      return null;
    }

    const parsedUser = JSON.parse(storedUser) as Partial<User>;
    if (!parsedUser.id || !parsedUser.username) {
      return null;
    }

    return {
      ...LOCAL_AUTH_USER,
      ...parsedUser,
      email: parsedUser.email || LOCAL_AUTH_EMAIL,
      shopName: parsedUser.shopName || LOCAL_AUTH_USER.shopName,
    };
  } catch {
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    return null;
  }
}

function saveLocalUser() {
  localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(LOCAL_AUTH_USER));
  setLocalAuthCookie();
  return LOCAL_AUTH_USER;
}

function isLocalFallbackLogin(email: string, password: string) {
  return email.trim().toLowerCase() === LOCAL_AUTH_EMAIL && password === LOCAL_AUTH_PASSWORD;
}

function getUserFacingAuthError(error: unknown) {
  if (isSupabaseNetworkError(error)) {
    return SUPABASE_UNAVAILABLE_MESSAGE;
  }

  return error instanceof Error ? error.message : 'Invalid email or password';
}

function getUserFromSession(session: Session): User {
  const email = session.user.email || '';

  return {
    id: session.user.id,
    email,
    username: session.user.user_metadata?.username || email.split('@')[0] || 'User',
    shopName: session.user.user_metadata?.shopName || 'My Shop',
  };
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialized = false;
    let unsubscribe: (() => void) | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const initializeAuth = async () => {
      try {
        const localUser = readLocalUser();
        if (localUser && mounted) {
          console.log('[v0] Found local user session, setting state...');
          setUser(localUser);
          setLocalAuthCookie();
          // Stop loading if we have a local session
          setLoading(false);
        }

        if (!isSupabaseConfigured) {
          console.warn('[v0] Supabase is not configured.');
          if (mounted) {
            setSession(null);
            if (!localUser) {
              setUser(null);
              setMiddlewareAuthCookie(null);
            }
            setLoading(false);
          }
          return;
        }

        console.log('[v0] Fetching Supabase session...');
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (mounted) {
          if (currentSession) {
            console.log('[v0] Supabase session found');
            setSession(currentSession);
            setMiddlewareAuthCookie(currentSession);
            const restoredUser = getUserFromSession(currentSession);
            setUser(restoredUser);
            
            syncUserData(restoredUser.id, {
              email: restoredUser.email,
              shopName: restoredUser.shopName,
            }).catch(err => console.warn('[v0] Sync error:', err));
          } else if (!localUser) {
            console.log('[v0] No session found');
            setUser(null);
            setMiddlewareAuthCookie(null);
          }
          setLoading(false);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted) {
            return;
          }

          setSession(newSession);

          if (newSession?.user) {
            setMiddlewareAuthCookie(newSession);
            const nextUser = getUserFromSession(newSession);
            setUser(nextUser);

            syncUserData(nextUser.id, {
              email: nextUser.email,
              shopName: nextUser.shopName,
            }).catch((error) => {
              console.warn('[v0] Failed to synchronize user data after auth state change:', error);
            });
          } else {
            const localUser = readLocalUser();
            if (localUser) {
              setLocalAuthCookie();
              setUser(localUser);
            } else {
              setMiddlewareAuthCookie(null);
              setUser(null);
            }
          }
        });

        unsubscribe = subscription?.unsubscribe;
      } catch (error) {
        if (isSupabaseNetworkError(error)) {
          console.warn(`[v0] ${SUPABASE_UNAVAILABLE_MESSAGE}`);
          const localUser = readLocalUser();
          if (localUser && mounted) {
            setUser(localUser);
            setLocalAuthCookie();
          } else if (mounted) {
            setMiddlewareAuthCookie(null);
            setUser(null);
          }
        } else {
          console.error('[v0] Auth initialization error:', error);
        }

        if (mounted && !user) {
          setSession(null);
          setUser(readLocalUser());
        }
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
        console.warn('[v0] Auth initialization timeout. Supabase did not respond in time.');
        // Don't clear state on timeout, just stop loading
        setLoading(false);
      }
    }, 15000);

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);

      if (!isSupabaseConfigured) {
        if (isLocalFallbackLogin(email, password)) {
          setSession(null);
          setUser(saveLocalUser());
          return;
        }

        throw new Error(
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isSupabaseNetworkError(error) && isLocalFallbackLogin(email, password)) {
          setSession(null);
          setUser(saveLocalUser());
          return;
        }

        throw error;
      }

      if (data.session?.user) {
        console.log('[v0] Login successful, setting session and cookies...');
        supabase.auth.startAutoRefresh();
        setMiddlewareAuthCookie(data.session);
        setSession(data.session);

        const nextUser = getUserFromSession(data.session);
        setUser(nextUser);

        syncUserData(nextUser.id, {
          email: nextUser.email,
          shopName: nextUser.shopName,
        }).catch((error) => {
          console.warn('[v0] Failed to synchronize user data after login:', error);
        });
      }
    } catch (error) {
      if (isSupabaseNetworkError(error) && isLocalFallbackLogin(email, password)) {
        setSession(null);
        setUser(saveLocalUser());
        return;
      }

      if (!isSupabaseNetworkError(error)) {
        console.error('[v0] Login error:', error);
      }

      setUser(null);
      setSession(null);
      setMiddlewareAuthCookie(null);
      throw new Error(getUserFacingAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);

      localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
      setUser(null);
      setSession(null);
      setMiddlewareAuthCookie(null);

      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error && !isSupabaseNetworkError(error)) {
          throw error;
        }
      }
    } catch (error) {
      console.error('[v0] Logout error:', error);
      setUser(null);
      setSession(null);
      setMiddlewareAuthCookie(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
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
