'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/db-supabase-types';

// Convert Supabase types to match our old User/Shop types
type User = Database['public']['Tables']['users']['Row'] & {
  createdAt?: number;
  updatedAt?: number;
  shopId?: number | null;
};

type Shop = Database['public']['Tables']['shops']['Row'] & {
  createdAt?: number;
  updatedAt?: number;
  ownerName?: string;
  shopName?: string;
  phoneNumber?: string;
  isPaused?: boolean;
};

interface AuthContextType {
  user: User | null;
  currentShop: Shop | null;
  currentShopId: number | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert Supabase timestamps
const toTimestamp = (dateStr: string | null): number => {
  if (!dateStr) return Date.now();
  return new Date(dateStr).getTime();
};

// Helper to map Supabase shop to local format
const mapShop = (shop: Database['public']['Tables']['shops']['Row']): Shop => ({
  ...shop,
  createdAt: toTimestamp(shop.created_at),
  updatedAt: toTimestamp(shop.updated_at),
  ownerName: shop.owner_name,
  shopName: shop.shop_name,
  phoneNumber: shop.phone_number,
  isPaused: shop.is_paused,
});

// Helper to map Supabase user to local format
const mapUser = (user: Database['public']['Tables']['users']['Row']): User => ({
  ...user,
  createdAt: toTimestamp(user.created_at),
  updatedAt: toTimestamp(user.updated_at),
  shopId: user.shop_id,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Expose current shop ID for easy access
  const currentShopId = currentShop?.id;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        
        // Check if user exists in Supabase
        if (parsedUser.id === 0) {
          // Super admin
          setUser(parsedUser);
        } else {
          const { data } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', parsedUser.id)
            .single();
            
          if (data) {
            const mappedUser = mapUser(data);
            setUser(mappedUser);
            
            if (data.shop_id) {
              const { data: shop } = await (supabase as any)
                .from('shops')
                .select('*')
                .eq('id', data.shop_id)
                .single();
              
              if (shop) {
                setCurrentShop(mapShop(shop));
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    try {
      // First, check if it's a super admin
    if (username === 'vijaysinhjadhav23@gmail.com' && password === 'Vijaysinh@23') {
      const superAdminUser: User = {
        id: 0,
        shop_id: null,
        username: 'vijaysinhjadhav23@gmail.com',
        password: 'Vijaysinh@23',
        role: 'super_admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
        setUser(superAdminUser);
        localStorage.setItem('auth_user', JSON.stringify(superAdminUser));
        return { success: true };
      }

      // Check if it's a shop owner (login via shop phone and password)
      const { data: shops } = await (supabase as any)
        .from('shops')
        .select('*')
        .eq('phone_number', username)
        .eq('password', password);
      
      const shop = shops?.[0];
      if (shop) {
        // Check if owner user exists, if not create one
        const { data: existingUsers } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('shop_id', shop.id)
          .eq('role', 'owner');
          
        let ownerUser = existingUsers?.[0];
        
        if (!ownerUser) {
          const { data: newUser } = await (supabase as any)
            .from('users')
            .insert({
              shop_id: shop.id,
              username: shop.owner_name,
              password: password,
              role: 'owner',
            })
            .select('*')
            .single();
          ownerUser = newUser || undefined;
        }
        
        if (ownerUser) {
          const mappedUser = mapUser(ownerUser);
          const mappedShop = mapShop(shop);
          setUser(mappedUser);
          setCurrentShop(mappedShop);
          localStorage.setItem('auth_user', JSON.stringify(mappedUser));
          return { success: true };
        }
      }

      // Check for workers
      const { data: users } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('role', 'worker');
      
      const worker = users?.[0];
      if (worker) {
        const mappedUser = mapUser(worker);
        setUser(mappedUser);
        
        if (worker.shop_id) {
          const { data: shop } = await (supabase as any)
            .from('shops')
            .select('*')
            .eq('id', worker.shop_id)
            .single();
            
          if (shop) {
            setCurrentShop(mapShop(shop));
          }
        }
        
        localStorage.setItem('auth_user', JSON.stringify(mappedUser));
        return { success: true };
      }

      return { success: false, error: 'Invalid username or password' };
    } catch (e) {
      console.error('Login error:', e);
      return { success: false, error: 'An error occurred' };
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    setUser(null);
    setCurrentShop(null);
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      currentShop,
      currentShopId,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
