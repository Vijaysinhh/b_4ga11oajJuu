# Dukan Developer Quick Reference

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure at a Glance

```
app/              - Next.js app router pages
├── dashboard/    - Dashboard with stats & charts
├── items/        - Item CRUD management
├── categories/   - Category CRUD management
├── units/        - Unit CRUD management
└── settings/     - App settings

components/       - Reusable React components
├── navigation.tsx - Bottom tab navigation
├── error-boundary.tsx - Error boundary (NEW)
└── ui/           - shadcn/ui components

hooks/
├── use-db.ts     - Database operations (FIXED: added safety checks)
└── use-voice-search.ts - Voice search functionality

lib/
├── db.ts         - Dexie database schema & demo data
├── logger.ts     - Production logger (NEW)
└── utils.ts      - Helper functions

providers/        - React Context providers
public/           - Static assets, PWA config, service worker
```

## Key Code Patterns

### Using Database Hooks
```typescript
import { useItems, useCategories, useUnits } from '@/hooks/use-db';

export function MyComponent() {
  const { items, addItem, updateItem, deleteItem } = useItems();
  const { categories } = useCategories();
  
  // Data is reactive - component re-renders on changes
  return <div>{items.map(item => ...)}</div>;
}
```

### Using Language Support
```typescript
import { useLanguage } from '@/providers/language-provider';

export function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return <h1>{t('dashboard')}</h1>; // Works in English & Marathi
}
```

### Using Production Logger
```typescript
import { logger } from '@/lib/logger';

// Only logs in development (zero console spam in production)
logger.info('Item added', { itemId: 123 });
logger.warn('Low stock warning', { itemId: 456 });
logger.error('Failed to save', { error: err });

// Get all logs
const logs = logger.getLogs();
logger.exportLogs(); // JSON format
```

### Safe Calculations (IMPORTANT)
```typescript
// ❌ DON'T - Can cause division by zero
const margin = (profit / cost) * 100;

// ✅ DO - With safety check
const margin = cost > 0 ? (profit / cost) * 100 : 0;
```

## Common Tasks

### Add a New Stat to Dashboard
```typescript
// In hooks/use-db.ts
export function useDashboardStats() {
  const items = useLiveQuery(() => db.items.toArray());
  
  const stats = {
    // ... existing stats
    newStat: items?.reduce(...) || 0, // With default
  };
  
  return stats;
}

// In app/dashboard/components.tsx
<Card className="border-2">
  <CardHeader>
    <CardTitle>{t('new_stat')}</CardTitle>
    <Icon className="h-5 w-5" />
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">{stats.newStat}</div>
  </CardContent>
</Card>
```

### Add a New Translation
```typescript
// Translations are in the language provider
// For both English and Marathi support:
// - Use useLanguage() hook
// - Call t('key') to get translated text
// - Add keys to translation object in language-provider.tsx
```

### Add Form Validation
```typescript
const handleSubmit = async () => {
  // Validate before submission
  if (!formData.name.trim()) {
    toast.error('Name is required');
    return;
  }
  
  try {
    await addItem(formData);
    toast.success('Item added');
    setIsOpen(false);
  } catch (error) {
    logger.error('Failed to add item', error);
    toast.error('Failed to add item');
  }
};
```

## Important Files to Know

| File | Purpose | Critical |
|------|---------|----------|
| app/layout.tsx | Root layout with error boundary | YES |
| lib/db.ts | Database schema (Dexie) | YES |
| hooks/use-db.ts | Database operations with safety checks | YES |
| components/error-boundary.tsx | Error catching | YES |
| lib/logger.ts | Production logging | NO |
| globals.css | Global styles | NO |

## Testing

### Manual Testing Checklist
- [ ] Add item with all fields
- [ ] Edit item and verify calculations
- [ ] Delete item with confirmation
- [ ] Switch language (English ↔ Marathi)
- [ ] Check offline functionality
- [ ] Test on mobile device
- [ ] Test voice search (mobile only)

### Run Automated Tests (if added)
```bash
pnpm test          # Run tests
pnpm test:watch   # Watch mode
```

## Performance Tips

1. **Use useMemo for expensive calculations**
   ```typescript
   const filtered = useMemo(() => 
     items.filter(item => item.name.includes(search))
   , [items, search]);
   ```

2. **Lazy load charts and expensive components**
   ```typescript
   const Chart = dynamic(() => import('@/components/chart'), 
     { ssr: false }
   );
   ```

3. **Don't trigger re-renders unnecessarily**
   - Use useCallback for stable function references
   - Avoid object literals in props

## Debugging

### Enable Development Logging
```typescript
// In development, logger shows styled console output
logger.info('Debug info', { data: value });

// Access all logs
console.log(logger.getLogs());
console.log(logger.exportLogs()); // JSON format
```

### Check Database State
```typescript
// In browser console
import { db } from '@/lib/db';

// View all items
db.items.toArray().then(items => console.log(items));

// View all categories
db.categories.toArray().then(cats => console.log(cats));

// Clear all data (be careful!)
db.items.clear();
```

### Error Debugging
- Check error boundary logs
- Look at logger output in console
- Verify data in IndexedDB
- Check service worker (DevTools > Application > Service Workers)

## Deployment

### Pre-Deployment Checks
```bash
# Build and check for errors
pnpm build

# Check TypeScript
pnpm tsc --noEmit

# Start production server locally
pnpm start
```

### Deploy Command
```bash
# To Vercel
vercel

# To other hosts
# Use .next output folder as static site
```

## Useful Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Build for production
pnpm start        # Start production server
pnpm format       # Format code (if prettier configured)
pnpm lint         # Lint code (if eslint configured)
```

## Browser DevTools Tips

### IndexedDB Inspector
DevTools > Application > Storage > IndexedDB > DukanDB

### Service Worker Debugging
DevTools > Application > Service Workers
- View registered workers
- Test offline mode
- Clear cache

### Performance
DevTools > Performance
- Record page load
- Check for jank
- Verify smooth animations

## Critical Production Fixes

### 1. Dashboard Stats (FIXED ✅)
- Changed: `averageMargin` → `avgMargin`
- Removed duplicate stat card
- Impact: Fixes crash on /dashboard

### 2. Division by Zero (FIXED ✅)
- Added: `buyPrice > 0` check before margin calc
- Impact: Prevents NaN in margin calculations

### 3. Error Handling (FIXED ✅)
- Added: Error boundary wrapper
- Impact: Graceful error recovery

## Support

### Common Issues

**App won't load**
- Clear browser cache
- Check console for errors
- Verify service worker installed

**Offline not working**
- Check service worker in DevTools
- Verify IndexedDB isn't corrupted
- Try reinstalling PWA

**Performance slow**
- Reduce number of items
- Clear browser cache
- Check available RAM

### Get Help
1. Check PRODUCTION_READY.md
2. Review TESTING_CHECKLIST.md
3. Check console logs and error boundary
4. Contact development team

---

**Last Updated**: 2026-04-20  
**Version**: 1.0.0
