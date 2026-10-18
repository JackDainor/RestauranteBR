import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sabor & Fogo — Pique Macho & Frango',
  description: 'Pique macho, pollo al spiedo, broaster, forno e bebidas. Delivery ou retirada.',
};

export const viewport: Viewport = {
  themeColor: '#236b4c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
