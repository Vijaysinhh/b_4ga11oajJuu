'use client';

import { useMemo, useState, useEffect } from 'react';
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
  Shield,
  Store,
  Search,
  X,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/page-shell';
import { Input } from '@/components/ui/input';
import { useItems, useSales, useUdhari } from '@/hooks/use-supabase';
import { 
  Avatar,
  AvatarFallback,
  AvatarImage 
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const { user, logout, isAuthenticated } = useSupabaseAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Get data for search (using user context for multi-tenant filtering)
  const { items } = useItems(user?.id || '');
  const { sales } = useSales(user?.id || '');
  const { customers } = useUdhari(user?.id || '');

  // Compute search results
  const searchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return { items: [], sales: [], customers: [] };

    const q = globalSearchQuery.toLowerCase();

    const filteredItems = items.filter(item => 
      (item.name?.toLowerCase().includes(q)) || 
      (item.nameMarathi?.toLowerCase().includes(q)) || 
      (item.brand?.toLowerCase().includes(q)) || 
      (item.brandMarathi?.toLowerCase().includes(q))
    );

    const filteredSales = sales.filter(sale => {
      if (sale.creditCustomerName?.toLowerCase().includes(q)) return true;
      if (sale.subtotal.toString().includes(q)) return true;
      const hasMatchingItem = sale.items?.some((item: any) => 
        item.itemName?.toLowerCase().includes(q)
      ) || false;
      return hasMatchingItem;
    });

    const filteredCustomers = customers.filter(c => 
      c.name?.toLowerCase().includes(q) || 
      c.phone?.includes(q) || 
      c.balance.toString().includes(q)
    );

    return {
      items: filteredItems,
      sales: filteredSales,
      customers: filteredCustomers,
    };
  }, [globalSearchQuery, items, sales, customers]);

  // Redirect logic moved to useEffect to prevent setState during render
  useEffect(() => {
    if (!isAuthenticated || pathname === '/login') return;

    if (pathname === '/' || pathname === '/dashboard') {
      if (user?.role === 'super_admin') {
        router.push('/super-admin');
      } else if (user?.role === 'worker') {
        router.push('/sales');
      }
    }
  }, [user, pathname, router, isAuthenticated]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Don't show navigation on login page
  if (pathname === '/login' || !isAuthenticated) {
    return null;
  }

  // Navigation items based on role and permissions
  const getNavItems = () => {
    if (user?.role === 'super_admin') {
      return [
        { href: '/super-admin', icon: Shield, label: 'Dashboard' },
      ];
    }

    const permissions = user?.permissions || { canViewDashboard: false, canViewItems: false, canViewSales: true, canViewUdhari: false, canViewReports: false, canViewSettings: false, canManageStaff: false };
    
    if (user?.role === 'worker') {
      const items: any[] = [];
      if (permissions.canViewDashboard) items.push({ href: '/dashboard', icon: Home, label: t('home') });
      if (permissions.canViewSales) items.push({ href: '/sales', icon: ShoppingCart, label: 'Sell' });
      if (permissions.canViewItems) items.push({ href: '/items', icon: Package, label: t('stock') });
      if (permissions.canViewUdhari) items.push({ href: '/udhari', icon: Users, label: t('udhari') });
      return items.length > 0 ? items : [{ href: '/sales', icon: ShoppingCart, label: 'Sell' }];
    }

    // Owner role
    return [
      { href: '/dashboard', icon: Home, label: t('home') },
      { href: '/items', icon: Package, label: t('stock') },
      { href: '/udhari', icon: Users, label: t('udhari') },
      { href: '/staff', icon: Users, label: 'Staff' },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border px-3 sm:px-4 py-3 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              {user?.role === 'super_admin' && <Shield className="h-5 w-5 text-purple-600" />}
              {user?.role === 'worker' && <ShoppingCart className="h-5 w-5 text-green-600" />}
              {user?.role === 'owner' && <Store className="h-5 w-5 text-purple-600" />}
              {user?.role === 'super_admin' ? 'Super Admin' : t('dukan')}
            </h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {user?.username}
              {user?.role === 'owner' && ' • Owner'}
              {user?.role === 'worker' && ' • Worker'}
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        {(user?.role === 'owner' || user?.role === 'super_admin') && (
          <div className="relative flex-1 max-w-md mx-4 search-container">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items, sales, udhari..."
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              className="pl-10 pr-10"
            />
            {globalSearchQuery && (
              <button
                onClick={() => {
                  setGlobalSearchQuery('');
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && globalSearchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-border z-50 max-h-[500px] overflow-y-auto">
                {/* Items */}
                {searchResults.items.length > 0 && (
                  <div className="p-3 border-b border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Items</h3>
                    <div className="space-y-1">
                      {searchResults.items.slice(0, 5).map((item) => (
                        <Link key={item.id} href="/items" onClick={() => setShowSearchResults(false)} className="block p-2 rounded hover:bg-muted transition-colors">
                          <div className="font-medium text-sm">{item.name || item.nameMarathi}</div>
                          {item.brand && <div className="text-xs text-muted-foreground">{item.brand}</div>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sales */}
                {searchResults.sales.length > 0 && (
                  <div className="p-3 border-b border-border">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Sales</h3>
                    <div className="space-y-1">
                      {searchResults.sales.slice(0, 5).map((sale) => (
                        <Link key={sale.id} href="/sales" onClick={() => setShowSearchResults(false)} className="block p-2 rounded hover:bg-muted transition-colors">
                          <div className="font-medium text-sm">
                            Sale - ₹{sale.subtotal}</div>
                          {sale.creditCustomerName && (
                            <div className="text-xs text-muted-foreground">
                              {sale.creditCustomerName}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers */}
                {searchResults.customers.length > 0 && (
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                      Udhari Customers
                    </h3>
                    <div className="space-y-1">
                      {searchResults.customers.slice(0, 5).map((customer) => (
                        <Link key={customer.id} href="/udhari" onClick={() => setShowSearchResults(false)} className="block p-2 rounded hover:bg-muted transition-colors">
                          <div className="font-medium text-sm">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Balance: ₹{customer.balance}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.items.length === 0 && searchResults.sales.length === 0 && searchResults.customers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {user?.role !== 'worker' && <LanguageToggle className="hidden sm:flex" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" alt={user?.username} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{user?.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.role === 'owner' ? 'Owner' : user?.role === 'super_admin' ? 'Super Admin' : 'Worker'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              {user?.role === 'owner' && (
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer flex items-center gap-2 text-red-600">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Left Sidebar - Desktop (Collapsible) - Only for non-workers & non-super-admins */}
      {(user?.role === 'owner' || user?.role === 'super_admin') && (
        <div className="hidden sm:flex fixed left-0 top-20 h-[calc(100vh-5rem)] z-30 flex-col">
          <nav className={cn(
            "bg-background border-r border-border overflow-y-auto transition-all duration-300 flex flex-col p-3 gap-2",
            sidebarCollapsed ? "w-20" : "w-56"
          )}>
            {user?.role === 'owner' && (
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
            )}

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
          
          {user?.role === 'owner' && (
            <Button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              variant="ghost"
              size="sm"
              className="w-full rounded-none border-t border-border h-12"
              title={sidebarCollapsed ? t('expand_menu') : t('collapse_menu')}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>
      )}

      {/* Bottom Navigation - Mobile Only (Quick Access) - For Owners */}
      {user?.role === 'owner' && (
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
      )}

      {/* Floating Sale Button - Only for Owners and Workers */}
      {(user?.role === 'owner' || user?.role === 'worker') && pathname !== '/sales' && (
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
