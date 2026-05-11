'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEMO_USER_ID, syncToSupabase } from '@/lib/supabase-sync';

interface User {
  id: string;
  username: string;
  shopName?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Set a timeout for auth initialization (5 seconds max)
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[v0] Auth initialization timeout - forcing completion');
        setLoading(false);
      }
    }, 5000);
    
    try {
      // Check if user is logged in from localStorage (demo mode)
      const storedUser = localStorage.getItem('user');
      if (storedUser && mounted) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('[v0] User loaded from storage:', parsedUser.username);
        } catch (error) {
          console.error('[v0] Failed to parse stored user:', error);
          localStorage.removeItem('user');
          document.cookie = 'authToken=; path=/; max-age=0';
        }
      }
      
      // Set loading to false immediately for demo users
      if (mounted) {
        setLoading(false);
      }
    } catch (error) {
      console.error('[v0] Auth initialization error:', error);
      if (mounted) {
        setLoading(false);
      }
    }
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const login = async (username: string, password: string) => {
    // Clear previous errors
    
    // Support hardcoded demo credentials for testing
    if (username === 'Bharat' && password === 'Bharat@71') {
      const userData: User = {
        id: DEMO_USER_ID, // Use fixed demo user ID for all devices
        username: 'Bharat',
        shopName: 'Bharat Kirana Store',
      };
      
      try {
        // Set auth token in cookie with proper flags
        const token = 'token-' + Date.now();
        document.cookie = `authToken=${token}; path=/; max-age=86400; SameSite=Strict; Secure`;
        
        // Verify cookie was set before proceeding
        const cookieVerified = document.cookie.includes(`authToken=${token}`);
        if (!cookieVerified) {
          console.warn('[v0] Cookie may not have been set immediately');
        }
        
        // Then update user state
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Sync this device's data with Supabase cloud
        // This ensures all devices see the same data
        await syncToSupabase(DEMO_USER_ID).catch(err => {
          console.warn('[v0] Supabase sync warning:', err);
          // Don't fail login if sync fails - allow offline usage
        });
        
        // Return immediately - cookie is already set
        return Promise.resolve();
      } catch (error) {
        console.error('[v0] Login error:', error);
        setUser(null);
        localStorage.removeItem('user');
        document.cookie = 'authToken=; path=/; max-age=0';
        return Promise.reject(new Error('Login failed. Please try again.'));
      }
    } else {
      console.warn('[v0] Invalid login attempt with username:', username);
      return Promise.reject(new Error('Invalid username or password. Use Bharat / Bharat@71'));
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    document.cookie = 'authToken=; path=/; max-age=0';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

