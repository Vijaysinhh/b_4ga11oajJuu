## Authentication Context Setup - Complete Guide

### Problem Analysis: "useAuth must be used within an AuthProvider"

This error occurs when a component tries to use an authentication hook (`useAuth`, `useSupabaseAuth`) without being wrapped in the corresponding context provider. The component hierarchy doesn't include the provider that creates the context.

---

## Architecture Overview

### 1. Root Layout Provider Hierarchy (app/layout.tsx)

Your app is correctly structured with the **SupabaseAuthProvider** at the root level:

```tsx
<html>
  <body>
    <ErrorBoundary>
      <SupabaseAuthProvider>  {/* All auth context available below this */}
        <ServiceWorkerProvider>
          <LanguageProvider>
            <Navigation />                {/* Can use useSupabaseAuth */}
            <CommandPalette />             {/* Can use useSupabaseAuth */}
            <main>
              {children}                 {/* All pages can use useSupabaseAuth */}
            </main>
            <ToastProvider />
          </LanguageProvider>
        </ServiceWorkerProvider>
      </SupabaseAuthProvider>
    </ErrorBoundary>
  </body>
</html>
```

### 2. Provider Implementation (supabase-auth-provider.tsx)

The provider creates an `AuthContext` and exports a `useSupabaseAuth` hook:

```tsx
'use client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  // Auth logic here
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within an SupabaseAuthProvider');
  }
  return context;
}
```

---

## Root Cause of Your Error

The error occurred because **components were importing from the wrong provider**:

```tsx
// ❌ WRONG - Old demo provider (still exists in codebase)
import { useAuth } from '@/providers/auth-provider';

// ✅ CORRECT - Supabase production provider
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
```

**Affected Components** (now fixed):
1. `components/command-palette.tsx` - Was using `useAuth` from `auth-provider.tsx`
2. `components/navigation.tsx` - Was using `useAuth` from `auth-provider.tsx`

**Solution Applied**: Updated both to import `useSupabaseAuth` from `supabase-auth-provider.tsx`

---

## Best Practices for Context Providers in Next.js

### 1. Provider Placement (Root Layout)

**✅ Correct Pattern:**
```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SupabaseAuthProvider>
          <LanguageProvider>
            <ToastProvider />
            {children}
          </LanguageProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
```

**Provider Order Matters:**
- Most general (global state) → Outer providers
- Feature-specific → Inner providers
- Always mark providers as `'use client'` (client-only components)

### 2. Hook Implementation Pattern

```tsx
// providers/supabase-auth-provider.tsx
'use client'; // Required for context in Next.js 13+

import { createContext, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize state and effects here
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Error-checking hook
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useSupabaseAuth must be used within an SupabaseAuthProvider');
  }
  
  return context;
}
```

### 3. Component Usage Pattern

```tsx
// components/navigation.tsx
'use client';

import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

export function Navigation() {
  const { user, logout, isAuthenticated } = useSupabaseAuth();
  
  // Component code here
}
```

---

## Debugging Strategies

### 1. Verify Component Hierarchy

Check that your component is actually inside the provider:

```tsx
// ✅ Works - Navigation is inside SupabaseAuthProvider
app/layout.tsx
  └─ SupabaseAuthProvider
      └─ Navigation (can use useSupabaseAuth)

// ❌ Fails - Sidebar is outside SupabaseAuthProvider  
app/layout.tsx
  └─ Sidebar (ERROR: can't use useSupabaseAuth)
  └─ SupabaseAuthProvider
      └─ Children
```

**Fix**: Ensure all components using hooks are descendants of the provider.

### 2. Import Path Verification

Always verify the correct import path:

```tsx
// List all available providers
// providers/
//   ├─ auth-provider.tsx (old demo - DEPRECATED)
//   ├─ supabase-auth-provider.tsx (production - USE THIS)
//   ├─ language-provider.tsx
//   └─ toast-provider.tsx

// ✅ Correct
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

// ❌ Wrong
import { useAuth } from '@/providers/auth-provider';
import { useSupabaseAuth } from '@/providers/auth-provider'; // Wrong file
```

### 3. Multi-Provider Setup Debugging

When multiple providers exist:

```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Order matters! Auth must wrap Language if Language uses Auth */}
        <SupabaseAuthProvider>
          <LanguageProvider>
            <ToastProvider />
            {children}
          </LanguageProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}
```

### 4. Runtime Debugging

Add console logs to understand the flow:

```tsx
export function useSupabaseAuth() {
  console.log('[v0] useSupabaseAuth called');
  const context = useContext(AuthContext);
  
  if (!context) {
    console.error('[v0] AuthContext is undefined - NOT inside SupabaseAuthProvider');
    console.trace('[v0] Stack trace for debugging');
    throw new Error('useSupabaseAuth must be used within an SupabaseAuthProvider');
  }
  
  console.log('[v0] useSupabaseAuth context found:', context);
  return context;
}
```

---

## Common Pitfalls and Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| "useAuth must be used within AuthProvider" | Wrong import or hook outside provider | Check imports, verify hierarchy |
| Stale context value | Provider not re-rendering | Use `useCallback` for functions, `useEffect` for side effects |
| Multiple provider instances | Nested providers creating isolation | Keep single provider at root |
| Context not updating | State not properly initialized | Use `useState` and `useEffect` in provider |
| Import not found | Typo in import path | Verify `@/providers/supabase-auth-provider` exists |

---

## Production Checklist

- ✅ Provider wraps all components that need auth context
- ✅ Only ONE `SupabaseAuthProvider` at root layout
- ✅ All components use `useSupabaseAuth` (not old `useAuth`)
- ✅ Provider is marked as `'use client'`
- ✅ Error message is clear and helpful
- ✅ No circular dependencies between providers
- ✅ Context value is memoized to prevent unnecessary re-renders
- ✅ No context hooks called in Server Components (use page.tsx instead)

---

## Your Current Setup (Fixed)

**Root Provider**: `app/layout.tsx` ✅
**Auth Provider**: `providers/supabase-auth-provider.tsx` ✅
**Using Components**:
- `components/navigation.tsx` ✅ (Updated to useSupabaseAuth)
- `components/command-palette.tsx` ✅ (Updated to useSupabaseAuth)
- `app/dashboard/components.tsx` ✅ (Already using useSupabaseAuth)
- `app/login/page.tsx` ✅ (Already using useSupabaseAuth)

All components are now correctly using the production Supabase authentication context provider.
