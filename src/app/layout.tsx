import type { Metadata } from 'next';
import './globals.css';
import PWAProvider from '@/components/PWAProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'EA FC Friends Championship',
  description: 'Manage EA FC round-robin tournaments with your friends',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FC Champ',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <PWAProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
        </PWAProvider>
      </body>
    </html>
  );
}
