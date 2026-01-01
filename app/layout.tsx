import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WeDesignz Admin Panel',
  description: 'Admin panel for WeDesignz platform',
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/favicon.ico",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Theme-aware favicon switching */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function updateFavicon() {
                  const faviconSvg = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
                  const faviconPng = document.querySelector('link[rel="icon"][sizes="96x96"]');
                  
                  if (!faviconSvg || !faviconPng) return;
                  
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  // SVG favicon supports theme switching via media attribute
                  if (isDark) {
                    faviconSvg.setAttribute('media', '(prefers-color-scheme: dark)');
                  } else {
                    faviconSvg.removeAttribute('media');
                  }
                }
                
                // Set initial favicon
                updateFavicon();
                
                // Listen for theme changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateFavicon);
              })();
            `,
          }}
        />
        {/* Chunk loading error handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Handle chunk loading errors
                window.addEventListener('error', function(e) {
                  if (e.message && e.message.includes('Loading chunk') || e.message && e.message.includes('ChunkLoadError')) {
                    console.warn('Chunk load error detected, reloading page...');
                    // Reload the page after a short delay
                    setTimeout(function() {
                      window.location.reload();
                    }, 1000);
                  }
                }, true);
                
                // Handle unhandled promise rejections (chunk loading failures)
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && (e.reason.message && e.reason.message.includes('Loading chunk') || e.reason.message && e.reason.message.includes('ChunkLoadError'))) {
                    console.warn('Chunk load error in promise, reloading page...');
                    e.preventDefault();
                    setTimeout(function() {
                      window.location.reload();
                    }, 1000);
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
