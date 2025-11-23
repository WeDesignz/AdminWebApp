import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WeDesignz Admin Panel',
  description: 'Admin panel for WeDesignz platform',
  icons: {
    icon: "/Logos/ONLY LOGO.png",
    shortcut: "/Logos/ONLY LOGO.png",
    apple: "/Logos/ONLY LOGO.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Default favicon for light theme */}
        <link rel="icon" type="image/png" href="/favicon-light.png" id="favicon" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function updateFavicon() {
                  const favicon = document.getElementById('favicon');
                  if (!favicon) return;
                  
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (isDark) {
                    // Dark theme: use white logo (inverted)
                    favicon.href = '/Logos/WD LOGO2048 WHITE.png';
                  } else {
                    // Light theme: use dark logo
                    favicon.href = '/favicon-light.png';
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
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
