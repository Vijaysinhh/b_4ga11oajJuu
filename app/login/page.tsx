"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { LanguageToggle } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading } = useSupabaseAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !password) {
      setErrorMsg(t("login_fill_fields"));
      return;
    }

    if (loading) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email, password);
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(t("login_success"));
      router.replace("/dashboard");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : t("error");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-lg font-medium">{t("redirecting_dashboard")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl tracking-tight">
            {t("login_title")}
          </CardTitle>
          <CardDescription>{t("login_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("enter_email")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("enter_password")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="h-11"
                required
              />
            </div>

            {errorMsg ? (
              <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            ) : null}

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? t("logging_in") : t("login")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
