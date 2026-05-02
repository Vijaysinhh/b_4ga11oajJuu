'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-sync';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

interface RealtimeOptions {
  tableName: string;
  onInsert?: (data: any) => void;
  onUpdate?: (data: any) => void;
  onDelete?: (data: any) => void;
}

/**
 * Hook for real-time data synchronization across devices
 * Automatically syncs items, categories, units, and other data
 * Changes on one device instantly appear on all other connected devices
 */
export function useRealtimeSubscription(options: RealtimeOptions) {
  const { session } = useSupabaseAuth();
  const subscriptionRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setIsConnected(false);
      return;
    }

    let mounted = true;

    const setupSubscription = async () => {
      try {
        // Unsubscribe from previous subscription
        if (subscriptionRef.current) {
          await supabase.removeChannel(subscriptionRef.current);
        }

        // Subscribe to real-time changes
        const subscription = supabase
          .channel(`${options.tableName}:${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: options.tableName,
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              if (mounted && options.onInsert) {
                console.log('[v0] Real-time INSERT:', payload.new);
                options.onInsert(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: options.tableName,
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              if (mounted && options.onUpdate) {
                console.log('[v0] Real-time UPDATE:', payload.new);
                options.onUpdate(payload.new);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: options.tableName,
              filter: `user_id=eq.${session.user.id}`,
            },
            (payload) => {
              if (mounted && options.onDelete) {
                console.log('[v0] Real-time DELETE:', payload.old);
                options.onDelete(payload.old);
              }
            }
          )
          .subscribe((status) => {
            if (mounted) {
              setIsConnected(status === 'SUBSCRIBED');
              console.log(`[v0] Real-time subscription status: ${status}`);
            }
          });

        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('[v0] Subscription setup error:', error);
        if (mounted) {
          setIsConnected(false);
        }
      }
    };

    setupSubscription();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [session?.user.id, options.tableName, supabase, options]);

  return { isConnected };
}
