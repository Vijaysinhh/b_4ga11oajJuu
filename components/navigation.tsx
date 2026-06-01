'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { useLanguage } from '@/providers/language-provider';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Settings, 
  Home,
  ShoppingCart, 
  LogOut, 
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { user, logout, isAuthenticated } = useSupabaseAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = useMemo(() => [
    { href: '/dashboard', icon: Home, label: t('home') },
    { href: '/items', icon: Package, label: t('stock') },
    { href: '/udhari', icon: Users, label: t('udhari') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ], [t]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Don't show navigation on login page
  if (pathname === '/login' || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-3 sm:px-4 py-3 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{t('dukan')}</h1>
            <p className="text-xs text-gray-600 truncate hidden sm:block">{user?.shopName || 'Shop'}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="h-9 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </Button>
      </header>

      {/* Left Sidebar - Desktop (Collapsible) */}
      <div className="hidden sm:flex fixed left-0 top-20 h-[calc(100vh-5rem)] z-30 flex-col">
        <nav className={cn(
          "bg-background border-r border-border overflow-y-auto transition-all duration-300 flex flex-col p-3 gap-2",
          sidebarCollapsed ? "w-20" : "w-56"
        )}>
          <Link
            href="/sales"
            title={sidebarCollapsed ? t('new_sale') : undefined}
            className={cn(
              "mb-2 flex items-center gap-3 rounded-lg bg-green-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <ShoppingCart className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{t('new_sale')}</span>}
          </Link>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* Collapse Toggle Button */}
        <Button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          variant="ghost"
          size="sm"
          className="w-full rounded-none border-t border-border h-12"
          title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Bottom Navigation - Mobile Only (Quick Access) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border h-16 flex items-center shadow-lg">
        <div className="flex items-center justify-around w-full h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive ? "bg-primary/10" : "active:opacity-70"
                )}
              >
                <Icon className={cn(
                  'w-6 h-6',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-xs font-semibold text-center px-1',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {pathname !== '/sales' && (
        <Link
          href="/sales"
          className="fixed bottom-20 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-green-600 px-4 text-sm font-bold text-white shadow-lg transition active:scale-95 hover:bg-green-700 sm:bottom-6 sm:right-6"
        >
          <Plus className="h-5 w-5" />
          {t('sale')}
        </Link>
      )}
    </>
  );
}
