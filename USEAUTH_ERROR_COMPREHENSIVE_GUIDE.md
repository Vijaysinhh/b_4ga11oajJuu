# Comprehensive useAuth Error Analysis and Next.js Authentication Context Setup Guide

## Executive Summary

The `useAuth is not defined` or `useAuth must be used within an AuthProvider` error in Next.js applications occurs when:
1. A component attempts to use a custom hook without being wrapped by its required context provider
2. The provider is not positioned at an appropriate level in the component hierarchy
3. Import paths reference incorrect or non-existent provider implementations
4. Circular dependencies or module resolution issues prevent proper hook instantiation

This guide provides a technical analysis of root causes, proper architecture patterns, and comprehensive debugging strategies.

---

## Part 1: Root Cause Analysis

### 1.1 Context Dependency Chain

In React, custom hooks that rely on Context API require:
- **Provider Component**: Defines `createContext()` and supplies context value via a provider component
- **Custom Hook**: Wraps `useContext()` to access the context value
- **Consumer Component**: Uses the custom hook within the provider's subtree

### 1.2 Common Error Patterns

#### Error Pattern A: Hook Outside Provider Scope
```tsx
// ❌ WRONG: useSupabaseAuth called outside SupabaseAuthProvider
export default function App() {
  const { user } = useSupabaseAuth(); // ERROR: Context not available
  return <div>App</div>;
}

// ✅ CORRECT: Hook used within provider's children
export default function App() {
  return (
    <SupabaseAuthProvider>
      <Dashboard /> {/* Dashboard can use useSupabaseAuth */}
    </SupabaseAuthProvider>
  );
}
```

#### Error Pattern B: Mixed Context Providers
```tsx
// ❌ WRONG: Using hook from different provider
import { useAuth } from '@/providers/auth-provider'; // Old provider
import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider'; // New provider

export function Component() {
  return (
    <SupabaseAuthProvider>
      <Child /> {/* Child tries to use old useAuth hook */}
    </SupabaseAuthProvider>
  );
}

export function Child() {
  const auth = useAuth(); // ERROR: Hook expects old AuthProvider, but only SupabaseAuthProvider wraps tree
}
```

#### Error Pattern C: Incorrect Import Resolution
```tsx
// ❌ WRONG: Typo in import path
import { useSupabaseAuth } from '@/providers/supabase-auth-provide'; // Missing 'r'

// ❌ WRONG: Import doesn't export the hook
import { useAuth } from '@/providers/supabase-auth-provider'; // Hook is useSupabaseAuth, not useAuth

// ✅ CORRECT: Exact import path
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
```

---

## Part 2: Proper Next.js 16+ AuthProvider Setup

### 2.1 Architecture Overview

In Next.js with App Router, the authentication provider must be positioned at the root level:

```
app/
├── layout.tsx (ROOT LEVEL - Provider wraps all routes)
│   └── <SupabaseAuthProvider>
│       └── <Navigation /> (can use useSupabaseAuth)
│       └── <main>{children}</main>
│           ├── app/page.tsx (can use useSupabaseAuth)
│           ├── app/dashboard/page.tsx (can use useSupabaseAuth)
│           └── app/login/page.tsx (can use useSupabaseAuth)
```

### 2.2 Root Layout Implementation (app/layout.tsx)

