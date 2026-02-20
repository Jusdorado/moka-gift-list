import type { Metadata } from "next";
import "./globals.css";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Los Regalos Perfectos para Möka 🎁✨",
  description: "Lista curada con amor - Diciembre 2025. Descubre 21 productos seleccionados en música, moda urbana, streetwear y gaming.",
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
