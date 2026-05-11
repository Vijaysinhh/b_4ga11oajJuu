'use client';

import React from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/providers/supabase-auth-provider';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}

export function useAuth() {
  return useSupabaseAuth();
}
