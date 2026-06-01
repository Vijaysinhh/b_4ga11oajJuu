"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user?.role === "super_admin") {
      router.replace("/super-admin");
    } else if (user?.role === "worker") {
      router.replace("/sales");
    } else {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-lg font-medium">{t("loading_dukan")}</p>
    </div>
  );
}
