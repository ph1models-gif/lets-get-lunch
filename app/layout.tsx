import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { appleSplashScreens } from "../lib/appleSplashScreens";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InstallPrompt from "./components/InstallPrompt";
import CapacitorExternalLinks from "./components/CapacitorExternalLinks";
import { INSTALL_PROMPT_ENABLED } from "../lib/pwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas" });

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.jpg', type: 'image/jpeg' }],
    apple: [
      { url: '/icons/apple-touch-icon-180.png', sizes: '180x180' },
      { url: '/icons/apple-touch-icon-167.png', sizes: '167x167' },
      { url: '/icons/apple-touch-icon-152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon-120.png', sizes: '120x120' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Let's Get Lunch",
    statusBarStyle: 'default',
    startupImage: appleSplashScreens,
  },
  title: "Let's Get Lunch — Exclusive NYC Lunch Specials",
  description: "Discover great prix-fixe lunch specials at hundreds of NYC restaurants. Real sit-down tables, fast service, most under $35. Find your lunch today.",
  openGraph: {
    title: "Let's Get Lunch — Exclusive NYC Lunch Specials",
    description: "Discover great prix-fixe lunch specials at hundreds of NYC restaurants. Real sit-down tables, fast service, most under $35. Find your lunch today.",
    siteName: "Let's Get Lunch",
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#4A9FD5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${bebas.variable}`}>
        {children}
        {INSTALL_PROMPT_ENABLED && <InstallPrompt />}
        <ServiceWorkerRegister />
        <CapacitorExternalLinks />
        <Analytics />
      </body>
    </html>
  );
}
