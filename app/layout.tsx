import type { Metadata } from "next";
import "./globals.css";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gifts.justogarcia.es';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Wish List de Möka 🎁✨",
  description: "Una lista curada con amor. Descubre una selección exclusiva de productos en música, moda urbana, streetwear y gaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
