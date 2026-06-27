'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/db-supabase-types';

// Define permission types
export type UserPermissions = {
  canViewDashboard: boolean;
  canViewItems: boolean;
  canManageItems: boolean;
  canViewSales: boolean;
  canCreateSales: boolean;
  canViewUdhari: boolean;
  canManageUdhari: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;
  canManageStaff: boolean;
};

// Default permissions for workers
export const DEFAULT_WORKER_PERMISSIONS: UserPermissions = {
  canViewDashboard: false,
  canViewItems: false,
  canManageItems: false,
  canViewSales: true,
  canCreateSales: true,
  canViewUdhari: false,
  canManageUdhari: false,
  canViewReports: false,
  canViewSettings: false,
  canManageStaff: false,
};

// Convert Supabase types to match our old User/Shop types
export type User = Database['public']['Tables']['users']['Row'] & {
  createdAt?: number;
  updatedAt?: number;
  shopId?: number | null;
  permissions?: UserPermissions;
};

export type Shop = Database['public']['Tables']['shops']['Row'] & {
  createdAt?: number;
  updatedAt?: number;
  ownerName?: string;
  shopName?: string;
  phoneNumber?: string;
  isPaused?: boolean;
  subscriptionEndDate?: number;
  lastPaymentDate?: number;
};

interface AuthContextType {
  user: User | null;
  currentShop: Shop | null;
  currentShopId: number | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert Supabase timestamps
const toTimestamp = (dateStr: string | null): number => {
  if (!dateStr) return Date.now();
  return new Date(dateStr).getTime();
};

const toOptionalTimestamp = (dateStr: string | null): number | undefined => {
  if (!dateStr) return undefined;
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) ? t : undefined;
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
  subscriptionEndDate: toOptionalTimestamp(shop.subscription_end_date),
  lastPaymentDate: toOptionalTimestamp(shop.last_payment_date),
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

  // Helper to fetch user permissions
  const fetchUserPermissions = async (userId: number, shopId: number | null): Promise<UserPermissions> => {
    if (!shopId || userId === 0) {
      // Super admin or no shop - full permissions
      return {
        canViewDashboard: true,
        canViewItems: true,
        canManageItems: true,
        canViewSales: true,
        canCreateSales: true,
        canViewUdhari: true,
        canManageUdhari: true,
        canViewReports: true,
        canViewSettings: true,
        canManageStaff: true,
      };
    }

    try {
      const { data } = await (supabase as any)
        .from('user_roles')
        .select('permissions')
        .eq('user_id', userId)
        .eq('shop_id', shopId)
        .single();

      if (data?.permissions) {
        return data.permissions as UserPermissions;
      }
    } catch (e) {
      console.log('No permissions found, using defaults');
    }

    // Return default permissions
    return DEFAULT_WORKER_PERMISSIONS;
  };

  // Refresh user data and permissions
  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      if (user.id === 0) {
        // Super admin
        return;
      } else {
        const { data } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (data) {
          const permissions = await fetchUserPermissions(data.id, data.shop_id);
          const mappedUser = {
            ...mapUser(data),
            permissions
          };
          setUser(mappedUser);
          localStorage.setItem('auth_user', JSON.stringify(mappedUser));
        }
      }
    } catch (e) {
      console.error('Refresh user failed:', e);
    }
  }, [user, supabase]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for realtime changes to user_roles and users for current user
  useEffect(() => {
    if (!user || user.id === 0 || !currentShopId) return;

    const userRolesChannel = supabase
      .channel(`user_roles:${user.id}:${currentShopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshUser();
        }
      )
      .subscribe();

    const usersChannel = supabase
      .channel(`users:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshUser();
        }
      )
      .subscribe();

    return () => {
      userRolesChannel.unsubscribe();
      usersChannel.unsubscribe();
    };
  }, [user, currentShopId, refreshUser, supabase]);

  const checkAuth = async () => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        
        // Check if user exists in Supabase
        if (parsedUser.id === 0) {
          // Super admin
          const superAdminWithPerms = {
            ...parsedUser,
            permissions: {
              canViewDashboard: true,
              canViewItems: true,
              canManageItems: true,
              canViewSales: true,
              canCreateSales: true,
              canViewUdhari: true,
              canManageUdhari: true,
              canViewReports: true,
              canViewSettings: true,
              canManageStaff: true,
            } as UserPermissions
          };
          setUser(superAdminWithPerms);
          // Set auth cookie if not present
          document.cookie = `authToken=token-super-${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}`;
        } else {
          const { data } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('id', parsedUser.id)
            .single();
            
          if (data) {
            const permissions = await fetchUserPermissions(data.id, data.shop_id);
            const mappedUser = {
              ...mapUser(data),
              permissions
            };
            setUser(mappedUser);
            localStorage.setItem('auth_user', JSON.stringify(mappedUser));
            // Set auth cookie if not present
            document.cookie = `authToken=token-${data.id}-${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}`;
            
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
          permissions: {
            canViewDashboard: true,
            canViewItems: true,
            canManageItems: true,
            canViewSales: true,
            canCreateSales: true,
            canViewUdhari: true,
            canManageUdhari: true,
            canViewReports: true,
            canViewSettings: true,
            canManageStaff: true,
          }
        };
        setUser(superAdminUser);
        localStorage.setItem('auth_user', JSON.stringify(superAdminUser));
        // Set auth cookie
        document.cookie = `authToken=token-super-${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}`;
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
          const permissions = {
            canViewDashboard: true,
            canViewItems: true,
            canManageItems: true,
            canViewSales: true,
            canCreateSales: true,
            canViewUdhari: true,
            canManageUdhari: true,
            canViewReports: true,
            canViewSettings: true,
            canManageStaff: true,
          } as UserPermissions;
          
          const mappedUser = {
            ...mapUser(ownerUser),
            permissions
          };
          const mappedShop = mapShop(shop);
          setUser(mappedUser);
          setCurrentShop(mappedShop);
          localStorage.setItem('auth_user', JSON.stringify(mappedUser));
          // Set auth cookie
          document.cookie = `authToken=token-${ownerUser.id}-${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}`;
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
        const permissions = await fetchUserPermissions(worker.id, worker.shop_id);
        const mappedUser = {
          ...mapUser(worker),
          permissions
        };
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
        // Set auth cookie
        document.cookie = `authToken=token-${worker.id}-${Date.now()}; path=/; max-age=${60 * 60 * 24 * 7}`;
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
    // Clear auth cookie
    document.cookie = "authToken=; path=/; max-age=0";
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
      refreshUser,
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