```tsx
'use client';

import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider';
import { LanguageProvider } from '@/providers/language-provider';
import { Navigation } from '@/components/navigation';
import { ErrorBoundary } from '@/components/error-boundary';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {/* 1. OUTERMOST PROVIDER: Wraps everything requiring auth */}
          <SupabaseAuthProvider>
            {/* 2. SECONDARY PROVIDERS: Other context providers */}
            <LanguageProvider>
              {/* 3. LAYOUT COMPONENTS: Navigation can use useSupabaseAuth */}
              <Navigation />
              
              {/* 4. PAGE CONTENT: All nested routes/components can use hooks */}
              <main>
                {children}
              </main>
            </LanguageProvider>
          </SupabaseAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### 2.3 Context Provider Implementation Pattern

```tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Define interface for context value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// 2. Create context with undefined default (forces provider check)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Provider component: supplies context value
export function SupabaseAuthProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      // ... fetch session from Supabase
      setLoading(false);
    };
    initAuth();
  }, []);

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    login: async (email, password) => { /* ... */ },
    logout: async () => { /* ... */ },
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Custom hook: wraps useContext with error boundary
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useSupabaseAuth must be used within SupabaseAuthProvider. ' +
      'Ensure your component is wrapped by <SupabaseAuthProvider> in app/layout.tsx'
    );
  }
  
  return context;
}
```

---

## Part 3: Component Hierarchy Best Practices

### 3.1 Provider Nesting Order (Priority Hierarchy)

```
┌─────────────────────────────────────────────┐
│ ErrorBoundary (outermost - catches errors)  │
├─────────────────────────────────────────────┤
│ AuthProvider (authentication context)       │
├─────────────────────────────────────────────┤
│ ThemeProvider (styling/appearance)          │
├─────────────────────────────────────────────┤
│ LanguageProvider (i18n/translation)         │
├─────────────────────────────────────────────┤
│ ToastProvider (notifications)               │
├─────────────────────────────────────────────┤
│ Layout Components (Navigation, Sidebar)     │
├─────────────────────────────────────────────┤
│ Page Content ({children})                   │
└─────────────────────────────────────────────┘
```

### 3.2 Correct Organization Pattern

```tsx
// ✅ CORRECT: app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <SupabaseAuthProvider>     {/* Auth first */}
            <LanguageProvider>        {/* UI second */}
              <Navigation />          {/* Can use useSupabaseAuth */}
              <main>{children}</main> {/* All routes wrapped */}
              <ToastProvider />
            </LanguageProvider>
          </SupabaseAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

// ✅ CORRECT: app/dashboard/page.tsx
'use client';

import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

