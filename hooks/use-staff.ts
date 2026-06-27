'use client';

import { useCallback, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth, UserPermissions, DEFAULT_WORKER_PERMISSIONS } from '@/providers/auth-provider';
import { hashPassword } from '@/lib/password-utils';
import type { Database } from '@/lib/db-supabase-types';
import { hashPassword } from '@/lib/password-utils';

type StaffUser = Database['public']['Tables']['users']['Row'] & {
  permissions?: UserPermissions;
};

export function useStaff() {
  const { user, currentShopId } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const fetchStaff = useCallback(async () => {
    if (!currentShopId || user?.role !== 'owner') return;
    
    setIsLoading(true);
    try {
      const { data: users } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('shop_id', currentShopId)
        .eq('role', 'worker')
        .order('created_at', { ascending: false });
      
      if (users) {
        // Fetch permissions for each user
        const staffWithPermissions = await Promise.all(
          users.map(async (staffUser: StaffUser) => {
            try {
              const { data: userRole } = await (supabase as any)
                .from('user_roles')
                .select('permissions')
                .eq('user_id', staffUser.id)
                .eq('shop_id', currentShopId)
                .single();
                
              return {
                ...staffUser,
                permissions: userRole?.permissions || DEFAULT_WORKER_PERMISSIONS
              };
            } catch {
              return {
                ...staffUser,
                permissions: DEFAULT_WORKER_PERMISSIONS
              };
            }
          })
        );
        
        setStaff(staffWithPermissions);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentShopId, user?.role, supabase]);

  const addStaff = useCallback(async (username: string, password: string) => {
    if (!currentShopId || user?.role !== 'owner') return;
    
    try {
      const { data: newUser } = await (supabase as any)
        .from('users')
        .insert({
          shop_id: currentShopId,
          username,
          password,
          role: 'worker',
        })
        .select('*')
        .single();
      
      if (newUser) {
        // Add default permissions
        await (supabase as any)
          .from('user_roles')
          .insert({
            user_id: newUser.id,
            shop_id: currentShopId,
            role: 'worker',
            permissions: DEFAULT_WORKER_PERMISSIONS,
          });
        
        await fetchStaff();
      }
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  }, [currentShopId, user?.role, supabase, fetchStaff]);

  const updateStaff = useCallback(async (userId: number, username: string, password: string) => {
    if (!currentShopId || user?.role !== 'owner') return;
    
    try {
      const updateData: any = {};
      if (username) updateData.username = username;
      if (password) updateData.password = password;
      
      await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', userId);
      
      await fetchStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  }, [currentShopId, user?.role, supabase, fetchStaff]);

  const updateStaffPermissions = useCallback(async (userId: number, permissions: UserPermissions) => {
    if (!currentShopId || user?.role !== 'owner') return;
    
    try {
      // Check if user role exists
      const { data: existingRole } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('shop_id', currentShopId)
        .single();
      
      if (existingRole) {
        await (supabase as any)
          .from('user_roles')
          .update({ permissions })
          .eq('id', existingRole.id);
      } else {
        await (supabase as any)
          .from('user_roles')
          .insert({
            user_id: userId,
            shop_id: currentShopId,
            role: 'worker',
            permissions,
          });
      }
      
      await fetchStaff();
    } catch (error) {
      console.error('Error updating staff permissions:', error);
    }
  }, [currentShopId, user?.role, supabase, fetchStaff]);

  const removeStaff = useCallback(async (userId: number) => {
    if (!currentShopId || user?.role !== 'owner') return;
    
    try {
      // Delete user roles first
      await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('shop_id', currentShopId);
      
      // Delete user
      await (supabase as any)
        .from('users')
        .delete()
        .eq('id', userId);
      
      await fetchStaff();
    } catch (error) {
      console.error('Error removing staff:', error);
    }
  }, [currentShopId, user?.role, supabase, fetchStaff]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return {
    staff,
    isLoading,
    addStaff,
    updateStaff,
    updateStaffPermissions,
    removeStaff,
    refreshStaff: fetchStaff,
  };
}
}
    refreshStaff: fetchStaff,
  };
}
