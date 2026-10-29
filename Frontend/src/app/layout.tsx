import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InAds — Monetización para Micro-Influencers & Indie Devs",
  description:
    "Conecta micro-influencers de 1,000 a 10,000 seguidores con desarrolladores independientes. Gana $0.10 USD por cada jugador verificado con tu código.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  verification: {
    google: "AoMIknCqhydQPOblzzCuuTZ554ND3ZeC0OrpciVNcv4",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-surface-pure text-ink-primary antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

