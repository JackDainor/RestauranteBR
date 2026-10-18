import type { Metadata } from 'next';import './globals.css';
export const metadata:Metadata={title:'Sabor & Brasa | Peça online',description:'Peça seus favoritos de forma rápida e fácil.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
