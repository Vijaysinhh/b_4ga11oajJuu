'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Grid3x3,
  Layers,
  Box,
  Bell,
} from 'lucide-react';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

const commands = [
  {
    group: 'Navigation',
    items: [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, shortcut: 'Ctrl+D', path: '/dashboard' },
      { id: 'items', label: 'Go to Items', icon: Package, shortcut: 'Ctrl+I', path: '/items' },
      { id: 'sales', label: 'Go to Sales', icon: ShoppingCart, shortcut: 'Ctrl+S', path: '/sales' },
      { id: 'reports', label: 'Go to Reports', icon: BarChart3, shortcut: 'Ctrl+R', path: '/reports' },
      { id: 'categories', label: 'Go to Categories', icon: Grid3x3, shortcut: 'Ctrl+Shift+C', path: '/categories' },
      { id: 'units', label: 'Go to Units', icon: Layers, shortcut: 'Ctrl+U', path: '/units' },
      { id: 'batches', label: 'Go to Batches', icon: Box, shortcut: 'Ctrl+B', path: '/batches' },
      { id: 'alerts', label: 'Go to Alerts', icon: Bell, shortcut: 'Ctrl+Shift+A', path: '/alerts' },
      { id: 'settings', label: 'Go to Settings', icon: Settings, shortcut: 'Ctrl+,', path: '/settings' },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { logout } = useSupabaseAuth();

  // Open command palette with Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Handle navigation commands
  const handleCommand = async (commandId: string) => {
    const allItems = commands.flatMap((group) => group.items);
    const command = allItems.find((item) => item.id === commandId);

    if (command && command.path) {
      setOpen(false);
      router.push(command.path);
      return;
    }

    if (commandId === 'logout') {
      setOpen(false);
      await logout();
      router.push('/login');
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleCommand(item.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        <CommandGroup heading="Account">
          <CommandItem onSelect={() => handleCommand('logout')}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
