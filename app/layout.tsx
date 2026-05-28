import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SupabaseAuthProvider } from '@/providers/supabase-auth-provider'
import { LanguageProvider } from '@/providers/language-provider'
import { ServiceWorkerProvider } from '@/providers/service-worker-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { Navigation } from '@/components/navigation'
import { CommandPalette } from '@/components/command-palette'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dukan - Inventory Manager',
  description: 'Manage your small shop inventory with ease',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8d5cf6',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8d5cf6" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, url, line, col, error) {
            console.error('[Global Error]', msg, error);
            return false;
          };
          window.onunhandledrejection = function(event) {
            console.error('[Unhandled Rejection]', event.reason);
          };
          // Debug click events
          window.onclick = function(e) {
            console.log('[Click Debug]', e.target);
          };
        ` }} />
      </head>
      <body className="font-sans antialiased bg-background overflow-x-hidden m-0 p-0">
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <SupabaseAuthProvider>
              <ServiceWorkerProvider>
                <LanguageProvider>
                  <Navigation />
                  <CommandPalette />
                  <main className="pt-16 sm:pt-20 pb-20 sm:pb-6 px-3 sm:px-4 sm:ml-56 md:px-6 overflow-y-auto overflow-x-hidden min-h-screen transition-all duration-300">
                    {children}
                  </main>
                  <ToastProvider />
                </LanguageProvider>
              </ServiceWorkerProvider>
            </SupabaseAuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}



