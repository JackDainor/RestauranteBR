import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.RESTAURANT_NAME || 'Delivery',
  description: 'Peça online — delivery',
};

export const viewport: Viewport = {
  themeColor: '#e85d04',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
