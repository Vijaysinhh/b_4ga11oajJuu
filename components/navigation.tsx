'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/providers/language-provider';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Settings, 
  LayoutDashboard, 
  ShoppingCart, 
  LogOut, 
  Menu,
  BarChart3,
  Bell,
  Box,
  Layers,
  Grid3x3,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export function Navigation() {
  const { t } = useLanguage();
  const { user, logout, isAuthenticated } = useSupabaseAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const mainNavItems = useMemo(() => [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/sales', icon: ShoppingCart, label: 'Sales' },
    { href: '/items', icon: Package, label: 'Items' },
    { href: '/reports', icon: BarChart3, label: 'Reports' },
  ], []);

  const allNavItems = useMemo(() => [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/items', icon: Package, label: 'Items' },
    { href: '/categories', icon: Grid3x3, label: 'Categories' },
    { href: '/units', icon: Layers, label: 'Units' },
    { href: '/sales', icon: ShoppingCart, label: 'Sales' },
    { href: '/batches', icon: Box, label: 'Batches' },
    { href: '/reports', icon: BarChart3, label: 'Reports' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ], []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  // Don't show navigation on login page
  if (pathname === '/login' || !isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-3 sm:px-4 py-3 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 sm:hidden"
            title="Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Dukan</h1>
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
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 sm:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Left Sidebar - Mobile (Collapsible) */}
      <nav className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-background border-r border-border overflow-y-auto transition-transform duration-300 z-30 p-3 space-y-2",
        "sm:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Left Sidebar - Desktop (Collapsible) */}
      <div className="hidden sm:flex fixed left-0 top-20 h-[calc(100vh-5rem)] z-30 flex-col">
        <nav className={cn(
          "bg-background border-r border-border overflow-y-auto transition-all duration-300 flex flex-col p-3 gap-2",
          sidebarCollapsed ? "w-20" : "w-56"
        )}>
          {allNavItems.map((item) => {
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
          {mainNavItems.map((item) => {
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
    </>
  );
}
