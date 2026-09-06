'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { createClient } from '@/lib/supabase';
import { QrCodeGenerator } from './QrCodeGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type GateStatus = 'checking' | 'active' | 'dueSoon' | 'overdueGrace' | 'locked';

interface SubscriptionCheckProps {
  children: React.ReactNode;
}

function parseDateToTs(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : undefined;
}

export function SubscriptionCheck({ children }: SubscriptionCheckProps) {
  const { user, currentShop, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<GateStatus>('checking');
  const [shopName, setShopName] = useState<string>('');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const shouldRun = useMemo(() => {
    if (!user) return false;
    if (user.role === 'super_admin') return false;
    if (!currentShop?.id) return false;
    if (pathname?.startsWith('/login')) return false;
    if (pathname?.startsWith('/super-admin')) return false;
    return true;
  }, [currentShop?.id, pathname, user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!shouldRun) {
        setStatus('active');
        return;
      }

      setStatus('checking');

      const shopId = currentShop!.id;

      const [{ data: shop, error: shopError }, { data: paymentInfo, error: paymentError }] =
        await Promise.all([
          (supabase as any).from('shops').select('*').eq('id', shopId).single(),
          (supabase as any).from('shop_payment_info').select('*').eq('shop_id', shopId).single(),
        ]);

      if (cancelled) return;

      if (shopError) {
        setStatus('active');
        return;
      }

      const endTs = parseDateToTs(shop?.subscription_end_date);
      setShopName(shop?.shop_name || '');

      if (!paymentError) {
        setQrImageUrl(paymentInfo?.qr_code_url || null);
      } else {
        setQrImageUrl(null);
      }

      const now = Date.now();
      const isPaused = !!shop?.is_paused;
      const todayDate = new Date().getDate();

      if (isPaused) {
        setStatus('locked');
        return;
      }

      if (!endTs) {
        setStatus('locked');
        return;
      }

      if (now <= endTs) {
        const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
        setStatus(endTs - now <= twoDaysMs ? 'dueSoon' : 'active');
        return;
      }

      if (todayDate >= 4) {
        setStatus('locked');
        (supabase as any).from('shops').update({ is_paused: true }).eq('id', shopId);
        return;
      }

      setStatus('overdueGrace');
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentShop, shouldRun, supabase]);

  if (!shouldRun) return <>{children}</>;

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking subscription…</p>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Required</h1>
          <p className="text-gray-600 mb-6">Pay ₹299 to continue using Dukan.</p>
          <div className="mb-6">
            <QrCodeGenerator qrImageUrl={qrImageUrl} amount={299} name={shopName || 'Dukan'} note="Monthly Subscription" />
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">After payment, contact admin to activate your account.</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await logout();
                router.push('/login/superadmin');
              }}
            >
              Super Admin Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const bannerTone = status === 'overdueGrace' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-blue-50 border-blue-200 text-blue-900';
  const bannerTitle = status === 'overdueGrace' ? 'Subscription overdue (grace period until 4th)' : 'Subscription due soon';
  const bannerDesc = status === 'overdueGrace'
    ? 'Pay ₹299 now to avoid pause on 4th.'
    : 'Pay ₹299 before month end to avoid interruption.';

  // Always render the banner if needed, and wrap everything properly
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === 'main') {
          return React.cloneElement(child as React.ReactElement<any>, {
            children: (
              <>
                {status === 'dueSoon' || status === 'overdueGrace' ? (
                  <div className={`border ${bannerTone} rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3`}>
                    <div className="min-w-0">
                      <div className="font-semibold">{bannerTitle}</div>
                      <div className="text-sm opacity-90">{bannerDesc}</div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">Pay ₹299</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pay Subscription</DialogTitle>
                        </DialogHeader>
                        <QrCodeGenerator qrImageUrl={qrImageUrl} amount={299} name={shopName || 'Dukan'} note="Monthly Subscription" />
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : null}
                {(child as React.ReactElement<any>).props.children}
              </>
            ),
          });
        }
        return child;
      })}
    </>
  );
}
