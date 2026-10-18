import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sabor & Fogo — Delivery',
  description: 'Hambúrgueres, pizzas e bebidas. Peça online.',
};

export const viewport: Viewport = {
  themeColor: '#ff4d00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
