import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  title: "Let's Get Lunch — NYC Prix-Fixe Lunch Deals",
  description: "Find the best prix-fixe lunch deals across NYC. Real tables, real service, all under $35.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
