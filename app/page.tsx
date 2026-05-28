'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useSupabaseAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-lg font-medium">Loading Dukan...</p>
    </div>
  );
}
