"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase";
import type { Database } from "@/lib/db-supabase-types";
import { isBrowserOnline } from "@/lib/offline-sync";
import { getAuthCredentials } from "@/lib/auth-config";

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

export const FULL_PERMISSIONS: UserPermissions = {
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

// Convert Supabase types to match our old User/Shop types
export type User = Database["public"]["Tables"]["users"]["Row"] & {
  createdAt?: number;
  updatedAt?: number;
  shopId?: number | null;
  permissions?: UserPermissions;
};

export type Shop = Database["public"]["Tables"]["shops"]["Row"] & {
  createdAt?: number;
  updatedAt?: number;
  ownerName?: string;
  shopName?: string;
  phoneNumber?: string;
  isPaused?: boolean;
  subscriptionEndDate?: number;
  lastPaymentDate?: number;
};

type PermissionRole = User["role"] | string | null | undefined;

function toPermissionPatch(value: unknown): Partial<UserPermissions> | null {
  if (!value || typeof value !== "object") return null;
  return value as Partial<UserPermissions>;
}

export function normalizeUserPermissions(
  role: PermissionRole,
  permissions?: Partial<UserPermissions> | null,
): UserPermissions {
  if (role === "owner" || role === "super_admin") {
    return { ...FULL_PERMISSIONS };
  }

  return {
    ...DEFAULT_WORKER_PERMISSIONS,
    ...(permissions || {}),
    canManageStaff: false,
  };
}

export function getUserLandingPath(
  user: Pick<User, "role" | "permissions"> | null,
): string {
  if (!user) return "/login";
  if (user.role === "super_admin") return "/super-admin";
  if (user.role === "owner") return "/dashboard";

  const permissions = normalizeUserPermissions(user.role, user.permissions);
  if (permissions.canViewDashboard) return "/dashboard";
  if (permissions.canCreateSales || permissions.canViewSales) return "/sales";
  if (permissions.canViewItems) return "/items";
  if (permissions.canViewUdhari) return "/udhari";
  return "/sales";
}

export function canUserAccessPath(
  user: Pick<User, "role" | "permissions"> | null,
  pathname: string | null | undefined,
): boolean {
  if (!pathname || pathname === "/") return true;
  if (pathname.startsWith("/login")) return true;
  if (!user) return false;

  if (user.role === "super_admin") {
    return (
      pathname.startsWith("/super-admin") || pathname.startsWith("/profile")
    );
  }

  if (user.role === "owner") {
    return !pathname.startsWith("/super-admin");
  }

  const permissions = normalizeUserPermissions(user.role, user.permissions);
  if (pathname.startsWith("/profile")) return true;
  if (pathname.startsWith("/dashboard")) return permissions.canViewDashboard;
  if (pathname.startsWith("/sales"))
    return permissions.canCreateSales || permissions.canViewSales;
  if (pathname.startsWith("/items")) return permissions.canViewItems;
  if (pathname.startsWith("/udhari")) return permissions.canViewUdhari;
  if (pathname.startsWith("/reports")) return permissions.canViewReports;
  if (pathname.startsWith("/settings")) return false;
  if (pathname.startsWith("/staff") || pathname.startsWith("/super-admin"))
    return false;
  return true;
}

interface AuthContextType {
  user: User | null;
  currentShop: Shop | null;
  currentShopId: number | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
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
const mapShop = (shop: Database["public"]["Tables"]["shops"]["Row"]): Shop => ({
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
const mapUser = (user: Database["public"]["Tables"]["users"]["Row"]): User => ({
  ...user,
  createdAt: toTimestamp(user.created_at),
  updatedAt: toTimestamp(user.updated_at),
  shopId: user.shop_id,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const currentUserId = user?.id;

  // Expose current shop ID for easy access
  const currentShopId =
    currentShop?.id ?? user?.shop_id ?? user?.shopId ?? undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentShopId) {
      window.localStorage.setItem(
        "dukan-current-shop-id",
        String(currentShopId),
      );
    } else {
      window.localStorage.removeItem("dukan-current-shop-id");
    }
  }, [currentShopId]);

  // Helper to fetch user permissions
  const fetchUserPermissions = useCallback(
    async (
      userId: number,
      shopId: number | null,
      role?: PermissionRole,
    ): Promise<UserPermissions> => {
      if (!shopId || userId === 0) {
        return normalizeUserPermissions(
          role || "super_admin",
          FULL_PERMISSIONS,
        );
      }

      if (!isBrowserOnline()) {
        return normalizeUserPermissions(role, null);
      }

      try {
        const { data, error } = await (supabase as any)
          .from("user_roles")
          .select("permissions")
          .eq("user_id", userId)
          .eq("shop_id", shopId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn("Permission lookup failed, using defaults:", error);
        }

        return normalizeUserPermissions(
          role,
          toPermissionPatch(data?.permissions),
        );
      } catch (e) {
        console.warn("Permission lookup failed, using defaults:", e);
      }

      return normalizeUserPermissions(role, null);
    },
    [supabase],
  );

  // Refresh user data and permissions
  const refreshUser = useCallback(async () => {
    if (currentUserId === undefined) return;

    if (!isBrowserOnline()) {
      const savedUser = localStorage.getItem("auth_user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch {
          // Ignore invalid cached auth payload.
        }
      }
      return;
    }

    try {
      if (currentUserId === 0) {
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          const superAdminUser = {
            ...prevUser,
            permissions: normalizeUserPermissions(
              "super_admin",
              FULL_PERMISSIONS,
            ),
          };
          localStorage.setItem("auth_user", JSON.stringify(superAdminUser));
          return superAdminUser;
        });
        return;
      } else {
        const { data, error } = await (supabase as any)
          .from("users")
          .select("*")
          .eq("id", currentUserId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          const permissions = await fetchUserPermissions(
            data.id,
            data.shop_id,
            data.role,
          );
          const mappedUser = {
            ...mapUser(data),
            permissions,
          };
          setUser(mappedUser);
          localStorage.setItem("auth_user", JSON.stringify(mappedUser));
        }
      }
    } catch (e) {
      const savedUser = localStorage.getItem("auth_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // Ignore invalid cached auth payload.
        }
      }
    }
  }, [currentUserId, fetchUserPermissions, supabase]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setUser(null);
        setCurrentShop(null);
        localStorage.removeItem("auth_user");
        return false;
      }

      const { data, error } = await (supabase as any)
        .from("users")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();
      if (error || !data) throw error || new Error("Missing user profile");

      const permissions = await fetchUserPermissions(data.id, data.shop_id, data.role);
      const mappedUser = { ...mapUser(data), permissions };
      setUser(mappedUser);
      localStorage.setItem("auth_user", JSON.stringify(mappedUser));

      if (data.shop_id) {
        const { data: shop, error: shopError } = await (supabase as any)
          .from("shops")
          .select("*")
          .eq("id", data.shop_id)
          .single();
        if (shopError) throw shopError;
        setCurrentShop(shop ? mapShop(shop) : null);
      } else {
        setCurrentShop(null);
      }
      return true;
    } catch (e) {
      console.error("Unable to load authenticated profile:", e);
      setUser(null);
      setCurrentShop(null);
      localStorage.removeItem("auth_user");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserPermissions, supabase]);

  useEffect(() => {
    void checkAuth();
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void checkAuth(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [checkAuth, supabase]);

  // Listen for realtime changes to user_roles and users for current user
  useEffect(() => {
    if (!user || user.id === 0 || !currentShopId) return;

    const userRolesChannel = supabase
      .channel(`user_roles:${user.id}:${currentShopId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refreshUser();
        },
      )
      .subscribe();

    const usersChannel = supabase
      .channel(`users:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        () => {
          void refreshUser();
        },
      )
      .subscribe();

    return () => {
      userRolesChannel.unsubscribe();
      usersChannel.unsubscribe();
    };
  }, [currentShopId, refreshUser, supabase, user?.id]);

  // Realtime is best-effort; this keeps staff permissions fresh even when
  // Supabase realtime is disabled for the table or the browser missed an event.
  useEffect(() => {
    if (!user || user.id === 0) return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "hidden" && isBrowserOnline()) {
        void refreshUser();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, 15000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshUser, user?.id]);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword(
          getAuthCredentials(username, password),
        );
        if (error) return { success: false, error: "Invalid login credentials" };
        const profileLoaded = await checkAuth();
        if (!profileLoaded) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: "Login exists, but its shop profile is missing. Contact the administrator.",
          };
        }
        return { success: true };
      } catch (e) {
        console.error("Login error:", e);
        return { success: false, error: "An error occurred" };
      }
    },
    [checkAuth, supabase],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentShop(null);
    localStorage.removeItem("auth_user");
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        currentShop,
        currentShopId,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
