import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cleo — Clips automáticos para Instagram',
  description: 'Convierte videos largos en clips virales de Instagram con IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
