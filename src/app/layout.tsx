import type { Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { siteMetadata } from './metadata';
import './globals.css';

export const metadata = siteMetadata;

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050505',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
