'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export function useRealtimePriceTiers(itemId: number | null) {
  const { user } = useAuth();
  const supabase = createClient();
  const [priceTiers, setPriceTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<any>(null);

  // Fetch initial price tiers
  const fetchPriceTiers = useCallback(async () => {
    if (!user || !itemId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('price_tiers')
        .select('*')
        .eq('item_id', itemId)
        .order('quantity', { ascending: true });

      if (error) throw error;
      setPriceTiers(data || []);
    } catch (err) {
      console.error('[v0] Error fetching price tiers:', err);
      setPriceTiers([]);
    } finally {
      setLoading(false);
    }
  }, [user, itemId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !itemId) return;

    fetchPriceTiers();

    // Subscribe to price_tiers changes for this item
    const subscription = supabase
      .channel(`price_tiers:item_id=eq.${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_tiers',
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          console.log('[v0] Price tier change received:', payload);
          setIsConnected(true);

          if (payload.eventType === 'INSERT') {
            setPriceTiers(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setPriceTiers(prev =>
              prev.map(tier => (tier.id === payload.new.id ? payload.new : tier))
            );
          } else if (payload.eventType === 'DELETE') {
            setPriceTiers(prev => prev.filter(tier => tier.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('[v0] Price tier subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
    };
  }, [user, itemId, fetchPriceTiers]);

  return {
    priceTiers,
    loading,
    isConnected,
    refetch: fetchPriceTiers,
  };
}