export default function DashboardPage() {
  const { user, isAuthenticated } = useSupabaseAuth();
  
  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }
  
  return <div>Welcome, {user?.email}</div>;
}
```

### 3.3 Server Component vs Client Component Boundaries

```tsx
// ✅ CORRECT: Server component at root, client providers below
export default function RootLayout({ children }) {
  // This is a Server Component (default in App Router)
  return (
    <html>
      <body>
        <ClientProviders>  {/* Boundary for client-only context */}
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

// Wrapper that marks transition to client components
'use client';

export function ClientProviders({ children }) {
  return (
    <SupabaseAuthProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </SupabaseAuthProvider>
  );
}
```

---

## Part 4: Import Path Verification

### 4.1 Import Validation Checklist

```tsx
// ❌ WRONG: Incorrect hook name
import { useAuth } from '@/providers/supabase-auth-provider';
// Error: 'useAuth' is not exported; hook is named 'useSupabaseAuth'

// ✅ CORRECT: Exact exported name
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

// ❌ WRONG: File path typo
import { useSupabaseAuth } from '@/providers/supabase-auth-provide';
// Error: Cannot find module (missing 'r')

// ✅ CORRECT: Exact file path
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

// ❌ WRONG: Mixing old and new providers
import { useAuth } from '@/providers/auth-provider'; // Old
import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider'; // New
// Error: useAuth context not provided by SupabaseAuthProvider

// ✅ CORRECT: Use matching provider and hook
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider';
```

### 4.2 Verification Script

```bash
# Find all imports of a hook
grep -r "useAuth" --include="*.tsx" --include="*.ts"

# Find provider implementations
grep -r "export function.*Provider" --include="*.tsx"

# Find hook exports
grep -r "export function use" --include="*.tsx" providers/
```

---

## Part 5: Debugging Strategies

### 5.1 Systematic Debugging Approach

#### Step 1: Verify Provider Wraps Component
```tsx
// Add debug logging to provider
export function SupabaseAuthProvider({ children }) {
  useEffect(() => {
    console.log('[AUTH] SupabaseAuthProvider mounted');
    return () => console.log('[AUTH] SupabaseAuthProvider unmounted');
  }, []);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Add debug logging to hook
export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    console.error('[AUTH] useSupabaseAuth called outside provider');
    console.error('[AUTH] Component tree:', new Error().stack);
  }
  
  return context;
}
```

#### Step 2: Verify Import Paths
```tsx
// Check what's actually exported
import * as AuthProvider from '@/providers/supabase-auth-provider';
console.log('[AUTH] Exports:', Object.keys(AuthProvider));
// Expected output: ['SupabaseAuthProvider', 'useSupabaseAuth']

// Verify component receives provider
console.log('[AUTH] App wrapped by:', '<SupabaseAuthProvider>');
```

#### Step 3: Trace Component Hierarchy
```tsx
// Wrap component to see hierarchy
function DebugWrapper({ children, name }) {
  useEffect(() => {
    console.log(`[HIERARCHY] Rendering ${name}`);
  }, [name]);
  
  return children;
}

// Use in layout
<SupabaseAuthProvider>
  <DebugWrapper name="SupabaseAuthProvider">
    <Navigation />
    <DebugWrapper name="MainContent">
      {children}
    </DebugWrapper>
  </DebugWrapper>
</SupabaseAuthProvider>
```

### 5.2 Error Message Analysis

```
Error: useSupabaseAuth must be used within SupabaseAuthProvider

Root Cause Identification:
├─ ❌ Component using hook is NOT wrapped by provider
├─ ❌ Provider is in different branch of component tree
├─ ❌ Provider parent is not rendered yet (race condition)
├─ ❌ Circular dependency prevents provider from loading
└─ ❌ SSR/SSG rendering without client boundary

Solution Checklist:
├─ ✅ Add 'use client' to component using hook
├─ ✅ Verify provider in app/layout.tsx wraps {children}
├─ ✅ Check no layout.tsx between provider and component
├─ ✅ Ensure hook is used after provider mounts
└─ ✅ Remove old auth provider imports from file
```

### 5.3 Console Debugging Pattern

```tsx
'use client';

import { useSupabaseAuth } from '@/providers/supabase-auth-provider';

export function MyComponent() {
  console.log('[v0] MyComponent mounting...');
  
  let authContext;
  try {
    authContext = useSupabaseAuth();
    console.log('[v0] Auth context accessed:', authContext?.user?.email);
  } catch (error) {
    console.error('[v0] Auth context error:', error.message);
    console.error('[v0] Stack:', error.stack);
    return <div>Auth Error: {error.message}</div>;
  }
  
  return <div>Authenticated as: {authContext.user?.email}</div>;
}
```

---

## Part 6: Common Mistakes and Solutions

| Mistake | Cause | Solution |
|---------|-------|----------|
| `useAuth is not defined` | Import doesn't match export | Use exact export name: `useSupabaseAuth` |
| `useAuth must be used within provider` | Hook called outside provider subtree | Wrap component with `<SupabaseAuthProvider>` in layout |
| Provider seems to not initialize | Component renders before auth loads | Check `loading` state before accessing `user` |
| Auth state resets unexpectedly | Multiple providers in tree | Ensure only ONE `SupabaseAuthProvider` at root |
| Import path errors | Typo in file path | Verify path with IDE autocomplete |
| Context value undefined | Provider not passing value correctly | Check `<AuthContext.Provider value={...}>` in provider |

---

## Part 7: Production Verification Checklist

```
VERIFICATION CHECKLIST
─────────────────────

Architecture:
  ☐ app/layout.tsx uses 'use client' directive
  ☐ <SupabaseAuthProvider> wraps {children}
  ☐ No other auth providers in tree
  ☐ Provider positioned BEFORE Navigation component
  ☐ <ErrorBoundary> wraps provider

Imports:
  ☐ useSupabaseAuth imported from correct file
  ☐ SupabaseAuthProvider imported in layout
  ☐ No old auth-provider imports remaining
  ☐ All components using hook are 'use client'
  ☐ IDE shows correct autocomplete paths

Runtime:
  ☐ Console shows no "useAuth must be used within" errors
  ☐ Auth state initializes on app load
  ☐ useSupabaseAuth accessible in nested routes
  ☐ No circular dependency warnings
  ☐ Build completes without context errors
```

---

## Conclusion

The `useAuth is not defined` error is preventable through:
1. **Proper Architecture**: Position provider at app root with correct client boundary
2. **Exact Imports**: Use correct exported hook and provider names
3. **Component Hierarchy**: Wrap all consuming components with their provider
4. **Systematic Debugging**: Use console logging and error boundaries to trace issues
5. **Verification**: Follow the checklist before deployment

For your application, ensure all components import `useSupabaseAuth` from `@/providers/supabase-auth-provider` and are wrapped by the provider positioned in `app/layout.tsx`.
