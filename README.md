# Dukan - Shop Inventory Manager

A simple, fast, and offline-first inventory management app for small shop owners!

## Features 🌟

- **100% Offline First**: Works without any internet
- **Local Storage**: All data stored securely on your device
- **Progressive Web App (PWA)**: Install like a native app
- **Bilingual Support**: English & Marathi
- **Dark/Light Mode**: Eye-friendly UI
- **Expiry Alerts**: Get notified about expiring and expired products
- **Low Stock Warnings**: Never run out of your best-sellers
- **Sales Management**: Track sales, customers, and udhari (credit)
- **Batches & Price Tiers**: Advanced inventory control
- **Reports**: Generate daily, monthly, and custom reports

## Tech Stack 🛠️

- **Next.js 16+**: Full-stack React framework
- **TypeScript**: Type-safe code
- **Tailwind CSS**: Modern, utility-first styling
- **Supabase**: (Optional) Cloud backup and sync
- **Dexie.js**: Offline IndexedDB storage
- **shadcn/ui**: Beautiful, accessible UI components

## Getting Started 🚀

### Prerequisites

- Node.js 18+ or 20+ installed
- npm or pnpm (pnpm recommended)
- (Optional) A Supabase account for cloud sync

### Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **(Optional) Set up Supabase**
   - Create a `.env.local` file based on `.env.example`
   - Follow the steps in `SUPABASE_SETUP.md`

4. **Run the development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open the app** in your browser: [http://localhost:3000](http://localhost:3000)

## Production Deployment 🚀

### Building for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/dukan)

1. Connect your GitHub repository to Vercel
2. Add your environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Deploy!

### Other Hosting Options

- Netlify
- Cloudflare Pages
- Any static hosting provider

## Documentation 📖

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase configuration
- [PRODUCTION_READY.md](./PRODUCTION_READY.md) - Production readiness checklist
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Comprehensive testing guide
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer documentation
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - All docs at a glance

## Project Structure 📁

```
dukan/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page (redirects)
│   ├── dashboard/               # Dashboard (home)
│   ├── items/                   # Items management
│   ├── sales/                   # Sales & transactions
│   ├── categories/              # Categories
│   ├── units/                   # Units of measurement
│   └── settings/                # Settings
├── components/                  # React components
│   ├── ui/                      # shadcn/ui components
│   ├── error-boundary.tsx       # Error handling
│   └── navigation.tsx           # Bottom navigation
├── hooks/                       # Custom hooks
│   ├── use-supabase.ts          # Supabase hooks
│   └── use-db.ts                # Offline DB hooks
├── lib/                         # Utilities
│   ├── db.ts                    # Dexie DB schema
│   ├── logger.ts                # Production logger
│   └── utils.ts                 # Helper functions
├── providers/                   # React context providers
├── public/                      # Static assets
│   ├── sw.js                    # Service worker
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # App icons
├── supabase/                    # Supabase schema & migrations
├── middleware.ts                # Security headers
├── next.config.mjs              # Next.js config
└── package.json                 # Dependencies & scripts
```

## Production Checklist ✅

- [x] TypeScript strict mode enabled
- [x] Security headers set (CSP, X-Frame-Options, etc.)
- [x] Error boundary implemented
- [x] Production logger
- [x] PWA manifest and service worker
- [x] Offline-first design
- [x] Responsive mobile-first UI
- [x] Environment variables documented
- [x] No debug code in production
- [x] Build passes without errors
- [x] Dependencies are up-to-date

## Contributing 🤝

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is open source and available under the [MIT License](LICENSE).

## Support 🙏

For help, check out our documentation files or open an issue!

---

Built with ❤️ for small shop owners!
