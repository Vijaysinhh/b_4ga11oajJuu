"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { useLanguage } from "@/providers/language-provider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useSupabaseAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-lg font-medium">{t("loading_dukan")}</p>
    </div>
  );
}
