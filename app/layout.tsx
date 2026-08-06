import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas" });

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/favicon.jpg', type: 'image/jpeg' }],
    shortcut: [{ url: '/favicon.jpg', type: 'image/jpeg' }],
    apple: [{ url: '/favicon.jpg' }],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${bebas.variable}`}>{children}<Analytics /></body>
    </html>
  );
}
